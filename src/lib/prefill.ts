import { db } from '../db/db'
import type { Garment, MeasurementSource, Order } from '../types'

export interface Prefill {
  measurements: Record<string, number | null>
  sources: Record<string, MeasurementSource>
  cutStyle: Partial<Record<Garment, Record<string, string>>>
}

/**
 * Pull a returning customer's details forward.
 *
 * Field-level fallback matters: if the last order was an alteration that only recorded waist
 * and hem, everything else fills from the most recent order that did have it — so the tailor
 * never faces a half-empty form.
 *
 * Material and balance deliberately do not carry over: new order, new fabric, new money.
 */
export async function prefillFromHistory(customerId: string, excludeOrderId?: string) {
  const orders = (
    await db.orders.where('customerId').equals(customerId).sortBy('number')
  ).filter((o) => !o.deletedAt && o.id !== excludeOrderId)

  const newest = orders.reverse() // highest order number first
  const result: Prefill = { measurements: {}, sources: {}, cutStyle: {} }

  for (const order of newest) {
    for (const [field, value] of Object.entries(order.measurements)) {
      if (value === null || value === undefined) continue
      if (result.measurements[field] !== undefined) continue
      result.measurements[field] = value
      result.sources[field] = { orderNumber: order.number, date: order.createdAt }
    }
    for (const item of order.items) {
      if (result.cutStyle[item.garment]) continue
      if (Object.keys(item.cutStyle).length === 0) continue
      result.cutStyle[item.garment] = { ...item.cutStyle }
    }
  }

  return { prefill: result, lastOrder: newest[0] as Order | undefined }
}
