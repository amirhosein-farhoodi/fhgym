import { LOCALE_DIR, isLocale, type Locale } from './types'

const STORAGE_KEY = 'fh.locale'

/**
 * Persian-first: an Iranian gym should not have to switch languages to read its own app.
 * Browser preference only wins when it is explicitly a locale we ship.
 *
 * (PLAN.md §12 lists default locale as open. This is the assumption until told otherwise —
 * changing it is a one-line edit here.)
 */
const DEFAULT_LOCALE: Locale = 'fa'

export function readStoredLocale(): Locale | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isLocale(stored) ? stored : null
  } catch {
    // Private mode / blocked storage. Not worth failing a page load over.
    return null
  }
}

export function storeLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* ignore */
  }
}

export function resolveInitialLocale(): Locale {
  const stored = readStoredLocale()
  if (stored) return stored

  for (const tag of navigator.languages ?? []) {
    const base = tag.split('-')[0]
    if (isLocale(base)) return base
  }
  return DEFAULT_LOCALE
}

/**
 * Writes lang and dir onto <html>. Called once before React mounts so a Persian load
 * never flashes LTR, and again on every locale switch.
 */
export function applyDirection(locale: Locale): void {
  const root = document.documentElement
  root.lang = locale
  root.dir = LOCALE_DIR[locale]
}
