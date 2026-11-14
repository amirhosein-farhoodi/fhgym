import { describe, expect, it } from 'vitest'
import { en } from './messages/en'
import { fa } from './messages/fa'
import { LOCALE_DIR, LOCALES, isLocale } from './types'

/*
 * Key parity is already a compile error via the Messages type. This covers what the type
 * cannot: a key present but left as an empty string, or a Persian value accidentally left
 * in English during a translation pass.
 */
describe('translations', () => {
  it('fa covers exactly the en key set', () => {
    expect(Object.keys(fa).sort()).toEqual(Object.keys(en).sort())
  })

  it('has no empty values in either locale', () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value.trim(), `en.${key} is empty`).not.toBe('')
    }
    for (const [key, value] of Object.entries(fa)) {
      expect(value.trim(), `fa.${key} is empty`).not.toBe('')
    }
  })

  it('translates Persian values rather than copying English through', () => {
    // Keys that are legitimately identical across locales: proper nouns and language names.
    const allowedIdentical = new Set(['lang.en', 'lang.fa'])

    const untranslated = Object.keys(en).filter((key) => {
      const k = key as keyof typeof en
      return !allowedIdentical.has(key) && fa[k] === en[k]
    })

    expect(untranslated, `still English in fa.ts: ${untranslated.join(', ')}`).toEqual([])
  })
})

describe('locales', () => {
  it('maps every locale to a direction', () => {
    for (const locale of LOCALES) {
      expect(LOCALE_DIR[locale]).toMatch(/^(rtl|ltr)$/)
    }
  })

  it('rejects unknown locale tags', () => {
    expect(isLocale('fa')).toBe(true)
    expect(isLocale('de')).toBe(false)
    expect(isLocale(null)).toBe(false)
  })
})
