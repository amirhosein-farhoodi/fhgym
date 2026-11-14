import { createContext } from 'react'
import type { InterpolationValues, Locale, TranslationKey } from './types'

export type TranslateFn = (key: TranslationKey, values?: InterpolationValues) => string

export interface I18nContextValue {
  locale: Locale
  dir: 'rtl' | 'ltr'
  setLocale: (locale: Locale) => void
  t: TranslateFn
}

/** Split from the provider so the provider file exports a component and nothing else. */
export const I18nContext = createContext<I18nContextValue | null>(null)
