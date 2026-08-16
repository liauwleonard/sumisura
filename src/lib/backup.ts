import { db } from '../db/db'
import { resetPushMarks } from '../sync/sync'
import type { ChangeLogEntry, Customer, Order } from '../types'

/**
 * Backup and restore.
 *
 * The point is that the tailor can get his own data out and back in without needing anyone
 * else. A cloud account he cannot export from is still a cloud account he could lose.
 *
 * The file is plain JSON: readable, diffable, and openable in any text editor in ten years,
 * which a proprietary format would not be.
 */

const FORMAT = 'sumisura-backup'
const VERSION = 1

export interface Backup {
  format: string
  version: number
  exportedAt: number
  shopName: string
  customers: Customer[]
  orders: Order[]
  changeLog: ChangeLogEntry[]
}

export interface BackupSummary {
  shopName: string
  exportedAt: number
  customers: number
  orders: number
  changeLog: number
}

export const summarise = (b: Backup): BackupSummary => ({
  shopName: b.shopName,
  exportedAt: b.exportedAt,
  customers: b.customers.length,
  orders: b.orders.length,
  changeLog: b.changeLog.length,
})

export async function buildBackup(shopId: string, shopName: string): Promise<Backup> {
  const [customers, orders, changeLog] = await Promise.all([
    db.customers.where('shopId').equals(shopId).toArray(),
    db.orders.where('shopId').equals(shopId).toArray(),
    db.changeLog.where('shopId').equals(shopId).toArray(),
  ])
  // Soft-deleted rows are kept on purpose: a backup that quietly drops them would turn a
  // restore into a way of resurrecting deleted customers on the next sync.
  return { format: FORMAT, version: VERSION, exportedAt: Date.now(), shopName, customers, orders, changeLog }
}

export function downloadBackup(backup: Backup) {
  const stamp = new Date(backup.exportedAt).toISOString().slice(0, 10)
  const slug = backup.shopName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sumisura-${slug || 'backup'}-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoking immediately can cancel the download on some browsers; a tick is enough.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function readBackupFile(file: File): Promise<Backup> {
  const parsed = JSON.parse(await file.text())
  if (parsed?.format !== FORMAT) throw new Error('notABackup')
  if (typeof parsed.version !== 'number' || parsed.version > VERSION) throw new Error('newerVersion')
  return {
    ...parsed,
    customers: parsed.customers ?? [],
    orders: parsed.orders ?? [],
    changeLog: parsed.changeLog ?? [],
  }
}

/**
 * Restore into the current shop.
 *
 * Additive and non-destructive: nothing local is deleted, and an incoming row only replaces a
 * local one when it is genuinely newer — the same last-write-wins rule sync uses, so importing
 * an old file can never roll back newer work.
 *
 * Rows are re-stamped onto the current shop, which is what makes the real recovery case work:
 * lost account → new account → import → the book is back.
 */
export async function applyBackup(backup: Backup, shopId: string) {
  let restored = 0
  let skipped = 0

  await db.transaction('rw', db.customers, db.orders, db.changeLog, async () => {
    for (const row of backup.customers) {
      const incoming = { ...row, shopId }
      const existing = await db.customers.get(incoming.id)
      if (existing && existing.updatedAt >= incoming.updatedAt) { skipped++; continue }
      await db.customers.put(incoming)
      restored++
    }

    for (const row of backup.orders) {
      const incoming = { ...row, shopId }
      const existing = await db.orders.get(incoming.id)
      if (existing && existing.updatedAt >= incoming.updatedAt) { skipped++; continue }
      await db.orders.put(incoming)
      restored++
    }

    // Log entries are immutable, so anything not already held is simply added.
    const entries = backup.changeLog.map((e) => ({ ...e, shopId }))
    if (entries.length) {
      await db.changeLog.bulkPut(entries)
      restored += entries.length
    }
  })

  // Restored rows carry old timestamps; without this they would look already-pushed.
  resetPushMarks(shopId)

  return { restored, skipped }
}
