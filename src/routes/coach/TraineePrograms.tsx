import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  CalendarDays,
  ChevronLeft,
  CircleCheck,
  ClipboardList,
  Copy,
  Layers,
  Pencil,
  Play,
  Plus,
  Trash2,
  User,
} from 'lucide-react'
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Segmented } from '@/components/ui'
import { cn } from '@/lib/cn'
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
      <Link
        to="/coach/trainees"
        className="mb-4 inline-flex items-center gap-1.5 text-caption font-semibold text-fg-muted hover:text-fg"
      >
        <ChevronLeft aria-hidden className="icon-directional size-4" />
        {t('nav.trainees')}
      </Link>
      <PageHeader icon={User} eyebrow={t('nav.programs')} title={trainee?.full_name ?? t('nav.trainees')} />

      {/* ------------------------------------------------------- new program */}
      <Card className="mt-8">
        <h2 className="flex items-center gap-2 text-body font-semibold">
          <Plus aria-hidden className="size-[18px] text-pine" />
          {t('programs.new.title')}
        </h2>

        <div className="mt-5 flex flex-wrap items-end gap-4">
          <div className="w-full sm:w-72">
            <Field label={t('programs.new.name')}>
              {({ id }) => (
                <Input
                  id={id}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t('programs.new.namePlaceholder')}
                />
              )}
            </Field>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-body-sm font-semibold">{t('programs.new.daysPerWeek')}</span>
            <Segmented
              options={DAY_OPTIONS}
              value={daysPerWeek as (typeof DAY_OPTIONS)[number]}
              onChange={setDaysPerWeek}
              label={t('programs.new.daysPerWeek')}
            />
          </div>

          <Button onClick={handleCreate} disabled={createProgram.isPending}>
            <Plus aria-hidden />
            {t('programs.new.create')}
          </Button>
        </div>

        {(templates.data?.length ?? 0) > 0 && (
          <div className="mt-6 border-t border-line/70 pt-5">
            <p className="flex items-center gap-1.5 text-caption font-semibold text-fg-muted">
              <Layers aria-hidden className="size-3.5" />
              {t('programs.fromTemplate')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
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
                  <Copy aria-hidden />
                  {template.title}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* -------------------------------------------------- existing programs */}
      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {programs.data?.map((program) => {
          const active = program.status === 'active'
          return (
            <li key={program.id}>
              <Card
                interactive
                className={cn('flex h-full flex-col gap-4', active && 'border-pine/40 ring-1 ring-pine/25')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-body font-semibold">{program.title}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-caption text-fg-muted">
                      <CalendarDays aria-hidden className="size-3.5" />
                      {program.days_per_week} {t('programs.dayWeek')}
                    </p>
                  </div>
                  <Badge tone={active ? 'done' : 'neutral'}>
                    {active && <CircleCheck aria-hidden />}
                    {t(`program.status.${program.status}` as 'program.status.draft')}
                  </Badge>
                </div>

                <div className="mt-auto flex flex-wrap gap-2 border-t border-line/70 pt-4">
                  <Button size="sm" onClick={() => void navigate(`/coach/programs/${program.id}`)}>
                    <Pencil aria-hidden />
                    {t('action.edit')}
                  </Button>
                  {!active && (
                    <Button size="sm" variant="secondary" onClick={() => activate.mutate(program.id)}>
                      <Play aria-hidden />
                      {t('builder.activate')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hover:text-danger"
                    onClick={() => {
                      if (window.confirm(t('programs.deleteConfirm'))) deleteProgram.mutate(program.id)
                    }}
                  >
                    <Trash2 aria-hidden />
                    {t('action.delete')}
                  </Button>
                </div>
              </Card>
            </li>
          )
        })}
      </ul>

      {programs.isSuccess && programs.data.length === 0 && (
        <EmptyState icon={ClipboardList} title={t('programs.none')} />
      )}
    </CoachLayout>
  )
}
