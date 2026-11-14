import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import type { Trainee } from '@/lib/db.types'

export const traineeKeys = {
  all: ['trainees'] as const,
  devices: (traineeId: string) => ['trainee-devices', traineeId] as const,
}

export function useTrainees() {
  return useQuery({
    queryKey: traineeKeys.all,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('trainees')
        .select('*')
        .order('created_at', { ascending: false })
        .returns<Trainee[]>()
      if (error) throw error
      return data ?? []
    },
  })
}

export interface CreateTraineeInput {
  full_name: string
  phone?: string | null
  goal?: string | null
}

/**
 * Returns the plaintext access token — the only time it is ever available.
 *
 * It is not stored anywhere in readable form, so if the coach closes the QR dialog without
 * showing or printing it, the only way back is rotating (which issues a new one and kills
 * the old). The UI has to make that consequence obvious.
 */
export function useCreateTrainee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTraineeInput) => {
      const { data, error } = await getSupabase()
        .rpc('create_trainee', {
          p_full_name: input.full_name,
          p_phone: input.phone ?? null,
          p_goal: input.goal ?? null,
        })
        .single<{ trainee_id: string; access_token: string }>()
      if (error) throw error
      return data
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: traineeKeys.all }),
  })
}

/** New QR, old one dead, every signed-in device kicked. */
export function useRotateToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (traineeId: string) => {
      const { data, error } = await getSupabase()
        .rpc('rotate_trainee_token', { p_trainee_id: traineeId })
        .returns<string>()
      if (error) throw error
      return data as unknown as string
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: traineeKeys.all }),
  })
}

/** The kick switch. Access dies immediately on every device. */
export function useRevokeTrainee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (traineeId: string) => {
      const { error } = await getSupabase().rpc('revoke_trainee', { p_trainee_id: traineeId })
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: traineeKeys.all }),
  })
}

/** Un-revoke without changing the QR, for an accidental kick. */
export function useReactivateTrainee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (traineeId: string) => {
      const { error } = await getSupabase()
        .from('trainees')
        .update({ revoked_at: null, status: 'active' })
        .eq('id', traineeId)
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: traineeKeys.all }),
  })
}

/** The URL encoded into the QR code. */
export function traineeJoinUrl(token: string): string {
  return `${window.location.origin}/j/${token}`
}
