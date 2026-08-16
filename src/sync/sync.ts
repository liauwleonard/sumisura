import { db } from '../db/db'
import { supabase } from '../lib/supabase'
import {
  customerToRow,
  logToRow,
  orderToRow,
  rowToCustomer,
  rowToLog,
  rowToOrder,
} from './mapping'

/**
 * Local-first sync.
 *
 * The app never waits on this. It reads and writes IndexedDB; this runs behind it and moves
 * rows in both directions when there is signal. Offline is not an error state — it is just a
 * sync that has not happened yet.
 *
 * Conflicts resolve last-write-wins per row, compared on `updatedAt`. For one tailor moving
 * between his own devices that is honest: the edit he made most recently is the one he meant.
 */

const CHUNK = 200

/**
 * Re-fetch a minute either side of the watermark. Devices' clocks are not perfectly aligned,
 * and a row written a few seconds "in the past" by another device would otherwise be skipped
 * forever. Re-applying a row we already have is harmless — the merge is idempotent.
 */
const CLOCK_SKEW_ALLOWANCE = 60_000

const key = (shopId: string, name: string) => `sync:${name}:${shopId}`
const readMark = (shopId: string, name: string) =>
  Number(localStorage.getItem(key(shopId, name)) ?? 0)
const writeMark = (shopId: string, name: string, value: number) =>
  localStorage.setItem(key(shopId, name), String(value))

const chunked = <T,>(rows: T[]) => {
  const out: T[][] = []
  for (let i = 0; i < rows.length; i += CHUNK) out.push(rows.slice(i, i + CHUNK))
  return out
}

export interface SyncResult {
  pushed: number
  pulled: number
}

export async function syncNow(shopId: string): Promise<SyncResult> {
  if (!supabase) return { pushed: 0, pulled: 0 }
  const pushed = await push(shopId)
  const pulled = await pull(shopId)
  return { pushed, pulled }
}

// ---------------------------------------------------------------------------
// Push — local changes up
// ---------------------------------------------------------------------------

async function push(shopId: string): Promise<number> {
  if (!supabase) return 0
  let pushed = 0

  // Watermarks advance to the newest row actually sent, not to "now". A row edited while the
  // request was in flight then still has a newer timestamp and is caught on the next pass.
  const since = readMark(shopId, 'pushed')

  const customers = (await db.customers.where('shopId').equals(shopId).toArray()).filter(
    (c) => c.updatedAt > since,
  )
  const orders = (await db.orders.where('shopId').equals(shopId).toArray()).filter(
    (o) => o.updatedAt > since,
  )

  let newest = since

  for (const batch of chunked(customers)) {
    const { error } = await supabase.from('customers').upsert(batch.map(customerToRow))
    if (error) throw error
    pushed += batch.length
    newest = Math.max(newest, ...batch.map((c) => c.updatedAt))
  }

  for (const batch of chunked(orders)) {
    const { error } = await supabase.from('orders').upsert(batch.map(orderToRow))
    if (error) throw error
    pushed += batch.length
    newest = Math.max(newest, ...batch.map((o) => o.updatedAt))
  }

  if (customers.length || orders.length) writeMark(shopId, 'pushed', newest)

  // The change log is append-only, so it gets its own watermark and never updates a remote row.
  const logSince = readMark(shopId, 'pushedLog')
  const entries = (await db.changeLog.where('shopId').equals(shopId).toArray()).filter(
    (e) => e.at > logSince,
  )
  let newestLog = logSince

  for (const batch of chunked(entries)) {
    // ignoreDuplicates makes this INSERT ... ON CONFLICT DO NOTHING, which needs only the
    // insert policy — the schema deliberately grants change_log no update policy at all.
    const { error } = await supabase
      .from('change_log')
      .upsert(batch.map(logToRow), { ignoreDuplicates: true })
    if (error) throw error
    pushed += batch.length
    newestLog = Math.max(newestLog, ...batch.map((e) => e.at))
  }

  if (entries.length) writeMark(shopId, 'pushedLog', newestLog)

  return pushed
}

// ---------------------------------------------------------------------------
// Pull — other devices' changes down
// ---------------------------------------------------------------------------

async function pull(shopId: string): Promise<number> {
  if (!supabase) return 0
  let pulled = 0

  const since = Math.max(0, readMark(shopId, 'pulled') - CLOCK_SKEW_ALLOWANCE)
  let newest = readMark(shopId, 'pulled')

  const { data: customerRows, error: cErr } = await supabase
    .from('customers')
    .select('*')
    .eq('shop_id', shopId)
    .gt('updated_at', since)
  if (cErr) throw cErr

  for (const row of customerRows ?? []) {
    const incoming = rowToCustomer(row)
    const existing = await db.customers.get(incoming.id)
    // Last-write-wins. A local row that is newer stays put and goes up on the next push.
    if (!existing || incoming.updatedAt > existing.updatedAt) {
      await db.customers.put(incoming)
      pulled++
    }
    newest = Math.max(newest, incoming.updatedAt)
  }

  const { data: orderRows, error: oErr } = await supabase
    .from('orders')
    .select('*')
    .eq('shop_id', shopId)
    .gt('updated_at', since)
  if (oErr) throw oErr

  for (const row of orderRows ?? []) {
    const incoming = rowToOrder(row)
    const existing = await db.orders.get(incoming.id)
    if (!existing || incoming.updatedAt > existing.updatedAt) {
      await db.orders.put(incoming)
      pulled++
    }
    newest = Math.max(newest, incoming.updatedAt)
  }

  writeMark(shopId, 'pulled', newest)

  // Change-log entries are immutable, so there is nothing to compare — anything we do not
  // already hold is simply added.
  const logSince = Math.max(0, readMark(shopId, 'pulledLog') - CLOCK_SKEW_ALLOWANCE)
  let newestLog = readMark(shopId, 'pulledLog')

  const { data: logRows, error: lErr } = await supabase
    .from('change_log')
    .select('*')
    .eq('shop_id', shopId)
    .gt('at', logSince)
  if (lErr) throw lErr

  const entries = (logRows ?? []).map(rowToLog)
  if (entries.length) {
    await db.changeLog.bulkPut(entries)
    pulled += entries.length
    newestLog = Math.max(newestLog, ...entries.map((e) => e.at))
  }
  writeMark(shopId, 'pulledLog', newestLog)

  return pulled
}

/** Used when signing out, so the next account on this device does not inherit watermarks. */
export function clearSyncMarks(shopId: string) {
  for (const name of ['pushed', 'pushedLog', 'pulled', 'pulledLog']) {
    localStorage.removeItem(key(shopId, name))
  }
}
