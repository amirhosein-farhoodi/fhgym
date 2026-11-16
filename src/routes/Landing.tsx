import { useState } from 'react'
import { ArrowRight, ClipboardList, Dumbbell, LoaderCircle, QrCode, ScanLine, Whistle } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { LocaleSwitch } from '@/components/LocaleSwitch'
import { Wordmark } from '@/components/Wordmark'
import { signInWithGoogle } from '@/features/auth/api'
import { useAuth } from '@/features/auth/hooks'
import { useT } from '@/lib/i18n'
import type { TranslationKey } from '@/lib/i18n'

const FEATURES: Array<{ icon: typeof Dumbbell; title: TranslationKey; body: TranslationKey }> = [
  { icon: ClipboardList, title: 'landing.feature.programs.title', body: 'landing.feature.programs.body' },
  { icon: Dumbbell, title: 'landing.feature.library.title', body: 'landing.feature.library.body' },
  { icon: QrCode, title: 'landing.feature.qr.title', body: 'landing.feature.qr.body' },
]

/** Google's "G", drawn inline — lucide deliberately ships no brand marks. */
function GoogleG() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  )
}

/*
 * Cream hero with the full lockup, a features strip, then a hard break into the steel band
 * for the two doors — the one big dark surface in the app, which is what makes the cream
 * read as calm instead of washed out.
 */
export function Landing() {
  const t = useT()
  const { status } = useAuth()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const configured = status !== 'unconfigured'

  async function handleCoachSignIn() {
    setBusy(true)
    setFailed(false)
    try {
      await signInWithGoogle()
      // On success the browser is already navigating to Google; `busy` stays true so the
      // button does not flicker back to its idle label during the redirect.
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh bg-surface">
      <header className="mx-auto flex max-w-page items-center justify-between px-4 pt-5 sm:px-6">
        <Wordmark />
        <LocaleSwitch />
      </header>

      {/* ---------------------------------------------------------------- hero */}
      <section className="mx-auto grid max-w-page items-center gap-10 px-4 pt-12 pb-16 sm:px-6 md:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-24">
        <div>
          <p className="flex items-center gap-2 text-caption font-semibold tracking-wide text-copper-deep uppercase">
            <span aria-hidden className="h-px w-8 bg-copper" />
            {t('landing.eyebrow')}
          </p>

          <h1 className="mt-5 font-display text-display-xl text-fg [text-wrap:balance]">
            <span className="block">{t('landing.hero.line1')}</span>
            <span className="block text-pine">
              {t('landing.hero.line2')} {t('landing.hero.line3')}
            </span>
          </h1>

          <p className="mt-6 max-w-md text-subheading text-fg-muted">{t('app.tagline')}</p>

          <a
            href="#start"
            className="group mt-8 inline-flex items-center gap-2 text-body-sm font-semibold text-fg underline decoration-copper decoration-2 underline-offset-[6px] hover:decoration-pine"
          >
            {t('landing.door.coach.cta')}
            <ArrowRight aria-hidden className="icon-directional size-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
          </a>
        </div>

        {/* Logo on a plaster plate, framed like a sign on a concrete wall. */}
        <div className="relative">
          <div aria-hidden className="absolute -inset-3 -z-0 rotate-[-2deg] rounded-[28px] bg-sage/45" />
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-special border border-line bg-plaster shadow-raised">
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_1px_1px,var(--color-line-strong)_1px,transparent_0)] [background-size:18px_18px]"
            />
            <img
              src="/logo-full.png"
              alt="FH Gym"
              width={900}
              height={600}
              className="relative w-[88%] max-w-[520px]"
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ features */}
      <section className="mx-auto max-w-page px-4 pb-16 sm:px-6 lg:pb-24">
        <ul className="grid gap-4 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-card border border-line/70 bg-surface-card p-6 shadow-card">
              <span className="flex size-11 items-center justify-center rounded-[12px] bg-pine-soft text-pine-deep">
                <Icon aria-hidden className="size-5" strokeWidth={1.75} />
              </span>
              <h2 className="mt-4 text-body font-semibold text-fg">{t(title)}</h2>
              <p className="mt-1.5 text-body-sm text-fg-muted">{t(body)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* --------------------------------------------------------- the two doors */}
      <section id="start" className="relative overflow-hidden bg-surface-inverse text-on-inverse">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 end-[-10%] size-[520px] rounded-full bg-pine/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-48 start-[-10%] size-[420px] rounded-full bg-copper/15 blur-3xl"
        />

        <div className="relative mx-auto max-w-page px-4 py-section sm:px-6">
          <div className="grid gap-5 md:grid-cols-2">
            {/* Coach door — the primary path, so it is the cream card. */}
            <div className="flex flex-col gap-4 rounded-special bg-cream p-7 text-fg shadow-raised">
              <div className="flex items-center justify-between">
                <span className="flex size-12 items-center justify-center rounded-[14px] bg-steel text-sage">
                  <Whistle aria-hidden className="size-6" strokeWidth={1.75} />
                </span>
                <Badge tone="accent">{t('nav.dashboard')}</Badge>
              </div>
              <h2 className="font-display text-heading text-fg">{t('landing.door.coach.title')}</h2>
              <p className="text-body-sm text-fg-muted">{t('landing.door.coach.body')}</p>
              <div className="mt-auto pt-4">
                <Button
                  size="lg"
                  onClick={() => void handleCoachSignIn()}
                  disabled={!configured || busy}
                  className="ps-2"
                >
                  <span className="flex size-9 items-center justify-center rounded-full bg-paper">
                    {busy ?
                      <LoaderCircle aria-hidden className="size-[18px] animate-spin text-pine" />
                    : <GoogleG />}
                  </span>
                  {busy ? t('auth.signingIn') : t('landing.door.coach.cta')}
                </Button>
                {!configured && (
                  <p className="mt-3 text-caption text-fg-muted">{t('error.unconfigured.title')}</p>
                )}
                {failed && (
                  <p role="alert" className="mt-3 text-caption text-danger">
                    {t('error.generic.body')}
                  </p>
                )}
              </div>
            </div>

            {/* Trainee door — informational: trainees arrive by scanning, not by clicking here. */}
            <div className="flex flex-col gap-4 rounded-special border border-line-inverse bg-steel-soft/60 p-7">
              <div className="flex items-center justify-between">
                <span className="flex size-12 items-center justify-center rounded-[14px] bg-sage text-steel">
                  <QrCode aria-hidden className="size-6" strokeWidth={1.75} />
                </span>
                <span className="rounded-pill bg-sage/20 px-2.5 py-0.5 text-caption font-semibold text-sage">
                  {t('nav.today')}
                </span>
              </div>
              <h2 className="font-display text-heading text-on-inverse">{t('landing.door.trainee.title')}</h2>
              <p className="text-body-sm text-on-inverse-muted">{t('landing.door.trainee.body')}</p>
              <div className="mt-auto flex items-start gap-3 rounded-card border border-dashed border-sage/40 p-4 text-body-sm text-on-inverse-muted">
                <ScanLine aria-hidden className="mt-0.5 size-5 shrink-0 text-copper" />
                {t('landing.door.trainee.hint')}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-page items-center justify-between px-4 py-8 text-caption text-fg-muted sm:px-6">
        <span>{t('app.name')}</span>
        <img src="/logo-mark.png" alt="" className="h-6 w-auto opacity-70" />
      </footer>
    </div>
  )
}
