import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { saveOrder } from '../db/changelog'
import {
  ORDER_STATUSES,
  balanceOf,
  paymentStatusOf,
  type Customer,
  type Order,
  type OrderStatus,
} from '../types'
import { daysUntil, formatDate, formatMoney } from '../lib/format'
import { useSettings } from '../i18n'
import { Button, Card, Chip } from '../components/ui'

type Filter = 'active' | 'receivables' | 'all'

export function OrdersList({
  shopId,
  onOpen,
  onNew,
}: {
  shopId: string
  onOpen: (id: string) => void
  onNew: () => void
}) {
  const { t } = useSettings()
  const [filter, setFilter] = useState<Filter>('active')

  const orders = useLiveQuery(async () => {
    const all = await db.orders.where('shopId').equals(shopId).sortBy('number')
    return all.filter((o) => !o.deletedAt).reverse()
  }, [shopId], [])

  const customers = useLiveQuery(
    () => db.customers.where('shopId').equals(shopId).toArray(),
    [shopId],
    [],
  )
  const byId = new Map((customers ?? []).map((c: Customer) => [c.id, c]))

  const visible = (orders ?? []).filter((o) => {
    if (filter === 'active') return o.status !== 'collected'
    if (filter === 'receivables') return balanceOf(o) > 0
    return true
  })

  return (
    <div className="mx-auto max-w-3xl p-4 pb-28">
      {/* New Order sits with the filters rather than floating in a corner — on a laptop a
          bottom-right button is a long way from where the eye already is. */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex flex-1 gap-1 rounded-lg bg-stone-200 p-1">
          {(['active', 'receivables', 'all'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                filter === f ? 'bg-white shadow-sm' : ''
              }`}
            >
              {t(f === 'receivables' ? 'receivables' : f)}
            </button>
          ))}
        </div>
        <Button variant="primary" className="shrink-0 whitespace-nowrap" onClick={onNew}>
          + {t('newOrder')}
        </Button>
      </div>

      {visible.length === 0 && <p className="py-12 text-center text-stone-500">{t('empty')}</p>}

      <ul className="space-y-2">
        {visible.map((order) => (
          <li key={order.id}>
            <OrderRow
              order={order}
              customerName={byId.get(order.customerId)?.name ?? '—'}
              onOpen={() => onOpen(order.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

function OrderRow({
  order,
  customerName,
  onOpen,
}: {
  order: Order
  customerName: string
  onOpen: () => void
}) {
  const { t, lang } = useSettings()
  const receivable = balanceOf(order)
  const payment = paymentStatusOf(order)
  const days = daysUntil(order.dueDate)
  const overdue = days !== null && days < 0 && order.status !== 'collected'
  const soon = days !== null && days >= 0 && days <= 3 && order.status !== 'collected'

  return (
    <Card className="hover:border-amber-400">
      <div className="flex items-start justify-between gap-3">
        <button onClick={onOpen} className="flex-1 text-left">
          <div className="font-semibold">{customerName}</div>
          <div className="text-sm text-stone-500">
            #{order.number} ·{' '}
            {order.items.map((i) => t(`garment_${i.garment}`)).join(', ') || t('empty')}
          </div>
          {order.dueDate && (
            <div
              className={`mt-1 text-xs ${
                overdue ? 'font-medium text-red-700' : soon ? 'text-amber-700' : 'text-stone-500'
              }`}
            >
              {overdue ? t('overdue') : soon ? t('dueSoon') : ''} {formatDate(order.dueDate, lang)}
            </div>
          )}
        </button>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {/* Payment: derived from price vs payments, so read-only here by design. */}
          {order.price === 0 ? (
            <Chip>{t('notPriced')}</Chip>
          ) : (
            <Chip tone={payment === 'paid' ? 'good' : payment === 'partial' ? 'warn' : 'danger'}>
              {t(payment)}
            </Chip>
          )}
          {/* Completion: settable without opening the order. */}
          <StatusSelect order={order} />
        </div>
      </div>

      {receivable > 0 && (
        <button onClick={onOpen} className="mt-2 block w-full text-left text-sm text-red-700">
          {t('receivable')}: {formatMoney(receivable, lang)}
        </button>
      )}
    </Card>
  )
}

/** Changing status from the list still goes through saveOrder, so it lands in the change log. */
function StatusSelect({ order }: { order: Order }) {
  const { t } = useSettings()
  return (
    <select
      value={order.status}
      onChange={(e) => saveOrder({ ...order, status: e.target.value as OrderStatus })}
      className={`rounded-full border px-2 py-1 text-xs font-medium ${
        order.status === 'ready'
          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
          : order.status === 'collected'
            ? 'border-stone-200 bg-stone-100 text-stone-500'
            : 'border-stone-300 bg-white text-stone-700'
      }`}
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s}>
          {t(`status_${s}`)}
        </option>
      ))}
    </select>
  )
}
