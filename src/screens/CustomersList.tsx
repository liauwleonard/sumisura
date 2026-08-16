import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { balanceOf, type Customer, type Order } from '../types'
import { formatDate, formatMoney, normalize, normalizePhone } from '../lib/format'
import { plural, useSettings } from '../i18n'
import { Card, Chip, inputClass } from '../components/ui'

/**
 * Browsing customers directly, rather than only stumbling across them while writing an order.
 * The customer is the durable record here — orders come and go against it.
 */
export function CustomersList({
  shopId,
  onOpenOrder,
}: {
  shopId: string
  onOpenOrder: (id: string) => void
}) {
  const { t, lang } = useSettings()
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const customers = useLiveQuery(
    async () => {
      const all = await db.customers.where('shopId').equals(shopId).toArray()
      return all.filter((c) => !c.deletedAt).sort((a, b) => a.name.localeCompare(b.name))
    },
    [shopId],
    [] as Customer[],
  )

  const orders = useLiveQuery(
    async () => {
      const all = await db.orders.where('shopId').equals(shopId).toArray()
      return all.filter((o) => !o.deletedAt)
    },
    [shopId],
    [] as Order[],
  )

  const byCustomer = new Map<string, Order[]>()
  for (const order of orders) {
    const list = byCustomer.get(order.customerId) ?? []
    list.push(order)
    byCustomer.set(order.customerId, list)
  }

  const q = normalize(query)
  const visible = customers.filter(
    (c) =>
      q === '' || normalize(c.name).includes(q) || normalizePhone(c.phone).includes(q.replace(/\D/g, '')),
  )

  return (
    <div className="mx-auto max-w-3xl p-4 pb-28">
      <input
        className={`${inputClass} mb-4`}
        placeholder={t('searchCustomers')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <p className="mb-3 text-sm text-stone-500">
        {plural(t, 'customerCount', visible.length)}
      </p>

      {visible.length === 0 && <p className="py-12 text-center text-stone-500">{t('empty')}</p>}

      <ul className="space-y-2">
        {visible.map((customer) => {
          const theirOrders = (byCustomer.get(customer.id) ?? []).sort((a, b) => b.number - a.number)
          const owed = theirOrders.reduce((sum, o) => sum + Math.max(balanceOf(o), 0), 0)
          const open = openId === customer.id

          return (
            <li key={customer.id}>
              <Card>
                <button
                  onClick={() => setOpenId(open ? null : customer.id)}
                  className="flex w-full items-start justify-between gap-3 text-left"
                >
                  <div>
                    <div className="font-semibold">{customer.name}</div>
                    <div className="text-sm text-stone-500">
                      {customer.code}
                      {customer.phone && ` · ${customer.phone}`}
                    </div>
                    <div className="mt-1 text-xs text-stone-500">
                      {plural(t, 'orderCount', theirOrders.length)}
                      {theirOrders[0] && ` · ${formatDate(theirOrders[0].createdAt, lang)}`}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {owed > 0 && <Chip tone="danger">{formatMoney(owed, lang)}</Chip>}
                    <span className="text-stone-400">{open ? '▾' : '▸'}</span>
                  </div>
                </button>

                {open && (
                  <div className="mt-3 border-t border-stone-200 pt-3">
                    {customer.address && (
                      <p className="mb-1 text-sm text-stone-600">{customer.address}</p>
                    )}
                    {customer.notes && (
                      <p className="mb-2 text-sm italic text-stone-500">{customer.notes}</p>
                    )}

                    {customer.phone && (
                      <div className="mb-3 flex gap-2">
                        <a
                          href={`tel:${customer.phone}`}
                          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
                        >
                          {t('call')}
                        </a>
                        <a
                          href={`https://wa.me/${normalizePhone(customer.phone).replace(/^0/, '62')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
                        >
                          WhatsApp
                        </a>
                      </div>
                    )}

                    {theirOrders.length === 0 ? (
                      <p className="text-sm text-stone-500">{t('empty')}</p>
                    ) : (
                      <ul className="space-y-1">
                        {theirOrders.map((order) => (
                          <li key={order.id}>
                            <button
                              onClick={() => onOpenOrder(order.id)}
                              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-stone-50"
                            >
                              <span>
                                #{order.number} ·{' '}
                                {order.items.map((i) => t(`garment_${i.garment}`)).join(', ') ||
                                  t('empty')}
                              </span>
                              <span className="text-stone-500">{t(`status_${order.status}`)}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Card>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
