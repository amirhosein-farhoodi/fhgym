import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'

/**
 * `unconfigured` is a real state, not an error.
 *
 * Phase 0 shipped before the Supabase project existed, and the app still has to render.
 * Treating missing credentials as a first-class status means the landing page works and
 * the sign-in button can explain itself instead of throwing on click.
 */
export type AuthStatus = 'loading' | 'signed-in' | 'signed-out' | 'unconfigured'

export interface AuthContextValue {
  status: AuthStatus
  session: Session | null
  userId: string | null
}

export const AuthContext = createContext<AuthContextValue | null>(null)
