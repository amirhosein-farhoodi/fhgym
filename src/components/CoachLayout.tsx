import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ClipboardList, Dumbbell, LayoutDashboard, LogOut, Store, Users, type LucideIcon } from 'lucide-react'
import { LocaleSwitch } from '@/components/LocaleSwitch'
import { Wordmark } from '@/components/Wordmark'
import { signOut } from '@/features/auth/api'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'
import type { TranslationKey } from '@/lib/i18n'

const NAV: Array<{ to: string; key: TranslationKey; icon: LucideIcon; end?: boolean }> = [
  { to: '/coach', key: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/coach/trainees', key: 'nav.trainees', icon: Users },
  { to: '/coach/programs', key: 'nav.programs', icon: ClipboardList },
  { to: '/coach/exercises', key: 'nav.exercises', icon: Dumbbell },
  { to: '/coach/settings', key: 'nav.settings', icon: Store },
]

export function CoachLayout({ children }: { children: ReactNode }) {
  const t = useT()

  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-page items-center gap-6 px-4 sm:px-6">
          <Link to="/coach" className="rounded-[10px]">
            <Wordmark />
          </Link>

          {/* Desktop nav. On phones the same items live in the bottom tab bar. */}
          <nav className="hidden items-center gap-1 md:flex" aria-label={t('nav.dashboard')}>
            {NAV.map(({ to, key, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end ?? false}
                className={({ isActive }) =>
                  cn(
                    'flex h-10 items-center gap-2 rounded-pill px-4 text-body-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-steel text-cream shadow-sm'
                      : 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
                  )
                }
              >
                <Icon aria-hidden className="size-4" strokeWidth={2} />
                {t(key)}
              </NavLink>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-2">
            <LocaleSwitch />
            <button
              type="button"
              onClick={() => void signOut()}
              aria-label={t('auth.signOut')}
              title={t('auth.signOut')}
              className="flex size-10 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg"
            >
              <LogOut aria-hidden className="icon-directional size-[18px]" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-page px-4 pt-8 pb-28 sm:px-6 md:pt-10 md:pb-16">{children}</main>

      {/* Phone tab bar — thumbs reach the bottom, not the header. */}
      <nav
        aria-label={t('nav.dashboard')}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-cream/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map(({ to, key, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end ?? false}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[0.7rem] font-semibold transition-colors',
                  isActive ? 'text-fg' : 'text-fg-subtle',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-7 w-11 items-center justify-center rounded-pill transition-colors',
                      isActive && 'bg-steel text-sage',
                    )}
                  >
                    <Icon aria-hidden className="size-[18px]" strokeWidth={isActive ? 2.25 : 1.75} />
                  </span>
                  {t(key)}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
