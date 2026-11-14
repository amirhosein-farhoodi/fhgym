import type { Locale } from '@/lib/i18n'

/**
 * The name to show for an exercise in the current language.
 *
 * One name, not two. The locale switch decides which — showing both stacked makes the
 * switch meaningless and doubles the visual weight of every card.
 *
 * Persian falls back to English when `name_fa` is null, which is the case for ~25% of the
 * catalog where the dictionary had no confident translation. A coach reading
 * "Sled Hack Squat" in an otherwise Persian UI is fine; a wrong Persian name is not.
 */
export function exerciseName(
  exercise: { name: string; name_fa?: string | null },
  locale: Locale,
): string {
  if (locale === 'fa' && exercise.name_fa) return exercise.name_fa
  return exercise.name
}
