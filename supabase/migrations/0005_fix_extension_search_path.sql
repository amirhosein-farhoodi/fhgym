-- 0005 — fix: pgcrypto lives in `extensions`, not `public`.
--
-- Found by running the QR claim end to end against the live database:
--   ERROR 42883: function digest(text, unknown) does not exist
--
-- Supabase installs pgcrypto into the `extensions` schema. Every SECURITY DEFINER function
-- here pins `set search_path = public` — which is correct for safety, since an unpinned
-- search_path on a definer function is a privilege-escalation vector — but it also hides
-- digest() and gen_random_bytes().
--
-- The `create extension if not exists pgcrypto` in 0001 was a silent no-op for the same
-- reason: the extension already existed, just in another schema.
--
-- Fix: add `extensions` to the search path and schema-qualify the calls, so it works
-- regardless of how a future migration reorders the path.

create or replace function public.hash_access_token(token text)
returns text
language sql
immutable
strict
set search_path = public, extensions
as $$
  select encode(extensions.digest(token, 'sha256'), 'hex');
$$;

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
set search_path = public, extensions
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

  v_token := encode(extensions.gen_random_bytes(16), 'hex');

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

create or replace function public.rotate_trainee_token(p_trainee_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
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

  v_token := encode(extensions.gen_random_bytes(16), 'hex');

  update public.trainees
  set access_token_hash = public.hash_access_token(v_token),
      token_version = token_version + 1,
      revoked_at = null
  where id = p_trainee_id;

  delete from public.trainee_devices where trainee_id = p_trainee_id;

  return v_token;
end;
$$;

create or replace function public.claim_trainee(p_token text)
returns table (trainee_id uuid, trainee_name text, gym_name text)
language plpgsql
security definer
set search_path = public, extensions
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

grant execute on function public.claim_trainee(text) to authenticated;
grant execute on function public.create_trainee(text, text, text, date, smallint, text, text) to authenticated;
grant execute on function public.rotate_trainee_token(uuid) to authenticated;
