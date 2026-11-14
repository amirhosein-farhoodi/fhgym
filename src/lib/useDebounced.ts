import { useEffect, useState } from 'react'

/**
 * Delays a fast-changing value so it can be used as a query key.
 *
 * Without it, every keystroke in the exercise search is a round trip — 1500 rows of
 * catalog and a coach typing "incline dumbbell" is fifteen requests.
 */
export function useDebounced<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
