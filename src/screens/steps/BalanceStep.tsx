import {
  balanceOf,
  itemsSubtotal,
  paidOf,
  paymentStatusOf,
  recalculatedTotal,
  type Order,
  type OrderItem,
  type Payment,
} from '../../types'
import { newId, now } from '../../db/db'
import { formatDate, formatMoney, toDateInput, fromDateInput } from '../../lib/format'
import { useSettings } from '../../i18n'
import { Button, Card, Chip, Field, MoneyInput, inputClass } from '../../components/ui'

interface Props {
  order: Order
  onChange: (patch: Partial<Order>) => void
}

/** Deliberately dumb: prices, a discount, deposits, auto receivable. No invoices, no tax. */
export function BalanceStep({ order, onChange }: Props) {
  const { t, lang } = useSettings()
  const paid = paidOf(order)
  const receivable = balanceOf(order)
  const subtotal = itemsSubtotal(order)
  const priced = subtotal > 0
  const status = paymentStatusOf(order)

  /** Any change to item prices or the discount re-derives the stored total in one place. */
  const applyPricing = (patch: Partial<Order>) => {
    const next = { ...order, ...patch }
    onChange({ ...patch, price: recalculatedTotal(next) })
  }

  const setItemPrice = (id: string, price: number) =>
    applyPricing({
      items: order.items.map((i: OrderItem) => (i.id === id ? { ...i, price } : i)),
    })

  const addPayment = () =>
    onChange({ payments: [...order.payments, { id: newId(), amount: 0, date: now() }] })

  const setPayment = (id: string, patch: Partial<Payment>) =>
    onChange({ payments: order.payments.map((p) => (p.id === id ? { ...p, ...patch } : p)) })

  const removePayment = (id: string) =>
    onChange({ payments: order.payments.filter((p) => p.id !== id) })

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="font-semibold">{t('pricing')}</div>

        {order.items.length === 0 ? (
          // No garments yet, so there is nothing to break down — take a lump sum.
          <Field label={t('price')}>
            <MoneyInput value={order.price} onChange={(price) => onChange({ price })} />
          </Field>
        ) : (
          <>
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className="flex-1 text-sm text-stone-600">{t(`garment_${item.garment}`)}</span>
                <MoneyInput
                  className="w-40 text-right"
                  value={item.price ?? 0}
                  placeholder="0"
                  onChange={(price) => setItemPrice(item.id, price)}
                />
              </div>
            ))}

            <div className="flex items-center justify-between border-t border-stone-200 pt-3 text-sm">
              <span className="text-stone-600">{t('subtotal')}</span>
              <span className="font-medium">{formatMoney(subtotal, lang)}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex-1 text-sm text-stone-600">{t('discount')}</span>
              <MoneyInput
                className="w-40 text-right"
                value={order.discount ?? 0}
                placeholder="0"
                onChange={(discount) => applyPricing({ discount })}
              />
            </div>
          </>
        )}

        <div className="flex items-center justify-between border-t border-stone-200 pt-3">
          <span className="font-medium text-stone-700">{t('total')}</span>
          <span className="text-lg font-semibold">{formatMoney(order.price, lang)}</span>
        </div>

        {priced && order.items.some((i) => (i.price ?? 0) === 0) && (
          <p className="text-xs text-amber-700">{t('someItemsUnpriced')}</p>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-600">{t('deposit')}</span>
          <span className="font-medium">{formatMoney(paid, lang)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-600">{t('receivable')}</span>
          <span
            className={`text-lg font-semibold ${receivable > 0 ? 'text-red-700' : 'text-emerald-700'}`}
          >
            {formatMoney(Math.max(receivable, 0), lang)}
          </span>
        </div>
        <div>
          <Chip tone={status === 'paid' ? 'good' : status === 'partial' ? 'warn' : 'neutral'}>
            {t(status)}
          </Chip>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="font-semibold">{t('addPayment')}</div>
        {order.payments.length === 0 && <p className="text-sm text-stone-500">{t('empty')}</p>}
        {order.payments.map((p) => (
          <div key={p.id} className="rounded-lg border border-stone-200 p-3">
            <div className="flex items-end gap-2">
              <Field label={t('amount')}>
                <MoneyInput
                  value={p.amount}
                  onChange={(amount) => setPayment(p.id, { amount })}
                />
              </Field>
              <Field label={t('paymentDate')}>
                <input
                  type="date"
                  className={inputClass}
                  value={toDateInput(p.date)}
                  onChange={(e) =>
                    setPayment(p.id, { date: fromDateInput(e.target.value) ?? now() })
                  }
                />
              </Field>
              <Button variant="ghost" onClick={() => removePayment(p.id)}>
                ✕
              </Button>
            </div>
            <div className="mt-3">
              <Field label={t('paymentRef')} hint={t('paymentRefHint')}>
                <input
                  className={inputClass}
                  value={p.ref ?? ''}
                  placeholder="BCA 20260815-0042"
                  onChange={(e) => setPayment(p.id, { ref: e.target.value })}
                />
              </Field>
            </div>
          </div>
        ))}
        <Button onClick={addPayment}>+ {t('addPayment')}</Button>
      </Card>

      <Card>
        <Field label={t('dueDate')}>
          <input
            type="date"
            className={inputClass}
            value={toDateInput(order.dueDate)}
            onChange={(e) => onChange({ dueDate: fromDateInput(e.target.value) })}
          />
        </Field>
        <p className="mt-2 text-xs text-stone-500">{formatDate(order.dueDate, lang)}</p>
      </Card>
    </div>
  )
}
