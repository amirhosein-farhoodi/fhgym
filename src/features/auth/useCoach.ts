import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import type { CoachContext, Gym, Profile } from '@/lib/db.types'
import { useAuth } from './hooks'

export const coachKeys = {
  context: (userId: string) => ['coach-context', userId] as const,
}

/**
 * The profile row and its gym in one query.
 *
 * Fetched together because every guarded route needs both answers at once — "is this a
 * coach" and "have they finished onboarding" — and splitting them produces a flash of the
 * onboarding screen for coaches who already have a gym.
 */
export function useCoachContext() {
  const { userId, status } = useAuth()

  return useQuery<CoachContext | null>({
    queryKey: coachKeys.context(userId ?? 'anonymous'),
    enabled: status === 'signed-in' && Boolean(userId),
    queryFn: async () => {
      const supabase = getSupabase()

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId!)
        .maybeSingle<Profile>()

      if (profileError) throw profileError
      // The profile is created by a database trigger on signup. A null here means the
      // trigger has not landed yet on a brand-new account — retry rather than treat the
      // user as "not a coach".
      if (!profile) return null

      if (!profile.gym_id) return { profile, gym: null }

      const { data: gym, error: gymError } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', profile.gym_id)
        .maybeSingle<Gym>()

      if (gymError) throw gymError
      return { profile, gym: gym ?? null }
    },
    retry: 3,
  })
}

export interface CreateGymInput {
  name: string
  locale: 'fa' | 'en'
  timezone: string
}

/** Calls the create_gym RPC, which makes gym creation and profile linking one transaction. */
export function useCreateGym() {
  const queryClient = useQueryClient()
  const { userId } = useAuth()

  return useMutation({
    mutationFn: async (input: CreateGymInput): Promise<Gym> => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .rpc('create_gym', {
          gym_name: input.name,
          gym_locale: input.locale,
          gym_timezone: input.timezone,
        })
        .single<Gym>()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: coachKeys.context(userId) })
    },
  })
}
