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
      <label htmlFor={id} className="text-body-sm font-medium text-on-dark">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-caption text-muted-dark">
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
        'w-full rounded-special bg-white/6 px-4 py-3 text-body text-on-dark',
        'border transition-colors placeholder:text-muted-dark',
        invalid ? 'border-danger' : 'border-line-dark focus:border-accent',
        'focus:outline-none focus-visible:outline-2 focus-visible:outline-accent',
        className,
      )}
      {...props}
    />
  )
}
