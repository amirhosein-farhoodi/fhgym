/*
 * Seeds the system exercise catalog into Supabase.
 *
 *   pnpm seed:exercises             # fetch upstream, write data/exercises.json, upsert rows
 *   pnpm seed:exercises --offline   # re-seed from data/exercises.json, no network
 *   pnpm seed:exercises --mirror    # also copy every GIF into Storage (~100 MB)
 *
 * The local dataset is the point of --offline: data/exercises.json is committed, so the
 * catalog (and its Persian names) is version-controlled and diffable, a fresh Supabase
 * project can be seeded with no internet, and upstream disappearing costs us nothing.
 *
 * Idempotent: re-running upserts on external_id rather than duplicating. Safe to interrupt
 * and re-run, which matters because the mirror step is long and network-bound.
 *
 * Two upstream quirks this script works around, both found by testing the live API:
 *   * `offset` is silently ignored — paginating with it returns page 1 forever. The real
 *     parameter is `after`, fed from meta.nextCursor.
 *   * search is `?search=`, not `?q=` (`?q=` returns an empty array rather than an error).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { categorise } from '../src/lib/exercise-taxonomy.ts'
import { translateExerciseName } from '../src/lib/exercise-names-fa.ts'

/*
 * Deliberately no supabase-js here. It requires Node 22+ for a native WebSocket (realtime),
 * which a one-shot seed never uses — and this machine runs Node 20. Plain fetch against
 * PostgREST and the Storage API is fewer moving parts and no version floor.
 */

const API = 'https://oss.exercisedb.dev/api/v1'
// Upstream silently caps pages at 25 no matter what `limit` asks for, so 1500 exercises
// means 60 requests — and it rate-limits well before that at full speed.
const PAGE_SIZE = 25
const PAGE_DELAY_MS = 350
const UPSERT_BATCH = 500
const BUCKET = 'exercise-media'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface UpstreamExercise {
  exerciseId: string
  name: string
  gifUrl?: string
  bodyParts?: string[]
  equipments?: string[]
  targetMuscles?: string[]
  secondaryMuscles?: string[]
  instructions?: string[]
}

/*
 * Named rather than inlined at the call site: the paging loop feeds `after` from
 * `page.meta.nextCursor` and then reads `after` to build the next request, which makes the
 * inference circular and collapses both to `any`. An explicit annotation breaks the cycle.
 */
interface ExercisePage {
  data: UpstreamExercise[]
  meta: { total: number; hasNextPage: boolean; nextCursor: string | null }
}

// --------------------------------------------------------------------- env
function loadEnv(): { url: string; serviceKey: string } {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  const vars = new Map<string, string>()
  for (const line of raw.split('\n')) {
    const match = /^([A-Z_]+)=(.*)$/.exec(line.trim())
    if (match?.[1] && match[2] !== undefined) vars.set(match[1], match[2].trim())
  }

  const url = vars.get('VITE_SUPABASE_URL')
  const serviceKey = vars.get('SUPABASE_SERVICE_KEY')
  if (!url || !serviceKey) {
    throw new Error('.env.local needs VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY')
  }
  return { url, serviceKey }
}

// ----------------------------------------------------------------- helpers
/** "Step:1 Lie face down…" -> "Lie face down…" */
function cleanInstruction(line: string): string {
  return line.replace(/^\s*Step\s*:?\s*\d+\s*/i, '').trim()
}

/** Upstream names are all lowercase; title-case them once here rather than in every view. */
function titleCase(name: string): string {
  const minor = new Set(['and', 'on', 'the', 'to', 'with', 'in', 'of', 'a', 'for', 'up', 'v.'])
  return name
    .split(/\s+/)
    .map((word, index) =>
      index > 0 && minor.has(word.toLowerCase())
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ')
}

async function fetchJson<T>(url: string, attempt = 1): Promise<T> {
  const MAX_ATTEMPTS = 8
  try {
    const response = await fetch(url)

    // 429 gets its own, much longer backoff — retrying a rate limit on the same schedule
    // as a network blip just burns the remaining quota.
    if (response.status === 429) {
      if (attempt >= MAX_ATTEMPTS) throw new Error('429 Too Many Requests (gave up)')
      const retryAfter = Number(response.headers.get('retry-after'))
      const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * attempt
      process.stdout.write(`\n  rate limited, waiting ${Math.round(wait / 1000)}s…`)
      await sleep(wait)
      return fetchJson<T>(url, attempt + 1)
    }

    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    return (await response.json()) as T
  } catch (error) {
    if (attempt >= MAX_ATTEMPTS) throw error
    await sleep(500 * 2 ** attempt)
    return fetchJson<T>(url, attempt + 1)
  }
}

/** Minimal PostgREST / Storage client over fetch. */
function makeClient(url: string, serviceKey: string) {
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  }

  return {
    async upsert(table: string, rows: unknown[], onConflict: string) {
      const response = await fetch(`${url}/rest/v1/${table}?on_conflict=${onConflict}`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows),
      })
      if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`)
    },

    async select<T>(table: string, query: string): Promise<T[]> {
      const response = await fetch(`${url}/rest/v1/${table}?${query}`, { headers })
      if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`)
      return (await response.json()) as T[]
    },

    async patch(table: string, query: string, body: unknown) {
      const response = await fetch(`${url}/rest/v1/${table}?${query}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`)
    },

    async upload(bucket: string, path: string, body: Uint8Array, contentType: string) {
      const response = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body,
      })
      if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`)
    },
  }
}

// -------------------------------------------------------------------- main
const DATASET_PATH = new URL('../data/exercises.json', import.meta.url)

async function fetchAllUpstream(): Promise<UpstreamExercise[]> {
  const all: UpstreamExercise[] = []
  let after: string | null = null
  let total = 0

  for (;;) {
    const query = `limit=${PAGE_SIZE}${after ? `&after=${encodeURIComponent(after)}` : ''}`
    const page: ExercisePage = await fetchJson<ExercisePage>(`${API}/exercises?${query}`)

    if (total === 0) total = page.meta.total
    all.push(...page.data)
    process.stdout.write(`\r  fetched ${all.length}/${total}`)

    if (!page.meta.hasNextPage || !page.meta.nextCursor) break
    after = page.meta.nextCursor
    await sleep(PAGE_DELAY_MS)
  }
  console.log('')
  return all
}

async function main() {
  const mirror = process.argv.includes('--mirror')
  const offline = process.argv.includes('--offline')
  const { url, serviceKey } = loadEnv()
  const db = makeClient(url, serviceKey)

  // ------------------------------------------------------------ load data
  let all: UpstreamExercise[]

  if (offline) {
    console.log(`Seeding from local dataset (no network)\n`)
    all = JSON.parse(readFileSync(DATASET_PATH, 'utf8')) as UpstreamExercise[]
    console.log(`  loaded ${all.length} exercises from data/exercises.json`)
  } else {
    console.log(`Seeding from ${API}${mirror ? ' (with GIF mirror)' : ''}\n`)
    all = await fetchAllUpstream()
  }

  // Abort rather than wipe: an upstream outage returning [] must not empty the catalog.
  if (all.length === 0) throw new Error('No exercises loaded; aborting rather than wiping')

  if (!offline) {
    mkdirSync(new URL('../data/', import.meta.url), { recursive: true })
    writeFileSync(DATASET_PATH, JSON.stringify(all, null, 2) + '\n')
    console.log(`  wrote data/exercises.json (${all.length} exercises)`)
  }
  console.log('')

  // --------------------------------------------------------------- upsert
  const rows = all.map((exercise) => ({
    source: 'system' as const,
    external_id: exercise.exerciseId,
    gym_id: null,
    name: titleCase(exercise.name),
    // null when the dictionary has no confident match — see exercise-names-fa.ts for why
    // a missing Persian name beats a plausible wrong one.
    name_fa: translateExerciseName(exercise.name, exercise.equipments ?? []).nameFa,
    body_parts: exercise.bodyParts ?? [],
    target_muscles: exercise.targetMuscles ?? [],
    secondary_muscles: exercise.secondaryMuscles ?? [],
    equipments: exercise.equipments ?? [],
    categories: categorise(exercise),
    instructions: (exercise.instructions ?? []).map(cleanInstruction).filter(Boolean),
    gif_url: exercise.gifUrl ?? null,
  }))

  const uncategorised = rows.filter((r) => r.categories.length === 0)
  if (uncategorised.length > 0) {
    console.log(`  ${uncategorised.length} uncategorised, e.g. ${uncategorised.slice(0, 5).map((r) => r.name).join(', ')}`)
  }

  const translated = rows.filter((r) => r.name_fa).length
  const pct = Math.round((translated / rows.length) * 100)
  console.log(`  Persian names: ${translated}/${rows.length} (${pct}%) — the rest keep English`)

  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const batch = rows.slice(i, i + UPSERT_BATCH)
    await db.upsert('exercises', batch, 'external_id')
    process.stdout.write(`\r  upserted ${Math.min(i + UPSERT_BATCH, rows.length)}/${rows.length}`)
  }
  console.log('\n  rows done\n')

  if (!mirror) {
    console.log('Catalog is live. Run with --mirror to copy GIFs into Storage.')
    return
  }

  // ---------------------------------------------------------- mirror GIFs
  // Resumable: rows that already have gif_path are skipped, so an interrupted run
  // picks up where it stopped.
  const pending = await db.select<{ id: string; external_id: string; gif_url: string }>(
    'exercises',
    'select=id,external_id,gif_url&source=eq.system&gif_path=is.null&gif_url=not.is.null&limit=5000',
  )

  console.log(`Mirroring ${pending.length} GIFs…`)

  let mirrored = 0
  let failed = 0
  // The media CDN rate-limits harder than the JSON API. At concurrency 8 with no retry,
  // roughly 40% of a 1500-file run fails. 4 workers plus backoff gets it done in one pass.
  const CONCURRENCY = 4
  const DOWNLOAD_ATTEMPTS = 5
  const queue = [...pending]

  async function downloadGif(url: string): Promise<Uint8Array> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        const response = await fetch(url)
        if (response.status === 429 || response.status >= 500) {
          throw new Error(`retryable ${response.status}`)
        }
        if (!response.ok) throw new Error(`fatal ${response.status}`)
        return new Uint8Array(await response.arrayBuffer())
      } catch (error) {
        const fatal = error instanceof Error && error.message.startsWith('fatal')
        if (fatal || attempt >= DOWNLOAD_ATTEMPTS) throw error
        await sleep(1000 * 2 ** (attempt - 1))
      }
    }
  }

  async function worker() {
    for (;;) {
      const item = queue.pop()
      if (!item) return
      try {
        const body = await downloadGif(item.gif_url)
        const path = `system/${item.external_id}.gif`

        await db.upload(BUCKET, path, body, 'image/gif')
        await db.patch('exercises', `id=eq.${item.id}`, { gif_path: path })

        mirrored += 1
      } catch {
        failed += 1
      }
      process.stdout.write(`\r  mirrored ${mirrored}, failed ${failed}, left ${queue.length}   `)
      await sleep(120) // gentle pacing; the CDN is the bottleneck, not us
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  console.log(`\n  mirror done — ${mirrored} copied, ${failed} failed`)
  if (failed > 0) {
    // Non-zero exit so a partial mirror is not mistaken for a complete one by CI or by
    // whoever is reading the tail of a long log.
    console.log('  re-run with --mirror to retry the failures (already-copied rows are skipped)')
    process.exitCode = 1
  }
}

main().catch((error: unknown) => {
  console.error('\nSeed failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
