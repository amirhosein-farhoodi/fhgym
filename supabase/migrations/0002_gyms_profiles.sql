-- 0002 — coach identity: gyms and profiles, with the RLS baseline every later phase inherits.
--
-- Policies are written per-operation rather than as one blanket `for all`. It is more SQL,
-- but it makes "who can write this row" reviewable instead of a guess.

-- ---------------------------------------------------------------- gyms
create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  logo_path text,
  locale text not null default 'fa' check (locale in ('fa', 'en')),
  unit_system text not null default 'metric' check (unit_system in ('metric', 'imperial')),
  -- 0 = Sunday … 6 = Saturday. Saturday is the default: the Iranian week starts there,
  -- and "this week's adherence" is wrong all week if this is off by one.
  week_start smallint not null default 6 check (week_start between 0 and 6),
  timezone text not null default 'Asia/Tehran',
  require_pin boolean not null default false, -- reserved for v1.1 trainee PINs
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gyms_owner_id_idx on public.gyms (owner_id);

create trigger gyms_set_updated_at
before update on public.gyms
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  gym_id uuid references public.gyms (id) on delete set null,
  display_name text,
  avatar_url text,
  role text not null default 'owner' check (role in ('owner', 'coach')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_gym_id_idx on public.profiles (gym_id);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- --------------------------------------------------- new coach -> profile
-- Anonymous users are trainees arriving from a QR scan (Phase 2). They are NOT coaches
-- and must never get a profile row, or they would turn up in gym staff queries.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.is_anonymous, false) then
    return new;
  end if;

  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.email
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ------------------------------------------------------------- helpers
-- security definer so it does not re-enter profiles' own RLS policy and recurse.
create or replace function public.current_gym_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select gym_id from public.profiles where id = auth.uid();
$$;

-- -------------------------------------------------------- RLS: profiles
alter table public.profiles enable row level security;

create policy profiles_select_self on public.profiles
for select to authenticated
using (id = (select auth.uid()));

create policy profiles_update_self on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- No insert or delete policy on purpose: rows are created by the trigger above and
-- removed by the cascade from auth.users. Clients never touch either.

-- ------------------------------------------------------------ RLS: gyms
alter table public.gyms enable row level security;

create policy gyms_select_member on public.gyms
for select to authenticated
using (owner_id = (select auth.uid()) or id = public.current_gym_id());

create policy gyms_insert_own on public.gyms
for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy gyms_update_owner on public.gyms
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy gyms_delete_owner on public.gyms
for delete to authenticated
using (owner_id = (select auth.uid()));

-- ------------------------------------------------------------ onboarding
-- Creating the gym and linking the coach to it must be one transaction. Doing it as two
-- client calls leaves a coach stranded with a gym they are not attached to if the second
-- call fails — and the UI would then offer to create a second one.
create or replace function public.create_gym(
  gym_name text,
  gym_locale text default 'fa',
  gym_timezone text default 'Asia/Tehran'
)
returns public.gyms
language plpgsql
security definer
set search_path = public
as $$
declare
  new_gym public.gyms;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if exists (select 1 from public.profiles where id = auth.uid() and gym_id is not null) then
    raise exception 'coach already has a gym' using errcode = '23505';
  end if;

  insert into public.gyms (owner_id, name, locale, timezone)
  values (auth.uid(), trim(gym_name), gym_locale, gym_timezone)
  returning * into new_gym;

  update public.profiles
  set gym_id = new_gym.id, role = 'owner'
  where id = auth.uid();

  return new_gym;
end;
$$;

revoke execute on function public.create_gym(text, text, text) from anon;
grant execute on function public.create_gym(text, text, text) to authenticated;
