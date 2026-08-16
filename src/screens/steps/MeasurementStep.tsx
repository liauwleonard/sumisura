import { useMemo, useRef, useState } from 'react'
import type { Garment, Order } from '../../types'
import { FIELDS_BY_GARMENT, POSTURE_OPTIONS, fromDisplay, toDisplay } from '../../data/measurements'
import type { View } from '../../data/mannequin'
import { Mannequin } from '../../components/Mannequin'
import { FieldHistory } from '../../components/FieldHistory'
import { label, useSettings } from '../../i18n'
import { formatDate } from '../../lib/format'
import { Button, Card, inputClass } from '../../components/ui'

interface Props {
  order: Order
  saved: boolean
  onChange: (patch: Partial<Order>) => void
}

export function MeasurementStep({ order, saved, onChange }: Props) {
  const { t, lang, unit, setUnit } = useSettings()
  const garments = useMemo(
    () => Array.from(new Set(order.items.map((i) => i.garment))) as Garment[],
    [order.items],
  )
  const [garment, setGarment] = useState<Garment>(garments[0] ?? 'jacket')
  const [view, setView] = useState<View>('front')
  const [activeField, setActiveField] = useState<string | null>(null)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  const active: Garment = garments.includes(garment) ? garment : (garments[0] ?? 'jacket')
  const fields = FIELDS_BY_GARMENT[active]

  if (garments.length === 0) {
    return <Card className="text-stone-500">{t('noGarmentSelected')}</Card>
  }

  function setValue(field: string, raw: string) {
    const cm = fromDisplay(raw, unit)
    // Typing a value clears its "carried over" tag — it is now freshly measured.
    const { [field]: _dropped, ...restSources } = order.measurementSource
    void _dropped
    onChange({
      measurements: { ...order.measurements, [field]: cm },
      measurementSource: restSources,
    })
  }

  function focusField(field: string) {
    setActiveField(field)
    inputs.current[field]?.focus()
    inputs.current[field]?.select()
  }

  function measureFresh() {
    if (!confirm(t('measureFreshConfirm'))) return
    const cleared: Record<string, number | null> = {}
    for (const f of Object.keys(order.measurements)) cleared[f] = null
    onChange({ measurements: cleared, measurementSource: {} })
  }

  return (
    <div className="space-y-4">
      {/* garment + view + unit controls */}
      <div className="flex flex-wrap items-center gap-2">
        {garments.map((g) => (
          <button
            key={g}
            onClick={() => setGarment(g)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              g === active ? 'bg-amber-700 text-white' : 'bg-white border border-stone-300'
            }`}
          >
            {t(`garment_${g}`)}
          </button>
        ))}
        <span className="ml-auto flex gap-1 rounded-lg bg-stone-200 p-1">
          {(['front', 'back'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 text-sm ${view === v ? 'bg-white shadow-sm' : ''}`}
            >
              {t(v)}
            </button>
          ))}
        </span>
        <span className="flex gap-1 rounded-lg bg-stone-200 p-1">
          {(['cm', 'in'] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`rounded-md px-3 py-1 text-sm ${unit === u ? 'bg-white shadow-sm' : ''}`}
            >
              {u}
            </button>
          ))}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:sticky lg:top-4 self-start">
          <Mannequin
            view={view}
            fields={fields}
            values={order.measurements}
            activeField={activeField}
            onPick={focusField}
          />
        </Card>

        <div className="space-y-3">
          <Card className="space-y-3">
            {fields.map((field) => {
              const source = order.measurementSource[field]
              return (
                <div key={field}>
                  <label className="flex items-center gap-3">
                    <span
                      className={`flex-1 text-sm font-medium ${
                        activeField === field ? 'text-amber-700' : 'text-stone-600'
                      }`}
                    >
                      {label(t, 'm_', field)}
                    </span>
                    <span className="relative">
                      <input
                        ref={(el) => {
                          inputs.current[field] = el
                        }}
                        className={`${inputClass} w-28 text-right pr-10 ${
                          source ? 'border-dashed border-amber-400 bg-amber-50/50' : ''
                        }`}
                        inputMode="decimal"
                        value={toDisplay(order.measurements[field] ?? null, unit)}
                        onFocus={() => setActiveField(field)}
                        onChange={(e) => setValue(field, e.target.value)}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                        {unit}
                      </span>
                    </span>
                  </label>
                  {source && (
                    <div className="pl-1 text-xs text-amber-700">
                      {t('fromOrder', {
                        n: source.orderNumber,
                        date: formatDate(source.date, lang),
                      })}
                    </div>
                  )}
                  {saved && <FieldHistory orderId={order.id} field={field} />}
                </div>
              )
            })}
            <Button variant="danger" onClick={measureFresh}>
              {t('measureFresh')}
            </Button>
          </Card>

          <Card className="space-y-3">
            <div className="text-sm font-medium text-stone-600">{t('posture')}</div>
            <div className="flex flex-wrap gap-2">
              {POSTURE_OPTIONS.map((p) => {
                const on = order.posture.includes(p)
                return (
                  <button
                    key={p}
                    onClick={() =>
                      onChange({
                        posture: on
                          ? order.posture.filter((x) => x !== p)
                          : [...order.posture, p],
                      })
                    }
                    className={`rounded-full px-3 py-1.5 text-sm ${
                      on ? 'bg-stone-800 text-white' : 'bg-white border border-stone-300'
                    }`}
                  >
                    {label(t, 'p_', p)}
                  </button>
                )
              })}
            </div>
            <textarea
              className={inputClass}
              rows={3}
              placeholder={t('postureNotes')}
              value={order.postureNotes ?? ''}
              onChange={(e) => onChange({ postureNotes: e.target.value })}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}
