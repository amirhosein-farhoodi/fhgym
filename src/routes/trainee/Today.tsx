import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Badge, Button, Card, Display } from '@/components/ui'
import { LocaleSwitch } from '@/components/LocaleSwitch'
import { FullScreenSpinner } from '@/components/Feedback'
import { recallTrainee } from '@/features/trainees/claim'
import { exerciseImageUrl } from '@/features/exercises/useExercises'
import { exerciseName } from '@/features/exercises/name'
import {
  useActiveProgram,
  useDaySession,
  useEnsureSession,
  useSessionHistory,
  useSetCurrentExercise,
  useToggleDone,
} from '@/features/trainee/useTraineeProgram'
import { cn } from '@/lib/cn'
import { formatShortDate } from '@/lib/date'
import { useI18n, useT } from '@/lib/i18n'
import type { ProgramDayWithExercises } from '@/lib/db.types'

/*
 * The trainee's whole app.
 *
 * Read-only by design (PLAN.md §3.4): they never edit a prescription and never type a number.
 * The only things they change are which exercise is current and which ones are done.
 */
export function TraineeToday() {
  const t = useT()
  const { locale } = useI18n()
  const trainee = recallTrainee()

  const program = useActiveProgram()
  const history = useSessionHistory()
  const [dayIndex, setDayIndex] = useState(0)

  const days = program.data?.program_days ?? []
  const day: ProgramDayWithExercises | undefined = days[dayIndex]

  const session = useDaySession(day?.id, trainee?.trainee_id)
  const ensureSession = useEnsureSession(day?.id ?? '', trainee?.trainee_id ?? '')
  const setCurrent = useSetCurrentExercise(day?.id ?? '')
  const toggleDone = useToggleDone(day?.id ?? '')

  const doneIds = useMemo(
    () => new Set(session.data?.progress.filter((p) => p.is_done).map((p) => p.program_exercise_id)),
    [session.data],
  )

  // "Last time you did this day: 6 of 7." The single most useful thing we can show.
  const lastSession = useMemo(() => {
    if (!day) return null
    const today = new Date().toISOString().slice(0, 10)
    const past = history.data?.find((s) => s.program_day_id === day.id && s.session_date !== today)
    if (!past) return null
    return {
      date: past.session_date,
      done: past.exercise_progress.filter((p) => p.is_done).length,
    }
  }, [history.data, day])

  if (!trainee) return <Navigate to="/" replace />
  if (program.isPending) return <FullScreenSpinner />

  async function handleTap(programExerciseId: string, markDone: boolean) {
    const current = session.data?.session ?? (await ensureSession.mutateAsync())
    if (markDone) {
      toggleDone.mutate({
        sessionId: current.id,
        programExerciseId,
        done: !doneIds.has(programExerciseId),
      })
    } else {
      setCurrent.mutate({ sessionId: current.id, exerciseId: programExerciseId })
    }
  }

  const currentId = session.data?.session?.current_exercise_id ?? null
  const doneCount = day ? day.program_exercises.filter((e) => doneIds.has(e.id)).length : 0

  return (
    <div className="min-h-dvh bg-surface pb-16">
      <header className="mx-auto flex max-w-page items-center justify-between px-5 pt-5">
        <div>
          <p className="text-caption text-muted-dark">{trainee.gym_name}</p>
          <p className="text-body-sm">{trainee.trainee_name}</p>
        </div>
        <LocaleSwitch />
      </header>

      <main className="mx-auto max-w-page px-5 py-10">
        {!program.data ?
          <>
            <Display size="lg" as="h1" className="text-accent">
              {t('nav.today')}
            </Display>
            <p className="mt-6 text-body text-muted-dark">{t('trainee.noProgram')}</p>
          </>
        : <>
            <Display size="md" as="h1" className="text-accent">
              {day?.is_rest_day ? t('trainee.restDay') : t('nav.today')}
            </Display>
            <p className="mt-2 text-body-sm text-muted-dark">{program.data.title}</p>

            {/* day switcher */}
            <div className="mt-6 flex flex-wrap gap-2">
              {days.map((d, index) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDayIndex(index)}
                  aria-pressed={index === dayIndex}
                  className={cn(
                    'rounded-pill px-4 py-2 text-body-sm transition-colors',
                    index === dayIndex ? 'bg-accent text-plum' : 'bg-white/8 text-on-dark/75',
                  )}
                >
                  {d.title || `${t('builder.day')} ${d.day_index}`}
                </button>
              ))}
            </div>

            {lastSession && (
              <p className="mt-5 text-caption text-muted-dark">
                {t('trainee.lastTime', {
                  date: formatShortDate(lastSession.date, locale),
                  done: lastSession.done,
                })}
              </p>
            )}

            {day && !day.is_rest_day && (
              <>
                <p className="mt-6 text-body-sm text-status-done">
                  {t('trainee.doneCount', {
                    done: doneCount,
                    total: day.program_exercises.length,
                  })}
                </p>

                <ul className="mt-5 flex flex-col gap-3">
                  {day.program_exercises.map((item) => {
                    const isDone = doneIds.has(item.id)
                    const isCurrent = currentId === item.id
                    const src = exerciseImageUrl(item.exercise)

                    return (
                      <li key={item.id}>
                        <Card
                          className={cn(
                            'transition-opacity',
                            isCurrent && 'ring-2 ring-accent',
                            isDone && !isCurrent && 'opacity-55',
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => void handleTap(item.id, false)}
                            className="flex w-full items-start gap-3 text-start"
                          >
                            <span
                              className={cn(
                                'shrink-0 overflow-hidden rounded-[10px] bg-white transition-all',
                                isCurrent ? 'size-32' : 'size-16',
                              )}
                            >
                              {src && (
                                <img
                                  src={src}
                                  alt=""
                                  loading="lazy"
                                  className="h-full w-full object-contain"
                                />
                              )}
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block text-body font-medium">
                                {exerciseName(item.exercise, locale)}
                              </span>
                              <span className="mt-1 block text-body-sm text-muted-dark" dir="ltr">
                                {[
                                  item.sets && `${item.sets} × ${item.reps_min ?? ''}${item.reps_max ? `-${item.reps_max}` : ''}`,
                                  item.weight && `${item.weight} ${item.weight_unit ?? 'kg'}`,
                                  item.rest_seconds && `${item.rest_seconds}s`,
                                ]
                                  .filter(Boolean)
                                  .join('  ·  ')}
                              </span>
                              {item.notes && (
                                <span className="mt-1 block text-caption text-muted-dark">
                                  {item.notes}
                                </span>
                              )}
                              {item.superset_group !== null && (
                                <Badge tone="due" className="mt-2">
                                  {t('builder.superset')} {item.superset_group}
                                </Badge>
                              )}
                            </span>
                          </button>

                          <div className="mt-3">
                            <Button
                              size="sm"
                              variant={isDone ? 'secondary' : 'primary'}
                              onClick={() => void handleTap(item.id, true)}
                              fullWidth
                            >
                              {isDone ? t('trainee.undo') : t('trainee.markDone')}
                            </Button>
                          </div>
                        </Card>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}

            {day?.is_rest_day && (
              <p className="mt-6 text-body text-muted-dark">{t('trainee.restDayBody')}</p>
            )}
          </>
        }
      </main>
    </div>
  )
}
