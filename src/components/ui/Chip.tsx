import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Toggleable filter / selection pill. One component for every chip row in the app so the
 * selected state reads the same everywhere: steel fill with a check, like a stamped tag.
 */
export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  active: boolean
  children: ReactNode
  size?: 'sm' | 'md'
}

export function Chip({ active, size = 'sm', className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border font-semibold capitalize transition-colors',
        size === 'sm' ? 'h-8 px-3 text-caption' : 'h-10 px-4 text-body-sm',
        active
          ? 'border-steel bg-steel text-cream'
          : 'border-line-strong/70 bg-surface-raised text-fg-muted hover:border-steel/40 hover:text-fg',
        className,
      )}
      {...props}
    >
      {active && <Check aria-hidden className="size-3.5" strokeWidth={3} />}
      {children}
    </button>
  )
}

/** A row of mutually exclusive options that look like one control (e.g. days per week). */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  render,
}: {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  label?: string
  render?: (value: T) => ReactNode
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex gap-0.5 self-start rounded-pill border border-line bg-surface-sunken/70 p-0.5"
    >
      {options.map((option) => {
        const selected = option === value
        return (
          <button
            key={String(option)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={cn(
              'h-9 min-w-10 rounded-pill px-3.5 text-body-sm font-semibold transition-colors',
              selected ? 'bg-steel text-cream shadow-sm' : 'text-fg-muted hover:text-fg',
            )}
          >
            {render ? render(option) : option}
          </button>
        )
      })}
    </div>
  )
}
