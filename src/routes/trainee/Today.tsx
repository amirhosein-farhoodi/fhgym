import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock,
  Check,
  CloudOff,
  History,
  RefreshCw,
  Link2,
  Moon,
  Repeat,
  StickyNote,
  Timer,
  Weight,
  type LucideIcon,
} from 'lucide-react'
import { Badge, Card, Display, EmptyState } from '@/components/ui'
import { LocaleSwitch } from '@/components/LocaleSwitch'
import { FullScreenMessage, FullScreenSpinner } from '@/components/Feedback'
import { InstallHint } from '@/components/InstallHint'
import { useTraineeBrand } from '@/features/branding/brand'
import { CoachAvatar, GymAvatar } from '@/features/branding/GymAvatar'
import { useInstallBranding } from '@/features/branding/useInstallBranding'
import {
  claimAndRemember,
  recallTrainee,
  traineeHomePath,
  type StoredTrainee,
} from '@/features/trainees/claim'
import { exerciseImageUrl, mediaCrossOrigin } from '@/features/exercises/useExercises'
import { exerciseName } from '@/features/exercises/name'
import {
  useActiveProgram,
  useDaySession,
  useEnsureSession,
  useSessionHistory,
  useSetCurrentExercise,
} from '@/features/trainee/useTraineeProgram'
import { queueTick, todayISO, useTickSync } from '@/features/trainee/offlineTicks'
import { cn } from '@/lib/cn'
import { formatShortDate } from '@/lib/date'
import { useI18n, useT } from '@/lib/i18n'
import type { ProgramDayWithExercises } from '@/lib/db.types'

/** Animations already requested this page-load, so switching days does not refetch them. */
const prefetched = new Set<string>()

/**
 * Gets a trainee before showing the workout:
 *   1. remembered on this device — the normal case;
 *   2. otherwise, the access token in the URL (?k=) — an app installed to an iPhone home
 *      screen starts with storage separate from Safari, so it signs itself in from this;
 *   3. otherwise, ask them to scan their QR code again. Never the coach landing page.
 */
export function TraineeToday() {
  const t = useT()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const urlToken = params.get('k') ?? undefined

  const [trainee, setTrainee] = useState<StoredTrainee | null>(recallTrainee)
  const [failed, setFailed] = useState(false)
  const started = useRef(false)

  // A token we have not claimed with on this device (fresh install, or another trainee's link).
  const needsClaim = Boolean(urlToken) && trainee?.token !== urlToken

  useEffect(() => {
    if (!needsClaim || !urlToken || started.current) return
    started.current = true
    claimAndRemember(urlToken)
      .then((next) => {
        // Drop anything cached for a previous trainee on this device.
        queryClient.removeQueries({ queryKey: ['trainee'] })
        setTrainee(next)
      })
      .catch(() => setFailed(true))
  }, [needsClaim, urlToken, queryClient])

  // Keep the token in the address bar, so "Add to Home Screen" always captures it.
  useEffect(() => {
    if (trainee?.token && !urlToken) void navigate(traineeHomePath(trainee.token), { replace: true })
  }, [trainee?.token, urlToken, navigate])

  if (failed) {
    return navigator.onLine ?
        <FullScreenMessage title={t('claim.failed.title')} body={t('claim.failed.body')} />
      : <FullScreenMessage title={t('trainee.offline.title')} body={t('trainee.offline.firstLoad')} />
  }
  if (needsClaim) return <FullScreenSpinner branded={false} />
  if (!trainee) return <FullScreenMessage title={t('trainee.rescan.title')} body={t('trainee.rescan.body')} />

  return <TraineeWorkout trainee={trainee} />
}

/*
 * The trainee's whole app.
 *
 * Read-only by design (PLAN.md §3.4): they never edit a prescription and never type a number.
 * The only things they change are which exercise is current and which ones are done.
 */
function TraineeWorkout({ trainee }: { trainee: StoredTrainee }) {
  const t = useT()
  const { locale } = useI18n()
  // The gym's screen, not ours: logo, name and coach come from the gym.
  const brand = useTraineeBrand()
  useInstallBranding(brand.data, trainee.token)

  const program = useActiveProgram()
  const history = useSessionHistory()
  const [dayIndex, setDayIndex] = useState(0)

  const days = program.data?.program_days ?? []
  const day: ProgramDayWithExercises | undefined = days[dayIndex]

  const session = useDaySession(day?.id, trainee.trainee_id)
  const ensureSession = useEnsureSession(day?.id ?? '', trainee.trainee_id ?? '')
  const setCurrent = useSetCurrentExercise(day?.id ?? '')
  const { online, pending, sync } = useTickSync(trainee.trainee_id)
  // Tapping "current" works offline too; the server copy catches up when it can.
  const [currentOverride, setCurrentOverride] = useState<string | null>(null)

  // Server ticks, overlaid with anything queued locally that has not synced yet.
  const doneIds = useMemo(() => {
    const ids = new Set(
      session.data?.progress.filter((p) => p.is_done).map((p) => p.program_exercise_id),
    )
    const today = todayISO()
    for (const tick of pending) {
      if (tick.dayId !== day?.id || tick.date !== today) continue
      if (tick.done) ids.add(tick.programExerciseId)
      else ids.delete(tick.programExerciseId)
    }
    return ids
  }, [session.data, pending, day?.id])

  // Download every animation in the program up front, not just the day on screen, so the
  // whole week works offline after one online open. The service worker caches each one.
  useEffect(() => {
    const urls = new Set<string>()
    for (const d of program.data?.program_days ?? []) {
      for (const item of d.program_exercises) {
        const src = exerciseImageUrl(item.exercise)
        if (src && mediaCrossOrigin(src)) urls.add(src)
      }
    }
    for (const url of urls) {
      if (prefetched.has(url)) continue
      prefetched.add(url)
      void fetch(url, { mode: 'cors' }).catch(() => prefetched.delete(url))
    }
  }, [program.data])

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

  if (program.isPending) {
    // Never opened online on this phone, and offline now: nothing to show yet.
    if (!online) {
      return <FullScreenMessage title={t('trainee.offline.title')} body={t('trainee.offline.firstLoad')} />
    }
    return <FullScreenSpinner branded={false} />
  }

  function handleTap(programExerciseId: string, markDone: boolean) {
    if (!day) return
    if (markDone) {
      queueTick({
        dayId: day.id,
        date: todayISO(),
        programExerciseId,
        done: !doneIds.has(programExerciseId),
      })
      void sync()
      return
    }

    setCurrentOverride(programExerciseId)
    if (!online) return
    void (async () => {
      try {
        const current = session.data?.session ?? (await ensureSession.mutateAsync())
        setCurrent.mutate({ sessionId: current.id, exerciseId: programExerciseId })
      } catch {
        /* offline-ish: the local highlight is enough */
      }
    })()
  }

  const gymName = brand.data?.gym_name || trainee.gym_name
  const currentId = currentOverride ?? session.data?.session?.current_exercise_id ?? null
  const doneCount = day ? day.program_exercises.filter((e) => doneIds.has(e.id)).length : 0

  const total = day?.program_exercises.length ?? 0
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0

  return (
    <div className="min-h-dvh bg-surface pb-16">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <GymAvatar name={gymName} logoPath={brand.data?.logo_path} className="size-10" />
            <p className="truncate font-display text-subheading text-fg">{gymName}</p>
          </div>
          <LocaleSwitch />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {(!online || pending.length > 0) && (
          <p
            role="status"
            className="mb-5 flex items-center gap-2 rounded-pill bg-copper-soft px-3.5 py-2 text-caption font-semibold text-copper-deep"
          >
            {online ?
              <RefreshCw aria-hidden className="size-3.5 animate-spin" />
            : <CloudOff aria-hidden className="size-3.5" />}
            {online ? t('trainee.offline.syncing') : t('trainee.offline.banner')}
          </p>
        )}

        {/* Gym card: who this program is from. */}
        <section className="mb-6 flex items-center gap-4 rounded-special border border-line/70 bg-surface-card p-4 shadow-card">
          <GymAvatar name={gymName} logoPath={brand.data?.logo_path} className="size-16" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-semibold">
              {t('trainee.hello', { name: trainee.trainee_name })}
            </p>
            {brand.data?.coach_name ?
              <div className="mt-1.5 flex items-center gap-2">
                <CoachAvatar name={brand.data.coach_name} url={brand.data.coach_avatar_url} className="size-7" />
                <p className="min-w-0 truncate text-caption text-fg-muted">
                  <span className="font-semibold text-fg">{brand.data.coach_name}</span>
                  {brand.data.coach_title && <> · {brand.data.coach_title}</>}
                </p>
              </div>
            : <p className="mt-0.5 truncate text-caption text-fg-muted">{gymName}</p>}
          </div>
        </section>

        <InstallHint
          className="mb-5"
          appName={gymName}
          icon={<GymAvatar name={gymName} logoPath={brand.data?.logo_path} className="size-12" />}
        />

        {!program.data ?
          <EmptyState icon={CalendarClock} title={t('nav.today')} body={t('trainee.noProgram')} />
        : <>
            <p className="flex items-center gap-2 text-caption font-semibold tracking-wide text-copper-deep uppercase">
              <span aria-hidden className="h-px w-5 bg-copper" />
              {program.data.title}
            </p>
            <Display size="lg" as="h1" className="mt-2 text-fg">
              {day?.is_rest_day ? t('trainee.restDay') : t('nav.today')}
            </Display>

            {/* day switcher */}
            <div className="-mx-4 mt-6 overflow-x-auto px-4">
              <div className="flex gap-2 pb-1">
                {days.map((d, index) => {
                  const selected = index === dayIndex
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDayIndex(index)}
                      aria-pressed={selected}
                      className={cn(
                        'flex h-10 shrink-0 items-center gap-2 rounded-pill border px-4 text-body-sm font-semibold capitalize transition-colors',
                        selected
                          ? 'border-steel bg-steel text-cream shadow-card'
                          : 'border-line bg-surface-card text-fg-muted hover:text-fg',
                      )}
                    >
                      {d.is_rest_day && <Moon aria-hidden className="size-3.5" />}
                      {d.title || `${t('builder.day')} ${d.day_index}`}
                    </button>
                  )
                })}
              </div>
            </div>

            {day && !day.is_rest_day && (
              <>
                {/* progress */}
                <div className="mt-6 rounded-card bg-surface-inverse p-5 text-on-inverse shadow-raised">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-body-sm font-semibold">
                        {t('trainee.doneCount', { done: doneCount, total })}
                      </p>
                      {lastSession && (
                        <p className="mt-1 flex items-center gap-1.5 text-caption text-on-inverse-muted">
                          <History aria-hidden className="size-3.5" />
                          {t('trainee.lastTime', {
                            date: formatShortDate(lastSession.date, locale),
                            done: lastSession.done,
                          })}
                        </p>
                      )}
                    </div>
                    <span className="font-display text-heading text-sage tabular-nums" dir="ltr">
                      {pct}%
                    </span>
                  </div>
                  <div
                    className="mt-4 h-2 overflow-hidden rounded-pill bg-cream/12"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={doneCount}
                  >
                    <div
                      className="h-full rounded-pill bg-gradient-to-r from-pine to-sage transition-[width] duration-500 rtl:bg-gradient-to-l"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <ul className="mt-5 flex flex-col gap-3">
                  {day.program_exercises.map((item, index) => {
                    const isDone = doneIds.has(item.id)
                    const isCurrent = currentId === item.id
                    const src = exerciseImageUrl(item.exercise)

                    return (
                      <li key={item.id}>
                        <Card
                          className={cn(
                            'p-3 transition-[opacity,box-shadow] sm:p-4',
                            isCurrent && 'border-steel shadow-raised ring-2 ring-steel',
                            isDone && !isCurrent && 'bg-sage-soft/60 opacity-70',
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => handleTap(item.id, false)}
                              className="flex min-w-0 flex-1 items-start gap-3 text-start"
                            >
                              <span
                                className={cn(
                                  'relative shrink-0 overflow-hidden rounded-[12px] bg-paper ring-1 ring-line/60 transition-all',
                                  isCurrent ? 'size-28 sm:size-32' : 'size-16',
                                )}
                              >
                                <span
                                  className="absolute start-0 top-0 z-10 flex size-5 items-center justify-center rounded-ee-[8px] bg-steel text-[0.65rem] font-bold text-cream"
                                  dir="ltr"
                                >
                                  {index + 1}
                                </span>
                                {src && (
                                  <img
                                    src={src}
                                    crossOrigin={mediaCrossOrigin(src)}
                                    alt=""
                                    loading="lazy"
                                    className="h-full w-full object-contain"
                                  />
                                )}
                              </span>

                              <span className="min-w-0 flex-1 pt-0.5">
                                <span
                                  className={cn(
                                    'block text-body font-semibold',
                                    isDone && 'line-through decoration-sage decoration-2',
                                  )}
                                >
                                  {exerciseName(item.exercise, locale)}
                                </span>
                                <span className="mt-2 flex flex-wrap gap-1.5" dir="ltr">
                                  {!!item.sets && (
                                    <Stat icon={Repeat}>
                                      {`${item.sets} × ${item.reps_min ?? ''}${item.reps_max ? `-${item.reps_max}` : ''}`}
                                    </Stat>
                                  )}
                                  {!!item.weight && (
                                    <Stat icon={Weight}>{`${item.weight} ${item.weight_unit ?? 'kg'}`}</Stat>
                                  )}
                                  {!!item.rest_seconds && <Stat icon={Timer}>{`${item.rest_seconds}s`}</Stat>}
                                </span>
                                {item.notes && (
                                  <span className="mt-2 flex items-start gap-1.5 text-caption text-fg-muted">
                                    <StickyNote aria-hidden className="mt-0.5 size-3.5 shrink-0 text-copper" />
                                    {item.notes}
                                  </span>
                                )}
                                {item.superset_group !== null && (
                                  <Badge tone="due" className="mt-2">
                                    <Link2 aria-hidden />
                                    {t('builder.superset')} {item.superset_group}
                                  </Badge>
                                )}
                              </span>
                            </button>

                            {/* Big round check — easy to hit with a sweaty thumb. */}
                            <button
                              type="button"
                              onClick={() => handleTap(item.id, true)}
                              aria-pressed={isDone}
                              aria-label={isDone ? t('trainee.undo') : t('trainee.markDone')}
                              title={isDone ? t('trainee.undo') : t('trainee.markDone')}
                              className={cn(
                                'flex size-12 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                                isDone
                                  ? 'border-pine bg-pine text-cream'
                                  : 'border-line-strong bg-surface-raised text-line-strong hover:border-pine hover:text-pine',
                              )}
                            >
                              <Check aria-hidden className="size-6" strokeWidth={3} />
                            </button>
                          </div>
                        </Card>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}

            {day?.is_rest_day && (
              <EmptyState icon={Moon} title={t('trainee.restDay')} body={t('trainee.restDayBody')} className="mt-8" />
            )}
          </>
        }
      </main>

      {/* Our one mention on the trainee's screen. */}
      <footer className="mx-auto max-w-2xl px-4 pb-4 text-center">
        <p className="inline-flex items-center gap-1.5 text-[0.7rem] text-fg-subtle">
          {t('trainee.poweredBy')}
          <span className="font-semibold text-fg-muted">FH Gym Assistant</span>
        </p>
      </footer>
    </div>
  )
}

function Stat({ icon: Icon, children }: { icon: LucideIcon; children: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-surface-sunken px-2.5 py-1 text-caption font-semibold text-fg tabular-nums">
      <Icon aria-hidden className="size-3.5 text-pine" />
      {children}
    </span>
  )
}
