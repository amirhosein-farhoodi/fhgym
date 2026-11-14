import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getEnv } from '@/env'

/*
 * Single client for the whole app, created on first use.
 *
 * `persistSession` matters more here than in a normal app: a trainee's session comes from
 * an anonymous sign-in after a QR scan, and losing it means asking them to find the coach
 * and rescan. It must survive a refresh and a browser restart.
 */
let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (client) return client

  const env = getEnv()
  client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'fh.auth',
    },
  })
  return client
}
