import type { en } from './messages/en'

export const LOCALES = ['fa', 'en'] as const
export type Locale = (typeof LOCALES)[number]

/** Direction per locale. The only place this mapping is allowed to live. */
export const LOCALE_DIR: Record<Locale, 'rtl' | 'ltr'> = {
  fa: 'rtl',
  en: 'ltr',
}

export type TranslationKey = keyof typeof en

/** Every locale must supply exactly the English key set — no more, no less. */
export type Messages = Record<TranslationKey, string>

export type InterpolationValues = Record<string, string | number>

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}
