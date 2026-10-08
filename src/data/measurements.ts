import type { Garment } from '../types'

/**
 * Stable field keys. These are written to the database and must never be renamed —
 * display names live in the i18n dictionaries, so relabelling is free.
 */
export const FIELDS_BY_GARMENT: Record<Garment, string[]> = {
  /*
   * Ordered as the tailor reads them off the body, from his own note (8 Oct 2026). Anything he
   * did not list is kept, below his order rather than dropped: Leonard's call, "just in case".
   * Removing a field only hides it anyway — the stored numbers survive — but a field that is
   * gone from the form is a field nobody notices is missing.
   */
  blazer: [
    'blazer_length',
    'arm_length',
    'shoulder_width',
    'chest',
    'waist', // his "abdominal size"
    'bicep', // his "arm size"
    'elbow',
    'wrist',
    // not on his list
    'seat',
    'back_width',
  ],
  trousers: [
    'outseam', // his "trousers length" — waist to floor, outside leg
    'trouser_waist',
    'seat', // his "hips size"
    'thigh',
    'rise', // his "crotch"
    'calf',
    'hem', // his "ankle size" — the opening
    // not on his list
    'knee',
    'inseam',
  ],
  shirt: [
    'shirt_length',
    'arm_length',
    'shoulder_width',
    'chest',
    'shirt_waist', // his "abdominal size"
    'bicep', // his "arm size"
    'elbow',
    'cuff', // his "wrist size"
    'neck',
    // not on his list
    'back_width',
  ],
  // No list from him for the vest, so it stands as it was.
  vest: ['chest', 'waist', 'shoulder_width', 'back_width', 'vest_length'],
}

/**
 * Measurements are stored per garment, keyed `<garment>.<field>`.
 *
 * A blazer chest and a shirt chest are different numbers — the tailor cuts them with different
 * ease. One shared `chest` meant editing either silently changed the other.
 */
export const measurementKey = (garment: Garment, field: string) => `${garment}.${field}`

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
