-- 0003 — the exercise catalog.
--
-- Two kinds of row share one table, separated by `source`:
--   system : mirrored from oss.exercisedb.dev, gym_id null, visible to every coach
--   custom : written by a coach, gym_id set, visible only to that gym
--
-- Keeping them in one table means the program builder joins one place and never has to
-- care where a movement came from.

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'system' check (source in ('system', 'custom')),
  -- Upstream id, so a re-run of the seed updates rows instead of duplicating them.
  external_id text,
  gym_id uuid references public.gyms (id) on delete cascade,

  name text not null check (char_length(trim(name)) between 1 and 160),
  name_fa text,

  body_parts text[] not null default '{}',
  target_muscles text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  equipments text[] not null default '{}',
  -- Our own coach-facing layer (Chest, Legs, Push, Pull …). The upstream data is
  -- muscle-oriented; coaches think in training days.
  categories text[] not null default '{}',
  instructions text[] not null default '{}',

  -- gif_url is upstream; gif_path is our mirrored copy in Storage. The UI prefers the
  -- mirror when present and falls back to upstream, so the catalog is usable the moment
  -- rows land and the ~100 MB media mirror can finish in its own time.
  gif_url text,
  gif_path text,
  video_url text,
  difficulty text check (difficulty is null or difficulty in ('beginner', 'intermediate', 'advanced')),
  is_unilateral boolean not null default false,

  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint exercises_ownership check (
    (source = 'system' and gym_id is null and external_id is not null)
    or (source = 'custom' and gym_id is not null)
  )
);

create unique index exercises_external_id_key
on public.exercises (external_id)
where source = 'system';

create index exercises_gym_id_idx on public.exercises (gym_id) where source = 'custom';
create index exercises_body_parts_idx on public.exercises using gin (body_parts);
create index exercises_categories_idx on public.exercises using gin (categories);
create index exercises_equipments_idx on public.exercises using gin (equipments);
create index exercises_target_muscles_idx on public.exercises using gin (target_muscles);

-- A generated column requires a strictly IMMUTABLE expression, and two things in the
-- obvious version are not:
--   * to_tsvector(text, text) resolves the config by name at runtime -> STABLE.
--     The ::regconfig overload is immutable.
--   * array_to_string(anyarray, text) is declared STABLE, because in general it calls the
--     element type's output function. For text[] it is immutable in practice, but the
--     declaration is what the planner checks.
-- Wrapping the whole document in one immutable SQL function is the standard way through.
--
-- 'simple' rather than 'english': Postgres has no Persian text-search config, and English
-- stemming on movement names buys little while making fa and en behave differently.
create or replace function public.exercise_search_document(
  p_name text,
  p_name_fa text,
  p_target_muscles text[],
  p_body_parts text[],
  p_equipments text[],
  p_categories text[]
)
returns tsvector
language sql
immutable
as $$
  select to_tsvector(
    'simple'::regconfig,
    coalesce(p_name, '')
    || ' ' || coalesce(p_name_fa, '')
    || ' ' || coalesce(array_to_string(p_target_muscles, ' '), '')
    || ' ' || coalesce(array_to_string(p_body_parts, ' '), '')
    || ' ' || coalesce(array_to_string(p_equipments, ' '), '')
    || ' ' || coalesce(array_to_string(p_categories, ' '), '')
  );
$$;

alter table public.exercises
add column search_tsv tsvector generated always as (
  public.exercise_search_document(
    name, name_fa, target_muscles, body_parts, equipments, categories
  )
) stored;

create index exercises_search_idx on public.exercises using gin (search_tsv);
-- Trigram on top of tsvector: tsvector handles whole words, trigram catches
-- "benh press" and partial typing in the builder's search box.
create index exercises_name_trgm_idx on public.exercises using gin (name gin_trgm_ops);

create trigger exercises_set_updated_at
before update on public.exercises
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------- RLS
alter table public.exercises enable row level security;

create policy exercises_select_system_or_own on public.exercises
for select to authenticated
using (source = 'system' or gym_id = public.current_gym_id());

create policy exercises_insert_own_gym on public.exercises
for insert to authenticated
with check (source = 'custom' and gym_id = public.current_gym_id());

create policy exercises_update_own_gym on public.exercises
for update to authenticated
using (source = 'custom' and gym_id = public.current_gym_id())
with check (source = 'custom' and gym_id = public.current_gym_id());

create policy exercises_delete_own_gym on public.exercises
for delete to authenticated
using (source = 'custom' and gym_id = public.current_gym_id());

-- ----------------------------------------------------------------- storage
-- Public bucket: exercise GIFs are not secret, and a public bucket means the browser
-- gets a plain CDN URL with no signing round-trip per image in a 40-item grid.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-media',
  'exercise-media',
  true,
  10485760,
  array['image/gif', 'image/webp', 'image/png', 'image/jpeg', 'video/mp4']
)
on conflict (id) do nothing;

create policy exercise_media_public_read on storage.objects
for select to public
using (bucket_id = 'exercise-media');

-- Coaches may upload media for their own custom exercises, under gyms/<gym_id>/…
create policy exercise_media_coach_write on storage.objects
for insert to authenticated
with check (
  bucket_id = 'exercise-media'
  and (storage.foldername(name))[1] = 'gyms'
  and (storage.foldername(name))[2] = public.current_gym_id()::text
);
