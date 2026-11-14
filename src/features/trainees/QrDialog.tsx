import { useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui'
import { traineeJoinUrl } from './useTrainees'
import { useT } from '@/lib/i18n'

/**
 * Shows the QR once, right after creation or rotation.
 *
 * The token is never stored in readable form, so closing this dialog loses it permanently —
 * the only recovery is rotating, which issues a new code and kicks every device. The warning
 * text is not decoration; it is the whole reason this is a modal and not a toast.
 */
export function QrDialog({
  traineeName,
  token,
  gymName,
  onClose,
}: {
  traineeName: string
  token: string
  gymName: string
  onClose: () => void
}) {
  const t = useT()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const url = traineeJoinUrl(token)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('trainees.qr.title')}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-sm rounded-special bg-surface-card p-6">
        <h2 className="font-display text-heading-sm text-accent">{t('trainees.qr.title')}</h2>
        <p className="mt-2 text-body-sm text-on-dark">{traineeName}</p>

        {/*
          White plate behind the code: QR scanners need light-on-dark contrast the right way
          round, and a lavender-on-plum QR simply does not scan.
        */}
        <div className="mt-5 flex justify-center rounded-card bg-white p-5">
          <QRCodeSVG value={url} size={200} level="M" marginSize={0} />
        </div>

        <p className="mt-4 text-center text-caption text-muted-dark">{gymName}</p>

        <p className="mt-5 rounded-card bg-status-due/15 p-3 text-caption text-status-due">
          {t('trainees.qr.oneTimeWarning')}
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={() => void navigator.clipboard?.writeText(url)} variant="secondary">
            {t('trainees.qr.copyLink')}
          </Button>
          <Button ref={closeRef} onClick={onClose}>
            {t('action.done')}
          </Button>
        </div>
      </div>
    </div>
  )
}
