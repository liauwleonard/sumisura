import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { balanceOf, type Customer, type Order } from '../types'
import { formatDate, formatMoney, normalize, phoneKey, whatsappNumber } from '../lib/format'
import { plural, useSettings } from '../i18n'
import { Card, Chip, inputClass } from '../components/ui'
import { CustomerFields } from '../components/CustomerFields'

type SortKey = 'name' | 'phone' | 'value' | 'receivable'

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
  const [sort, setSort] = useState<SortKey>('name')

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
  // Same guard as the order flow: an empty digit key would match every customer.
  const digits = phoneKey(query)

  // Totals are computed once per render rather than inside the sort comparator, which would
  // recompute them for every comparison.
  const rows = customers
    .filter(
      (c) =>
        q === '' ||
        normalize(c.name).includes(q) ||
        (digits.length >= 3 && phoneKey(c.phone).includes(digits)),
    )
    .map((customer) => {
      const theirOrders = (byCustomer.get(customer.id) ?? []).sort((a, b) => b.number - a.number)
      return {
        customer,
        theirOrders,
        // Everything billed, whether collected yet or not.
        value: theirOrders.reduce((sum, o) => sum + o.price, 0),
        owed: theirOrders.reduce((sum, o) => sum + Math.max(balanceOf(o), 0), 0),
      }
    })
    .sort((a, b) => {
      if (sort === 'value') return b.value - a.value
      if (sort === 'receivable') return b.owed - a.owed
      if (sort === 'phone') return phoneKey(a.customer.phone).localeCompare(phoneKey(b.customer.phone))
      return a.customer.name.localeCompare(b.customer.name)
    })

  return (
    <div className="mx-auto max-w-3xl p-4 pb-28">
      <input
        className={`${inputClass} mb-4`}
        placeholder={t('searchCustomers')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="mb-3 flex items-center gap-3">
        <p className="text-sm text-stone-500">{plural(t, 'customerCount', rows.length)}</p>
        <label className="ml-auto flex items-center gap-2 text-sm text-stone-500">
          {t('sortBy')}
          <select
            className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="name">{t('sortName')}</option>
            <option value="phone">{t('sortPhone')}</option>
            <option value="value">{t('sortValue')}</option>
            <option value="receivable">{t('sortReceivable')}</option>
          </select>
        </label>
      </div>

      {rows.length === 0 && <p className="py-12 text-center text-stone-500">{t('empty')}</p>}

      <ul className="space-y-2">
        {rows.map(({ customer, theirOrders, value, owed }) => {
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
                    {value > 0 && (
                      <span className="text-sm font-medium text-stone-700">
                        {formatMoney(value, lang)}
                      </span>
                    )}
                    {owed > 0 && <Chip tone="danger">{formatMoney(owed, lang)}</Chip>}
                    <span className="text-stone-400">{open ? '▾' : '▸'}</span>
                  </div>
                </button>

                {open && (
                  <div className="mt-3 space-y-4 border-t border-stone-200 pt-3">
                    {customer.phone && (
                      <div className="flex gap-2">
                        <a
                          href={`tel:${customer.phone}`}
                          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
                        >
                          {t('call')}
                        </a>
                        <a
                          href={`https://wa.me/${whatsappNumber(customer.phone)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
                        >
                          WhatsApp
                        </a>
                      </div>
                    )}

                    {/* Same editable fields as inside an order — it is the same record. */}
                    <CustomerFields customer={customer} />

                    <div className="text-sm font-medium text-stone-600">{t('orders')}</div>

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
