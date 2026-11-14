import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { Surface } from './Button'

/*
 * No shadows anywhere. The reference builds depth from flat colour layering, not elevation —
 * adding a box-shadow here is the fastest way to make the whole app look like a different product.
 */
export type CardTone = 'warm' | 'cool'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  surface?: Surface
  /** Dark cards only: espresso (warm) or ink teal (cool). Ignored on light. */
  tone?: CardTone
  interactive?: boolean
  children: ReactNode
}

export function Card({
  surface = 'dark',
  tone = 'warm',
  interactive = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card p-card',
        surface === 'dark'
          ? [
              tone === 'warm' ? 'bg-surface-card' : 'bg-surface-card-deep',
              'text-on-dark',
              interactive && 'transition-colors hover:bg-surface-raised',
            ]
          : [
              'bg-surface-light text-on-light border border-line-light',
              interactive && 'transition-colors hover:bg-black/[0.03]',
            ],
        className,
      )}
      {...props}
    />
  )
}
