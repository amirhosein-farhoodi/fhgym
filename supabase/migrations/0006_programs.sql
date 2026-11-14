-- 0006 — programs: the thing the whole app exists to produce.
--
-- Shape: program -> days -> exercises. PLAN.md §7 had a `program_blocks` level between days
-- and exercises to model supersets and circuits. Dropped deliberately: it buys one feature
-- (grouping) at the cost of a third level of nested drag-and-drop in the builder, which is
-- where this kind of UI goes to die. A `superset_group` integer on program_exercises gives
-- coaches the same visible result — "do these two back to back" — with a flat list.
--
-- Two ownership modes on one table:
--   is_template = true   -> reusable blueprint, trainee_id null
--   is_template = false  -> assigned to exactly one trainee

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  trainee_id uuid references public.trainees (id) on delete cascade,
  is_template boolean not null default false,

  title text not null check (char_length(trim(title)) between 1 and 120),
  description text,
  days_per_week smallint not null default 4 check (days_per_week between 1 and 7),
  start_date date,
  end_date date,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),

  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint programs_template_or_assigned check (
    (is_template and trainee_id is null) or (not is_template)
  )
);

create index programs_gym_idx on public.programs (gym_id);
create index programs_trainee_idx on public.programs (trainee_id) where trainee_id is not null;

-- A trainee follows one program at a time. Enforced in the database rather than the UI,
-- because "which program is live?" must never be ambiguous on the trainee's phone.
create unique index programs_one_active_per_trainee
on public.programs (trainee_id)
where status = 'active' and trainee_id is not null;

create trigger programs_set_updated_at
before update on public.programs
for each row execute function public.set_updated_at();

-- -------------------------------------------------------------- days
create table public.program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  -- 1-based position in the week as the coach laid it out, not a weekday number:
  -- most gyms say "day 1, day 2" and let the trainee choose which weekday that falls on.
  day_index smallint not null check (day_index between 1 and 7),
  title text,
  focus text[] not null default '{}',
  notes text,
  is_rest_day boolean not null default false,

  unique (program_id, day_index)
);

create index program_days_program_idx on public.program_days (program_id);

-- --------------------------------------------------------- exercises
create table public.program_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.program_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position smallint not null default 0,

  -- Same integer on two rows = superset. Null = a normal standalone exercise.
  superset_group smallint,

  sets smallint check (sets is null or sets between 1 and 20),
  reps_min smallint,
  reps_max smallint,
  weight numeric(6, 2),
  weight_unit text default 'kg' check (weight_unit is null or weight_unit in ('kg', 'lb', '%1rm')),
  tempo text,
  rest_seconds smallint,
  target_rpe smallint check (target_rpe is null or target_rpe between 1 and 10),
  duration_seconds integer,
  distance_m integer,
  notes text,
  -- "If the machine is taken, do this instead."
  alt_exercise_id uuid references public.exercises (id) on delete set null,

  created_at timestamptz not null default now()
);

create index program_exercises_day_idx on public.program_exercises (day_id);

-- ---------------------------------------------------------- sessions
-- The trainee's program is read-only. The only things they change are where they are in a
-- workout and which exercises they have finished — see PLAN.md §3.4.
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references public.trainees (id) on delete cascade,
  program_day_id uuid not null references public.program_days (id) on delete cascade,
  session_date date not null default current_date,
  current_exercise_id uuid references public.program_exercises (id) on delete set null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,

  unique (trainee_id, program_day_id, session_date)
);

create index workout_sessions_trainee_idx on public.workout_sessions (trainee_id, session_date desc);

create table public.exercise_progress (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  program_exercise_id uuid not null references public.program_exercises (id) on delete cascade,
  is_done boolean not null default false,
  done_at timestamptz,
  -- v1.1 adds reps / weight / rpe columns here; v1 records completion only.

  unique (session_id, program_exercise_id)
);

create index exercise_progress_session_idx on public.exercise_progress (session_id);

-- ------------------------------------------------------------ helpers
/*
 * Can the caller see this program? True for a coach in the owning gym, or for the trainee
 * it is assigned to. Used by every policy on the program tree so the rule lives in one place.
 */
create or replace function public.can_read_program(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.programs p
    where p.id = p_program_id
      and (p.gym_id = public.current_gym_id() or p.trainee_id = public.current_trainee_id())
  );
$$;

create or replace function public.can_write_program(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.programs p
    where p.id = p_program_id and p.gym_id = public.current_gym_id()
  );
$$;

-- ---------------------------------------------------------- duplicate
/*
 * Deep-copies a program, its days and its exercises.
 *
 * This is the feature coaches use most after the first month: a 4-day split that works for
 * one trainee works for the next with two tweaks. Doing it server-side in one transaction
 * means no half-copied programs if the connection drops mid-way.
 */
create or replace function public.duplicate_program(
  p_program_id uuid,
  p_trainee_id uuid default null,
  p_title text default null,
  p_as_template boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.programs;
  v_new_id uuid;
  v_day record;
  v_new_day_id uuid;
begin
  select * into v_source from public.programs
  where id = p_program_id and gym_id = public.current_gym_id();

  if v_source.id is null then
    raise exception 'program not found in your gym' using errcode = '42501';
  end if;

  insert into public.programs (
    gym_id, trainee_id, is_template, title, description, days_per_week, status, created_by
  )
  values (
    v_source.gym_id,
    case when p_as_template then null else p_trainee_id end,
    p_as_template,
    coalesce(p_title, v_source.title || ' (copy)'),
    v_source.description,
    v_source.days_per_week,
    'draft',
    auth.uid()
  )
  returning id into v_new_id;

  for v_day in select * from public.program_days where program_id = p_program_id order by day_index
  loop
    insert into public.program_days (program_id, day_index, title, focus, notes, is_rest_day)
    values (v_new_id, v_day.day_index, v_day.title, v_day.focus, v_day.notes, v_day.is_rest_day)
    returning id into v_new_day_id;

    insert into public.program_exercises (
      day_id, exercise_id, position, superset_group, sets, reps_min, reps_max, weight,
      weight_unit, tempo, rest_seconds, target_rpe, duration_seconds, distance_m, notes,
      alt_exercise_id
    )
    select
      v_new_day_id, exercise_id, position, superset_group, sets, reps_min, reps_max, weight,
      weight_unit, tempo, rest_seconds, target_rpe, duration_seconds, distance_m, notes,
      alt_exercise_id
    from public.program_exercises where day_id = v_day.id;
  end loop;

  return v_new_id;
end;
$$;

/*
 * Activating is its own function because of the one-active-program rule: the previous
 * active program has to be retired in the same transaction, or the unique index rejects it.
 */
create or replace function public.activate_program(p_program_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainee_id uuid;
begin
  select trainee_id into v_trainee_id from public.programs
  where id = p_program_id and gym_id = public.current_gym_id();

  if v_trainee_id is null then
    raise exception 'program not found, or not assigned to a trainee' using errcode = '42501';
  end if;

  update public.programs set status = 'completed'
  where trainee_id = v_trainee_id and status = 'active' and id <> p_program_id;

  update public.programs set status = 'active' where id = p_program_id;
end;
$$;

-- ---------------------------------------------------------------- RLS
alter table public.programs enable row level security;
alter table public.program_days enable row level security;
alter table public.program_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.exercise_progress enable row level security;

-- programs: coach writes, trainee reads only their own ACTIVE one.
create policy programs_select on public.programs
for select to authenticated
using (
  gym_id = public.current_gym_id()
  or (trainee_id = public.current_trainee_id() and status = 'active')
);

create policy programs_insert on public.programs
for insert to authenticated
with check (gym_id = public.current_gym_id());

create policy programs_update on public.programs
for update to authenticated
using (gym_id = public.current_gym_id())
with check (gym_id = public.current_gym_id());

create policy programs_delete on public.programs
for delete to authenticated
using (gym_id = public.current_gym_id());

-- days and exercises: read follows the program, write is coach-only.
-- Trainees get NO update path anywhere in this tree — read-only is enforced here, not in the UI.
create policy program_days_select on public.program_days
for select to authenticated using (public.can_read_program(program_id));

create policy program_days_write on public.program_days
for all to authenticated
using (public.can_write_program(program_id))
with check (public.can_write_program(program_id));

create policy program_exercises_select on public.program_exercises
for select to authenticated
using (exists (
  select 1 from public.program_days d
  where d.id = day_id and public.can_read_program(d.program_id)
));

create policy program_exercises_write on public.program_exercises
for all to authenticated
using (exists (
  select 1 from public.program_days d
  where d.id = day_id and public.can_write_program(d.program_id)
))
with check (exists (
  select 1 from public.program_days d
  where d.id = day_id and public.can_write_program(d.program_id)
));

-- sessions: the trainee's own, plus the coach reading their gym's.
create policy workout_sessions_select on public.workout_sessions
for select to authenticated
using (
  trainee_id = public.current_trainee_id()
  or trainee_id in (select id from public.trainees where gym_id = public.current_gym_id())
);

create policy workout_sessions_insert on public.workout_sessions
for insert to authenticated
with check (trainee_id = public.current_trainee_id());

create policy workout_sessions_update on public.workout_sessions
for update to authenticated
using (trainee_id = public.current_trainee_id())
with check (trainee_id = public.current_trainee_id());

create policy exercise_progress_select on public.exercise_progress
for select to authenticated
using (exists (
  select 1 from public.workout_sessions s
  where s.id = session_id
    and (
      s.trainee_id = public.current_trainee_id()
      or s.trainee_id in (select id from public.trainees where gym_id = public.current_gym_id())
    )
));

create policy exercise_progress_write on public.exercise_progress
for all to authenticated
using (exists (
  select 1 from public.workout_sessions s
  where s.id = session_id and s.trainee_id = public.current_trainee_id()
))
with check (exists (
  select 1 from public.workout_sessions s
  where s.id = session_id and s.trainee_id = public.current_trainee_id()
));

-- -------------------------------------------------------------- grants
grant execute on function public.duplicate_program(uuid, uuid, text, boolean) to authenticated;
grant execute on function public.activate_program(uuid) to authenticated;
