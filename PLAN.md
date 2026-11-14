# FH Gym Assistant — Product & Technical Plan

> Coaches build workout programs. Trainees scan a QR code and see them.

**Status:** Phases 0-5 complete — full coach→trainee loop works · **Date:** 2026-09-17 · **Stack:** React + Vite + TypeScript + Supabase

---

## 1. What it is

A web app for gym coaches to write, assign and track workout programs for their trainees.

The insight driving the design: **coaches are busy and trainees are lazy.** So the coach flow must
make building a 4-day split take under two minutes, and the trainee flow must require zero account,
zero password, zero install — scan a code, see today's workout.

### Two doors on the front page

| Door | Who | How |
|---|---|---|
| **I'm a coach** | Gym owners / personal trainers | Google sign-in → gym name → trainee list |
| **I have a code** | Trainees | Scan QR (or open link) → straight into their plan |

---

## 2. Roles

- **Coach (owner)** — signs in with Google, owns one gym, full control.
- **Coach (staff)** — *v2*: invited by the owner, same powers scoped to the gym.
- **Trainee** — no account. Identified by a QR token issued by the coach. Read-only on their program,
  write-only on their own logs. Access revocable at any time by the coach.

---

## 3. Core flows

### 3.1 Coach onboarding
1. Land on `/` → "I'm a coach" → Google OAuth (Supabase Auth).
2. First login only: gym name, optional logo, units (kg/lb), language, week start day.
3. Lands on the dashboard — the empty state pushes one action: **Add your first trainee**.

### 3.2 Creating a trainee and issuing access
1. Short form: name, phone (optional), gender, birth date, height, goal, notes.
2. On save the server mints a random access token, stores only its **hash**, and returns the
   plaintext once. The app renders it as a QR code.
3. Coach can show the QR on screen, download it as PNG, or print a **trainee card**
   (gym logo + trainee name + QR + short human-readable code). Batch-print all cards for a new intake.
4. Coach can **rotate** the token (old QR dies instantly) or **revoke** access entirely.

### 3.3 Building a program
1. From a trainee's page → **New program** → blank, from a template, or copy an existing program.
2. Pick a split: 3 / 4 / 5 / 6 days a week, or a custom day count. Presets fill in sensible day
   labels (Push / Pull / Legs, Upper / Lower, bro split, full body).
3. For each day: name it, pick a focus (chest, back, legs…), then add exercises.
4. Adding an exercise opens the catalog drawer — filter by body part / target muscle / equipment,
   search by name, GIF previews inline, tap to add. Multi-select so a whole day goes in at once.
5. Per exercise set the prescription: sets, reps (or a range like `8–12`), weight or %1RM, tempo,
   rest, RPE, free-text note. Reorder by drag.
6. Group exercises into **blocks**: single, superset, circuit, or dropset.
7. Save as draft → **Activate** to publish it to the trainee.

### 3.4 Trainee experience

The program is **read-only**. The trainee never edits a prescription and never types a number. The
only thing they change is *where they are in the workout*.

1. Scans the QR → opens `/j/<token>` → session established silently → redirect to `/me`.
2. `/me` shows **today**: either today's workout or "Rest day — next session Wednesday".
3. Tap a workout → the **session player**: one exercise at a time, GIF looping, and the coach's
   prescribed sets/reps/rest shown as written, plus a rest timer.
4. **Current-exercise marker** — the trainee taps an exercise to make it the current one. It goes
   large, the GIF plays, and the rest of the day greys back. One tap to advance.
5. **Done state** — finishing an exercise marks it done for that date. The day view reads "5 of 7 done"
   and shows which.
6. **Last-session recall** — every day view opens with one line of history: *"Last chest day (Mon 14):
   6 of 7 done — skipped Cable Fly."* This is the reason to persist anything at all.
7. Tabs: **Today**, **Week** (the full program), **History** (what was done, and when).
8. Session persists in `localStorage` — no rescanning. Works offline once loaded (PWA).

Explicitly **not** in v1: weights, reps achieved, RPE, PRs, body metrics. Those turn the app from a
plan viewer into a training log, which is a separate product decision — see v1.1.

### 3.5 Coach oversight
- Dashboard: active trainees, who trained this week, who has gone quiet (no session opened in N days),
  programs expiring soon.
- Per trainee: completion rate by day and by week, session history, and **which exercises get skipped
  most** — a genuinely useful signal that a prescription is wrong or a machine is always occupied.
- Load progression, PRs and body composition arrive with logging in v1.1.

---

## 4. Feature scope

### MVP (v1) — ship this first
- Google auth for coaches, gym onboarding
- Trainee CRUD + QR issue / rotate / revoke + printable cards
- Exercise catalog (~1500 exercises with GIFs) with filter + search
- Coach-created custom exercises (own name, instructions, uploaded GIF/image or video URL)
- Program builder: days → blocks → exercises with full prescription
- Program templates (save a split once, reuse for every trainee)
- Trainee view: today / week / session player, current-exercise marker, per-exercise done state,
  last-session recall
- **Persian + English with RTL and Jalali dates** — built in from day one, not retrofitted
- Coach dashboard with completion rates and skipped-exercise signals

### v1.1
- Trainee logging of weight + reps + RPE, PR detection — the step from plan viewer to training log
- Body metrics + progress photos (private storage)
- Print / PDF export of a program — gyms *will* ask for this
- PWA install + offline program cache
- Optional per-gym 4-digit PIN on a trainee's first device

### v2 and beyond — ideas worth keeping on the list
- **Staff coaches** under one gym, with per-coach trainee assignment
- **Exercise alternatives** — "if the machine is taken, do X instead"; trainee can swap
- **Auto-progression rules** — "+2.5 kg/week on compounds", applied on program rollover
- **Periodization** — multi-week blocks with per-week variation
- **Coach ↔ trainee notes** — a comment thread per session, deliberately not a full chat
- **Form-check video** — trainee records a set, coach replies with a note
- **Warm-up / cooldown** as first-class day sections
- **Weekly volume-per-muscle chart** so the coach can see whether the split is balanced
- **Attendance / membership expiry** — many gyms want this more than they want programs
- **WhatsApp / SMS share** of the trainee link as an alternative to the QR
- **Nutrition notes** — free-text meal plan per trainee, not a calorie tracker

---

## 5. Exercise catalog — sourcing

Researched and verified live against the API on 2026-09-17.

### Chosen source: `oss.exercisedb.dev`

```
GET https://oss.exercisedb.dev/api/v1/exercises?limit=100          # cursor paginated
GET https://oss.exercisedb.dev/api/v1/exercises/search?search=bench
GET https://oss.exercisedb.dev/api/v1/bodyparts    # 10 values
GET https://oss.exercisedb.dev/api/v1/muscles      # ~45 values
GET https://oss.exercisedb.dev/api/v1/equipments   # 28 values
```

- **No API key, no auth.** 1500 exercises total.
- Object shape:
  ```json
  {
    "exerciseId": "01qpYSe",
    "name": "upward facing dog",
    "gifUrl": "https://static.exercisedb.dev/media/01qpYSe.gif",
    "bodyParts": ["back"],
    "equipments": ["body weight"],
    "targetMuscles": ["spine"],
    "secondaryMuscles": ["shoulders", "chest"],
    "instructions": ["Step:1 ...", "Step:2 ..."]
  }
  ```
- GIFs are ~67 KB each → **~105 MB for the full set**, comfortably inside Supabase's 1 GB free storage.
- Gotchas found while testing: the search param is `?search=`, **not** `?q=` (`?q=` silently returns
  an empty array). There are no `/bodyparts/:name/exercises` sub-resources — we filter in our own DB.

### Persian exercise names

Confirmed as in scope 2026-09-17: coaches need `پرس سینه`, not `Barbell Bench Press`.

Machine-translating all 1500 would produce confident nonsense — Persian gym vocabulary is trade
jargon, not literal translation (`lat pulldown` is `زیربغل سیم‌کش`, nothing to do with "lat" or
"pull"). The approach instead:

1. A **curated dictionary** in the repo covering the movements coaches actually prescribe, written
   as compositional rules (equipment term + movement term) plus exact overrides for the lifts whose
   Persian name is idiomatic.
2. Everything it cannot translate confidently keeps its English name rather than getting a guess.
3. `name_fa` is **editable by the coach in the UI**, and a coach's correction is worth more than any
   dictionary — they use these words every day.

### Local dataset

Also confirmed in scope: the catalog lives in the repo at `data/exercises.json`, not only upstream.

`pnpm seed:exercises` writes that file on every run, and `--offline` re-seeds from it without
touching the network. That means the Persian names are version-controlled and diffable, a fresh
Supabase project can be seeded with no internet, and upstream disappearing costs us nothing.

### Gym equipment and bookmarks

A coach's gym has maybe 30 of the 28 equipment types and a few hundred relevant movements out of
1500. Two features address that, both confirmed 2026-09-17:

- **Gym equipment profile** — the coach ticks what their gym actually has; the catalog filters to it
  by default, with a toggle to see everything.
- **Bookmarks** — a starred shortlist per gym, which becomes the default tab in the program builder's
  exercise picker. This is the one that saves real time: most coaches prescribe from a personal
  repertoire of 40-60 movements.

### Strategy: mirror, do not proxy

A one-off idempotent seed script pages the API, downloads every GIF into Supabase Storage, and
upserts rows into our `exercises` table. Reasons:

- No runtime dependency on a third party that can rate-limit, change shape, or disappear.
- Full-text search and faceted filtering in Postgres instead of N network round-trips.
- GIFs served from our own CDN, and we can later transcode to WebP/MP4 (GIFs are heavy for mobile).
- We normalise the data: strip the `Step:N ` prefixes, title-case names, add Persian names, and map
  the 45 raw muscle values onto a clean coach-facing taxonomy.

### Coach-facing categories

The raw data is muscle-oriented; coaches think in **training days**. We add a category layer and tag
each exercise into one or more of:

`Chest · Back · Shoulders · Arms (Biceps/Triceps) · Legs (Quads/Hamstrings/Glutes/Calves) · Core ·
Cardio · Full Body · Mobility`

Plus day presets: **Push · Pull · Leg Day · Upper · Lower · Full Body**. This mapping lives in a
checked-in `exercise-taxonomy.ts` so it is reviewable and editable rather than buried in a migration.

### Licensing — verify before launch

The ExerciseDB server code on GitHub is **AGPL-3.0**. We consume the API and mirror data rather than
redistribute their server, but the *dataset and GIF* licensing needs an explicit answer.
Keep these fallbacks ready:

- [`yuhonas/free-exercise-db`](https://github.com/yuhonas/free-exercise-db) — ~800 exercises, static photos, permissive
- [`wger`](https://github.com/wger-project/wger) — AGPL, self-hostable, weak imagery
- Commercial APIs (WorkoutX, RepDB, YMove) if we need a clean license with good media

Design the `exercises` table so the source is swappable: keep `source` and `external_id` columns and
never let source-specific shape leak into the UI.

Sources: [ExerciseDB docs](https://oss.exercisedb.dev/docs) · [ExerciseDB on GitHub](https://github.com/ExerciseDB/exercisedb-api) · [alternatives comparison](https://repdb.co/blog/exercisedb-alternatives-2026/)

---

## 6. Authentication design

This is the trickiest part of the app, because trainees have no accounts.

### Coaches
Standard Supabase Auth with the Google provider. `auth.uid()` drives every RLS policy.

### Trainees — recommended: anonymous auth + token claim

1. Coach creates a trainee. An Edge Function generates 32 random bytes, stores
   `sha256(token)` in `trainees.access_token_hash`, and returns the plaintext **once**.
2. QR encodes `https://app.example.com/j/<token>`.
3. Trainee opens it. The client calls `supabase.auth.signInAnonymously()` — a real Supabase user
   with a real JWT, but no email or password.
4. The client calls the `claim-trainee` Edge Function with the token. The function hashes it, finds
   the trainee, checks `revoked_at` and the device cap, and inserts a row into `trainee_devices`
   linking `auth.uid()` → `trainee_id`.
5. From then on, **normal PostgREST calls work and RLS enforces everything** via:
   ```sql
   trainee_id IN (SELECT trainee_id FROM trainee_devices WHERE auth_user_id = auth.uid())
   ```

Why this over signing our own JWTs with the Supabase JWT secret: Supabase has moved to asymmetric
JWT keys and the shared-secret path is on a deprecation track. Anonymous auth is first-class,
survives that migration, and gives us Realtime and Storage RLS for free.

**Fallback if anonymous auth proves awkward:** a small Edge Function API (`trainee-me`,
`trainee-program`, `trainee-log`) that validates the token itself and uses the service role
internally. Simpler to reason about, but we hand-write the endpoints and lose free Realtime.

### Security properties to build in

**The session never expires.** Confirmed 2026-09-17: a trainee scans once and stays signed in
indefinitely. The only way out is the coach revoking them. This is a deliberate choice — a trainee
re-scanning a QR they no longer have access to is a support call the coach does not want.

- Token is **hashed at rest** — a database leak does not hand over logins.
- **Revoke** is the coach's kick switch: sets `revoked_at`, deletes every device row, session dies
  on next request.
- **Rotate** issues a new token and invalidates the old QR, for when a code leaks but the trainee stays.
- **Device cap** defaults to 5 and exists only to bound accidental sharing. It is per-trainee and
  editable, not a security boundary — the coach kicking someone is.
- **Optional 4-digit PIN** per gym — deferred. A nullable `pin_hash` column and a `require_pin`
  gym flag are already in the schema, so enabling it later is a UI change and not a migration.
- Rate-limit `claim-trainee` by IP; enable Supabase's captcha on anonymous sign-in.
- Scheduled cleanup of anonymous users with no `trainee_devices` row after 24h.

Honest assessment: anyone holding the QR image can see that trainee's workout plan. That is the
trade-off we are deliberately making for frictionless access, and it is acceptable for workout data.
It would not be acceptable if we ever store health records or payment data — so we should not.

---

## 7. Data model

```
gyms                 id, owner_id→auth.users, name, logo_path, locale, unit_system,
                     week_start, require_pin, timezone, created_at

profiles             id=auth.users.id, gym_id, display_name, avatar_url, role(owner|coach)

trainees             id, gym_id, full_name, phone, gender, birth_date, height_cm, goal,
                     notes, access_token_hash, token_version, pin_hash, device_cap,
                     status(active|paused|archived), revoked_at, created_by, created_at

trainee_devices      id, trainee_id, auth_user_id UNIQUE, label, user_agent,
                     last_seen_at, created_at

exercises            id, source(system|custom), external_id, gym_id NULL,
                     name, name_fa, body_parts[], target_muscles[], secondary_muscles[],
                     equipments[], categories[], instructions[], gif_path, video_url,
                     difficulty, is_unilateral, search_tsv, created_at

programs             id, gym_id, trainee_id NULL, is_template, title, description,
                     days_per_week, start_date, end_date,
                     status(draft|active|completed|archived), created_by, created_at

program_days         id, program_id, day_index, title, focus[], notes, is_rest_day

program_blocks       id, day_id, position, type(single|superset|circuit|dropset),
                     label, rounds, rest_seconds

program_exercises    id, block_id, exercise_id, position, sets, reps_min, reps_max,
                     weight, weight_unit, percent_1rm, tempo, rest_seconds, target_rpe,
                     duration_seconds, distance_m, notes, alt_exercise_id

workout_sessions     id, trainee_id, program_day_id, date, current_exercise_id,
                     status(in_progress|completed|abandoned), started_at, completed_at

exercise_progress    id, session_id, program_exercise_id, is_done, done_at
                     -- v1 stores completion only; v1.1 adds reps / weight / rpe columns here

body_metrics         id, trainee_id, date, weight_kg, body_fat_pct,          -- v1.1
                     chest_cm, waist_cm, hip_cm, arm_cm, thigh_cm, photo_paths[]
```

**Storage buckets:** `exercise-media` (public), `gym-logos` (public), `progress-photos` (private, RLS).

**RLS in one sentence each:**
- Coach rows: `gym_id IN (SELECT gym_id FROM profiles WHERE id = auth.uid())`
- Trainee rows: `trainee_id IN (SELECT trainee_id FROM trainee_devices WHERE auth_user_id = auth.uid())`
- `exercises`: readable by anyone authenticated when `source = 'system'`; custom rows scoped to `gym_id`.
- Trainees get `SELECT` on their active program tree and `INSERT/UPDATE` only on their own
  `workout_sessions` and `exercise_progress` rows. They get **no** `UPDATE` anywhere in the program
  tree — read-only is enforced in the database, not merely hidden in the UI.

Write the policies as **separate per-operation policies**, not one blanket `FOR ALL` — it is the
difference between a reviewable security model and a guess.

---

## 8. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Build | **Vite + React 19 + TypeScript** | Fast, no SSR needed — this is an app behind auth |
| Styling | **Tailwind v4** (`@theme` tokens) | The style reference is already written as `@theme` |
| Routing | **React Router v7** (data mode) | Loaders pair well with route-level auth guards |
| Server state | **TanStack Query** | Caching, optimistic set-logging, offline retry |
| Forms | **react-hook-form + zod** | One zod schema shared by form and API validation |
| UI state | **Zustand** | Builder draft state, session player — small and local |
| Drag & drop | **@dnd-kit** | Reordering exercises and days; touch-friendly |
| Backend | **Supabase** | Postgres + Auth + Storage + Edge Functions + RLS |
| Charts | **Recharts** | Progress and volume charts |
| QR | **qrcode.react** (render) + **@zxing/browser** (scan) | Coach renders, trainee's camera app usually scans |
| Dates | **dayjs** + `jalaliday` plugin | Jalali support without a second date library |
| Animation | **Motion** (framer-motion) | Sparingly — page transitions and the session player |
| PWA | **vite-plugin-pwa** | Offline program cache, installable |
| Testing | **Vitest** + **Playwright** | Unit for taxonomy/progression logic, E2E for both auth flows |

### Project structure

```
src/
  app/                  router, providers, guards
  features/
    auth/               coach OAuth, trainee claim
    gym/                onboarding, settings
    trainees/           list, profile, QR card
    exercises/          catalog browser, custom exercise editor
    programs/           builder, templates, day/block/exercise editors
    session/            trainee session player, rest timer
    progress/           metrics, charts, PRs
    dashboard/          coach overview
  components/ui/        design-system primitives (Button, Pill, Card, Badge, Display)
  lib/                  supabase client, query client, zod schemas, date, i18n
  styles/theme.css      the @theme token block
supabase/
  migrations/
  functions/            issue-trainee-token, claim-trainee, rotate-token
scripts/
  seed-exercises.ts     one-off catalog import
```

### Routes

```
/                       landing — poster hero, two doors
/auth/callback          OAuth return
/onboarding             gym setup (first login only)
/coach                  dashboard
/coach/trainees         list
/coach/trainees/new
/coach/trainees/:id     profile · programs · progress · QR
/coach/programs         template library
/coach/programs/:id     builder
/coach/exercises        catalog
/coach/exercises/new    custom exercise
/coach/settings
/j/:token               QR landing → claim → redirect
/me                     trainee: today
/me/week                full program
/me/day/:dayId          session player
/me/progress
```

---

## 9. Design system

The Champions4good reference is the base. Adapting it to a gym app needs four decisions.

### Font substitution (Druk and Neue Montreal are commercial)
- **Display** → **Bebas Neue** (closest free condensed poster face), Oswald 700 as the alternate.
- **UI** → **Inter**, matching Neue Montreal's geometric quiet.
- **Persian** → **Morabba** Bold for display, **Vazirmatn** for UI. Persian has no true
  ultra-condensed display face, so the Persian hero reads considerably wider than the Latin one.
  Budget for a **separate Persian type scale** rather than forcing one scale to serve both — this is
  the single most common way bilingual poster typography goes wrong.

### Fluid type — non-negotiable
A 317px headline is a desktop poster, not a phone screen. Every display token becomes a clamp:
```css
--text-display-xl: clamp(80px, 22vw, 317px);
--text-display:    clamp(56px, 14vw, 187px);
--text-heading:    clamp(32px,  6vw,  58px);
```
The poster energy survives; the layout stops breaking at 390px.

### Color roles in an app context
The reference is a marketing site; we are building a tool. The mapping:

| Token | App role |
|---|---|
| Deep Plum `#23002b` | App shell, nav, hero, trainee session player background |
| Lavender Shock `#e894ff` | Primary interactive accent on dark: buttons, active nav, selected states |
| Espresso `#291900` / Ink Teal `#002629` | Card surfaces on plum |
| Paper White `#ffffff` | Data-dense screens — program builder, exercise catalog, tables |
| Mint Signal `#93ffe4` | Status: completed set, completed session, "on track" |
| Amber Pulse `#ffac47` | Status: due today, program expiring, "hasn't trained in 5 days" |
| Charcoal / Slate | Text on white sections |

**One contradiction to settle:** the reference says both "do not promote lavender to the primary CTA
color" and "Filled Lavender Button — primary action". Resolution: **lavender is the primary action on
dark surfaces; on white surfaces the primary button is a plum fill with white text.** Lavender on
white is banned by the reference anyway and fails contrast — so this is consistent either way.
Mint and amber stay as status punctuation and never become buttons.

### Where the poster type actually goes
Display type at 187px+ belongs on: the landing page, the trainee's "TODAY" / "REST DAY" screen, the
exercise name in the session player, and empty states. The program builder and catalog are dense
working surfaces — those get Inter at 14–16px and white ground. The contrast between the two modes
*is* the product's personality: the coach's tools are quiet, the trainee's experience is loud.

### Bilingual and RTL

Persian and English are both first-class, so RTL is a structural constraint rather than a later
theme. The rules:

- **Logical properties only.** `padding-inline`, `margin-inline-start`, `inset-inline-end`,
  `text-align: start`. No `left` / `right` anywhere in the codebase, enforced by a lint rule that
  fails the build.
- **`dir` on `<html>`**, flipped by the locale, so Tailwind's `rtl:` / `ltr:` variants work.
- **Two type scales** — the Latin scale from the reference, and a Persian scale with larger
  line-heights (Persian needs ~1.6 for body where Latin reads fine at 1.43) and no negative tracking.
- **Numbers stay Latin** in the UI chrome (sets, reps, weights) — Persian gyms read `3 × 12` fine and
  Persian digits in a numeric table hurt scanability. Jalali dates use Persian digits.
- **Mirror the icons that have direction** (arrows, chevrons, progress) and nothing else. A dumbbell
  does not mirror.
- Copy lives in `lib/i18n` with typed keys, not inline strings — the Persian pass in Phase 7 is then
  a translation file, not a code hunt.

### Logo
Wordmark placeholder following the reference's stacked treatment: **FH / GYM / ASSISTANT** in three
lines, Bebas Neue, Lavender Shock on plum, with a Persian lockup in Morabba. Replaceable with the
real mark when it lands.

---

## 10. Build phases

| Phase | Deliverable | Notes |
|---|---|---|
| **0 — Foundation** ✅ | Vite + TS + Tailwind v4 theme, both font stacks, UI primitives, i18n + RTL scaffolding, migration skeleton | Done 2026-09-17. Typecheck, both linters, 19 tests and the production build all pass. Supabase project still pending credentials |
| **1 — Coach identity** ✅ | Google OAuth, gym onboarding, profiles, RLS baseline | Code complete 2026-09-17; unverified against a live project. Needs the console steps in [SETUP.md](SETUP.md) |
| **2 — Trainees + QR** ✅ | Trainee CRUD, token issue/rotate/revoke, Edge Functions, QR render, printable cards | Ship the `/j/:token` claim flow end-to-end even before programs exist |
| **3 — Exercise catalog** ✅ | Seed script, catalog browser with filters + search, custom exercises | Longest single task is the seed + storage upload |
| **4 — Program builder** ✅ | Days, blocks, exercises, prescriptions, drag-reorder, templates | The heaviest UI work in the app — expect it to take as long as phases 0–3 combined |
| **5 — Trainee app** ✅ | Today / week / session player, current marker, done state, last-session recall | First moment the product is usable by a real gym |
| **6 — Coach insight** | Completion rates, session history, skipped-exercise signals, dashboard | All derived from `exercise_progress` — no numeric logging in v1 |
| **7 — Polish** | PWA + offline queue, PDF/print export, full Persian copy pass, empty and error states | |

Phases 1–2 and 3 are independent and can run in parallel if there is more than one person.

---

## 10a. Toolchain pins (Phase 0 findings)

Two versions are deliberately held back. Both are worth revisiting, neither is worth fighting now.

| Pin | Why | Revisit when |
|---|---|---|
| `typescript@6.0.3` (not 7.x) | TypeScript 7 is the native Go compiler. `typescript-eslint@8` refuses to load against it outright — the whole lint step dies, and the RTL rule dies with it. TS 6 is the last release with the JS API the ecosystem targets | typescript-eslint ships TS 7 support ([issue #10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)) |
| `jsdom@26` (not 30) | jsdom 30 pulls undici 8, which calls `webidl.util.markAsUncloneable` — a Node 22 API. This machine runs Node 20.19.5, so every test worker crashes on startup | Node is upgraded to 22 LTS |

Also worth knowing: TS 7 removed `baseUrl`, so `paths` in the tsconfigs resolve relative to the
config file. That form works under both 6 and 7, so it stays as-is after the pin lifts.

---

## 11. Things that will bite us

- **The program builder is the whole app.** Nested drag-and-drop over days → blocks → exercises with
  dirty-state handling is where the schedule goes. Design the draft state model before writing UI.
- **GIF weight.** 1500 GIFs at 67 KB is fine to store, but a catalog grid of 40 animated GIFs will
  stall a mid-range phone. Lazy-load, show a static first frame until in view, and plan the WebP
  transcode for v1.1.
- **Anonymous user sprawl.** Every QR scan on a new device creates a Supabase user. Needs a cleanup job.
- **Offline writes.** A trainee marking exercises done in a basement with no signal must not lose
  that state. The v1 payload is tiny — a boolean per exercise — so a `localStorage` write queue
  flushed on reconnect is enough. Worth building now, because v1.1 logging inherits it.
- **RTL drift.** Logical properties hold only if they are enforced. Add the Stylelint/ESLint rule in
  Phase 0; without it, physical `left`/`right` creeps back in by month two and the Persian layout
  quietly rots.
- **Timezone.** "Today's workout" must resolve in the *gym's* timezone, not the browser's.

---

## 12. Decisions

| Decision | Call | Date |
|---|---|---|
| **Language** | Persian + English, with RTL and Jalali dates built in from day one | 2026-09-17 |
| **Trainee interaction** | Read-only program. Current-exercise marker, per-exercise done state, last-session recall. No weights, reps or RPE in v1 | 2026-09-17 |
| **QR security** | Link + device cap of 3 + coach rotate/revoke. PIN deferred to v1.1 with the schema left ready | 2026-09-17 |
| **Exercise source** | Mirror `oss.exercisedb.dev` into Supabase; keep the schema source-swappable | 2026-09-17 |

### Still open

- **Supabase project** — new or existing? Credentials needed by Phase 1.
- **Default locale** — does the app open in Persian with English available, or follow the browser?
- **Persian exercise names** — machine-translate the 1500 seeded names as a starting point and let
  coaches correct them, or ship the catalog in English for v1 and translate the category layer only?
  (My lean: translate the ~40 category and equipment terms by hand, leave exercise names English in
  v1. Coaches use the English names in gyms anyway, and 1500 bad machine translations are worse than
  none.)
- **Dataset licensing** — the AGPL question in §5 needs a written answer before launch, not before
  Phase 3. Build against it, be ready to swap.

---

## 13. Next step

Phase 0: scaffold Vite + TS, lay in the Tailwind theme and both font stacks, set up i18n with RTL and
the lint rule that protects it, and build the UI primitive set. Blocked on nothing — the Supabase
credentials are only needed at Phase 1.
