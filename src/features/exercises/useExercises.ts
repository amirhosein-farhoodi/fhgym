import { useInfiniteQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { getEnv } from '@/env'
import type { Exercise } from '@/lib/db.types'
import { MEDIA_FALLBACK } from '@/lib/exercise-media-fallback'

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
 * Where an exercise's animation lives.
 *
 * System exercises always resolve to our own Storage mirror, never to upstream: the
 * exercisedb media CDN has dropped files (it 404s on 176 of them), and an image host we do
 * not control is also one more thing that breaks offline caching. Mirrored files are named
 * after the exercisedb id, so the path can be derived even on rows whose gif_path was
 * never backfilled. The 176 with no file anywhere borrow their base movement's animation.
 *
 * Custom exercises keep whatever URL the coach pasted.
 */
export function exerciseImageUrl(
  exercise: Pick<Exercise, 'gif_path' | 'gif_url'> & Partial<Pick<Exercise, 'source' | 'external_id'>>,
): string | null {
  const base = `${getEnv().VITE_SUPABASE_URL}/storage/v1/object/public/exercise-media`

  if (exercise.source === 'system' && exercise.external_id) {
    const id = MEDIA_FALLBACK[exercise.external_id] ?? exercise.external_id
    return `${base}/system/${id}.gif`
  }
  if (exercise.gif_path) return `${base}/${exercise.gif_path}`
  // Never fall back to the dead upstream CDN; a placeholder beats a broken image.
  if (exercise.gif_url?.includes('static.exercisedb.dev')) return null
  return exercise.gif_url
}

/**
 * crossOrigin for an exercise <img>. Our Storage sends CORS headers, so requesting it in
 * CORS mode lets the service worker cache real responses. Third-party URLs a coach pasted
 * may not send CORS headers, and crossOrigin would make those fail to load — leave them be.
 */
export function mediaCrossOrigin(src: string | null): 'anonymous' | undefined {
  return src?.includes('/storage/v1/object/public/') ? 'anonymous' : undefined
}
