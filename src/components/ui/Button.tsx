import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/*
 * The `surface` prop encodes the one colour rule this design system has:
 * lavender is the primary action on dark, plum is the primary action on light.
 * Lavender on white fails contrast and the reference bans it outright — so instead of
 * asking every call site to remember that, the component resolves it.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type Surface = 'dark' | 'light'

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-4 py-1.5 text-caption',
  md: 'px-5 py-3 text-body-sm',
  lg: 'px-8 py-4 text-body',
}

const VARIANTS: Record<Surface, Record<ButtonVariant, string>> = {
  dark: {
    primary: 'bg-accent text-plum hover:brightness-110 active:brightness-95',
    secondary: 'border border-accent text-accent hover:bg-accent/10',
    ghost: 'text-on-dark/80 hover:text-on-dark hover:bg-white/8',
    danger: 'bg-danger text-paper hover:brightness-110',
  },
  light: {
    primary: 'bg-plum text-paper hover:brightness-125',
    secondary: 'border border-line-light text-on-light hover:bg-black/5',
    ghost: 'text-on-light hover:bg-black/5',
    danger: 'bg-danger text-paper hover:brightness-110',
  },
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  surface?: Surface
  fullWidth?: boolean
  children: ReactNode
}

/** forwardRef so dialogs can move focus here on open. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    surface = 'dark',
    fullWidth = false,
    className,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        // Pill everywhere: the reference has no sharp corners on interactive elements.
        'inline-flex items-center justify-center gap-2 rounded-pill font-medium',
        'transition-[filter,background-color,color] duration-150',
        'disabled:pointer-events-none disabled:opacity-45',
        SIZES[size],
        VARIANTS[surface][variant],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    />
  )
})
