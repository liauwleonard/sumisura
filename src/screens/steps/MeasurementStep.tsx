import { useMemo, useRef, useState } from 'react'
import type { Garment, Order } from '../../types'
import {
  FIELDS_BY_GARMENT,
  POSTURE_OPTIONS,
  fromDisplay,
  measurementKey,
  toDisplay,
} from '../../data/measurements'
import type { View } from '../../data/mannequin'
import { Mannequin } from '../../components/Mannequin'
import { FieldHistory } from '../../components/FieldHistory'
import { label, useSettings } from '../../i18n'
import { formatDate } from '../../lib/format'
import { Button, Card, inputClass } from '../../components/ui'
import { AccessoryList } from '../../components/AccessoryList'

/** Accessories take their turn in the same strip as the garments — see `tab` below. */
export type MeasureTab = Garment | 'accessories'

interface Props {
  order: Order
  saved: boolean
  tab: MeasureTab
  onTab: (tab: MeasureTab) => void
  onChange: (patch: Partial<Order>) => void
}

export function MeasurementStep({ order, saved, tab, onTab, onChange }: Props) {
  const { t, lang, unit, setUnit } = useSettings()
  const garments = useMemo(
    () => Array.from(new Set(order.items.map((i) => i.garment))) as Garment[],
    [order.items],
  )
  const accessories = order.accessories ?? []
  const [view, setView] = useState<View>('front')
  const [activeField, setActiveField] = useState<string | null>(null)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  /**
   * One strip for everything on the order. Accessories sit beside the garments rather than in a
   * card stacked above them, so five ties cost one tap instead of a page of scrolling.
   */
  const tabs: MeasureTab[] = [...garments, ...(accessories.length > 0 ? ['accessories' as const] : [])]
  const active: MeasureTab = tabs.includes(tab) ? tab : (tabs[0] ?? 'blazer')
  const onAccessories = active === 'accessories'
  const garmentTab: Garment = onAccessories ? (garments[0] ?? 'blazer') : (active as Garment)

  // Same reasoning as `known()` in data/mannequin: never render off an unknown garment.
  const fields = FIELDS_BY_GARMENT[garmentTab] ?? []

  /** The figure and its labels are keyed by bare field name, so unwrap this garment's slice. */
  const valuesForFigure = Object.fromEntries(
    fields.map((f) => [f, order.measurements[measurementKey(garmentTab, f)] ?? null]),
  )

  if (tabs.length === 0) {
    return <Card className="text-stone-500">{t('noGarmentSelected')}</Card>
  }

  function setValue(field: string, raw: string) {
    const cm = fromDisplay(raw, unit)
    const key = measurementKey(garmentTab, field)
    // Typing a value clears its "carried over" tag — it is now freshly measured.
    const { [key]: _dropped, ...restSources } = order.measurementSource
    void _dropped
    onChange({
      measurements: { ...order.measurements, [key]: cm },
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
    // Clears this garment only — re-measuring a blazer should not wipe the trousers.
    const cleared = { ...order.measurements }
    for (const f of fields) delete cleared[measurementKey(garmentTab, f)]
    const sources = { ...order.measurementSource }
    for (const f of fields) delete sources[measurementKey(garmentTab, f)]
    onChange({ measurements: cleared, measurementSource: sources })
  }

  return (
    <div className="space-y-4">
      {/* garment + accessory tabs, then view + unit controls */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((g) => (
          <button
            key={g}
            onClick={() => onTab(g)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              g === active ? 'bg-amber-700 text-white' : 'bg-white border border-stone-300'
            }`}
          >
            {g === 'accessories'
              ? `${t('accessories')} (${accessories.length})`
              : t(`garment_${g}`)}
          </button>
        ))}
        {/* Front/back and cm/inch belong to the figure; on the accessory tab there isn't one. */}
        <span className={`ml-auto flex gap-1 rounded-lg bg-stone-200 p-1 ${onAccessories ? 'hidden' : ''}`}>
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
        <span className={`flex gap-1 rounded-lg bg-stone-200 p-1 ${onAccessories ? 'hidden' : ''}`}>
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

      {/* The accessory tab replaces the figure entirely rather than stacking under it. */}
      {onAccessories ? (
        <AccessoryList order={order} onChange={onChange} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:sticky lg:top-4 self-start">
          <Mannequin
            garment={garmentTab}
            view={view}
            values={valuesForFigure}
            activeField={activeField}
            onPick={focusField}
          />
        </Card>

        <div className="space-y-3">
          <Card className="space-y-3">
            {fields.map((field) => {
              const key = measurementKey(garmentTab, field)
              const source = order.measurementSource[key]
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
                        value={toDisplay(order.measurements[key] ?? null, unit)}
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
                  {saved && <FieldHistory orderId={order.id} field={key} />}
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
      )}

    </div>
  )
}
