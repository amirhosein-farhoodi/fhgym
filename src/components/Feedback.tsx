import type { ReactNode } from 'react'
import { AlertTriangle, LoaderCircle } from 'lucide-react'
import { useT } from '@/lib/i18n'

/** `branded={false}` on trainee screens, which belong to the gym, not to us. */
export function FullScreenSpinner({ branded = true }: { branded?: boolean }) {
  const t = useT()
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface"
      role="status"
      aria-live="polite"
    >
      {branded && <img src="/logo-mark.png" alt="" className="h-10 w-auto opacity-90" />}
      <span className="flex items-center gap-2 text-body-sm text-fg-muted">
        <LoaderCircle aria-hidden className="size-4 animate-spin text-pine" />
        {t('state.loading')}
      </span>
    </div>
  )
}

/** Inline loading line for sections inside a page. */
export function InlineSpinner({ className }: { className?: string }) {
  const t = useT()
  return (
    <p role="status" className={`flex items-center gap-2 text-body-sm text-fg-muted ${className ?? ''}`}>
      <LoaderCircle aria-hidden className="size-4 animate-spin text-pine" />
      {t('state.loading')}
    </p>
  )
}

export function FullScreenMessage({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-6">
      <div className="w-full max-w-md rounded-special border border-line/70 bg-surface-card p-8 shadow-raised">
        <span className="flex size-12 items-center justify-center rounded-full bg-copper-soft text-copper-deep">
          <AlertTriangle aria-hidden className="size-5" />
        </span>
        <h1 className="mt-5 font-display text-heading-sm text-fg">{title}</h1>
        <p className="mt-3 whitespace-pre-line text-body-sm text-fg-muted">{body}</p>
        {action && <div className="mt-8">{action}</div>}
      </div>
    </div>
  )
}
