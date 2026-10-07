import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useShop } from '../shop/ShopProvider'
import { useSettings, type Lang, type Unit } from '../i18n'
import { Button, Card, Chip, Field, inputClass } from '../components/ui'
import { formatPhone } from '../lib/format'
import { SyncStatus } from '../components/SyncStatus'
import { BackupCard } from '../components/BackupCard'

/** Who am I, whose shop is this, and is it the right account — checkable at a glance. */
export function Profile() {
  const { t, lang, unit, setLang, setUnit } = useSettings()
  const { cloud, session, signOut } = useAuth()
  const shop = useShop()
  const { name, role, update } = shop
  const [draft, setDraft] = useState({
    name,
    address: shop.address ?? '',
    phone: shop.phone ?? '',
    bankName: shop.bankName ?? '',
    bankAccount: shop.bankAccount ?? '',
    bankHolder: shop.bankHolder ?? '',
  })

  // Details arrive asynchronously; don't strand the fields on their initial empty values.
  useEffect(() => {
    setDraft({
      name,
      address: shop.address ?? '',
      phone: shop.phone ?? '',
      bankName: shop.bankName ?? '',
      bankAccount: shop.bankAccount ?? '',
      bankHolder: shop.bankHolder ?? '',
    })
  }, [name, shop.address, shop.phone, shop.bankName, shop.bankAccount, shop.bankHolder])

  const dirty =
    draft.name.trim() !== '' &&
    (draft.name.trim() !== name ||
      draft.address !== (shop.address ?? '') ||
      draft.phone !== (shop.phone ?? '') ||
      draft.bankName !== (shop.bankName ?? '') ||
      draft.bankAccount !== (shop.bankAccount ?? '') ||
      draft.bankHolder !== (shop.bankHolder ?? ''))

  const save = () =>
    update({
      name: draft.name.trim(),
      address: draft.address.trim() || undefined,
      phone: draft.phone.trim() || undefined,
      bankName: draft.bankName.trim() || undefined,
      bankAccount: draft.bankAccount.trim() || undefined,
      bankHolder: draft.bankHolder.trim() || undefined,
    })

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pb-28">
      <Card className="space-y-3">
        <div className="text-sm font-medium text-stone-600">{t('shop')}</div>
        <Field label={t('shopName')} hint={t('shopNameHint')}>
          <input
            className={inputClass}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </Field>

        <Field label={t('address')}>
          <textarea
            className={inputClass}
            rows={2}
            value={draft.address}
            onChange={(e) => setDraft({ ...draft, address: e.target.value })}
          />
        </Field>

        <Field label={t('phone')}>
          <input
            className={inputClass}
            inputMode="tel"
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: formatPhone(e.target.value) })}
          />
        </Field>

        <div className="border-t border-stone-200 pt-3 text-sm font-medium text-stone-600">
          {t('bankDetails')}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('bankName')}>
            <input
              className={inputClass}
              value={draft.bankName}
              onChange={(e) => setDraft({ ...draft, bankName: e.target.value })}
            />
          </Field>
          <Field label={t('bankAccount')}>
            <input
              className={inputClass}
              inputMode="numeric"
              value={draft.bankAccount}
              onChange={(e) => setDraft({ ...draft, bankAccount: e.target.value })}
            />
          </Field>
        </div>
        <Field label={t('bankHolder')}>
          <input
            className={inputClass}
            value={draft.bankHolder}
            onChange={(e) => setDraft({ ...draft, bankHolder: e.target.value })}
          />
        </Field>

        <Button variant="primary" disabled={!dirty} onClick={save}>
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
