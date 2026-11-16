import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import type { Exercise } from '@/lib/db.types'

/** Matches the bucket's own limit (migration 0003), so the server never has to reject. */
export const MAX_MEDIA_BYTES = 10 * 1024 * 1024
export const ACCEPTED_MEDIA = ['image/gif', 'image/png', 'image/jpeg', 'image/webp'] as const

export type MediaProblem = 'tooBig' | 'badType'

export function checkMedia(file: File): MediaProblem | null {
  if (!(ACCEPTED_MEDIA as readonly string[]).includes(file.type)) return 'badType'
  if (file.size > MAX_MEDIA_BYTES) return 'tooBig'
  return null
}

/*
 * Still photos are downscaled before upload: a 4000px phone photo is 5 MB a trainee would
 * download and cache for a thumbnail that renders at 128px. 1280px WebP is ~100–250 KB and
 * still sharp full-screen. GIFs are uploaded untouched — a canvas round-trip would keep only
 * the first frame and kill the animation.
 */
const MAX_EDGE = 1280

async function shrinkStill(file: File): Promise<Blob> {
  if (file.type === 'image/gif') return file
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size < 600 * 1024) return file

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85))
  return blob && blob.size < file.size ? blob : file
}

/** Uploads into gyms/<gymId>/ — the only folder the storage policy lets a coach write. */
export async function uploadExerciseMedia(gymId: string, file: File): Promise<string> {
  const body = await shrinkStill(file)
  const type = body.type || file.type
  const ext = type === 'image/gif' ? 'gif' : type === 'image/webp' ? 'webp' : type === 'image/png' ? 'png' : 'jpg'
  const path = `gyms/${gymId}/${crypto.randomUUID()}.${ext}`

  const { error } = await getSupabase()
    .storage.from('exercise-media')
    // Paths are random and never overwritten, so the file can be cached for a year —
    // which is what lets the trainee's installed app show it offline.
    .upload(path, body, { contentType: type, cacheControl: '31536000', upsert: false })
  if (error) throw error
  return path
}

export interface CreateCustomExerciseInput {
  gymId: string
  name: string
  nameFa: string | null
  categories: string[]
  equipments: string[]
  /** A file to upload; wins over gifUrl when both are given. */
  file: File | null
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
      const gifPath = input.file ? await uploadExerciseMedia(input.gymId, input.file) : null

      const { data, error } = await getSupabase()
        .from('exercises')
        .insert({
          source: 'custom',
          gym_id: input.gymId,
          name: input.name,
          name_fa: input.nameFa,
          categories: input.categories,
          equipments: input.equipments,
          gif_path: gifPath,
          gif_url: gifPath ? null : input.gifUrl,
          instructions: input.instructions,
        })
        .select()
        .single<Exercise>()
      if (error) {
        // Do not leave an orphaned file behind if the row insert failed.
        if (gifPath) void getSupabase().storage.from('exercise-media').remove([gifPath])
        throw error
      }
      return data
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['exercises'] }),
  })
}
