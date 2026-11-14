import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Button } from '@/components/ui'
import { LocaleSwitch } from '@/components/LocaleSwitch'
import { Wordmark } from '@/components/Wordmark'
import { signOut } from '@/features/auth/api'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'
import type { TranslationKey } from '@/lib/i18n'

const NAV: Array<{ to: string; key: TranslationKey; end?: boolean }> = [
  { to: '/coach', key: 'nav.dashboard', end: true },
  { to: '/coach/trainees', key: 'nav.trainees' },
  { to: '/coach/programs', key: 'nav.programs' },
  { to: '/coach/exercises', key: 'nav.exercises' },
]

export function CoachLayout({ children }: { children: ReactNode }) {
  const t = useT()

  return (
    <div className="min-h-dvh bg-surface">
      <header className="border-b border-line-dark">
        <div className="mx-auto flex max-w-page flex-wrap items-center gap-6 px-6 py-4">
          <Wordmark />

          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end ?? false}
                className={({ isActive }) =>
                  cn(
                    'rounded-pill px-4 py-2 text-body-sm transition-colors',
                    isActive ? 'bg-accent text-plum' : 'text-on-dark/70 hover:text-on-dark',
                  )
                }
              >
                {t(item.key)}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3 ms-auto">
            <LocaleSwitch />
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              {t('auth.signOut')}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-page px-6 py-10">{children}</main>
    </div>
  )
}
