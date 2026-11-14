import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Card, Display, Field, Input } from '@/components/ui'
import { CoachLayout } from '@/components/CoachLayout'
import { useCoachContext } from '@/features/auth/useCoach'
import { useTrainees } from '@/features/trainees/useTrainees'
import {
  useActivateProgram,
  useCreateProgram,
  useDeleteProgram,
  useDuplicateProgram,
  useTemplates,
  useTraineePrograms,
} from '@/features/programs/usePrograms'
import { useT } from '@/lib/i18n'

const DAY_OPTIONS = [3, 4, 5, 6] as const

/** A trainee's program list: create a new one, start from a template, or open an existing one. */
export function TraineePrograms() {
  const { traineeId } = useParams<{ traineeId: string }>()
  const navigate = useNavigate()
  const t = useT()

  const { data: coach } = useCoachContext()
  const trainees = useTrainees()
  const programs = useTraineePrograms(traineeId)
  const templates = useTemplates()

  const createProgram = useCreateProgram()
  const duplicate = useDuplicateProgram()
  const activate = useActivateProgram()
  const deleteProgram = useDeleteProgram()

  const [title, setTitle] = useState('')
  const [daysPerWeek, setDaysPerWeek] = useState<number>(4)

  const trainee = trainees.data?.find((item) => item.id === traineeId)

  function handleCreate() {
    if (!coach?.gym || !traineeId) return
    createProgram.mutate(
      {
        gymId: coach.gym.id,
        traineeId,
        title: title.trim() || `${daysPerWeek} ${t('programs.dayWeek')}`,
        daysPerWeek,
      },
      { onSuccess: (program) => void navigate(`/coach/programs/${program.id}`) },
    )
  }

  return (
    <CoachLayout>
      <Display size="sm" as="h1" className="text-accent">
        {trainee?.full_name ?? t('nav.trainees')}
      </Display>

      {/* ------------------------------------------------------- new program */}
      <Card className="mt-6 max-w-2xl">
        <h2 className="text-body font-medium">{t('programs.new.title')}</h2>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <Field label={t('programs.new.name')}>
            {({ id }) => (
              <Input
                id={id}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t('programs.new.namePlaceholder')}
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

          <Button onClick={handleCreate} disabled={createProgram.isPending}>
            {t('programs.new.create')}
          </Button>
        </div>

        {(templates.data?.length ?? 0) > 0 && (
          <div className="mt-6 border-t border-line-dark pt-4">
            <p className="text-caption text-muted-dark">{t('programs.fromTemplate')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {templates.data?.map((template) => (
                <Button
                  key={template.id}
                  size="sm"
                  variant="secondary"
                  disabled={duplicate.isPending}
                  onClick={() =>
                    duplicate.mutate(
                      { programId: template.id, traineeId: traineeId ?? null, title: template.title },
                      { onSuccess: (newId) => void navigate(`/coach/programs/${newId}`) },
                    )
                  }
                >
                  {template.title}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* -------------------------------------------------- existing programs */}
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {programs.data?.map((program) => (
          <Card key={program.id} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-body font-medium">{program.title}</p>
              <Badge tone={program.status === 'active' ? 'done' : 'neutral'}>
                {t(`program.status.${program.status}` as 'program.status.draft')}
              </Badge>
            </div>
            <p className="text-caption text-muted-dark">
              {program.days_per_week} {t('programs.dayWeek')}
            </p>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void navigate(`/coach/programs/${program.id}`)}>
                {t('action.edit')}
              </Button>
              {program.status !== 'active' && (
                <Button size="sm" variant="secondary" onClick={() => activate.mutate(program.id)}>
                  {t('builder.activate')}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (window.confirm(t('programs.deleteConfirm'))) deleteProgram.mutate(program.id)
                }}
              >
                {t('action.delete')}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {programs.isSuccess && programs.data.length === 0 && (
        <p className="mt-8 text-body-sm text-muted-dark">{t('programs.none')}</p>
      )}
    </CoachLayout>
  )
}
