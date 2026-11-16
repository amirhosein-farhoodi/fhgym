import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface FieldProps {
  label: ReactNode
  // Explicit `| undefined`: exactOptionalPropertyTypes is on, so `error={maybeString}`
  // is a type error without it — and passing a computed maybe-error is the normal case.
  hint?: ReactNode | undefined
  error?: string | undefined
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode
}

/**
 * Wraps any control with a label, hint and error, wired up with the right aria-*.
 * Taking children as a render prop keeps the wiring in one place instead of duplicating
 * `aria-describedby` bookkeeping in every form.
 */
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-body-sm font-semibold text-fg">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-caption text-fg-muted">
          {hint}
        </p>
      )}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error && (
        <p id={errorId} role="alert" className="text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export function Input({ invalid = false, className, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        'h-11 w-full rounded-[12px] bg-surface-raised px-4 text-body text-fg',
        'border shadow-[inset_0_1px_2px_rgb(43_47_51/0.06)] transition-[border-color,box-shadow] placeholder:text-fg-subtle',
        invalid ? 'border-danger' : 'border-line-strong hover:border-steel/30 focus:border-accent',
        'focus:outline-none focus:ring-4 focus:ring-pine/15',
        className,
      )}
      {...props}
    />
  )
}
