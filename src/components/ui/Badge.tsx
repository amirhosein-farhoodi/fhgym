import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/*
 * App meanings, fixed so they stay consistent across every screen:
 *   done    (sage)    — set finished, session complete, trainee on track
 *   due     (copper)  — scheduled today, superset, attention needed
 *   accent  (pine)    — category / template
 *   neutral (sand)    — equipment, draft
 */
export type BadgeTone = 'done' | 'due' | 'accent' | 'neutral' | 'danger'

const TONES: Record<BadgeTone, string> = {
  done: 'bg-sage-soft text-pine-deep ring-sage',
  due: 'bg-copper-soft text-copper-deep ring-copper/50',
  accent: 'bg-pine-soft text-pine-deep ring-pine/30',
  neutral: 'bg-surface-sunken text-fg-muted ring-line-strong/60',
  danger: 'bg-danger-soft text-danger ring-danger/30',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  children: ReactNode
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-caption font-semibold ring-1 ring-inset [&_svg]:size-3.5',
        TONES[tone],
        className,
      )}
      {...props}
    />
  )
}
