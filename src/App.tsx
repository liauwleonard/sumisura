import { useEffect, useMemo, useState } from 'react'
import { getShop } from './db/db'
import { OrdersList } from './screens/OrdersList'
import { OrderEditor } from './screens/OrderEditor'
import { DEFAULT_LANG, SettingsContext, makeT, type Lang, type Unit } from './i18n'
import { Button } from './components/ui'
import { UpdatePrompt } from './components/UpdatePrompt'

type Screen = { name: 'orders' } | { name: 'order'; id: string | null } | { name: 'settings' }

const read = <T,>(key: string, fallback: T): T =>
  (localStorage.getItem(key) as T | null) ?? fallback

export default function App() {
  const [lang, setLangState] = useState<Lang>(() => read('lang', DEFAULT_LANG))
  const [unit, setUnitState] = useState<Unit>(() => read('unit', 'cm' as Unit))
  const [shopId, setShopId] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>({ name: 'orders' })

  useEffect(() => {
    getShop().then((shop) => setShopId(shop.id))
  }, [])

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

  if (!shopId) return null

  const { t, setLang, setUnit } = settings

  return (
    <SettingsContext.Provider value={settings}>
      <UpdatePrompt />
      <div className="min-h-full">
        {screen.name !== 'order' && (
          <header className="sticky top-0 z-10 border-b border-stone-200 bg-stone-100/90 backdrop-blur">
            <div className="mx-auto flex max-w-3xl items-center gap-3 p-4">
              <div>
                <h1 className="text-lg font-semibold leading-tight tracking-tight">{t('app')}</h1>
                <p className="text-xs leading-tight text-stone-500">{t('tagline')}</p>
              </div>
              <nav className="ml-auto flex gap-2">
                <Button
                  variant={screen.name === 'orders' ? 'primary' : 'ghost'}
                  onClick={() => setScreen({ name: 'orders' })}
                >
                  {t('orders')}
                </Button>
                <Button
                  variant={screen.name === 'settings' ? 'primary' : 'ghost'}
                  onClick={() => setScreen({ name: 'settings' })}
                >
                  {t('settings')}
                </Button>
              </nav>
            </div>
          </header>
        )}

        {screen.name === 'orders' && (
          <>
            <OrdersList shopId={shopId} onOpen={(id) => setScreen({ name: 'order', id })} />
            <button
              onClick={() => setScreen({ name: 'order', id: null })}
              className="fixed bottom-6 right-6 rounded-full bg-amber-700 px-6 py-4 font-semibold text-white shadow-lg hover:bg-amber-800"
            >
              + {t('newOrder')}
            </button>
          </>
        )}

        {screen.name === 'order' && (
          <OrderEditor
            shopId={shopId}
            orderId={screen.id}
            onClose={() => setScreen({ name: 'orders' })}
          />
        )}

        {screen.name === 'settings' && (
          <div className="mx-auto max-w-3xl space-y-4 p-4">
            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="mb-2 text-sm font-medium text-stone-600">{t('language')}</div>
              <div className="flex gap-2">
                {(['id', 'en'] as Lang[]).map((l) => (
                  <Button
                    key={l}
                    variant={lang === l ? 'primary' : 'secondary'}
                    onClick={() => setLang(l)}
                  >
                    {l === 'id' ? 'Bahasa Indonesia' : 'English'}
                  </Button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="mb-2 text-sm font-medium text-stone-600">{t('units')}</div>
              <div className="flex gap-2">
                {(['cm', 'in'] as Unit[]).map((u) => (
                  <Button
                    key={u}
                    variant={unit === u ? 'primary' : 'secondary'}
                    onClick={() => setUnit(u)}
                  >
                    {u}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </SettingsContext.Provider>
  )
}
