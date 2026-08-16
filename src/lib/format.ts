import type { Lang } from '../i18n'

export const formatDate = (ts: number | undefined, lang: Lang) =>
  ts === undefined
    ? '—'
    : new Date(ts).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })

/** Rupiah, no decimals — amounts in a tailor shop are always whole. */
export const formatMoney = (n: number, lang: Lang) =>
  new Intl.NumberFormat(lang === 'id' ? 'id-ID' : 'en-GB', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)

export const toDateInput = (ts: number | undefined) =>
  ts === undefined ? '' : new Date(ts).toISOString().slice(0, 10)

export const fromDateInput = (value: string) =>
  value === '' ? undefined : new Date(`${value}T00:00:00`).getTime()

export const daysUntil = (ts: number | undefined) =>
  ts === undefined ? null : Math.ceil((ts - Date.now()) / 86_400_000)

/** Loose match so "budi santoso" finds "Budi  Santoso" and "BUDI". */
export const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

export const normalizePhone = (s: string | undefined) => (s ?? '').replace(/\D/g, '')

/**
 * Digits and a single leading +, grouped for reading: "+62 812 345 678", "0812 345 678".
 *
 * Runs on every keystroke, so it must never reject input mid-typing — it only ever strips
 * characters that cannot belong in a phone number and inserts spaces.
 */
export function formatPhone(raw: string): string {
  const plus = raw.trimStart().startsWith('+')
  const digits = raw.replace(/\D/g, '')
  if (!digits) return plus ? '+' : ''

  if (plus) {
    // Hold the country code apart so the rest groups from the right place:
    // +62 812 345 678, not +62 9 812 345 67. Two digits covers +62 and its neighbours.
    const groups = digits.slice(2).match(/.{1,3}/g) ?? []
    return [`+${digits.slice(0, 2)}`, ...groups].join(' ').trim()
  }

  // Local Indonesian numbers are written 0812 3456 7890, so group these in fours instead.
  const size = digits.startsWith('0') ? 4 : 3
  return (digits.match(new RegExp(`.{1,${size}}`, 'g')) ?? []).join(' ')
}

/**
 * Canonical form for comparing two numbers.
 *
 * +62 812 345 678 and 0812 345 678 are the same phone. Comparing raw digits would treat them
 * as different people and let a duplicate customer through — the exact failure this app exists
 * to prevent.
 */
export function phoneKey(s: string | undefined): string {
  const digits = normalizePhone(s)
  if (!digits) return ''
  if (digits.startsWith('62')) return `0${digits.slice(2)}`
  return digits
}

/** wa.me wants the international form without a plus. */
export const whatsappNumber = (s: string | undefined) => {
  const key = phoneKey(s)
  return key.startsWith('0') ? `62${key.slice(1)}` : key
}
