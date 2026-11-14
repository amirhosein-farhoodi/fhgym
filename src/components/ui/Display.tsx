import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/*
 * The poster voice. Every display size is fluid (see theme.css) and the font stack swaps
 * per language automatically, so this component never needs to know which locale is active.
 *
 * Left-aligned by default — the reference is emphatic that centring kills the broadside
 * effect. `text-start` rather than `text-left` so Persian pushes to the right edge instead.
 */
export type DisplaySize = 'xl' | 'lg' | 'md' | 'sm'

const SIZES: Record<DisplaySize, string> = {
  xl: 'text-display-xl',
  lg: 'text-display',
  md: 'text-heading',
  sm: 'text-heading-sm',
}

export interface DisplayProps extends HTMLAttributes<HTMLElement> {
  size?: DisplaySize
  as?: ElementType
  children: ReactNode
}

export function Display({
  size = 'lg',
  as: Tag = 'h1',
  className,
  children,
  ...props
}: DisplayProps) {
  return (
    <Tag
      className={cn('font-display text-start [text-wrap:balance]', SIZES[size], className)}
      {...props}
    >
      {children}
    </Tag>
  )
}
