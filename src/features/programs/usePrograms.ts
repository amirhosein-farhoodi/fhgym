import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import type {
  Program,
  ProgramDay,
  ProgramExercise,
  ProgramWithDays,
} from '@/lib/db.types'

export const programKeys = {
  all: ['programs'] as const,
  forTrainee: (traineeId: string) => ['programs', 'trainee', traineeId] as const,
  detail: (programId: string) => ['program', programId] as const,
  templates: ['programs', 'templates'] as const,
}

/*
 * One nested select pulls the whole tree. The builder needs every day and every exercise at
 * once to render, and three round trips would mean three separate loading states in a UI
 * where the coach is looking at all of it simultaneously.
 */
/*
 * The FK must be named explicitly. program_exercises has two foreign keys to exercises —
 * exercise_id and alt_exercise_id — so a bare `exercises(*)` embed is ambiguous and
 * PostgREST rejects the whole query with PGRST201.
 */
export const TREE_SELECT =
  '*, program_days(*, program_exercises(*, exercise:exercises!program_exercises_exercise_id_fkey(*)))'

function sortTree(program: ProgramWithDays): ProgramWithDays {
  // PostgREST does not guarantee ordering inside embedded resources, so sort here rather
  // than hoping. Day 3 appearing before Day 1 is the kind of bug that looks like chaos.
  const days = [...(program.program_days ?? [])].sort((a, b) => a.day_index - b.day_index)
  for (const day of days) {
    day.program_exercises = [...(day.program_exercises ?? [])].sort(
      (a, b) => a.position - b.position,
    )
  }
  return { ...program, program_days: days }
}

export function useProgram(programId: string | undefined) {
  return useQuery({
    queryKey: programKeys.detail(programId ?? ''),
    enabled: Boolean(programId),
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('programs')
        .select(TREE_SELECT)
        .eq('id', programId!)
        .single<ProgramWithDays>()
      if (error) throw error
      return sortTree(data)
    },
  })
}

export function useTraineePrograms(traineeId: string | undefined) {
  return useQuery({
    queryKey: programKeys.forTrainee(traineeId ?? ''),
    enabled: Boolean(traineeId),
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('programs')
        .select('*')
        .eq('trainee_id', traineeId!)
        .order('created_at', { ascending: false })
        .returns<Program[]>()
      if (error) throw error
      return data ?? []
    },
  })
}

export function useTemplates() {
  return useQuery({
    queryKey: programKeys.templates,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('programs')
        .select('*')
        .eq('is_template', true)
        .order('created_at', { ascending: false })
        .returns<Program[]>()
      if (error) throw error
      return data ?? []
    },
  })
}

export interface CreateProgramInput {
  gymId: string
  traineeId: string | null
  title: string
  daysPerWeek: number
  isTemplate?: boolean
}

/**
 * Creates the program and its day rows together.
 *
 * The days are made up front rather than on demand, because a 4-day program with no days is
 * a confusing empty screen, and "add day 1, add day 2…" is four clicks of pure ceremony.
 */
export function useCreateProgram() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateProgramInput) => {
      const supabase = getSupabase()

      const { data: program, error } = await supabase
        .from('programs')
        .insert({
          gym_id: input.gymId,
          trainee_id: input.isTemplate ? null : input.traineeId,
          is_template: input.isTemplate ?? false,
          title: input.title,
          days_per_week: input.daysPerWeek,
          status: 'draft',
        })
        .select()
        .single<Program>()
      if (error) throw error

      const days = Array.from({ length: input.daysPerWeek }, (_, index) => ({
        program_id: program.id,
        day_index: index + 1,
      }))
      const { error: daysError } = await supabase.from('program_days').insert(days)
      if (daysError) throw daysError

      return program
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: programKeys.all }),
  })
}

export function useUpdateProgram(programId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (patch: Partial<Program>) => {
      const { error } = await getSupabase().from('programs').update(patch).eq('id', programId)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: programKeys.detail(programId) })
      void queryClient.invalidateQueries({ queryKey: programKeys.all })
    },
  })
}

export function useUpdateDay(programId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ dayId, patch }: { dayId: string; patch: Partial<ProgramDay> }) => {
      const { error } = await getSupabase().from('program_days').update(patch).eq('id', dayId)
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: programKeys.detail(programId) }),
  })
}

export function useAddExercises(programId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      dayId,
      exerciseIds,
      startPosition,
    }: {
      dayId: string
      exerciseIds: string[]
      startPosition: number
    }) => {
      const rows = exerciseIds.map((exerciseId, index) => ({
        day_id: dayId,
        exercise_id: exerciseId,
        position: startPosition + index,
        // Defaults a coach can live with if they change nothing: 3 x 8-12, 90s rest.
        sets: 3,
        reps_min: 8,
        reps_max: 12,
        rest_seconds: 90,
      }))
      const { error } = await getSupabase().from('program_exercises').insert(rows)
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: programKeys.detail(programId) }),
  })
}

export function useUpdateProgramExercise(programId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ProgramExercise> }) => {
      const { error } = await getSupabase().from('program_exercises').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: programKeys.detail(programId) }),
  })
}

export function useRemoveProgramExercise(programId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from('program_exercises').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: programKeys.detail(programId) }),
  })
}

/** Writes new positions for a whole day in one go, after a move. */
export function useReorderExercises(programId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ordered: Array<{ id: string; position: number }>) => {
      const supabase = getSupabase()
      await Promise.all(
        ordered.map(({ id, position }) =>
          supabase.from('program_exercises').update({ position }).eq('id', id),
        ),
      )
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: programKeys.detail(programId) }),
  })
}

export function useActivateProgram() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (programId: string) => {
      const { error } = await getSupabase().rpc('activate_program', { p_program_id: programId })
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: programKeys.all }),
  })
}

export interface DuplicateInput {
  programId: string
  traineeId?: string | null
  title?: string
  asTemplate?: boolean
}

export function useDuplicateProgram() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: DuplicateInput) => {
      const { data, error } = await getSupabase()
        .rpc('duplicate_program', {
          p_program_id: input.programId,
          p_trainee_id: input.traineeId ?? null,
          p_title: input.title ?? null,
          p_as_template: input.asTemplate ?? false,
        })
        .returns<string>()
      if (error) throw error
      return data as unknown as string
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: programKeys.all }),
  })
}

export function useDeleteProgram() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (programId: string) => {
      const { error } = await getSupabase().from('programs').delete().eq('id', programId)
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: programKeys.all }),
  })
}
