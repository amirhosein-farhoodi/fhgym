import { useEffect, useState, type ReactNode } from 'react'
import { Share, SquarePlus, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'

/*
 * "Add FH Gym to your home screen."
 *
 * Android/Chrome fires `beforeinstallprompt`, which we hold on to and replay from a real
 * button. iOS Safari has no such API — the only route is Share → Add to Home Screen — so
 * there we show the two steps instead. Hidden once installed or dismissed.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'fh.install-dismissed'

// Captured at module load: the event can fire before the trainee screen mounts.
let deferred: BeforeInstallPromptEvent | null = null
const waiting = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    waiting.forEach((fn) => fn())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    waiting.forEach((fn) => fn())
  })
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent)
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function InstallHint({
  className,
  appName,
  icon,
}: {
  className?: string
  /** The gym's name — the hint invites them to install the gym's app, not ours. */
  appName: string
  icon: ReactNode
}) {
  const t = useT()
  const [, rerender] = useState(0)
  const [dismissed, setDismissed] = useState(wasDismissed)

  useEffect(() => {
    const update = () => rerender((n) => n + 1)
    waiting.add(update)
    return () => {
      waiting.delete(update)
    }
  }, [])

  if (dismissed || isStandalone()) return null
  const ios = isIos()
  if (!deferred && !ios) return null

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 rounded-card border border-line/70 bg-surface-card p-4 pe-10 shadow-card',
        className,
      )}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-semibold">{t('install.title', { name: appName })}</p>
        {ios ?
          <p className="mt-1 text-caption text-fg-muted">
            {t('install.ios.step1')}{' '}
            <Share aria-hidden className="inline size-3.5 align-[-2px] text-pine-deep" />{' '}
            {t('install.ios.step2')}{' '}
            <SquarePlus aria-hidden className="inline size-3.5 align-[-2px] text-pine-deep" />
          </p>
        : <>
            <p className="mt-1 text-caption text-fg-muted">{t('install.body')}</p>
            <Button
              size="sm"
              className="mt-3"
              onClick={() => {
                const event = deferred
                if (!event) return
                void event.prompt()
                void event.userChoice.finally(() => {
                  deferred = null
                  rerender((n) => n + 1)
                })
              }}
            >
              <SquarePlus aria-hidden />
              {t('install.button')}
            </Button>
          </>
        }
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('install.dismiss')}
        className="absolute end-2 top-2 flex size-8 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-sunken hover:text-fg"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  )
}
