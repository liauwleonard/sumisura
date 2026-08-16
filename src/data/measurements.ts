import type { Garment } from '../types'

/**
 * Stable field keys. These are written to the database and must never be renamed —
 * display names live in the i18n dictionaries, so relabelling is free.
 */
export const FIELDS_BY_GARMENT: Record<Garment, string[]> = {
  jacket: [
    'neck',
    'chest',
    'waist',
    'seat',
    'shoulder_width',
    'back_width',
    'sleeve_length',
    'bicep',
    'wrist',
    'jacket_length',
  ],
  trousers: ['trouser_waist', 'seat', 'thigh', 'knee', 'hem', 'outseam', 'inseam', 'rise'],
  shirt: [
    'neck',
    'chest',
    'shirt_waist',
    'shoulder_width',
    'back_width',
    'sleeve_length',
    'cuff',
    'shirt_length',
  ],
  waistcoat: ['chest', 'waist', 'shoulder_width', 'back_width', 'waistcoat_length'],
}

export const ALL_FIELDS = Array.from(new Set(Object.values(FIELDS_BY_GARMENT).flat()))

/** Posture observations — the notebook knowledge a plain number set loses. */
export const POSTURE_OPTIONS = [
  'sloping_shoulder',
  'shoulder_uneven',
  'stooped',
  'erect',
  'prominent_seat',
  'belly',
] as const

export const CM_PER_INCH = 2.54

export const toDisplay = (cm: number | null, unit: 'cm' | 'in') =>
  cm === null ? '' : unit === 'cm' ? String(round(cm)) : String(round(cm / CM_PER_INCH))

export const fromDisplay = (value: string, unit: 'cm' | 'in'): number | null => {
  const trimmed = value.trim().replace(',', '.')
  if (trimmed === '') return null
  const n = Number(trimmed)
  if (!Number.isFinite(n)) return null
  return round(unit === 'cm' ? n : n * CM_PER_INCH)
}

const round = (n: number) => Math.round(n * 10) / 10
