import { CUT_OPTIONS, OTHER } from '../../data/cutStyles'
import type { Order, OrderItem } from '../../types'
import { label, useSettings } from '../../i18n'
import { Card, Field, inputClass } from '../../components/ui'

interface Props {
  order: Order
  onChange: (patch: Partial<Order>) => void
}

export function MaterialCutStep({ order, onChange }: Props) {
  const { t } = useSettings()

  const setMaterial = (patch: Partial<Order['material']>) =>
    onChange({ material: { ...order.material, ...patch } })

  const setItem = (id: string, patch: Partial<OrderItem>) =>
    onChange({ items: order.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="font-semibold">{t('step_material')}</div>
        <Field label={t('fabric')}>
          <input
            className={inputClass}
            value={order.material.fabric ?? ''}
            onChange={(e) => setMaterial({ fabric: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('color')}>
            <input
              className={inputClass}
              value={order.material.color ?? ''}
              onChange={(e) => setMaterial({ color: e.target.value })}
            />
          </Field>
          <Field label={t('meters')}>
            <input
              className={inputClass}
              inputMode="decimal"
              value={order.material.meters ?? ''}
              onChange={(e) =>
                setMaterial({ meters: e.target.value === '' ? undefined : Number(e.target.value) })
              }
            />
          </Field>
        </div>
        <Field label={t('lining')}>
          <input
            className={inputClass}
            value={order.material.lining ?? ''}
            onChange={(e) => setMaterial({ lining: e.target.value })}
          />
        </Field>
        <Field label={t('notes')}>
          <textarea
            className={inputClass}
            rows={2}
            value={order.material.notes ?? ''}
            onChange={(e) => setMaterial({ notes: e.target.value })}
          />
        </Field>
      </Card>

      {order.items.map((item) => (
        <Card key={item.id} className="space-y-3">
          <div className="font-semibold">
            {t(`garment_${item.garment}`)} — {t('cutStyle')}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {CUT_OPTIONS[item.garment].map((opt) => (
              <CutSelect
                key={opt.key}
                optionKey={opt.key}
                values={opt.values}
                current={item.cutStyle[opt.key] ?? ''}
                onSet={(v) => setItem(item.id, { cutStyle: { ...item.cutStyle, [opt.key]: v } })}
              />
            ))}
          </div>
          <Field label={t('notes')}>
            <textarea
              className={inputClass}
              rows={2}
              value={item.notes ?? ''}
              onChange={(e) => setItem(item.id, { notes: e.target.value })}
            />
          </Field>
        </Card>
      ))}
    </div>
  )
}

/**
 * Standardised dropdown with an "Other →" escape hatch — the tailor is never trapped by
 * our vocabulary. Free text is stored verbatim in the same field.
 */
function CutSelect({
  optionKey,
  values,
  current,
  onSet,
}: {
  optionKey: string
  values: string[]
  current: string
  onSet: (value: string) => void
}) {
  const { t } = useSettings()
  const isPreset = values.includes(current)
  const isOther = current !== '' && !isPreset

  return (
    <Field label={label(t, 'c_', optionKey)}>
      <select
        className={inputClass}
        value={isOther ? OTHER : current}
        onChange={(e) => onSet(e.target.value === OTHER ? ' ' : e.target.value)}
      >
        <option value="">—</option>
        {values.map((v) => (
          <option key={v} value={v}>
            {label(t, 'v_', v)}
          </option>
        ))}
        <option value={OTHER}>{t('other')} →</option>
      </select>
      {isOther && (
        <input
          autoFocus
          className={`${inputClass} mt-2`}
          value={current.trimStart()}
          onChange={(e) => onSet(e.target.value === '' ? ' ' : e.target.value)}
        />
      )}
    </Field>
  )
}
