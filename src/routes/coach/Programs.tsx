import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, Display, Field, Input } from '@/components/ui'
import { CoachLayout } from '@/components/CoachLayout'
import { useCoachContext } from '@/features/auth/useCoach'
import { useCreateProgram, useDeleteProgram, useTemplates } from '@/features/programs/usePrograms'
import { useT } from '@/lib/i18n'

const DAY_OPTIONS = [3, 4, 5, 6] as const

/**
 * The template library: splits the coach writes once and reuses for every trainee.
 * This is what turns the second program from twenty minutes of work into two.
 */
export function Programs() {
  const navigate = useNavigate()
  const t = useT()
  const { data: coach } = useCoachContext()
  const templates = useTemplates()
  const createProgram = useCreateProgram()
  const deleteProgram = useDeleteProgram()

  const [title, setTitle] = useState('')
  const [daysPerWeek, setDaysPerWeek] = useState<number>(4)

  return (
    <CoachLayout>
      <Display size="md" as="h1" className="text-accent">
        {t('nav.programs')}
      </Display>
      <p className="mt-3 max-w-prose text-body-sm text-muted-dark">{t('programs.templatesHint')}</p>

      <Card className="mt-8 max-w-2xl">
        <h2 className="text-body font-medium">{t('programs.newTemplate')}</h2>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <Field label={t('programs.new.name')}>
            {({ id }) => (
              <Input
                id={id}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t('programs.new.templatePlaceholder')}
                className="w-64"
              />
            )}
          </Field>

          <div className="flex flex-col gap-2">
            <span className="text-body-sm font-medium">{t('programs.new.daysPerWeek')}</span>
            <div className="flex gap-1 rounded-pill bg-white/8 p-1">
              {DAY_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={daysPerWeek === option}
                  onClick={() => setDaysPerWeek(option)}
                  className={
                    daysPerWeek === option
                      ? 'rounded-pill bg-accent px-4 py-2 text-body-sm text-plum'
                      : 'rounded-pill px-4 py-2 text-body-sm text-on-dark/70'
                  }
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <Button
            disabled={createProgram.isPending || !coach?.gym}
            onClick={() => {
              if (!coach?.gym) return
              createProgram.mutate(
                {
                  gymId: coach.gym.id,
                  traineeId: null,
                  isTemplate: true,
                  title: title.trim() || `${daysPerWeek} ${t('programs.dayWeek')}`,
                  daysPerWeek,
                },
                { onSuccess: (program) => void navigate(`/coach/programs/${program.id}`) },
              )
            }}
          >
            {t('programs.new.create')}
          </Button>
        </div>
      </Card>

      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.data?.map((template) => (
          <Card key={template.id} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-body font-medium">{template.title}</p>
              <Badge tone="accent">{t('program.template')}</Badge>
            </div>
            <p className="text-caption text-muted-dark">
              {template.days_per_week} {t('programs.dayWeek')}
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void navigate(`/coach/programs/${template.id}`)}>
                {t('action.edit')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (window.confirm(t('programs.deleteConfirm'))) deleteProgram.mutate(template.id)
                }}
              >
                {t('action.delete')}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {templates.isSuccess && templates.data.length === 0 && (
        <p className="mt-8 text-body-sm text-muted-dark">{t('programs.noTemplates')}</p>
      )}
    </CoachLayout>
  )
}
