import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Display, Field, Input } from '@/components/ui'
import { useCreateGym } from '@/features/auth/useCoach'
import { useI18n } from '@/lib/i18n'

/** Guessed from the browser, editable. Wrong timezone means "today's workout" is wrong. */
function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tehran'
  } catch {
    return 'Asia/Tehran'
  }
}

export function Onboarding() {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const createGym = useCreateGym()

  const [name, setName] = useState('')
  const [timezone, setTimezone] = useState(detectTimezone)
  const [touched, setTouched] = useState(false)

  const trimmed = name.trim()
  const nameError =
    !touched ? undefined
    : trimmed.length < 2 ? t('onboarding.gymName.tooShort')
    : trimmed.length > 80 ? t('onboarding.gymName.tooLong')
    : undefined

  const canSubmit = trimmed.length >= 2 && trimmed.length <= 80 && !createGym.isPending

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setTouched(true)
    if (!canSubmit) return

    createGym.mutate(
      { name: trimmed, locale, timezone },
      { onSuccess: () => void navigate('/coach', { replace: true }) },
    )
  }

  return (
    <main className="min-h-dvh bg-surface px-6 py-16">
      <div className="mx-auto w-full max-w-xl">
        <Display size="md" as="h1" className="text-accent">
          {t('onboarding.title')}
        </Display>
        <p className="mt-4 text-body text-muted-dark">{t('onboarding.subtitle')}</p>

        <form className="mt-10 flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
          <Field label={t('onboarding.gymName.label')} error={nameError}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder={t('onboarding.gymName.placeholder')}
                autoFocus
                maxLength={80}
              />
            )}
          </Field>

          <Field label={t('onboarding.timezone.label')} hint={t('onboarding.timezone.hint')}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                dir="ltr"
              />
            )}
          </Field>

          {createGym.isError && (
            <p role="alert" className="text-body-sm text-danger">
              {t('onboarding.failed')}
            </p>
          )}

          <div>
            <Button type="submit" disabled={!canSubmit}>
              {t('onboarding.submit')}
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
