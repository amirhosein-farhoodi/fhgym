import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import type { Exercise } from '@/lib/db.types'

export const bookmarkKeys = {
  all: ['bookmarks'] as const,
  ids: ['bookmarks', 'ids'] as const,
}

/**
 * The coach's starred shortlist, with the full exercise rows joined.
 *
 * This is the default tab in the program builder's picker. Most coaches prescribe from a
 * personal repertoire of 40-60 movements out of 1500, so searching the whole catalog every
 * time is the single biggest time sink in building a program.
 */
export function useBookmarkedExercises() {
  return useQuery({
    queryKey: bookmarkKeys.all,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('gym_exercise_bookmarks')
        .select('exercise:exercises(*)')
        .returns<Array<{ exercise: Exercise }>>()
      if (error) throw error
      return (data ?? []).map((row) => row.exercise).filter(Boolean)
    },
  })
}

/** Just the ids, for rendering the star state on catalog cards without a second join. */
export function useBookmarkIds() {
  return useQuery({
    queryKey: bookmarkKeys.ids,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('gym_exercise_bookmarks')
        .select('exercise_id')
        .returns<Array<{ exercise_id: string }>>()
      if (error) throw error
      return new Set((data ?? []).map((row) => row.exercise_id))
    },
  })
}

export function useToggleBookmark(gymId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ exerciseId, on }: { exerciseId: string; on: boolean }) => {
      if (!gymId) throw new Error('no gym')
      const supabase = getSupabase()

      if (on) {
        const { error } = await supabase
          .from('gym_exercise_bookmarks')
          .insert({ gym_id: gymId, exercise_id: exerciseId })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('gym_exercise_bookmarks')
          .delete()
          .eq('gym_id', gymId)
          .eq('exercise_id', exerciseId)
        if (error) throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookmarkKeys.all })
      void queryClient.invalidateQueries({ queryKey: bookmarkKeys.ids })
    },
  })
}
