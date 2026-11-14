/*
 * Hand-written for now. Once the Supabase project exists, replace this file with
 *   pnpm dlx supabase gen types typescript --project-id <ref> > src/lib/db.types.ts
 * and the shapes below become generated rather than maintained.
 *
 * Kept deliberately small: only what Phase 1 touches.
 */

export type Locale = 'fa' | 'en'
export type UnitSystem = 'metric' | 'imperial'
export type CoachRole = 'owner' | 'coach'

export interface Gym {
  id: string
  owner_id: string
  name: string
  logo_path: string | null
  locale: Locale
  unit_system: UnitSystem
  /** 0 = Sunday … 6 = Saturday. Saturday by default — the Iranian week starts there. */
  week_start: number
  timezone: string
  require_pin: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  gym_id: string | null
  display_name: string | null
  avatar_url: string | null
  role: CoachRole
  created_at: string
  updated_at: string
}

/** What the app needs to route a signed-in coach: are they onboarded or not. */
export interface CoachContext {
  profile: Profile
  gym: Gym | null
}

export type ProgramStatus = 'draft' | 'active' | 'completed' | 'archived'

export interface Program {
  id: string
  gym_id: string
  trainee_id: string | null
  is_template: boolean
  title: string
  description: string | null
  days_per_week: number
  start_date: string | null
  end_date: string | null
  status: ProgramStatus
  created_at: string
  updated_at: string
}

export interface ProgramDay {
  id: string
  program_id: string
  /** 1-based slot in the week as the coach laid it out, not a weekday number. */
  day_index: number
  title: string | null
  focus: string[]
  notes: string | null
  is_rest_day: boolean
}

export interface ProgramExercise {
  id: string
  day_id: string
  exercise_id: string
  position: number
  /** Same value on two rows means "do these back to back". Null = standalone. */
  superset_group: number | null
  sets: number | null
  reps_min: number | null
  reps_max: number | null
  weight: number | null
  weight_unit: 'kg' | 'lb' | '%1rm' | null
  tempo: string | null
  rest_seconds: number | null
  target_rpe: number | null
  duration_seconds: number | null
  distance_m: number | null
  notes: string | null
  alt_exercise_id: string | null
}

/** A program_exercise joined to its catalog row, which is what every view needs. */
export interface ProgramExerciseWithExercise extends ProgramExercise {
  exercise: Exercise
}

export interface ProgramDayWithExercises extends ProgramDay {
  program_exercises: ProgramExerciseWithExercise[]
}

export interface ProgramWithDays extends Program {
  program_days: ProgramDayWithExercises[]
}

export interface WorkoutSession {
  id: string
  trainee_id: string
  program_day_id: string
  session_date: string
  current_exercise_id: string | null
  status: 'in_progress' | 'completed' | 'abandoned'
  started_at: string
  completed_at: string | null
}

export interface ExerciseProgress {
  id: string
  session_id: string
  program_exercise_id: string
  is_done: boolean
  done_at: string | null
}

export type TraineeStatus = 'active' | 'paused' | 'archived'

export interface Trainee {
  id: string
  gym_id: string
  full_name: string
  phone: string | null
  gender: 'male' | 'female' | 'other' | null
  birth_date: string | null
  height_cm: number | null
  goal: string | null
  notes: string | null
  token_version: number
  device_cap: number
  status: TraineeStatus
  /** Set = kicked. Sessions on every device die on their next request. */
  revoked_at: string | null
  created_at: string
  updated_at: string
}

export type ExerciseSource = 'system' | 'custom'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export interface Exercise {
  id: string
  source: ExerciseSource
  external_id: string | null
  gym_id: string | null
  name: string
  name_fa: string | null
  body_parts: string[]
  target_muscles: string[]
  secondary_muscles: string[]
  equipments: string[]
  categories: string[]
  instructions: string[]
  /** Upstream URL. Always present on system rows. */
  gif_url: string | null
  /** Path inside the `exercise-media` bucket once mirrored. Null until the mirror runs. */
  gif_path: string | null
  video_url: string | null
  difficulty: Difficulty | null
  is_unilateral: boolean
  created_at: string
  updated_at: string
}
