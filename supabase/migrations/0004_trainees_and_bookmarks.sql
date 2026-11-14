-- 0004 — trainees, QR access, and the coach's own shortlist.
--
-- Access model, confirmed with the product owner 2026-09-17:
--   * A trainee never signs up. The coach creates them and hands over a QR code.
--   * Scanning signs them in and the session NEVER EXPIRES.
--   * The only way out is the coach revoking them. No time limits, no re-scanning.
--
-- That last point drives the design: there is no expires_at anywhere in this file. A trainee
-- being asked to find their coach and re-scan is a support call, and the coach is the one who
-- pays for it.

-- ------------------------------------------------------- gym equipment list
-- A gym has maybe 12 of the 28 equipment types upstream knows about. Storing the gym's real
-- inventory lets the catalog default to "things I can actually do here".
alter table public.gyms
add column equipment text[] not null default '{}';

comment on column public.gyms.equipment is
  'Equipment this gym actually has. Empty array means "not configured — show everything".';

-- ---------------------------------------------------------------- trainees
create table public.trainees (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,

  full_name text not null check (char_length(trim(full_name)) between 2 and 80),
  phone text,
  gender text check (gender is null or gender in ('male', 'female', 'other')),
  birth_date date,
  height_cm smallint check (height_cm is null or height_cm between 80 and 250),
  goal text,
  notes text,

  -- sha256 of the access token. The plaintext is shown to the coach exactly once, at
  -- creation, and never stored: a database leak must not hand over trainee sessions.
  access_token_hash text not null,
  -- Bumped on rotate. Not an expiry — it exists so an old QR stops working on demand.
  token_version integer not null default 1,
  pin_hash text, -- reserved; see PLAN.md §6
  device_cap smallint not null default 5 check (device_cap between 1 and 20),

  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  -- The kick switch. Set = every device dies on its next request.
  revoked_at timestamptz,

  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index trainees_access_token_hash_key on public.trainees (access_token_hash);
create index trainees_gym_id_idx on public.trainees (gym_id);

create trigger trainees_set_updated_at
before update on public.trainees
for each row execute function public.set_updated_at();

-- --------------------------------------------------------- trainee devices
-- One row per phone that has scanned the QR. The link from an anonymous auth user to a
-- trainee — this is what every trainee-side RLS policy resolves through.
create table public.trainee_devices (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references public.trainees (id) on delete cascade,
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  label text,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index trainee_devices_trainee_id_idx on public.trainee_devices (trainee_id);

-- ------------------------------------------------------------- bookmarks
-- The coach's shortlist. Most coaches prescribe from a personal repertoire of 40-60
-- movements out of 1500, so this is the default tab in the program builder's picker.
create table public.gym_exercise_bookmarks (
  gym_id uuid not null references public.gyms (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (gym_id, exercise_id)
);

create index gym_exercise_bookmarks_gym_idx on public.gym_exercise_bookmarks (gym_id);

-- ------------------------------------------------------------- helpers
/*
 * Resolves the trainee for the current anonymous session. security definer so it does not
 * re-enter trainee_devices' own policy and recurse.
 */
create or replace function public.current_trainee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.trainee_id
  from public.trainee_devices d
  join public.trainees t on t.id = d.trainee_id
  where d.auth_user_id = auth.uid()
    and t.revoked_at is null
    and t.status = 'active';
$$;

-- --------------------------------------------------------- create trainee
/*
 * Returns the plaintext token ONCE. It is never retrievable again — the coach must show or
 * print the QR now, or rotate to get a new one.
 *
 * 16 random bytes = 128 bits, hex-encoded. Hex rather than base64 because the token goes in
 * a URL inside a QR code, and base64's +/= would need escaping for no benefit.
 */
create or replace function public.create_trainee(
  p_full_name text,
  p_phone text default null,
  p_gender text default null,
  p_birth_date date default null,
  p_height_cm smallint default null,
  p_goal text default null,
  p_notes text default null
)
returns table (trainee_id uuid, access_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym_id uuid;
  v_token text;
  v_id uuid;
begin
  v_gym_id := public.current_gym_id();
  if v_gym_id is null then
    raise exception 'no gym for current user' using errcode = '28000';
  end if;

  v_token := encode(gen_random_bytes(16), 'hex');

  insert into public.trainees (
    gym_id, full_name, phone, gender, birth_date, height_cm, goal, notes,
    access_token_hash, created_by
  )
  values (
    v_gym_id, trim(p_full_name), p_phone, p_gender, p_birth_date, p_height_cm, p_goal, p_notes,
    public.hash_access_token(v_token), auth.uid()
  )
  returning id into v_id;

  return query select v_id, v_token;
end;
$$;

-- --------------------------------------------------------- rotate / revoke
create or replace function public.rotate_trainee_token(p_trainee_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if not exists (
    select 1 from public.trainees
    where id = p_trainee_id and gym_id = public.current_gym_id()
  ) then
    raise exception 'trainee not found in your gym' using errcode = '42501';
  end if;

  v_token := encode(gen_random_bytes(16), 'hex');

  update public.trainees
  set access_token_hash = public.hash_access_token(v_token),
      token_version = token_version + 1,
      revoked_at = null
  where id = p_trainee_id;

  -- Every existing phone loses access; the new QR is the only way back in.
  delete from public.trainee_devices where trainee_id = p_trainee_id;

  return v_token;
end;
$$;

create or replace function public.revoke_trainee(p_trainee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.trainees
    where id = p_trainee_id and gym_id = public.current_gym_id()
  ) then
    raise exception 'trainee not found in your gym' using errcode = '42501';
  end if;

  update public.trainees set revoked_at = now(), status = 'paused' where id = p_trainee_id;
  delete from public.trainee_devices where trainee_id = p_trainee_id;
end;
$$;

-- ------------------------------------------------------------- claim (QR)
/*
 * Called by the trainee's browser right after an anonymous sign-in, with the token from the
 * QR URL. Links this anonymous user to the trainee so ordinary RLS takes over from here.
 *
 * Idempotent: re-scanning on a device that already claimed just refreshes last_seen_at,
 * so a trainee who scans twice is not punished with a "device limit reached" error.
 */
create or replace function public.claim_trainee(p_token text)
returns table (trainee_id uuid, trainee_name text, gym_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainee public.trainees;
  v_devices integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_trainee
  from public.trainees
  where access_token_hash = public.hash_access_token(p_token);

  -- Same error for "no such token" and "revoked": do not let a scanner distinguish them.
  if v_trainee.id is null or v_trainee.revoked_at is not null or v_trainee.status <> 'active' then
    raise exception 'invalid or revoked code' using errcode = '42501';
  end if;

  if exists (select 1 from public.trainee_devices where auth_user_id = auth.uid()) then
    update public.trainee_devices
    set last_seen_at = now(), trainee_id = v_trainee.id
    where auth_user_id = auth.uid();
  else
    select count(*) into v_devices
    from public.trainee_devices where trainee_devices.trainee_id = v_trainee.id;

    if v_devices >= v_trainee.device_cap then
      raise exception 'device limit reached' using errcode = '53400';
    end if;

    insert into public.trainee_devices (trainee_id, auth_user_id)
    values (v_trainee.id, auth.uid());
  end if;

  return query
    select v_trainee.id, v_trainee.full_name, g.name
    from public.gyms g where g.id = v_trainee.gym_id;
end;
$$;

-- -------------------------------------------------------------------- RLS
alter table public.trainees enable row level security;
alter table public.trainee_devices enable row level security;
alter table public.gym_exercise_bookmarks enable row level security;

-- Coaches: full control over their own gym's trainees.
create policy trainees_select_coach on public.trainees
for select to authenticated
using (gym_id = public.current_gym_id() or id = public.current_trainee_id());

create policy trainees_insert_coach on public.trainees
for insert to authenticated
with check (gym_id = public.current_gym_id());

create policy trainees_update_coach on public.trainees
for update to authenticated
using (gym_id = public.current_gym_id())
with check (gym_id = public.current_gym_id());

create policy trainees_delete_coach on public.trainees
for delete to authenticated
using (gym_id = public.current_gym_id());

-- Devices: the coach sees and can remove them; a trainee sees only their own.
create policy trainee_devices_select on public.trainee_devices
for select to authenticated
using (
  auth_user_id = (select auth.uid())
  or trainee_id in (select id from public.trainees where gym_id = public.current_gym_id())
);

create policy trainee_devices_delete_coach on public.trainee_devices
for delete to authenticated
using (trainee_id in (select id from public.trainees where gym_id = public.current_gym_id()));

-- Bookmarks: entirely the coach's own.
create policy bookmarks_select on public.gym_exercise_bookmarks
for select to authenticated
using (gym_id = public.current_gym_id());

create policy bookmarks_insert on public.gym_exercise_bookmarks
for insert to authenticated
with check (gym_id = public.current_gym_id());

create policy bookmarks_delete on public.gym_exercise_bookmarks
for delete to authenticated
using (gym_id = public.current_gym_id());

-- ------------------------------------------------------------------ grants
revoke execute on function public.create_trainee(text, text, text, date, smallint, text, text) from anon;
revoke execute on function public.rotate_trainee_token(uuid) from anon;
revoke execute on function public.revoke_trainee(uuid) from anon;
grant execute on function public.create_trainee(text, text, text, date, smallint, text, text) to authenticated;
grant execute on function public.rotate_trainee_token(uuid) to authenticated;
grant execute on function public.revoke_trainee(uuid) to authenticated;
-- claim_trainee is reachable by any signed-in user, including anonymous ones — that is the
-- whole point. It authorises on the token, not on who is calling.
grant execute on function public.claim_trainee(text) to authenticated;
