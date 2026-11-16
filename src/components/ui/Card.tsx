import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { Surface } from './Button'

/*
 * Plaster on plaster: a lighter card on the cream page, a hairline edge and a low warm
 * shadow. `surface="dark"` is the steel variant for the occasional emphasis block.
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  surface?: Surface
  interactive?: boolean
  children: ReactNode
}

export function Card({ surface = 'light', interactive = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card p-card',
        surface === 'light'
          ? [
              'border border-line/70 bg-surface-card text-fg shadow-card',
              interactive &&
                'transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-raised',
            ]
          : [
              'bg-surface-inverse text-on-inverse',
              interactive && 'transition-colors hover:bg-steel-soft',
            ],
        className,
      )}
      {...props}
    />
  )
}
