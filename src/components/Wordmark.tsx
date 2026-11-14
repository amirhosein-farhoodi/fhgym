import { cn } from '@/lib/cn'

/**
 * Placeholder mark, following the reference's stacked wordmark treatment:
 * three lines, condensed display face, lavender on plum. Swap for the real logo when it lands.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn('font-display leading-[0.82] text-accent text-start', className)}
      aria-label="FH Gym Assistant"
      role="img"
    >
      <span className="block text-[1.35rem]">FH</span>
      <span className="block text-[1.35rem]">GYM</span>
      <span className="block text-[1.35rem]">ASSISTANT</span>
    </span>
  )
}
