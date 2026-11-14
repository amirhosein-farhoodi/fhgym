import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { en } from './messages/en'
import { fa } from './messages/fa'
import { applyDirection, resolveInitialLocale, storeLocale } from './direction'
import { LOCALE_DIR, type InterpolationValues, type Locale, type Messages } from './types'
import { I18nContext, type I18nContextValue, type TranslateFn } from './context'

/*
 * Hand-rolled rather than i18next. Everything we need is exact-key type safety,
 * {name} interpolation and a direction switch — about fifty lines, no runtime dependency,
 * and compile-time key checking for free instead of via a TS augmentation dance.
 * Every call site goes through useT(), so swapping in i18next later stays contained.
 */
const MESSAGES: Record<Locale, Messages> = { en, fa }

function interpolate(template: string, values?: InterpolationValues): string {
  if (!values) return template
  return template.replace(/\{(\w+)\}/g, (match, token: string) => {
    const value = values[token]
    return value === undefined ? match : String(value)
  })
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => resolveInitialLocale())

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    storeLocale(next)
    applyDirection(next)
  }, [])

  const t = useCallback<TranslateFn>(
    (key, values) => {
      // Fall back to English rather than rendering the raw key: a stray English word is
      // recoverable, a user staring at `nav.trainees` is a bug report.
      const message = MESSAGES[locale][key] ?? en[key]
      return interpolate(message, values)
    },
    [locale],
  )

  const value = useMemo<I18nContextValue>(
    () => ({ locale, dir: LOCALE_DIR[locale], setLocale, t }),
    [locale, setLocale, t],
  )

  return <I18nContext value={value}>{children}</I18nContext>
}
