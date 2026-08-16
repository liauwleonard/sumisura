import { db, newId, now } from './db'
import type { ChangeLogEntry, ChangeSection, Customer, Order } from '../types'

/**
 * Nothing is ever overwritten silently. Every edit is diffed against what was stored and
 * recorded field by field — this is the thing the paper notebook could not do.
 */

const BY = 'tailor' // Phase 3 replaces this with the signed-in user

interface Diff {
  section: ChangeSection
  field: string
  oldValue: string | null
  newValue: string | null
}

const str = (v: unknown): string | null =>
  v === undefined || v === null || v === '' ? null : String(v)

function pushIfChanged(out: Diff[], section: ChangeSection, field: string, a: unknown, b: unknown) {
  const oldValue = str(a)
  const newValue = str(b)
  if (oldValue !== newValue) out.push({ section, field, oldValue, newValue })
}

export function diffOrder(before: Order | undefined, after: Order): Diff[] {
  const out: Diff[] = []
  if (!before) return out // creation is not a change

  for (const key of new Set([
    ...Object.keys(before.measurements),
    ...Object.keys(after.measurements),
  ])) {
    pushIfChanged(out, 'measurement', key, before.measurements[key], after.measurements[key])
  }

  for (const key of ['fabric', 'color', 'meters', 'lining', 'notes'] as const) {
    pushIfChanged(out, 'material', key, before.material[key], after.material[key])
  }

  // Cut style is keyed by garment so a log line reads "trousers.fit: regular → slim".
  const cutMap = (o: Order) => {
    const m: Record<string, string> = {}
    for (const item of o.items)
      for (const [k, v] of Object.entries(item.cutStyle)) m[`${item.garment}.${k}`] = v
    return m
  }
  const beforeCut = cutMap(before)
  const afterCut = cutMap(after)
  for (const key of new Set([...Object.keys(beforeCut), ...Object.keys(afterCut)])) {
    pushIfChanged(out, 'cut_style', key, beforeCut[key], afterCut[key])
  }

  pushIfChanged(out, 'balance', 'price', before.price, after.price)
  pushIfChanged(out, 'balance', 'discount', before.discount, after.discount)

  // Per-garment prices are keyed by garment so a log line reads "jacket price: 0 -> 3500000".
  const priceMap = (o: Order) => {
    const m: Record<string, number> = {}
    for (const item of o.items) if (item.price != null) m[`${item.garment}.price`] = item.price
    return m
  }
  const beforePrices = priceMap(before)
  const afterPrices = priceMap(after)
  for (const key of new Set([...Object.keys(beforePrices), ...Object.keys(afterPrices)])) {
    pushIfChanged(out, 'balance', key, beforePrices[key], afterPrices[key])
  }
  // Summarised rather than totalled so an edited reference number is auditable too — that is
  // the whole point of recording one.
  const payments = (o: Order) =>
    o.payments.map((p) => `${p.amount}${p.ref ? ` (${p.ref})` : ''}`).join(' + ')
  pushIfChanged(out, 'balance', 'payments', payments(before), payments(after))

  pushIfChanged(out, 'status', 'status', before.status, after.status)
  pushIfChanged(out, 'order', 'type', before.type, after.type)
  pushIfChanged(out, 'order', 'dueDate', before.dueDate, after.dueDate)
  pushIfChanged(out, 'order', 'notes', before.notes, after.notes)
  pushIfChanged(out, 'order', 'posture', before.posture.join(','), after.posture.join(','))
  pushIfChanged(out, 'order', 'postureNotes', before.postureNotes, after.postureNotes)

  return out
}

export function diffCustomer(before: Customer | undefined, after: Customer): Diff[] {
  if (!before) return []
  const out: Diff[] = []
  for (const key of ['name', 'phone', 'address', 'notes'] as const) {
    pushIfChanged(out, 'customer', key, before[key], after[key])
  }
  return out
}

async function writeLog(
  diffs: Diff[],
  meta: { shopId: string; orderId?: string; customerId?: string; reason?: string },
) {
  if (diffs.length === 0) return
  const at = now()
  const entries: ChangeLogEntry[] = diffs.map((d) => ({
    id: newId(),
    shopId: meta.shopId,
    orderId: meta.orderId,
    customerId: meta.customerId,
    section: d.section,
    field: d.field,
    oldValue: d.oldValue,
    newValue: d.newValue,
    reason: meta.reason,
    at,
    by: BY,
  }))
  await db.changeLog.bulkAdd(entries)
}

/** Save an order and record what changed, atomically. */
export async function saveOrder(order: Order, reason?: string) {
  await db.transaction('rw', db.orders, db.changeLog, async () => {
    const before = await db.orders.get(order.id)
    const next: Order = { ...order, updatedAt: now() }
    await db.orders.put(next)
    await writeLog(diffOrder(before, next), {
      shopId: next.shopId,
      orderId: next.id,
      customerId: next.customerId,
      reason,
    })
  })
}

export async function saveCustomer(customer: Customer, reason?: string) {
  await db.transaction('rw', db.customers, db.changeLog, async () => {
    const before = await db.customers.get(customer.id)
    const next: Customer = { ...customer, updatedAt: now() }
    await db.customers.put(next)
    await writeLog(diffCustomer(before, next), {
      shopId: next.shopId,
      customerId: next.id,
      reason,
    })
  })
}

export const historyFor = (orderId: string, field: string) =>
  db.changeLog
    .where('orderId')
    .equals(orderId)
    .filter((e) => e.field === field)
    .reverse()
    .sortBy('at')

export const historyForOrder = (orderId: string) =>
  db.changeLog.where('orderId').equals(orderId).reverse().sortBy('at')
