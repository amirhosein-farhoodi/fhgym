import { useInfiniteQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { getEnv } from '@/env'
import type { Exercise } from '@/lib/db.types'

export const PAGE_SIZE = 24

export interface ExerciseFilters {
  search: string
  categories: string[]
  equipments: string[]
}

export const exerciseKeys = {
  list: (filters: ExerciseFilters) => ['exercises', filters] as const,
}

export function useExercises(filters: ExerciseFilters) {
  return useInfiniteQuery({
    queryKey: exerciseKeys.list(filters),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const supabase = getSupabase()
      let query = supabase
        .from('exercises')
        .select('*')
        .order('name')
        .range(pageParam, pageParam + PAGE_SIZE - 1)

      const term = filters.search.trim()
      // ilike rather than full-text: it matches mid-word ("bench" inside "Barbell Bench
      // Press") which is what someone typing into a search box expects, and the trigram
      // index on name makes it fast.
      if (term) query = query.ilike('name', `%${term}%`)

      // overlaps = "has any of these", so picking Chest + Back widens rather than narrows.
      if (filters.categories.length > 0) query = query.overlaps('categories', filters.categories)
      if (filters.equipments.length > 0) query = query.overlaps('equipments', filters.equipments)

      const { data, error } = await query.returns<Exercise[]>()
      if (error) throw error
      return data ?? []
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
  })
}

/**
 * Prefers our mirrored copy and falls back to upstream.
 *
 * The mirror is a long background job, so during and after seeding some rows have gif_path
 * and some do not. Resolving it here means the UI never has to know that.
 */
export function exerciseImageUrl(exercise: Pick<Exercise, 'gif_path' | 'gif_url'>): string | null {
  if (exercise.gif_path) {
    return `${getEnv().VITE_SUPABASE_URL}/storage/v1/object/public/exercise-media/${exercise.gif_path}`
  }
  return exercise.gif_url
}
