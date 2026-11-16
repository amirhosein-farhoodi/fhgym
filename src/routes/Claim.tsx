import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui'
import { FullScreenMessage, FullScreenSpinner } from '@/components/Feedback'
import { claimTrainee, rememberTrainee } from '@/features/trainees/claim'
import { useT } from '@/lib/i18n'

/**
 * Where the QR code points. The trainee never sees this page for more than a moment —
 * it signs them in and forwards to their workout.
 */
export function Claim() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const t = useT()
  const [failed, setFailed] = useState(false)
  // StrictMode double-invokes effects in dev; claiming twice is harmless but the guard
  // keeps the anonymous-user count honest.
  const started = useRef(false)

  useEffect(() => {
    if (!token || started.current) return
    started.current = true

    claimTrainee(token)
      .then((result) => {
        rememberTrainee(result)
        void navigate('/me', { replace: true })
      })
      .catch(() => setFailed(true))
  }, [token, navigate])

  if (failed) {
    return (
      <FullScreenMessage
        title={t('claim.failed.title')}
        body={t('claim.failed.body')}
        action={
          <Link to="/">
            <Button>{t('action.back')}</Button>
          </Link>
        }
      />
    )
  }

  return <FullScreenSpinner branded={false} />
}
