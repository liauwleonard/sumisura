import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId, nextCustomerCode, now } from '../../db/db'
import type { Customer, Order } from '../../types'
import { formatPhone, normalize, phoneKey } from '../../lib/format'
import { useSettings } from '../../i18n'
import { Button, Card, Field, inputClass } from '../../components/ui'
import { CustomerFields } from '../../components/CustomerFields'

interface Props {
  order: Order
  onPickCustomer: (customer: Customer) => void
  onChangeCustomer: () => void
}

/**
 * Search-or-create. This is the step that stops the notebook's core failure from being
 * rebuilt in software — without it you get three "Pak Budi" records.
 */
export function CustomerStep({ order, onPickCustomer, onChangeCustomer }: Props) {
  const { t } = useSettings()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ name: '', phone: '', address: '', notes: '' })
  const [phoneClash, setPhoneClash] = useState<Customer | null>(null)

  const customer = useLiveQuery(
    () => (order.customerId ? db.customers.get(order.customerId) : undefined),
    [order.customerId],
  )

  const matches = useLiveQuery(async () => {
    const q = normalize(query)
    if (q.length < 1) return []
    // Only match on phone when the query actually contains digits — an empty key would make
    // `includes()` true for everyone and every name search would return the whole book.
    const digits = phoneKey(query)
    const all = await db.customers.where('shopId').equals(order.shopId).toArray()
    return all
      .filter((c) => !c.deletedAt)
      .filter(
        (c) =>
          normalize(c.name).includes(q) ||
          (digits.length >= 3 && phoneKey(c.phone).includes(digits)),
      )
      .slice(0, 8)
  }, [query, order.shopId], [])

  async function createCustomer() {
    const phone = draft.phone.trim()
    if (phone) {
      const all = await db.customers.where('shopId').equals(order.shopId).toArray()
      const clash = all.find(
        (c) => !c.deletedAt && phoneKey(c.phone) === phoneKey(phone),
      )
      if (clash) {
        setPhoneClash(clash)
        return
      }
    }
    const created: Customer = {
      id: newId(),
      shopId: order.shopId,
      code: await nextCustomerCode(order.shopId),
      name: draft.name.trim(),
      phone: phone || undefined,
      address: draft.address.trim() || undefined,
      notes: draft.notes.trim() || undefined,
      createdAt: now(),
      updatedAt: now(),
    }
    await db.customers.put(created)
    setCreating(false)
    setPhoneClash(null)
    onPickCustomer(created)
  }

  // ---- already bound to a customer ----
  if (customer) {
    return (
      <div className="space-y-4">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">{customer.name}</div>
              <div className="text-sm text-stone-500">
                {customer.code}
                {customer.phone && ` · ${customer.phone}`}
              </div>
            </div>
            <Button variant="ghost" onClick={onChangeCustomer}>
              {t('changeCustomer')}
            </Button>
          </div>
        </Card>

        <Card>
          <CustomerFields customer={customer} />
        </Card>
      </div>
    )
  }

  // ---- creating a new one ----
  if (creating) {
    return (
      <Card className="space-y-3">
        <Field label={t('name')}>
          <input
            autoFocus
            className={inputClass}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </Field>
        <Field label={t('phone')}>
          <input
            className={inputClass}
            inputMode="tel"
            value={draft.phone}
            onChange={(e) => {
              setDraft({ ...draft, phone: formatPhone(e.target.value) })
              setPhoneClash(null)
            }}
          />
        </Field>
        {phoneClash && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
            <p className="text-amber-900">{t('phoneTaken', { name: phoneClash.name })}</p>
            <div className="mt-2 flex gap-2">
              <Button variant="primary" onClick={() => onPickCustomer(phoneClash)}>
                {t('useExisting', { name: phoneClash.name })}
              </Button>
            </div>
          </div>
        )}
        <Field label={t('address')}>
          <input
            className={inputClass}
            value={draft.address}
            onChange={(e) => setDraft({ ...draft, address: e.target.value })}
          />
        </Field>
        <Field label={t('notes')}>
          <textarea
            className={inputClass}
            rows={2}
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
        </Field>
        <div className="flex gap-2">
          <Button variant="primary" disabled={!draft.name.trim()} onClick={createCustomer}>
            {t('save')}
          </Button>
          <Button onClick={() => setCreating(false)}>{t('cancel')}</Button>
        </div>
      </Card>
    )
  }

  // ---- searching ----
  return (
    <div className="space-y-3">
      <Field label={t('search')} hint={t('searchOrCreate')}>
        <input
          autoFocus
          className={inputClass}
          value={query}
          placeholder={t('name')}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Field>

      {matches && matches.length > 0 && (
        <Card className="divide-y divide-stone-100 p-0">
          {matches.map((c) => (
            <button
              key={c.id}
              onClick={() => onPickCustomer(c)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-stone-50"
            >
              <span>
                <span className="font-medium">{c.name}</span>
                <span className="block text-sm text-stone-500">
                  {c.code}
                  {c.phone && ` · ${c.phone}`}
                </span>
              </span>
              <span className="text-stone-400">›</span>
            </button>
          ))}
        </Card>
      )}

      <Button
        variant="primary"
        onClick={() => {
          setDraft({ name: query.trim(), phone: '', address: '', notes: '' })
          setCreating(true)
        }}
      >
        + {t('createCustomer')}
      </Button>
    </div>
  )
}
