import { useState } from 'react'
import { Badge, Card } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useI18n, useT } from '@/lib/i18n'
import type { Exercise } from '@/lib/db.types'
import { exerciseImageUrl } from './useExercises'
import { exerciseName } from './name'

/*
 * A grid of 24 animated GIFs will stall a mid-range phone, which is most of the audience.
 * Two mitigations: loading="lazy" so offscreen images are never fetched, and a neutral
 * placeholder that holds layout so the grid does not jump as they arrive.
 * Transcoding to WebP/MP4 is the real fix and is on the v1.1 list.
 */
export interface ExerciseCardProps {
  exercise: Exercise
  selected?: boolean
  onSelect?: (exercise: Exercise) => void
  bookmarked?: boolean
  onToggleBookmark?: (exercise: Exercise, next: boolean) => void
}

export function ExerciseCard({
  exercise,
  selected = false,
  onSelect,
  bookmarked,
  onToggleBookmark,
}: ExerciseCardProps) {
  const { locale } = useI18n()
  const t = useT()
  const [loaded, setLoaded] = useState(false)
  const [broken, setBroken] = useState(false)
  const src = exerciseImageUrl(exercise)
  const interactive = Boolean(onSelect)
  const label = exerciseName(exercise, locale)

  // 176 of the 1500 upstream exercises have no GIF — the CDN 404s on them, so neither the
  // mirror nor the fallback URL resolves. They are still perfectly good exercises, so they
  // get a placeholder rather than being hidden or rendering a broken image icon.
  const showPlaceholder = !src || broken

  const content = (
    <>
      <div
        className={cn(
          'relative mb-3 aspect-square overflow-hidden rounded-[10px]',
          showPlaceholder ? 'bg-white/6' : 'bg-white',
        )}
      >
        {!loaded && !showPlaceholder && <div className="absolute inset-0 animate-pulse bg-white/10" />}

        {showPlaceholder ?
          <div className="flex h-full w-full items-center justify-center">
            <span aria-hidden className="font-display text-heading-sm text-white/25">
              {label.charAt(0)}
            </span>
          </div>
        : <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setBroken(true)}
            className={cn(
              'h-full w-full object-contain transition-opacity duration-200',
              loaded ? 'opacity-100' : 'opacity-0',
            )}
          />
        }
      </div>

      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-body-sm font-medium text-on-dark">{label}</p>
        {onToggleBookmark && (
          <button
            type="button"
            aria-pressed={bookmarked}
            aria-label={t(bookmarked ? 'exercises.bookmarked' : 'exercises.bookmark')}
            title={t(bookmarked ? 'exercises.bookmarked' : 'exercises.bookmark')}
            onClick={(event) => {
              event.stopPropagation()
              onToggleBookmark(exercise, !bookmarked)
            }}
            className={cn(
              'shrink-0 rounded-pill px-2 py-0.5 text-caption transition-colors',
              bookmarked ? 'text-status-due' : 'text-on-dark/35 hover:text-on-dark/70',
            )}
          >
            {bookmarked ? '★' : '☆'}
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {exercise.categories.slice(0, 2).map((category) => (
          <Badge key={category} tone="accent" className="capitalize">
            {category}
          </Badge>
        ))}
        {exercise.equipments.slice(0, 1).map((equipment) => (
          <Badge key={equipment} tone="neutral" className="capitalize">
            {equipment}
          </Badge>
        ))}
      </div>
    </>
  )

  if (!interactive) {
    return <Card className="flex flex-col">{content}</Card>
  }

  return (
    <Card
      className={cn(
        'flex cursor-pointer flex-col text-start transition-colors',
        selected ? 'bg-accent/20 ring-2 ring-accent' : 'hover:bg-surface-raised',
      )}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onSelect?.(exercise)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect?.(exercise)
        }
      }}
    >
      {content}
    </Card>
  )
}
