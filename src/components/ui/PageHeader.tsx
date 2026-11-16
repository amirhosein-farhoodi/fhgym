import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Display } from './Display'

/**
 * Title block for every coach screen: icon tile, title, optional description and actions.
 * The copper rule under the eyebrow is the one place copper appears on every page — a
 * small repeated accent, like a brass fitting.
 */
export function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  icon?: LucideIcon
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-x-6 gap-y-4', className)}>
      <div className="flex min-w-0 items-start gap-4">
        {Icon && (
          <span className="mt-1 hidden size-12 shrink-0 items-center justify-center rounded-[14px] bg-steel text-sage shadow-card sm:flex">
            <Icon aria-hidden className="size-6" strokeWidth={1.75} />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1.5 flex items-center gap-2 text-caption font-semibold tracking-wide text-copper-deep uppercase">
              <span aria-hidden className="h-px w-5 bg-copper" />
              {eyebrow}
            </p>
          )}
          <Display size="md" as="h1" className="text-fg">
            {title}
          </Display>
          {description && <p className="mt-2 max-w-prose text-body-sm text-fg-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/** Friendly empty state: icon in a sage disc, a heading and a line of help. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: LucideIcon
  title: ReactNode
  body?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-card border border-dashed border-line-strong bg-surface-card/60 px-6 py-12 text-center',
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-sage-soft text-pine-deep ring-8 ring-sage-soft/50">
        <Icon aria-hidden className="size-6" strokeWidth={1.75} />
      </span>
      <h3 className="mt-5 font-display text-heading-sm text-fg">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-body-sm text-fg-muted">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
