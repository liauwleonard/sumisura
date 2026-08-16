import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useShop } from '../shop/ShopProvider'
import { useSettings, type Lang, type Unit } from '../i18n'
import { Button, Card, Chip, Field, inputClass } from '../components/ui'
import { SyncStatus } from '../components/SyncStatus'
import { BackupCard } from '../components/BackupCard'

/** Who am I, whose shop is this, and is it the right account — checkable at a glance. */
export function Profile() {
  const { t, lang, unit, setLang, setUnit } = useSettings()
  const { cloud, session, signOut } = useAuth()
  const { name, role, rename } = useShop()
  const [draft, setDraft] = useState(name)

  // The name arrives asynchronously; don't strand the field on its initial empty value.
  useEffect(() => setDraft(name), [name])

  const dirty = draft.trim() !== name && draft.trim() !== ''

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pb-28">
      <Card className="space-y-3">
        <div className="text-sm font-medium text-stone-600">{t('shop')}</div>
        <Field label={t('shopName')} hint={t('shopNameHint')}>
          <input className={inputClass} value={draft} onChange={(e) => setDraft(e.target.value)} />
        </Field>
        <Button variant="primary" disabled={!dirty} onClick={() => rename(draft)}>
          {dirty ? t('save') : t('saved')}
        </Button>
      </Card>

      <Card className="space-y-2">
        <div className="text-sm font-medium text-stone-600">{t('account')}</div>
        {cloud && session ? (
          <>
            <Row label={t('email')} value={session.user.email ?? '—'} />
            {role && <Row label={t('role')} value={role} />}
            <div className="border-t border-stone-200 pt-3">
              <div className="mb-2 text-sm text-stone-500">{t('syncStatus')}</div>
              <SyncStatus />
            </div>
            <div className="pt-2">
              <Button onClick={signOut}>{t('signOut')}</Button>
            </div>
          </>
        ) : (
          <>
            <Chip>{t('localOnlyMode')}</Chip>
            <p className="text-sm text-stone-500">{t('localOnlyDetail')}</p>
          </>
        )}
      </Card>

      <BackupCard />

      <Card className="space-y-3">
        <div className="text-sm font-medium text-stone-600">{t('language')}</div>
        <div className="flex gap-2">
          {(['id', 'en'] as Lang[]).map((l) => (
            <Button key={l} variant={lang === l ? 'primary' : 'secondary'} onClick={() => setLang(l)}>
              {l === 'id' ? 'Bahasa Indonesia' : 'English'}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="text-sm font-medium text-stone-600">{t('units')}</div>
        <div className="flex gap-2">
          {(['cm', 'in'] as Unit[]).map((u) => (
            <Button key={u} variant={unit === u ? 'primary' : 'secondary'} onClick={() => setUnit(u)}>
              {u}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="font-medium text-stone-800">{value}</span>
    </div>
  )
}
