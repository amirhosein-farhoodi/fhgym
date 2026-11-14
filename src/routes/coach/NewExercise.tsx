import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Display, Field, Input } from '@/components/ui'
import { CoachLayout } from '@/components/CoachLayout'
import { useCoachContext } from '@/features/auth/useCoach'
import { useCreateCustomExercise } from '@/features/exercises/useCustomExercise'
import { CATEGORIES } from '@/lib/exercise-taxonomy'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'

/**
 * A coach's own movement — the machine their gym has that the global catalog does not,
 * or a cue they prescribe by a name their trainees recognise.
 *
 * Media is a URL rather than an upload in v1: most coaches already have the clip on their
 * phone or on YouTube, and a URL field works today where an upload pipeline is another
 * moving part to get wrong.
 */
export function NewExercise() {
  const t = useT()
  const navigate = useNavigate()
  const { data: coach } = useCoachContext()
  const create = useCreateCustomExercise()

  const [name, setName] = useState('')
  const [nameFa, setNameFa] = useState('')
  const [equipment, setEquipment] = useState('')
  const [gifUrl, setGifUrl] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [instructions, setInstructions] = useState('')

  const trimmed = name.trim()
  const canSubmit = trimmed.length >= 2 && categories.length > 0 && !create.isPending

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit || !coach?.gym) return

    create.mutate(
      {
        gymId: coach.gym.id,
        name: trimmed,
        nameFa: nameFa.trim() || null,
        categories,
        equipments: equipment.trim() ? [equipment.trim().toLowerCase()] : [],
        gifUrl: gifUrl.trim() || null,
        // One step per line — the same shape the seeded catalog uses, so both render alike.
        instructions: instructions
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      },
      { onSuccess: () => void navigate('/coach/exercises') },
    )
  }

  return (
    <CoachLayout>
      <Display size="sm" as="h1" className="text-accent">
        {t('exercises.custom.title')}
      </Display>
      <p className="mt-3 max-w-prose text-body-sm text-muted-dark">{t('exercises.custom.hint')}</p>

      <Card className="mt-8 max-w-2xl">
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <Field label={t('exercises.custom.name')}>
            {({ id }) => (
              <Input
                id={id}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Reverse Pec Deck"
                maxLength={160}
                autoFocus
              />
            )}
          </Field>

          <Field label={t('exercises.custom.nameFa')}>
            {({ id }) => (
              <Input
                id={id}
                value={nameFa}
                onChange={(event) => setNameFa(event.target.value)}
                placeholder="نشر خم دستگاه"
                dir="rtl"
              />
            )}
          </Field>

          <div className="flex flex-col gap-2">
            <span className="text-body-sm font-medium">{t('exercises.custom.categories')}</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={categories.includes(category)}
                  onClick={() =>
                    setCategories((prev) =>
                      prev.includes(category)
                        ? prev.filter((c) => c !== category)
                        : [...prev, category],
                    )
                  }
                  className={cn(
                    'rounded-pill px-3.5 py-1.5 text-caption capitalize transition-colors',
                    categories.includes(category)
                      ? 'bg-accent text-plum'
                      : 'bg-white/8 text-on-dark/70',
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <Field label={t('exercises.custom.equipment')}>
            {({ id }) => (
              <Input
                id={id}
                value={equipment}
                onChange={(event) => setEquipment(event.target.value)}
                placeholder="machine"
              />
            )}
          </Field>

          <Field label={t('exercises.custom.media')} hint={t('exercises.custom.mediaHint')}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                value={gifUrl}
                onChange={(event) => setGifUrl(event.target.value)}
                dir="ltr"
                placeholder="https://…"
              />
            )}
          </Field>

          <Field label={t('exercises.custom.instructions')} hint={t('exercises.custom.instructionsHint')}>
            {({ id, describedBy }) => (
              <textarea
                id={id}
                aria-describedby={describedBy}
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                rows={5}
                className="w-full rounded-special border border-line-dark bg-white/6 px-4 py-3 text-body text-on-dark focus:border-accent focus:outline-none"
              />
            )}
          </Field>

          {create.isError && (
            <p role="alert" className="text-caption text-danger">
              {t('error.generic.body')}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={!canSubmit}>
              {t('action.save')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => void navigate('/coach/exercises')}>
              {t('action.cancel')}
            </Button>
          </div>
        </form>
      </Card>
    </CoachLayout>
  )
}
