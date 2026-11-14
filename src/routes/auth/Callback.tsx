import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { FullScreenMessage, FullScreenSpinner } from '@/components/Feedback'
import { useAuth } from '@/features/auth/hooks'
import { useT } from '@/lib/i18n'

/**
 * Where Google drops the coach after consent.
 *
 * The Supabase client parses the URL fragment itself (detectSessionInUrl), so this route
 * only waits for AuthProvider's listener to report a session and then routes on. The grace
 * period matters: bailing the instant status is 'signed-out' would fail every time, because
 * that is the status for the few hundred milliseconds before the token is exchanged.
 */
const GRACE_MS = 6000

export function AuthCallback() {
  const { status } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (status === 'signed-in') {
      // replace: the callback URL carries tokens and must not sit in history.
      void navigate('/coach', { replace: true })
    }
  }, [status, navigate])

  useEffect(() => {
    if (status === 'signed-in') return
    const timer = setTimeout(() => setTimedOut(true), GRACE_MS)
    return () => clearTimeout(timer)
  }, [status])

  if (timedOut && status !== 'signed-in') {
    return (
      <FullScreenMessage
        title={t('auth.callback.failed.title')}
        body={t('auth.callback.failed.body')}
        action={
          <Link to="/">
            <Button>{t('action.retry')}</Button>
          </Link>
        }
      />
    )
  }

  return <FullScreenSpinner />
}
