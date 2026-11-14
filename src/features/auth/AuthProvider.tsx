import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured } from '@/env'
import { getSupabase } from '@/lib/supabase'
import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured()
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>(configured ? 'loading' : 'unconfigured')

  useEffect(() => {
    if (!configured) return

    const supabase = getSupabase()
    let active = true

    // getSession() reads the persisted token; onAuthStateChange covers sign-in, sign-out,
    // token refresh and the OAuth redirect landing. Both are needed — the listener alone
    // misses the already-signed-in-on-load case.
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setStatus(data.session ? 'signed-in' : 'signed-out')
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setStatus(nextSession ? 'signed-in' : 'signed-out')
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [configured])

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, userId: session?.user.id ?? null }),
    [status, session],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
