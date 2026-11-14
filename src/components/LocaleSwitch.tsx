import { Toggle } from '@/components/ui'
import { useI18n } from '@/lib/i18n'
import { LOCALES, type Locale } from '@/lib/i18n/types'

const OPTIONS = LOCALES.map((locale) => ({
  value: locale,
  label: locale === 'fa' ? 'فارسی' : 'EN',
}))

export function LocaleSwitch() {
  const { locale, setLocale, t } = useI18n()

  return (
    <Toggle<Locale>
      label={t('lang.switch')}
      options={OPTIONS}
      value={locale}
      onChange={setLocale}
    />
  )
}
