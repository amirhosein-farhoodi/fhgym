import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import type { WorkoutSession } from '@/lib/db.types'
import { traineeProgramKeys } from './useTraineeProgram'

/*
 * Local-first "mark done".
 *
 * A tick is written to a queue in localStorage first and shown immediately, then synced to
 * Supabase when there is a connection — straight away if online, otherwise on the next
 * `online` event or app launch. A trainee in a basement gym with no signal can work through
 * the whole session; nothing is lost if they close the app before reconnecting.
 *
 * Each entry carries its own date, so ticks made offline yesterday land on yesterday's
 * session, not today's.
 */

export interface PendingTick {
  dayId: string
  date: string
  programExerciseId: string
  done: boolean
}

const KEY = 'fh.pending-ticks'
const listeners = new Set<() => void>()

function read(): PendingTick[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as PendingTick[]
  } catch {
    return []
  }
}

let snapshot: PendingTick[] = read()

function write(next: PendingTick[]) {
  snapshot = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage full or private mode — the in-memory queue still syncs this session */
  }
  listeners.forEach((listener) => listener())
}

function sameTarget(a: PendingTick, b: PendingTick) {
  return a.dayId === b.dayId && a.date === b.date && a.programExerciseId === b.programExerciseId
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function queueTick(tick: PendingTick) {
  // Last write wins: ticking then unticking offline should sync as a single "not done".
  write([...snapshot.filter((t) => !sameTarget(t, tick)), tick])
}

export function usePendingTicks(): PendingTick[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => snapshot,
  )
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

async function sessionFor(dayId: string, date: string, traineeId: string): Promise<WorkoutSession> {
  const supabase = getSupabase()
  const { data: existing, error: readError } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('program_day_id', dayId)
    .eq('session_date', date)
    .maybeSingle<WorkoutSession>()
  if (readError) throw readError
  if (existing) return existing

  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({ trainee_id: traineeId, program_day_id: dayId, session_date: date })
    .select()
    .single<WorkoutSession>()
  if (error) throw error
  return data
}

let flushing: Promise<void> | null = null

/** Pushes every queued tick to the server. Safe to call often; concurrent calls share one run. */
async function flush(traineeId: string): Promise<boolean> {
  if (flushing) {
    await flushing
    return true
  }
  const queue = [...snapshot]
  if (queue.length === 0) return false

  flushing = (async () => {
    const sessions = new Map<string, WorkoutSession>()
    for (const tick of queue) {
      const groupKey = `${tick.dayId}|${tick.date}`
      let session = sessions.get(groupKey)
      if (!session) {
        session = await sessionFor(tick.dayId, tick.date, traineeId)
        sessions.set(groupKey, session)
      }
      const { error } = await getSupabase().from('exercise_progress').upsert(
        {
          session_id: session.id,
          program_exercise_id: tick.programExerciseId,
          is_done: tick.done,
          done_at: tick.done ? new Date().toISOString() : null,
        },
        { onConflict: 'session_id,program_exercise_id' },
      )
      if (error) throw error
      // Drop only this entry, and only if it was not re-ticked while we were syncing.
      write(snapshot.filter((t) => !(sameTarget(t, tick) && t.done === tick.done)))
    }
  })()

  try {
    await flushing
  } finally {
    flushing = null
  }
  return true
}

/**
 * Keeps the queue draining: on mount, whenever the phone comes back online, and after each
 * new tick. Returns `sync` for callers that want to push immediately.
 */
export function useTickSync(traineeId: string | undefined) {
  const queryClient = useQueryClient()
  const online = useOnline()
  const pending = usePendingTicks()

  const sync = useCallback(async () => {
    if (!traineeId || !navigator.onLine) return
    try {
      const pushed = await flush(traineeId)
      if (pushed) {
        void queryClient.invalidateQueries({ queryKey: ['trainee', 'session'] })
        void queryClient.invalidateQueries({ queryKey: traineeProgramKeys.history })
      }
    } catch {
      // Flaky gym wifi: the queue stays put and the next online event retries.
    }
  }, [traineeId, queryClient])

  useEffect(() => {
    if (online && pending.length > 0) void sync()
  }, [online, pending.length, sync])

  return { online, pending, sync }
}
