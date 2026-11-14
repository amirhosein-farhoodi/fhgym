import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import type { ExerciseProgress, ProgramWithDays, WorkoutSession } from '@/lib/db.types'

export const traineeProgramKeys = {
  program: ['trainee', 'program'] as const,
  session: (dayId: string) => ['trainee', 'session', dayId] as const,
  history: ['trainee', 'history'] as const,
}

/**
 * The trainee's one active program.
 *
 * No trainee id is passed: RLS resolves it from the anonymous session via trainee_devices,
 * and the policy only exposes programs with status = 'active'. A trainee physically cannot
 * fetch a draft their coach is still writing.
 */
export function useActiveProgram() {
  return useQuery({
    queryKey: traineeProgramKeys.program,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('programs')
        // Same explicit-FK requirement as the coach side; see TREE_SELECT in usePrograms.
        .select(
          '*, program_days(*, program_exercises(*, exercise:exercises!program_exercises_exercise_id_fkey(*)))',
        )
        .eq('status', 'active')
        .maybeSingle<ProgramWithDays>()
      if (error) throw error
      if (!data) return null

      const days = [...(data.program_days ?? [])].sort((a, b) => a.day_index - b.day_index)
      for (const day of days) {
        day.program_exercises = [...(day.program_exercises ?? [])].sort(
          (a, b) => a.position - b.position,
        )
      }
      return { ...data, program_days: days }
    },
  })
}

export interface SessionState {
  session: WorkoutSession | null
  progress: ExerciseProgress[]
}

/** Today's session for one program day, plus which exercises are already ticked off. */
export function useDaySession(dayId: string | undefined, traineeId: string | undefined) {
  return useQuery<SessionState>({
    queryKey: traineeProgramKeys.session(dayId ?? ''),
    enabled: Boolean(dayId && traineeId),
    queryFn: async () => {
      const supabase = getSupabase()
      const today = new Date().toISOString().slice(0, 10)

      const { data: session, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('program_day_id', dayId!)
        .eq('session_date', today)
        .maybeSingle<WorkoutSession>()
      if (error) throw error
      if (!session) return { session: null, progress: [] }

      const { data: progress, error: progressError } = await supabase
        .from('exercise_progress')
        .select('*')
        .eq('session_id', session.id)
        .returns<ExerciseProgress[]>()
      if (progressError) throw progressError

      return { session, progress: progress ?? [] }
    },
  })
}

/**
 * Creates today's session on demand — the trainee never presses "start workout", the first
 * tap on an exercise does it.
 */
export function useEnsureSession(dayId: string, traineeId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<WorkoutSession> => {
      const supabase = getSupabase()
      const today = new Date().toISOString().slice(0, 10)

      const { data: existing } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('program_day_id', dayId)
        .eq('session_date', today)
        .maybeSingle<WorkoutSession>()
      if (existing) return existing

      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({ trainee_id: traineeId, program_day_id: dayId, session_date: today })
        .select()
        .single<WorkoutSession>()
      if (error) throw error
      return data
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: traineeProgramKeys.session(dayId) }),
  })
}

export function useSetCurrentExercise(dayId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ sessionId, exerciseId }: { sessionId: string; exerciseId: string }) => {
      const { error } = await getSupabase()
        .from('workout_sessions')
        .update({ current_exercise_id: exerciseId })
        .eq('id', sessionId)
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: traineeProgramKeys.session(dayId) }),
  })
}

export function useToggleDone(dayId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      sessionId,
      programExerciseId,
      done,
    }: {
      sessionId: string
      programExerciseId: string
      done: boolean
    }) => {
      const { error } = await getSupabase().from('exercise_progress').upsert(
        {
          session_id: sessionId,
          program_exercise_id: programExerciseId,
          is_done: done,
          done_at: done ? new Date().toISOString() : null,
        },
        { onConflict: 'session_id,program_exercise_id' },
      )
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: traineeProgramKeys.session(dayId) })
      void queryClient.invalidateQueries({ queryKey: traineeProgramKeys.history })
    },
  })
}

export interface PastSession {
  id: string
  session_date: string
  program_day_id: string
  exercise_progress: Array<{ is_done: boolean }>
}

/**
 * Recent sessions with their tick counts.
 *
 * Powers the "last chest day: 6 of 7 done" line, which is the entire reason v1 persists
 * anything at all — see PLAN.md §3.4.
 */
export function useSessionHistory() {
  return useQuery({
    queryKey: traineeProgramKeys.history,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('workout_sessions')
        .select('id, session_date, program_day_id, exercise_progress(is_done)')
        .order('session_date', { ascending: false })
        .limit(30)
        .returns<PastSession[]>()
      if (error) throw error
      return data ?? []
    },
  })
}
