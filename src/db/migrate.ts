import { FIELDS_BY_GARMENT, measurementKey } from '../data/measurements'
import type { Garment, Material, MeasurementSource, Order, OrderItem } from '../types'

/**
 * Brings orders written by the pre-October-2026 version up to the current shape.
 *
 * Three things changed at once and all of them are stored, not merely displayed:
 *
 *   1. `jacket` became `blazer` and `waistcoat` became `vest`.
 *   2. Measurements stopped being one flat bag shared across every garment and became
 *      `<garment>.<field>`, because a blazer chest and a shirt chest are different numbers.
 *   3. Cloth moved from the order to each garment.
 *
 * Without this, opening an old order does not merely look wrong — `FIELDS_BY_GARMENT['jacket']`
 * is undefined and the measurement screen throws on render. A white screen, not a blank field.
 *
 * Written to be safe to run twice: an order already in the new shape comes back untouched.
 */

/** Old garment keys that still sit in stored rows. */
const GARMENT_RENAMES: Record<string, Garment> = {
  jacket: 'blazer',
  waistcoat: 'vest',
}

/** Old measurement field keys. The values carry over; only the name moved. */
const FIELD_RENAMES: Record<string, string> = {
  sleeve_length: 'arm_length',
  jacket_length: 'blazer_length',
  waistcoat_length: 'vest_length',
}

/** What a row looked like before: garments under old names, cloth on the order. */
type LegacyOrder = Omit<Order, 'items'> & {
  items: (Omit<OrderItem, 'garment'> & { garment: string })[]
  material?: Material
}

const renameGarment = (g: string): Garment => GARMENT_RENAMES[g] ?? (g as Garment)
const renameField = (f: string) => FIELD_RENAMES[f] ?? f

/** Namespaced keys contain a dot; a bare key is from the old flat bag. */
const isFlat = (key: string) => !key.includes('.')

/**
 * Spread one flat bag across the garments on the order.
 *
 * A flat `chest` is written to EVERY garment that has a chest field. That is not a guess — it
 * reproduces exactly what the old app showed, where one `chest` was displayed under the blazer
 * and the shirt alike. Splitting them into independent numbers is what the tailor now does by
 * re-measuring; the migration must not invent a difference that was never recorded.
 */
function spread<T>(flat: Record<string, T>, garments: Garment[]): Record<string, T> {
  const out: Record<string, T> = {}
  const claimed = new Set<string>()

  // Anything already namespaced is current — keep it and leave it alone.
  for (const [key, value] of Object.entries(flat)) {
    if (!isFlat(key)) out[key] = value
  }

  for (const garment of garments) {
    for (const field of FIELDS_BY_GARMENT[garment] ?? []) {
      const key = measurementKey(garment, field)
      if (key in out) continue // a namespaced value already won

      // The stored key may still carry the old field name.
      const legacy = Object.keys(flat).find((k) => isFlat(k) && renameField(k) === field)
      if (legacy !== undefined) {
        out[key] = flat[legacy]
        claimed.add(legacy)
      }
    }
  }

  // A flat value no garment could take — the order has no garments at all, or none that uses
  // that field. Keeping it costs a dead key; dropping it silently destroys a number the tailor
  // took off a real body. Nothing reads these, so they sit harmlessly until a garment is added.
  for (const [key, value] of Object.entries(flat)) {
    if (isFlat(key) && !claimed.has(key)) out[key] = value
  }

  return out
}

export function normaliseOrder(order: LegacyOrder): Order {
  const items = order.items.map((item) => ({ ...item, garment: renameGarment(item.garment) }))
  const garments = Array.from(new Set(items.map((i) => i.garment)))

  // Cloth was one object on the order; every garment on it was cut from that cloth.
  const legacyMaterial = order.material
  const hasMaterial = legacyMaterial && Object.values(legacyMaterial).some((v) => v != null && v !== '')

  const withCloth = hasMaterial
    ? items.map((i) => (i.material ? i : { ...i, material: { ...legacyMaterial } }))
    : items

  const { material: _dropped, ...rest } = order
  void _dropped

  return {
    ...rest,
    items: withCloth,
    measurements: spread<number | null>(order.measurements, garments),
    measurementSource: spread<MeasurementSource>(order.measurementSource ?? {}, garments),
  }
}

/** True when there is anything to do — lets callers skip a pointless write. */
export const needsMigration = (order: LegacyOrder): boolean =>
  order.items.some((i) => i.garment in GARMENT_RENAMES) ||
  Object.keys(order.measurements ?? {}).some(isFlat) ||
  Object.keys(order.measurementSource ?? {}).some(isFlat) ||
  (order.material != null && Object.values(order.material).some((v) => v != null && v !== ''))
