import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Card, Display, Input } from '@/components/ui'
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Display size="sm" as="h1" className="text-accent">
            {data.title}
          </Display>
          <div className="mt-2 flex items-center gap-2">
            <Badge tone={data.status === 'active' ? 'done' : 'neutral'}>
              {t(`program.status.${data.status}` as 'program.status.draft')}
            </Badge>
            {data.is_template && <Badge tone="accent">{t('program.template')}</Badge>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!data.is_template && data.trainee_id && data.status !== 'active' && (
            <Button
              onClick={() => activate.mutate(data.id, { onSuccess: () => void program.refetch() })}
              disabled={activate.isPending}
            >
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
            {t('builder.duplicate')}
          </Button>
        </div>
      </div>

      <Card className="mt-6">
        <label className="flex flex-col gap-2">
          <span className="text-caption text-muted-dark">{t('builder.programTitle')}</span>
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
      <div className="mt-8 flex flex-wrap gap-2">
        {days.map((d, index) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setActiveDay(index)}
            aria-pressed={index === activeDay}
            className={cn(
              'rounded-pill px-4 py-2 text-body-sm transition-colors',
              index === activeDay ? 'bg-accent text-plum' : 'bg-white/8 text-on-dark/75',
            )}
          >
            {d.title || `${t('builder.day')} ${d.day_index}`}
            {d.is_rest_day && ' · ' + t('builder.restDay')}
          </button>
        ))}
      </div>

      {day && (
        <Card className="mt-4">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-caption text-muted-dark">{t('builder.dayTitle')}</span>
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

            <label className="flex items-center gap-2 text-body-sm">
              <input
                type="checkbox"
                checked={day.is_rest_day}
                onChange={(event) =>
                  updateDay.mutate({ dayId: day.id, patch: { is_rest_day: event.target.checked } })
                }
                className="size-4 accent-[var(--color-accent)]"
              />
              {t('builder.restDay')}
            </label>
          </div>

          {/* Preset focus buttons fill the day title and focus tags in one tap. */}
          <div className="mt-4 flex flex-wrap gap-1.5">
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
                className="rounded-pill bg-white/8 px-3 py-1 text-caption capitalize text-on-dark/75 hover:text-on-dark"
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
                <p className="mt-6 text-body-sm text-muted-dark">{t('builder.emptyDay')}</p>
              )}

              <div className="mt-6">
                <Button onClick={() => setPicking(true)}>{t('builder.addExercises')}</Button>
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
