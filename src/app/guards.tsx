import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks'
import { useCoachContext } from '@/features/auth/useCoach'
import { FullScreenMessage, FullScreenSpinner } from '@/components/Feedback'
import { useT } from '@/lib/i18n'

/** Signed in, or bounced to the landing page. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()
  const t = useT()

  if (status === 'loading') return <FullScreenSpinner />
  if (status === 'unconfigured') {
    return <FullScreenMessage title={t('error.unconfigured.title')} body={t('error.unconfigured.body')} />
  }
  if (status === 'signed-out') return <Navigate to="/" replace state={{ from: location.pathname }} />

  return <>{children}</>
}

/**
 * Signed in AND onboarded. A coach without a gym is sent to /onboarding — every coach
 * screen below this assumes a gym exists, so this is the one place that check belongs.
 */
export function RequireGym({ children }: { children: ReactNode }) {
  const { data, isPending, isError } = useCoachContext()
  const t = useT()

  if (isPending) return <FullScreenSpinner />
  if (isError) return <FullScreenMessage title={t('error.generic.title')} body={t('error.generic.body')} />
  if (!data?.gym) return <Navigate to="/onboarding" replace />

  return <>{children}</>
}

/** Keeps an already-onboarded coach from landing back on /onboarding or the marketing page. */
export function RedirectIfOnboarded({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const { data, isPending } = useCoachContext()

  if (status !== 'signed-in') return <>{children}</>
  if (isPending) return <FullScreenSpinner />
  if (data?.gym) return <Navigate to="/coach" replace />

  return <>{children}</>
}
