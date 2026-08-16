import { balanceOf, paidOf, paymentStatusOf, type Order, type Payment } from '../../types'
import { newId, now } from '../../db/db'
import { formatDate, formatMoney, toDateInput, fromDateInput } from '../../lib/format'
import { useSettings } from '../../i18n'
import { Button, Card, Chip, Field, inputClass } from '../../components/ui'

interface Props {
  order: Order
  onChange: (patch: Partial<Order>) => void
}

/** Deliberately dumb: total, deposits, auto receivable. No invoices, no tax, no reports. */
export function BalanceStep({ order, onChange }: Props) {
  const { t, lang } = useSettings()
  const paid = paidOf(order)
  const receivable = balanceOf(order)

  const addPayment = () => {
    const payment: Payment = { id: newId(), amount: 0, date: now() }
    onChange({ payments: [...order.payments, payment] })
  }

  const setPayment = (id: string, patch: Partial<Payment>) =>
    onChange({ payments: order.payments.map((p) => (p.id === id ? { ...p, ...patch } : p)) })

  const removePayment = (id: string) =>
    onChange({ payments: order.payments.filter((p) => p.id !== id) })

  const status = paymentStatusOf(order)

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <Field label={t('price')}>
          <input
            className={inputClass}
            inputMode="numeric"
            value={order.price || ''}
            onChange={(e) => onChange({ price: Number(e.target.value) || 0 })}
          />
        </Field>

        <div className="flex items-center justify-between border-t border-stone-200 pt-3">
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
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={p.amount || ''}
                  onChange={(e) => setPayment(p.id, { amount: Number(e.target.value) || 0 })}
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
