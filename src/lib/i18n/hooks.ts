import { use } from 'react'
import { I18nContext, type I18nContextValue, type TranslateFn } from './context'

export function useI18n(): I18nContextValue {
  const ctx = use(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}

/** Convenience for the common case: `const t = useT()`. */
export function useT(): TranslateFn {
  return useI18n().t
}
