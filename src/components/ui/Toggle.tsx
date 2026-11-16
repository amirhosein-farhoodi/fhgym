import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/*
 * The reference's sport-toggle pill, generalised. Used for language switching now and
 * for split selection (3/4/5/6 day) in the program builder later.
 *
 * Rendered as a real radiogroup rather than styled buttons so keyboard and screen-reader
 * users get arrow-key navigation for free.
 */
export interface ToggleOption<T extends string> {
  value: T
  label: ReactNode
  /** Accessible name when `label` is an icon rather than text. */
  ariaLabel?: string
}

export interface ToggleProps<T extends string> {
  options: ReadonlyArray<ToggleOption<T>>
  value: T
  onChange: (value: T) => void
  /** Accessible name for the group as a whole. */
  label: string
  className?: string
}

export function Toggle<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: ToggleProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-pill border border-line bg-surface-sunken/70 p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-pill px-3.5 py-1.5 text-caption font-semibold transition-colors',
              selected ? 'bg-steel text-cream shadow-sm' : 'text-fg-muted hover:text-fg',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
