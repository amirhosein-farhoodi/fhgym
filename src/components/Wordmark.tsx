import { cn } from '@/lib/cn'

/**
 * The FH barbell mark plus the product name. `compact` drops the text for tight headers.
 * `tone="inverse"` is for the steel hero band, where the charcoal H would disappear —
 * the mark sits on a cream plate there instead.
 */
export function Wordmark({
  className,
  compact = false,
  tone = 'default',
}: {
  className?: string
  compact?: boolean
  tone?: 'default' | 'inverse'
}) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)} role="img" aria-label="FH Gym Assistant">
      <span
        className={cn(
          'flex items-center',
          tone === 'inverse' && 'rounded-[12px] bg-cream px-2.5 py-1.5 shadow-card',
        )}
      >
        <img src="/logo-mark.png" alt="" width={297} height={120} className="h-9 w-auto" />
      </span>
      {!compact && (
        <span
          className={cn(
            'hidden flex-col leading-none sm:flex',
            tone === 'inverse' ? 'text-on-inverse' : 'text-fg',
          )}
        >
          <span className="font-display text-[1.15rem] tracking-wide">FH GYM</span>
          <span
            className={cn(
              'mt-0.5 text-[0.65rem] font-semibold tracking-[0.22em] uppercase',
              tone === 'inverse' ? 'text-sage' : 'text-copper-deep',
            )}
          >
            Assistant
          </span>
        </span>
      )}
    </span>
  )
}
