import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { db, getShop } from '../db/db'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

interface Shop {
  id: string | null
  name: string
  role: string | null
  /** true once we know which shop we're in — screens wait for this. */
  ready: boolean
  rename: (name: string) => Promise<void>
}

const ShopContext = createContext<Shop>({
  id: null,
  name: '',
  role: null,
  ready: false,
  rename: async () => {},
})

export const useShop = () => useContext(ShopContext)

/**
 * Works out whose shop this is.
 *
 * Signed in  → the shop the account belongs to, read from Supabase.
 * Local only → the on-device shop, exactly as before Phase 3.
 */
export function ShopProvider({ children }: { children: ReactNode }) {
  const { cloud, session } = useAuth()
  const [id, setId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [role, setRole] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      setReady(false)

      if (!cloud || !session || !supabase) {
        const local = await getShop()
        if (cancelled) return
        setId(local.id)
        setName(local.name)
        setRole(null)
        setReady(true)
        return
      }

      const { data, error } = await supabase
        .from('shop_members')
        .select('role, shop_id, shops(name)')
        .limit(1)
        .maybeSingle()

      if (cancelled) return

      if (error || !data) {
        // Signed in but belonging to no shop. Falling back to the local shop keeps the app
        // usable rather than showing an empty screen with no explanation.
        const local = await getShop()
        if (cancelled) return
        setId(local.id)
        setName(local.name)
        setRole(null)
        setReady(true)
        return
      }

      const shopId = data.shop_id as string
      const shopName = (data.shops as unknown as { name: string } | null)?.name ?? 'My Shop'

      await claimLocalRows(shopId)
      if (cancelled) return

      setId(shopId)
      setName(shopName)
      setRole((data.role as string) ?? null)
      setReady(true)
    }

    resolve()
    return () => {
      cancelled = true
    }
  }, [cloud, session])

  const rename = async (next: string) => {
    const trimmed = next.trim()
    if (!id || !trimmed) return
    setName(trimmed)
    if (cloud && session && supabase) {
      await supabase.from('shops').update({ name: trimmed }).eq('id', id)
    } else {
      await db.shops.update(id, { name: trimmed })
    }
  }

  return (
    <ShopContext.Provider value={{ id, name, role, ready, rename }}>{children}</ShopContext.Provider>
  )
}

/**
 * Anything created before signing in belongs to the on-device shop. Re-stamp it onto the real
 * shop so the tailor's existing work isn't stranded and invisible the moment he logs in.
 *
 * Timestamps are left untouched: they record when the work actually happened, and sync decides
 * what to push from its own watermark rather than from these values.
 */
async function claimLocalRows(shopId: string) {
  // Each table is handled explicitly: looping over them as a union makes bulkPut's overloads
  // ambiguous, and the repetition is cheaper than the workaround.
  await db.transaction('rw', db.customers, db.orders, db.changeLog, async () => {
    const customers = await db.customers.where('shopId').notEqual(shopId).toArray()
    if (customers.length) await db.customers.bulkPut(customers.map((r) => ({ ...r, shopId })))

    const orders = await db.orders.where('shopId').notEqual(shopId).toArray()
    if (orders.length) await db.orders.bulkPut(orders.map((r) => ({ ...r, shopId })))

    const log = await db.changeLog.where('shopId').notEqual(shopId).toArray()
    if (log.length) await db.changeLog.bulkPut(log.map((r) => ({ ...r, shopId })))
  })
}
