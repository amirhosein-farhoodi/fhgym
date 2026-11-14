import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/*
 * Mint and amber live here and nowhere else. The reference is explicit that they are
 * punctuation, not surfaces — they must never become a button or a page background.
 *
 * App meanings, fixed so they stay consistent across every screen:
 *   done    (mint)     — set finished, session complete, trainee on track
 *   due     (amber)    — scheduled today, program expiring, attention needed
 *   accent  (lavender) — neutral category / count
 */
export type BadgeTone = 'done' | 'due' | 'accent' | 'neutral' | 'danger'

const TONES: Record<BadgeTone, string> = {
  done: 'bg-status-done text-ink',
  due: 'bg-status-due text-espresso',
  accent: 'bg-accent text-plum',
  neutral: 'bg-white/12 text-on-dark',
  danger: 'bg-danger text-paper',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  children: ReactNode
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-tag px-2.5 py-1 text-caption font-medium',
        TONES[tone],
        className,
      )}
      {...props}
    />
  )
}
