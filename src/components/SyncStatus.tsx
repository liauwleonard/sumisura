import { useSync } from '../sync/SyncProvider'
import { useSettings } from '../i18n'
import { Button, Chip } from './ui'

function relative(t: ReturnType<typeof useSettings>['t'], at: number | null) {
  if (!at) return t('syncNever')
  const mins = Math.floor((Date.now() - at) / 60_000)
  if (mins < 1) return t('syncLast', { when: t('justNow') })
  if (mins < 60) return t('syncLast', { when: t('minutesAgo', { n: mins }) })
  return t('syncLast', { when: t('hoursAgo', { n: Math.floor(mins / 60) }) })
}

/** Sync is background work, so this is the only place it is ever visible. */
export function SyncStatus() {
  const { t } = useSettings()
  const { state, lastSyncedAt, error, run } = useSync()

  if (state === 'off') return null

  const tone = state === 'error' ? 'danger' : state === 'offline' ? 'warn' : 'good'
  const label =
    state === 'syncing'
      ? t('syncSyncing')
      : state === 'offline'
        ? t('syncOffline')
        : state === 'error'
          ? t('syncError')
          : t('syncIdle')

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Chip tone={tone}>{label}</Chip>
        <span className="text-sm text-stone-500">{relative(t, lastSyncedAt)}</span>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <Button onClick={run} disabled={state === 'syncing'}>
        {t('syncNow')}
      </Button>
    </div>
  )
}
