import dayjs from 'dayjs'
import jalaliday from 'jalaliday'
import type { Locale } from './i18n/types'

dayjs.extend(jalaliday)

/*
 * One rule: the gym's timezone decides what "today" is, not the browser's.
 * A trainee travelling or a phone with a wrong clock must not see the wrong workout.
 * Every date that drives program logic goes through here.
 */

export type CalendarSystem = 'jalali' | 'gregory'

export function calendarFor(locale: Locale): CalendarSystem {
  return locale === 'fa' ? 'jalali' : 'gregory'
}

function base(date: dayjs.ConfigType, locale: Locale) {
  const d = dayjs(date)
  return locale === 'fa' ? d.calendar('jalali').locale('fa') : d
}

/** Short date for lists and headers — "Mon 14" / "دوشنبه ۱۴". */
export function formatShortDate(date: dayjs.ConfigType, locale: Locale): string {
  return base(date, locale).format(locale === 'fa' ? 'dddd D' : 'ddd D')
}

/** Full date for records — "14 Sep 2026" / "۱۴ شهریور ۱۴۰۵". */
export function formatFullDate(date: dayjs.ConfigType, locale: Locale): string {
  return base(date, locale).format('D MMMM YYYY')
}

/** ISO calendar day in the gym's timezone — the key every session row is stored against. */
export function gymToday(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function daysBetween(from: dayjs.ConfigType, to: dayjs.ConfigType): number {
  return dayjs(to).startOf('day').diff(dayjs(from).startOf('day'), 'day')
}

export { dayjs }
