import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getEnv } from '@/env'
import { getSupabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks'
import { coachKeys } from '@/features/auth/useCoach'
import { recallTrainee } from '@/features/trainees/claim'
import { ACCEPTED_MEDIA, MAX_MEDIA_BYTES } from '@/features/exercises/useCustomExercise'
import type { Gym, GymBrand, Profile } from '@/lib/db.types'

/*
 * Gym branding: the trainee app wears the gym's logo, name and coach, not ours.
 *
 * Logos live in the public exercise-media bucket under gyms/<gym_id>/brand/, the folder the
 * existing storage policy already lets a coach write. Each upload gets a fresh random name,
 * so it can be cached for a year (and offline) without ever serving a stale logo.
 */

export const BRAND_BUCKET = 'exercise-media'

export function publicMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null
  // Full URLs (Google avatars) and local previews (blob:/data:) pass straight through.
  if (/^(https?:|blob:|data:)/.test(path)) return path
  return `${getEnv().VITE_SUPABASE_URL}/storage/v1/object/public/${BRAND_BUCKET}/${path}`
}

/** Up to two initials. Persian letters get a zero-width non-joiner so they do not fuse. */
export function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters = words.slice(0, 2).map((w) => [...w][0] ?? '')
  const persian = letters.some((l) => /[؀-ۿ]/.test(l))
  return persian ? letters.join('‌') : letters.join('').toUpperCase()
}

// ------------------------------------------------------------ image prep

async function loadBitmap(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file)
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))), type, quality),
  )
}

/**
 * Logo → a square 512px PNG on white with a safe margin.
 *
 * One file serves every place the logo appears: the trainee header, the QR card, and the
 * home-screen app icon — which Android crops to a circle or squircle, so the logo must sit
 * inside the middle ~80% on an opaque background.
 */
export async function prepareLogo(file: File): Promise<Blob> {
  const bitmap = await loadBitmap(file)
  const size = 512
  const margin = size * 0.14
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  const box = size - margin * 2
  const scale = Math.min(box / bitmap.width, box / bitmap.height)
  const w = bitmap.width * scale
  const h = bitmap.height * scale
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h)
  bitmap.close()
  return canvasToBlob(canvas, 'image/png')
}

/** Coach photo → a 400px square, centre-cropped, as JPEG. */
export async function prepareAvatar(file: File): Promise<Blob> {
  const bitmap = await loadBitmap(file)
  const size = 400
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close()
  return canvasToBlob(canvas, 'image/jpeg', 0.86)
}

export function checkBrandImage(file: File): 'badType' | 'tooBig' | null {
  if (!(ACCEPTED_MEDIA as readonly string[]).includes(file.type)) return 'badType'
  if (file.size > MAX_MEDIA_BYTES) return 'tooBig'
  return null
}

export async function uploadBrandImage(gymId: string, kind: 'logo' | 'coach', file: File): Promise<string> {
  const blob = kind === 'logo' ? await prepareLogo(file) : await prepareAvatar(file)
  const ext = kind === 'logo' ? 'png' : 'jpg'
  const path = `gyms/${gymId}/brand/${kind}-${crypto.randomUUID()}.${ext}`
  const { error } = await getSupabase()
    .storage.from(BRAND_BUCKET)
    .upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false })
  if (error) throw error
  return path
}

/** A monogram tile as a PNG data URL — the home-screen icon for gyms without a logo. */
export function monogramIcon(name: string, size = 180): string {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = '#2f655c'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = '#f1e8d7'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `700 ${Math.round(size * 0.38)}px Vazirmatn, Inter, system-ui, sans-serif`
  ctx.fillText(monogram(name), size / 2, size / 2 + size * 0.02)
  return canvas.toDataURL('image/png')
}

// ----------------------------------------------------------- trainee side

/**
 * The gym the trainee belongs to. Persisted with the rest of the trainee cache, so the
 * installed app shows the gym's branding offline too. Before migration 0007 is applied the
 * RPC does not exist; the gym name from the QR claim keeps the screen correct anyway.
 */
export function useTraineeBrand() {
  const claimed = recallTrainee()
  const fallback: GymBrand = {
    gym_id: null,
    gym_name: claimed?.gym_name ?? '',
    logo_path: null,
    coach_name: null,
    coach_title: null,
    coach_avatar_url: null,
  }

  return useQuery({
    queryKey: ['trainee', 'brand'],
    queryFn: async (): Promise<GymBrand> => {
      const { data, error } = await getSupabase().rpc('trainee_brand').maybeSingle<GymBrand>()
      // Function not deployed yet (migration 0007 pending): degrade to the claimed gym name.
      if (error && (error.code === 'PGRST202' || error.code === '42883')) return fallback
      // Anything else (flaky gym wifi) is a real error, so the persisted brand is kept.
      if (error) throw error
      return data ?? fallback
    },
    placeholderData: fallback,
    staleTime: 10 * 60_000,
  })
}

// ------------------------------------------------------------- coach side

export function useUpdateGym() {
  const queryClient = useQueryClient()
  const { userId } = useAuth()
  return useMutation({
    mutationFn: async ({ gymId, patch }: { gymId: string; patch: Partial<Pick<Gym, 'name' | 'logo_path'>> }) => {
      const { error } = await getSupabase().from('gyms').update(patch).eq('id', gymId)
      if (error) throw error
    },
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: coachKeys.context(userId) })
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { userId } = useAuth()
  return useMutation({
    mutationFn: async (patch: Partial<Pick<Profile, 'display_name' | 'title' | 'avatar_url'>>) => {
      if (!userId) throw new Error('not signed in')
      const { error } = await getSupabase().from('profiles').update(patch).eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: coachKeys.context(userId) })
    },
  })
}
