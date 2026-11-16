-- 0007 — gym branding for the trainee app.
--
-- The trainee's screen (and the app they install to their home screen) belongs to the gym,
-- not to us: gym logo, gym name, the coach's name and title. These functions expose exactly
-- that and nothing more.

-- A coach's public title under their name, e.g. "Head coach" / "مربی بدنسازی".
alter table public.profiles
  add column if not exists title text
  check (title is null or char_length(trim(title)) <= 60);

-- ------------------------------------------------------- trainee_brand()
-- Called by the signed-in (anonymous) trainee. Resolves their gym through the same
-- current_trainee_id() every trainee RLS policy uses, so a trainee can only ever see the
-- branding of the gym they were claimed into. The coach shown is the gym owner.
create or replace function public.trainee_brand()
returns table (
  gym_id uuid,
  gym_name text,
  logo_path text,
  coach_name text,
  coach_title text,
  coach_avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.name, g.logo_path, p.display_name, p.title, p.avatar_url
  from public.trainees t
  join public.gyms g on g.id = t.gym_id
  left join public.profiles p on p.id = g.owner_id
  where t.id = public.current_trainee_id();
$$;

revoke all on function public.trainee_brand() from public, anon;
grant execute on function public.trainee_brand() to authenticated;

-- ---------------------------------------------------------- gym_brand()
-- Public, for the per-gym web app manifest served before anyone is signed in. Returns only
-- the name and logo — what is already printed on the gym's own QR card. Gym ids are random
-- uuids, so this cannot be used to enumerate gyms.
create or replace function public.gym_brand(p_gym_id uuid)
returns table (gym_name text, logo_path text)
language sql
stable
security definer
set search_path = public
as $$
  select g.name, g.logo_path from public.gyms g where g.id = p_gym_id;
$$;

revoke all on function public.gym_brand(uuid) from public;
grant execute on function public.gym_brand(uuid) to anon, authenticated;
