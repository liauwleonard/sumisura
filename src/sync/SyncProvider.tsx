import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useShop } from '../shop/ShopProvider'
import { syncNow } from './sync'

export type SyncState = 'off' | 'idle' | 'syncing' | 'offline' | 'error'

interface Sync {
  state: SyncState
  lastSyncedAt: number | null
  error: string | null
  run: () => void
}

const SyncContext = createContext<Sync>({
  state: 'off',
  lastSyncedAt: null,
  error: null,
  run: () => {},
})

export const useSync = () => useContext(SyncContext)

const INTERVAL = 60_000
const lastKey = (shopId: string) => `sync:lastAt:${shopId}`

/**
 * Decides *when* to sync. The how lives in sync.ts.
 *
 * Runs on sign-in, every minute, when the tab regains focus, and when the network returns —
 * the last two matter most in a shop, where the iPad sleeps between customers and wifi drops.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const { cloud, session } = useAuth()
  const { id: shopId, ready } = useShop()
  const [state, setState] = useState<SyncState>('off')
  const [error, setError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const running = useRef(false)

  const active = Boolean(cloud && session && ready && shopId)

  useEffect(() => {
    if (!shopId) return
    const stored = Number(localStorage.getItem(lastKey(shopId)) ?? 0)
    setLastSyncedAt(stored || null)
  }, [shopId])

  const run = useCallback(async () => {
    if (!active || !shopId) return
    // A slow sync must not stack up behind the interval and fire twice over the same rows.
    if (running.current) return
    if (!navigator.onLine) {
      setState('offline')
      return
    }

    running.current = true
    setState('syncing')
    try {
      await syncNow(shopId)
      const at = Date.now()
      localStorage.setItem(lastKey(shopId), String(at))
      setLastSyncedAt(at)
      setError(null)
      setState('idle')
    } catch (e) {
      // Failing to sync is not failing to work: the local copy is untouched and still correct,
      // so we surface the problem quietly and try again rather than interrupting the tailor.
      setError(e instanceof Error ? e.message : String(e))
      setState(navigator.onLine ? 'error' : 'offline')
    } finally {
      running.current = false
    }
  }, [active, shopId])

  useEffect(() => {
    if (!active) {
      setState('off')
      return
    }

    run()
    const timer = setInterval(run, INTERVAL)

    const onFocus = () => document.visibilityState === 'visible' && run()
    window.addEventListener('online', run)
    window.addEventListener('offline', () => setState('offline'))
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      clearInterval(timer)
      window.removeEventListener('online', run)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [active, run])

  return (
    <SyncContext.Provider value={{ state, lastSyncedAt, error, run }}>
      {children}
    </SyncContext.Provider>
  )
}
