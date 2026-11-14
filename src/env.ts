import { z } from 'zod'

/*
 * Env is validated lazily, not at module load.
 *
 * Phase 0 has no Supabase project yet, and an app that refuses to boot without credentials
 * would block all the UI work that does not need them. So the schema is enforced at the
 * point of first use (see lib/supabase.ts) with an error that says exactly what is missing.
 */
const envSchema = z.object({
  VITE_SUPABASE_URL: z.url({ message: 'VITE_SUPABASE_URL must be a full URL' }),
  VITE_SUPABASE_ANON_KEY: z.string().min(20, 'VITE_SUPABASE_ANON_KEY looks wrong or empty'),
})

export type Env = z.infer<typeof envSchema>

let cached: Env | null = null

export function getEnv(): Env {
  if (cached) return cached

  const parsed = envSchema.safeParse(import.meta.env)
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(
      `Supabase is not configured.\n${missing}\n\nCopy .env.example to .env.local and fill it in.`,
    )
  }

  cached = parsed.data
  return cached
}

/** True when the app can talk to Supabase. Lets the UI degrade instead of crashing. */
export function isSupabaseConfigured(): boolean {
  return envSchema.safeParse(import.meta.env).success
}
