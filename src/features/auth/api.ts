import { getSupabase } from '@/lib/supabase'

/**
 * Google OAuth for coaches.
 *
 * `redirectTo` must be in the Supabase dashboard's Redirect URLs allow-list or the
 * provider bounces the user to the Site URL instead — the single most common way this
 * flow "works locally and breaks in production".
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        // Ask for a refresh token and let the coach pick an account rather than
        // silently reusing whichever Google session the browser already has.
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
