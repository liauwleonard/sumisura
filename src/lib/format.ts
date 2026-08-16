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
