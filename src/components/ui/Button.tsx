import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/*
 * `surface` says what the button sits on. Almost everything sits on cream ("light");
 * the steel hero band is the one dark surface, where the primary flips to cream-on-steel
 * contrast rather than pine, which would sink into the charcoal.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type Surface = 'dark' | 'light'

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-caption [&_svg]:size-4',
  md: 'h-11 px-5 text-body-sm [&_svg]:size-[18px]',
  lg: 'h-13 px-7 text-body [&_svg]:size-5',
}

const VARIANTS: Record<Surface, Record<ButtonVariant, string>> = {
  light: {
    primary:
      'bg-accent text-on-accent shadow-[0_1px_0_rgb(255_255_255/0.15)_inset,0_6px_16px_-8px_rgb(47_101_92/0.7)] hover:bg-pine active:translate-y-px',
    secondary: 'border border-line-strong bg-surface-raised text-fg hover:border-steel/40 hover:bg-paper',
    ghost: 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
    danger: 'bg-danger text-paper hover:brightness-110',
  },
  dark: {
    primary: 'bg-cream text-steel hover:bg-paper active:translate-y-px',
    secondary: 'border border-line-inverse text-on-inverse hover:bg-cream/10',
    ghost: 'text-on-inverse-muted hover:bg-cream/10 hover:text-on-inverse',
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
    surface = 'light',
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
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-pill font-semibold whitespace-nowrap',
        'transition-[background-color,border-color,color,filter,transform] duration-150',
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
