import { useState } from 'react'
import { UserRound } from 'lucide-react'
import { cn } from '@/lib/cn'
import { mediaCrossOrigin } from '@/features/exercises/useExercises'
import { monogram, publicMediaUrl } from './brand'

/**
 * The gym's logo, or — until the coach uploads one — a monogram tile in the gym's initials,
 * so a gym without a logo still looks deliberate rather than broken.
 */
export function GymAvatar({
  name,
  logoPath,
  className,
  rounded = 'rounded-[22%]',
}: {
  name: string
  logoPath: string | null | undefined
  className?: string
  rounded?: string
}) {
  const src = publicMediaUrl(logoPath)
  const [broken, setBroken] = useState(false)

  if (src && !broken) {
    return (
      <img
        src={src}
        crossOrigin={mediaCrossOrigin(src)}
        alt={name}
        onError={() => setBroken(true)}
        className={cn('shrink-0 bg-paper object-contain ring-1 ring-line/70', rounded, className)}
      />
    )
  }

  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        'flex shrink-0 items-center justify-center bg-pine-deep font-semibold text-cream ring-1 ring-pine/40',
        '[container-type:size]',
        rounded,
        className,
      )}
    >
      <span aria-hidden className="text-[38cqh] leading-none">
        {monogram(name) || '·'}
      </span>
    </span>
  )
}

/** Coach photo, or a neutral person glyph. */
export function CoachAvatar({
  name,
  url,
  className,
}: {
  name: string | null | undefined
  url: string | null | undefined
  className?: string
}) {
  const src = publicMediaUrl(url)
  const [broken, setBroken] = useState(false)

  if (src && !broken) {
    return (
      <img
        src={src}
        crossOrigin={mediaCrossOrigin(src)}
        alt={name ?? ''}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={cn('shrink-0 rounded-full object-cover ring-2 ring-paper', className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn('flex shrink-0 items-center justify-center rounded-full bg-sage-soft text-pine-deep ring-2 ring-paper', className)}
    >
      <UserRound className="size-1/2" />
    </span>
  )
}
