import Dexie, { type EntityTable } from 'dexie'
import type { ChangeLogEntry, Customer, Order, Shop } from '../types'

/**
 * Local-first store. The app always reads and writes here — cloud sync (Phase 3) runs
 * in the background, so a dropped connection never blocks work in the shop.
 *
 * Schema mirrors what Postgres will hold later: every row carries shopId, updatedAt for
 * sync ordering, and deletedAt for soft deletes.
 */
export const db = new Dexie('sumisura') as Dexie & {
  shops: EntityTable<Shop, 'id'>
  customers: EntityTable<Customer, 'id'>
  orders: EntityTable<Order, 'id'>
  changeLog: EntityTable<ChangeLogEntry, 'id'>
}

db.version(1).stores({
  shops: 'id, createdAt',
  customers: 'id, shopId, name, phone, code, updatedAt, deletedAt',
  orders: 'id, shopId, customerId, number, status, dueDate, updatedAt, deletedAt',
  changeLog: 'id, shopId, orderId, customerId, field, at',
})

export const newId = () => crypto.randomUUID()
export const now = () => Date.now()

/** Single local shop until Phase 3 introduces accounts. */
export const LOCAL_SHOP_ID = 'local-shop'

export async function getShop(): Promise<Shop> {
  const existing = await db.shops.get(LOCAL_SHOP_ID)
  if (existing) return existing
  const shop: Shop = { id: LOCAL_SHOP_ID, name: 'My Shop', createdAt: now() }
  await db.shops.put(shop)
  return shop
}

/** Sequential per shop, so the tailor can say "order 41" out loud. */
export async function nextOrderNumber(shopId: string): Promise<number> {
  const last = await db.orders.where('shopId').equals(shopId).reverse().sortBy('number')
  return (last[0]?.number ?? 0) + 1
}

export async function nextCustomerCode(shopId: string): Promise<string> {
  const count = await db.customers.where('shopId').equals(shopId).count()
  return `C-${String(count + 1).padStart(3, '0')}`
}
