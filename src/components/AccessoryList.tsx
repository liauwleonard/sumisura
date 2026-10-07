import type { Accessory, Order } from '../types'
import { useSettings } from '../i18n'
import { Button, Card, Field, inputClass } from './ui'

/**
 * Ties, cufflinks, pocket squares, custom ornaments.
 *
 * Deliberately not garments: they carry no measurement field set, and inventing one per
 * ornament would be guesswork. Size is free text instead — a tie is sized by length, a button
 * by diameter. They are priced, so they also appear on the Balance tab.
 *
 * Adding is done from the garment picker, so every "what is on this order" control sits in one
 * row. This renders only when there is at least one, so it has no empty state.
 */
export function AccessoryList({
  order,
  onChange,
}: {
  order: Order
  onChange: (patch: Partial<Order>) => void
}) {
  const { t } = useSettings()
  const accessories = order.accessories ?? []

  const set = (id: string, patch: Partial<Accessory>) =>
    onChange({ accessories: accessories.map((a) => (a.id === id ? { ...a, ...patch } : a)) })

  const remove = (id: string) =>
    onChange({ accessories: accessories.filter((a) => a.id !== id) })

  return (
    <Card className="space-y-3">
      <div className="text-sm font-medium text-stone-600">{t('accessories')}</div>

      {accessories.map((a) => (
        <div key={a.id} className="rounded-lg border border-stone-200 p-3">
          {/* One compact block per accessory. These sit above the measuring UI now, so a tall
              card per tie would push the figure off the screen. Hints are placeholders. */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label={t('accessoryName')}>
                <input
                  className={inputClass}
                  placeholder={t('accessoryNameHint')}
                  value={a.name}
                  onChange={(e) => set(a.id, { name: e.target.value })}
                />
              </Field>
            </div>
            <Button variant="ghost" onClick={() => remove(a.id)}>
              ✕
            </Button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_5rem_1.5fr]">
            <Field label={t('accessorySize')}>
              <input
                className={inputClass}
                placeholder={t('accessorySizeHint')}
                value={a.size ?? ''}
                onChange={(e) => set(a.id, { size: e.target.value })}
              />
            </Field>
            <Field label={t('accessoryMaterial')}>
              <input
                className={inputClass}
                value={a.material ?? ''}
                onChange={(e) => set(a.id, { material: e.target.value })}
              />
            </Field>
            <Field label={t('accessoryQty')}>
              <input
                className={inputClass}
                inputMode="numeric"
                value={a.qty ?? 1}
                onChange={(e) =>
                  set(a.id, { qty: Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1) })
                }
              />
            </Field>
            <Field label={t('notes')}>
              <input
                className={inputClass}
                value={a.notes ?? ''}
                onChange={(e) => set(a.id, { notes: e.target.value })}
              />
            </Field>
          </div>
        </div>
      ))}

    </Card>
  )
}
