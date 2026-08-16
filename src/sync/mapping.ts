import type { ChangeLogEntry, Customer, Order } from '../types'

/**
 * Translation between the local camelCase records and the snake_case Postgres columns.
 *
 * Kept in one file, in matched pairs, because a mismatch here is the worst kind of sync bug:
 * silent. A misspelled column does not throw — the value simply arrives as undefined and a
 * measurement quietly disappears.
 */

type Row = Record<string, unknown>

// ---- customers ----

export const customerToRow = (c: Customer): Row => ({
  id: c.id,
  shop_id: c.shopId,
  code: c.code ?? null,
  name: c.name,
  phone: c.phone ?? null,
  address: c.address ?? null,
  notes: c.notes ?? null,
  created_at: c.createdAt,
  updated_at: c.updatedAt,
  deleted_at: c.deletedAt ?? null,
})

export const rowToCustomer = (r: Row): Customer => ({
  id: r.id as string,
  shopId: r.shop_id as string,
  code: (r.code as string) ?? '',
  name: (r.name as string) ?? '',
  phone: (r.phone as string) ?? undefined,
  address: (r.address as string) ?? undefined,
  notes: (r.notes as string) ?? undefined,
  createdAt: Number(r.created_at),
  updatedAt: Number(r.updated_at),
  deletedAt: r.deleted_at == null ? undefined : Number(r.deleted_at),
})

// ---- orders ----

export const orderToRow = (o: Order): Row => ({
  id: o.id,
  shop_id: o.shopId,
  customer_id: o.customerId,
  number: o.number,
  type: o.type,
  status: o.status,
  items: o.items,
  measurements: o.measurements,
  measurement_source: o.measurementSource,
  posture: o.posture,
  posture_notes: o.postureNotes ?? null,
  material: o.material,
  price: o.price,
  payments: o.payments,
  due_date: o.dueDate ?? null,
  notes: o.notes ?? null,
  created_at: o.createdAt,
  updated_at: o.updatedAt,
  deleted_at: o.deletedAt ?? null,
})

export const rowToOrder = (r: Row): Order => ({
  id: r.id as string,
  shopId: r.shop_id as string,
  customerId: r.customer_id as string,
  number: Number(r.number),
  type: r.type as Order['type'],
  status: r.status as Order['status'],
  items: (r.items as Order['items']) ?? [],
  measurements: (r.measurements as Order['measurements']) ?? {},
  measurementSource: (r.measurement_source as Order['measurementSource']) ?? {},
  posture: (r.posture as string[]) ?? [],
  postureNotes: (r.posture_notes as string) ?? undefined,
  material: (r.material as Order['material']) ?? {},
  price: Number(r.price) || 0,
  payments: (r.payments as Order['payments']) ?? [],
  dueDate: r.due_date == null ? undefined : Number(r.due_date),
  notes: (r.notes as string) ?? undefined,
  createdAt: Number(r.created_at),
  updatedAt: Number(r.updated_at),
  deletedAt: r.deleted_at == null ? undefined : Number(r.deleted_at),
})

// ---- change log ----

export const logToRow = (e: ChangeLogEntry): Row => ({
  id: e.id,
  shop_id: e.shopId,
  order_id: e.orderId ?? null,
  customer_id: e.customerId ?? null,
  section: e.section,
  field: e.field,
  old_value: e.oldValue,
  new_value: e.newValue,
  reason: e.reason ?? null,
  at: e.at,
  by: e.by,
})

export const rowToLog = (r: Row): ChangeLogEntry => ({
  id: r.id as string,
  shopId: r.shop_id as string,
  orderId: (r.order_id as string) ?? undefined,
  customerId: (r.customer_id as string) ?? undefined,
  section: r.section as ChangeLogEntry['section'],
  field: r.field as string,
  oldValue: (r.old_value as string) ?? null,
  newValue: (r.new_value as string) ?? null,
  reason: (r.reason as string) ?? undefined,
  at: Number(r.at),
  by: (r.by as string) ?? 'tailor',
})
