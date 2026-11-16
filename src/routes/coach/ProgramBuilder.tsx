import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, CircleCheck, Copy, Layers, Moon, Play, Plus, Sparkles } from 'lucide-react'
import { Badge, Button, Card, Display, EmptyState, Input } from '@/components/ui'
import { CoachLayout } from '@/components/CoachLayout'
import { FullScreenMessage, FullScreenSpinner } from '@/components/Feedback'
import { ExercisePicker } from '@/features/programs/ExercisePicker'
import { ExerciseRow } from '@/features/programs/ExerciseRow'
import {
  useActivateProgram,
  useAddExercises,
  useDuplicateProgram,
  useProgram,
  useRemoveProgramExercise,
  useReorderExercises,
  useUpdateDay,
  useUpdateProgram,
  useUpdateProgramExercise,
} from '@/features/programs/usePrograms'
import { DAY_PRESETS } from '@/lib/exercise-taxonomy'
import { cn } from '@/lib/cn'
import { useT } from '@/lib/i18n'

export function ProgramBuilder() {
  const { programId } = useParams<{ programId: string }>()
  const navigate = useNavigate()
  const t = useT()

  const program = useProgram(programId)
  const updateProgram = useUpdateProgram(programId ?? '')
  const updateDay = useUpdateDay(programId ?? '')
  const addExercises = useAddExercises(programId ?? '')
  const patchExercise = useUpdateProgramExercise(programId ?? '')
  const removeExercise = useRemoveProgramExercise(programId ?? '')
  const reorder = useReorderExercises(programId ?? '')
  const activate = useActivateProgram()
  const duplicate = useDuplicateProgram()

  const [activeDay, setActiveDay] = useState(0)
  const [picking, setPicking] = useState(false)

  if (program.isPending) return <FullScreenSpinner />
  if (program.isError || !program.data) {
    return <FullScreenMessage title={t('error.generic.title')} body={t('error.generic.body')} />
  }

  const data = program.data
  const days = data.program_days
  const day = days[activeDay]

  return (
    <CoachLayout>
      <Link
        to={data.is_template || !data.trainee_id ? '/coach/programs' : `/coach/trainees/${data.trainee_id}/program`}
        className="mb-4 inline-flex items-center gap-1.5 text-caption font-semibold text-fg-muted hover:text-fg"
      >
        <ChevronLeft aria-hidden className="icon-directional size-4" />
        {t('nav.programs')}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Display size="md" as="h1" className="text-fg">
            {data.title}
          </Display>
          <div className="mt-3 flex items-center gap-2">
            <Badge tone={data.status === 'active' ? 'done' : 'neutral'}>
              {data.status === 'active' && <CircleCheck aria-hidden />}
              {t(`program.status.${data.status}` as 'program.status.draft')}
            </Badge>
            {data.is_template && (
              <Badge tone="accent">
                <Layers aria-hidden />
                {t('program.template')}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!data.is_template && data.trainee_id && data.status !== 'active' && (
            <Button
              onClick={() => activate.mutate(data.id, { onSuccess: () => void program.refetch() })}
              disabled={activate.isPending}
            >
              <Play aria-hidden />
              {t('builder.activate')}
            </Button>
          )}
          <Button
            variant="secondary"
            disabled={duplicate.isPending}
            onClick={() =>
              duplicate.mutate(
                { programId: data.id, asTemplate: true, title: `${data.title}` },
                { onSuccess: () => void navigate('/coach/programs') },
              )
            }
          >
            <Layers aria-hidden />
            {t('builder.saveAsTemplate')}
          </Button>
          <Button
            variant="secondary"
            disabled={duplicate.isPending}
            onClick={() =>
              duplicate.mutate(
                { programId: data.id, traineeId: data.trainee_id },
                { onSuccess: (newId) => void navigate(`/coach/programs/${newId}`) },
              )
            }
          >
            <Copy aria-hidden />
            {t('builder.duplicate')}
          </Button>
        </div>
      </div>

      <Card className="mt-6">
        <label className="flex flex-col gap-2">
          <span className="text-body-sm font-semibold">{t('builder.programTitle')}</span>
          <Input
            defaultValue={data.title}
            onBlur={(event) => {
              const next = event.target.value.trim()
              if (next && next !== data.title) updateProgram.mutate({ title: next })
            }}
            className="max-w-md"
          />
        </label>
      </Card>

      {/* ------------------------------------------------------------ days */}
      <div className="-mx-4 mt-8 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 pb-1">
          {days.map((d, index) => {
            const selected = index === activeDay
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setActiveDay(index)}
                aria-pressed={selected}
                className={cn(
                  'flex shrink-0 items-center gap-2.5 rounded-[14px] border px-3 py-2 text-start transition-colors',
                  selected
                    ? 'border-steel bg-steel text-cream shadow-card'
                    : 'border-line bg-surface-card text-fg-muted hover:border-line-strong hover:text-fg',
                )}
              >
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-[8px] font-display text-body',
                    selected ? 'bg-pine text-cream' : 'bg-surface-sunken text-fg',
                  )}
                  dir="ltr"
                >
                  {d.is_rest_day ? <Moon aria-hidden className="size-3.5" /> : d.day_index}
                </span>
                <span className="text-body-sm font-semibold capitalize">
                  {d.title || `${t('builder.day')} ${d.day_index}`}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {day && (
        <Card className="mt-4">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-body-sm font-semibold">{t('builder.dayTitle')}</span>
              <Input
                defaultValue={day.title ?? ''}
                key={day.id}
                placeholder={t('builder.dayTitlePlaceholder')}
                onBlur={(event) =>
                  updateDay.mutate({ dayId: day.id, patch: { title: event.target.value || null } })
                }
                className="w-64"
              />
            </label>

            <label className="flex h-11 cursor-pointer items-center gap-2.5 rounded-pill border border-line-strong bg-surface-raised px-4 text-body-sm font-semibold">
              <Moon aria-hidden className="size-4 text-fg-muted" />
              <input
                type="checkbox"
                checked={day.is_rest_day}
                onChange={(event) =>
                  updateDay.mutate({ dayId: day.id, patch: { is_rest_day: event.target.checked } })
                }
                className="order-last size-4 accent-[var(--color-pine-deep)]"
              />
              {t('builder.restDay')}
            </label>
          </div>

          {/* Preset focus buttons fill the day title and focus tags in one tap. */}
          <div className="mt-5 flex flex-wrap items-center gap-1.5">
            <Sparkles aria-hidden className="me-1 size-4 text-copper" />
            {Object.entries(DAY_PRESETS).map(([preset, focus]) => (
              <button
                key={preset}
                type="button"
                onClick={() =>
                  updateDay.mutate({
                    dayId: day.id,
                    patch: { focus, title: day.title || preset.replace('-', ' ') },
                  })
                }
                className="h-8 rounded-pill border border-dashed border-line-strong px-3 text-caption font-semibold capitalize text-fg-muted transition-colors hover:border-pine hover:bg-pine-soft hover:text-pine-deep"
              >
                {preset.replace('-', ' ')}
              </button>
            ))}
          </div>

          {!day.is_rest_day && (
            <>
              <ul className="mt-6 flex flex-col gap-3">
                {day.program_exercises.map((item, index) => (
                  <ExerciseRow
                    key={item.id}
                    item={item}
                    index={index}
                    count={day.program_exercises.length}
                    onPatch={(patch) => patchExercise.mutate({ id: item.id, patch })}
                    onRemove={() => removeExercise.mutate(item.id)}
                    onMove={(direction) => {
                      const list = [...day.program_exercises]
                      const target = index + direction
                      if (target < 0 || target >= list.length) return
                      const a = list[index]
                      const b = list[target]
                      if (!a || !b) return
                      list[index] = b
                      list[target] = a
                      reorder.mutate(list.map((row, i) => ({ id: row.id, position: i })))
                    }}
                  />
                ))}
              </ul>

              {day.program_exercises.length === 0 && (
                <EmptyState icon={Plus} title={t('builder.emptyDay')} className="mt-6 py-8" />
              )}

              <div className="mt-6">
                <Button onClick={() => setPicking(true)}>
                  <Plus aria-hidden />
                  {t('builder.addExercises')}
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {picking && day && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onConfirm={(exerciseIds) =>
            addExercises.mutate({
              dayId: day.id,
              exerciseIds,
              startPosition: day.program_exercises.length,
            })
          }
        />
      )}
    </CoachLayout>
  )
}
