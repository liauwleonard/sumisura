import { useRef, useState } from 'react'
import {
  applyBackup,
  buildBackup,
  downloadBackup,
  readBackupFile,
  summarise,
  type Backup,
  type BackupSummary,
} from '../lib/backup'
import { useShop } from '../shop/ShopProvider'
import { useSync } from '../sync/SyncProvider'
import { useSettings } from '../i18n'
import { formatDate } from '../lib/format'
import { Button, Card } from './ui'

/** The tailor's own copy of everything, in a file he keeps. */
export function BackupCard() {
  const { t, lang } = useSettings()
  const { id: shopId, name: shopName } = useShop()
  const { run } = useSync()
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ backup: Backup; summary: BackupSummary } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onExport() {
    if (!shopId) return
    downloadBackup(await buildBackup(shopId, shopName || 'Sumisura'))
  }

  async function onPick(file: File) {
    setError(null)
    setMessage(null)
    try {
      const backup = await readBackupFile(file)
      setPending({ backup, summary: summarise(backup) })
    } catch (e) {
      const code = e instanceof Error ? e.message : ''
      setError(
        code === 'notABackup'
          ? t('backupNotABackup')
          : code === 'newerVersion'
            ? t('backupNewerVersion')
            : t('backupUnreadable'),
      )
    }
  }

  async function onRestore() {
    if (!pending || !shopId) return
    const { restored, skipped } = await applyBackup(pending.backup, shopId)
    setPending(null)
    setMessage(t('restored', { n: restored, skipped }))
    // Push the restored rows straight up rather than waiting for the next interval.
    run()
  }

  return (
    <Card className="space-y-3">
      <div className="text-sm font-medium text-stone-600">{t('backup')}</div>
      <p className="text-sm text-stone-500">{t('backupHint')}</p>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={onExport}>
          {t('exportBackup')}
        </Button>
        <Button onClick={() => fileInput.current?.click()}>{t('importBackup')}</Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onPick(file)
            // Reset so picking the same file twice still fires a change event.
            e.target.value = ''
          }}
        />
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      {pending && (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">
            {t('backupFound', {
              shop: pending.summary.shopName,
              date: formatDate(pending.summary.exportedAt, lang),
            })}
          </p>
          <p className="text-sm text-amber-900">
            {t('backupContains', {
              customers: pending.summary.customers,
              orders: pending.summary.orders,
            })}
          </p>
          <p className="text-sm text-amber-900">{t('restoreConfirm')}</p>
          <div className="flex gap-2">
            <Button variant="primary" onClick={onRestore}>
              {t('restore')}
            </Button>
            <Button onClick={() => setPending(null)}>{t('cancel')}</Button>
          </div>
        </div>
      )}
    </Card>
  )
}
