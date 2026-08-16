import { useMemo, useState } from 'react'
import { OrdersList } from './screens/OrdersList'
import { OrderEditor } from './screens/OrderEditor'
import { CustomersList } from './screens/CustomersList'
import { Profile } from './screens/Profile'
import { DEFAULT_LANG, SettingsContext, makeT, useSettings, type Lang, type Unit } from './i18n'
import { Button } from './components/ui'
import { UpdatePrompt } from './components/UpdatePrompt'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { ShopProvider, useShop } from './shop/ShopProvider'
import { SyncProvider } from './sync/SyncProvider'
import { SignIn } from './screens/SignIn'

type Screen =
  | { name: 'orders' }
  | { name: 'customers' }
  | { name: 'profile' }
  | { name: 'order'; id: string | null }

const read = <T,>(key: string, fallback: T): T =>
  (localStorage.getItem(key) as T | null) ?? fallback

export default function App() {
  const [lang, setLangState] = useState<Lang>(() => read('lang', DEFAULT_LANG))
  const [unit, setUnitState] = useState<Unit>(() => read('unit', 'cm' as Unit))

  // Persist only on an explicit choice. Writing the default on mount would freeze whatever
  // default happened to ship first, so changing it later would never reach existing installs.
  const settings = useMemo(
    () => ({
      lang,
      unit,
      t: makeT(lang),
      setLang: (l: Lang) => {
        localStorage.setItem('lang', l)
        setLangState(l)
      },
      setUnit: (u: Unit) => {
        localStorage.setItem('unit', u)
        setUnitState(u)
      },
    }),
    [lang, unit],
  )

  return (
    <SettingsContext.Provider value={settings}>
      <AuthProvider>
        <ShopProvider>
          <SyncProvider>
            <Gate />
          </SyncProvider>
        </ShopProvider>
      </AuthProvider>
    </SettingsContext.Provider>
  )
}

/**
 * Decides whether to show the sign-in screen.
 *
 * With no cloud configured we go straight through — the app is local-only and always usable.
 * Once configured, a session is required, but Supabase keeps it in localStorage and refreshes
 * it silently, so the tailor signs in once and stays signed in, offline included.
 */
function Gate() {
  const { cloud, session, loading } = useAuth()
  if (loading) return null
  if (cloud && !session) return <SignIn />
  return <Shell />
}

function Shell() {
  const { t } = useSettings()
  const { id: shopId, name: shopName, ready } = useShop()
  const [screen, setScreen] = useState<Screen>({ name: 'orders' })

  if (!ready || !shopId) return null

  const openOrder = (id: string | null) => setScreen({ name: 'order', id })

  return (
    <>
      <UpdatePrompt />
      <div className="min-h-full">
        {screen.name !== 'order' && (
          <header className="sticky top-0 z-10 border-b border-stone-200 bg-stone-100/90 backdrop-blur">
            <div className="mx-auto flex max-w-3xl items-center gap-2 p-4">
              <div className="min-w-0">
                {/* The shop name, not the product name: at a glance you know which account
                    you are in — the whole point of showing it here. */}
                <h1 className="truncate text-lg font-semibold leading-tight tracking-tight">
                  {shopName}
                </h1>
                <p className="truncate text-xs leading-tight text-stone-500">
                  {t('app')} · {t('tagline')}
                </p>
              </div>

              <nav className="ml-auto flex shrink-0 items-center gap-1">
                <Button
                  variant={screen.name === 'orders' ? 'primary' : 'ghost'}
                  className="px-3"
                  onClick={() => setScreen({ name: 'orders' })}
                >
                  {t('orders')}
                </Button>
                <Button
                  variant={screen.name === 'customers' ? 'primary' : 'ghost'}
                  className="px-3"
                  onClick={() => setScreen({ name: 'customers' })}
                >
                  {t('customers')}
                </Button>
                <button
                  aria-label={t('profile')}
                  onClick={() => setScreen({ name: 'profile' })}
                  className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
                    screen.name === 'profile'
                      ? 'bg-amber-700 text-white'
                      : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                  }`}
                >
                  {(shopName.trim()[0] ?? '?').toUpperCase()}
                </button>
              </nav>
            </div>
          </header>
        )}

        {screen.name === 'orders' && (
          <OrdersList shopId={shopId} onOpen={openOrder} onNew={() => openOrder(null)} />
        )}

        {screen.name === 'customers' && (
          <CustomersList shopId={shopId} onOpenOrder={openOrder} />
        )}

        {screen.name === 'profile' && <Profile />}

        {screen.name === 'order' && (
          <OrderEditor
            shopId={shopId}
            orderId={screen.id}
            onClose={() => setScreen({ name: 'orders' })}
          />
        )}
      </div>
    </>
  )
}
