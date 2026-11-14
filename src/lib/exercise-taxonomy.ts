/*
 * Coach-facing categories.
 *
 * The upstream data is muscle-oriented (50 muscle names, 10 body parts). Coaches think in
 * training days — "chest day", "leg day", "push". This file is the bridge, and it lives in
 * version control rather than in a migration so it is reviewable and correctable: the
 * mapping is a judgement call, not a fact, and a coach will eventually disagree with one.
 *
 * Applied at seed time (scripts/seed-exercises.ts) and when a coach saves a custom exercise.
 */

export const CATEGORIES = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'neck',
  'cardio',
  'mobility',
] as const

export type Category = (typeof CATEGORIES)[number]

/** Split presets the program builder offers when a coach picks a day's focus. */
export const DAY_PRESETS: Record<string, Category[]> = {
  push: ['chest', 'shoulders', 'triceps'],
  pull: ['back', 'biceps', 'forearms'],
  legs: ['quads', 'hamstrings', 'glutes', 'calves'],
  upper: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
  lower: ['quads', 'hamstrings', 'glutes', 'calves'],
  core: ['core'],
  'full-body': ['chest', 'back', 'quads', 'shoulders', 'core'],
}

/**
 * Muscle name -> category. Verified against the live vocabulary on 2026-09-17 (50 names).
 * Anything unmapped falls through to the body-part map below rather than being dropped.
 */
const MUSCLE_TO_CATEGORY: Record<string, Category> = {
  // chest
  chest: 'chest',
  pectorals: 'chest',
  'upper chest': 'chest',
  'serratus anterior': 'chest',

  // back
  back: 'back',
  'upper back': 'back',
  'lower back': 'back',
  lats: 'back',
  'latissimus dorsi': 'back',
  rhomboids: 'back',
  trapezius: 'back',
  traps: 'back',
  spine: 'back',
  'levator scapulae': 'back',

  // shoulders
  shoulders: 'shoulders',
  deltoids: 'shoulders',
  delts: 'shoulders',
  'rear deltoids': 'shoulders',
  'rotator cuff': 'shoulders',

  // arms
  biceps: 'biceps',
  brachialis: 'biceps',
  triceps: 'triceps',
  forearms: 'forearms',
  'grip muscles': 'forearms',
  'wrist extensors': 'forearms',
  'wrist flexors': 'forearms',
  wrists: 'forearms',
  hands: 'forearms',

  // legs
  quadriceps: 'quads',
  quads: 'quads',
  'hip flexors': 'quads',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  abductors: 'glutes',
  adductors: 'quads',
  'inner thighs': 'quads',
  groin: 'quads',
  calves: 'calves',
  soleus: 'calves',
  shins: 'calves',

  // core
  abs: 'core',
  abdominals: 'core',
  'lower abs': 'core',
  obliques: 'core',
  core: 'core',

  // other
  neck: 'neck',
  sternocleidomastoid: 'neck',
  'cardiovascular system': 'cardio',

  // mobility / stability work — these appear as targets on stretches and balance drills
  ankles: 'mobility',
  'ankle stabilizers': 'mobility',
  feet: 'mobility',
}

/** Coarser fallback when no target muscle maps cleanly. */
const BODY_PART_TO_CATEGORY: Record<string, Category> = {
  chest: 'chest',
  back: 'back',
  shoulders: 'shoulders',
  'upper arms': 'biceps',
  'lower arms': 'forearms',
  'upper legs': 'quads',
  'lower legs': 'calves',
  waist: 'core',
  neck: 'neck',
  cardio: 'cardio',
}

export interface CategorisableExercise {
  bodyParts?: string[]
  targetMuscles?: string[]
  secondaryMuscles?: string[]
  name?: string
}

/**
 * Categories for one exercise, most relevant first.
 *
 * Target muscles drive the primary category. Secondary muscles are included too — a coach
 * browsing "triceps" genuinely wants to see bench press — but only after the primaries, so
 * ordering still reflects what the movement is actually for.
 */
export function categorise(exercise: CategorisableExercise): Category[] {
  const result: Category[] = []

  const push = (category: Category | undefined) => {
    if (category && !result.includes(category)) result.push(category)
  }

  for (const muscle of exercise.targetMuscles ?? []) {
    push(MUSCLE_TO_CATEGORY[muscle.toLowerCase().trim()])
  }

  // Body-part fallback only if the target muscles produced nothing at all.
  if (result.length === 0) {
    for (const part of exercise.bodyParts ?? []) {
      push(BODY_PART_TO_CATEGORY[part.toLowerCase().trim()])
    }
  }

  for (const muscle of exercise.secondaryMuscles ?? []) {
    push(MUSCLE_TO_CATEGORY[muscle.toLowerCase().trim()])
  }

  // Stretches and mobility drills are named, not tagged, upstream.
  if (/\b(stretch|mobility|foam roll)\b/i.test(exercise.name ?? '')) push('mobility')

  return result
}
