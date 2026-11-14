import { useState } from 'react'
import { Badge, Button, Card, Display } from '@/components/ui'
import { LocaleSwitch } from '@/components/LocaleSwitch'
import { Wordmark } from '@/components/Wordmark'
import { signInWithGoogle } from '@/features/auth/api'
import { useAuth } from '@/features/auth/hooks'
import { useT } from '@/lib/i18n'

/*
 * The section rhythm is the layout: plum hero, then a hard break to white for the two doors.
 * That contrast is doing the work the reference asks of it, and it also happens to mirror
 * the product — the trainee's side is loud and dark, the coach's tools are quiet and light.
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
      <header className="mx-auto flex max-w-page items-start justify-between px-6 pt-6">
        <Wordmark />
        <LocaleSwitch />
      </header>

      {/* ---------------------------------------------------------------- hero */}
      <section className="mx-auto max-w-page px-6 pt-16 pb-24">
        <Display size="xl" as="h1" className="text-accent">
          {t('landing.hero.line1')}
        </Display>
        {/* The connector word breaks the display rhythm — UI face, not the poster face. */}
        <p className="font-ui text-heading font-semibold text-on-dark">
          {t('landing.hero.line2')}
        </p>
        <Display size="xl" as="p" className="text-accent">
          {t('landing.hero.line3')}
        </Display>

        <p className="mt-10 max-w-prose text-body text-muted-dark">{t('app.tagline')}</p>
      </section>

      {/* --------------------------------------------------------- the two doors */}
      <section className="bg-surface-light">
        <div className="mx-auto max-w-page px-6 py-section">
          <div className="grid gap-6 md:grid-cols-2">
            <Card surface="light" className="flex flex-col gap-4">
              <Badge tone="accent" className="self-start">
                {t('nav.dashboard')}
              </Badge>
              <h2 className="font-display text-heading-sm text-heading-light">
                {t('landing.door.coach.title')}
              </h2>
              <p className="text-body-sm text-on-light">{t('landing.door.coach.body')}</p>
              <div className="mt-auto pt-4">
                <Button
                  surface="light"
                  onClick={() => void handleCoachSignIn()}
                  disabled={!configured || busy}
                >
                  {busy ? t('auth.signingIn') : t('landing.door.coach.cta')}
                </Button>
                {!configured && (
                  <p className="mt-3 text-caption text-muted-light">
                    {t('error.unconfigured.title')}
                  </p>
                )}
                {failed && (
                  <p role="alert" className="mt-3 text-caption text-danger">
                    {t('error.generic.body')}
                  </p>
                )}
              </div>
            </Card>

            <Card surface="light" className="flex flex-col gap-4">
              <Badge tone="done" className="self-start">
                {t('nav.today')}
              </Badge>
              <h2 className="font-display text-heading-sm text-heading-light">
                {t('landing.door.trainee.title')}
              </h2>
              <p className="text-body-sm text-on-light">{t('landing.door.trainee.body')}</p>
              <div className="mt-auto pt-4">
                <Button surface="light" variant="secondary" disabled>
                  {t('landing.door.trainee.cta')}
                </Button>
              </div>
            </Card>
          </div>

          {/*
            The trainee CTA stays disabled on purpose — the QR claim flow is Phase 2.
            A button that navigates nowhere is worse than one that says "not yet".
          */}
          <p className="mt-8 text-caption text-muted-light">
            Phase 1 — coach sign-in works. Trainee QR codes arrive in Phase 2.
          </p>
        </div>
      </section>
    </div>
  )
}
