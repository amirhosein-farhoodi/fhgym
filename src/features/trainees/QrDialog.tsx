import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui'
import { GymAvatar } from '@/features/branding/GymAvatar'
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
  gymLogo,
  onClose,
}: {
  traineeName: string
  token: string
  gymName: string
  gymLogo?: string | null
  onClose: () => void
}) {
  const t = useT()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [copied, setCopied] = useState(false)

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-steel/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('trainees.qr.title')}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-sm rounded-special bg-surface p-6 shadow-raised">
        <h2 className="font-display text-heading-sm text-fg">{t('trainees.qr.title')}</h2>
        <p className="mt-1 text-body-sm font-semibold text-pine-deep">{traineeName}</p>

        {/*
          Pure white plate behind a charcoal code: scanners want maximum contrast, and cream
          behind the code costs a little reliability on older phone cameras.
        */}
        <div className="mt-5 rounded-card border border-line bg-paper p-5 shadow-card">
          <div className="flex justify-center">
            <QRCodeSVG value={url} size={200} level="M" marginSize={0} fgColor="#2b2f33" />
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 border-t border-line/70 pt-3">
            <GymAvatar name={gymName} logoPath={gymLogo} className="size-6" />
            <span className="text-caption font-semibold text-fg-muted">{gymName}</span>
          </div>
        </div>

        <p className="mt-5 flex items-start gap-2.5 rounded-card bg-copper-soft p-3 text-caption text-copper-deep">
          <TriangleAlert aria-hidden className="mt-px size-4 shrink-0" />
          {t('trainees.qr.oneTimeWarning')}
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <Button
            onClick={() => {
              void navigator.clipboard?.writeText(url).then(() => setCopied(true))
            }}
            variant="secondary"
          >
            {copied ? <Check aria-hidden className="text-pine" /> : <Copy aria-hidden />}
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
