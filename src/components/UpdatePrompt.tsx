import { useRegisterSW } from 'virtual:pwa-register/react'
import { useSettings } from '../i18n'
import { Button } from './ui'

/**
 * A new version never installs itself. The tailor could be mid-measurement with unsaved
 * numbers on screen, and saving here is explicit — so we ask, and he taps when he is ready.
 */
export function UpdatePrompt() {
  const { t } = useSettings()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl border border-stone-300 bg-white p-4 shadow-lg">
      <p className="mb-3 text-sm text-stone-700">{t('updateAvailable')}</p>
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => updateServiceWorker(true)}>
          {t('updateNow')}
        </Button>
        <Button onClick={() => setNeedRefresh(false)}>{t('updateLater')}</Button>
      </div>
    </div>
  )
}
