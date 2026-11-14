import type { ReactNode } from 'react'
import { useT } from '@/lib/i18n'

export function FullScreenSpinner() {
  const t = useT()
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface" role="status" aria-live="polite">
      <span className="text-body-sm text-muted-dark">{t('state.loading')}</span>
    </div>
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
      <div className="w-full max-w-prose">
        <h1 className="font-display text-heading-sm text-accent">{title}</h1>
        <p className="mt-3 whitespace-pre-line text-body text-muted-dark">{body}</p>
        {action && <div className="mt-8">{action}</div>}
      </div>
    </div>
  )
}
