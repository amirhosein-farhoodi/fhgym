import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import type { Exercise } from '@/lib/db.types'

export interface CreateCustomExerciseInput {
  gymId: string
  name: string
  nameFa: string | null
  categories: string[]
  equipments: string[]
  gifUrl: string | null
  instructions: string[]
}

/**
 * A gym-owned exercise. `source: 'custom'` plus a gym_id is what the RLS policy checks —
 * it is visible to this gym only, and never leaks into another coach's catalog.
 */
export function useCreateCustomExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateCustomExerciseInput) => {
      const { data, error } = await getSupabase()
        .from('exercises')
        .insert({
          source: 'custom',
          gym_id: input.gymId,
          name: input.name,
          name_fa: input.nameFa,
          categories: input.categories,
          equipments: input.equipments,
          gif_url: input.gifUrl,
          instructions: input.instructions,
        })
        .select()
        .single<Exercise>()
      if (error) throw error
      return data
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['exercises'] }),
  })
}
