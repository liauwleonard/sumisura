import { newId } from '../db/db'
import type { Accessory, Order } from '../types'
import { useSettings } from '../i18n'
import { Button, Card, Field, inputClass } from './ui'

/**
 * Ties, cufflinks, pocket squares, custom ornaments.
 *
 * Deliberately not garments: they carry no measurement field set, and inventing one per
 * ornament would be guesswork. Size is free text instead — a tie is sized by length, a button
 * by diameter. They are priced, so they also appear on the Balance tab.
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

  const add = () =>
    onChange({ accessories: [...accessories, { id: newId(), name: '', qty: 1 }] })

  const remove = (id: string) =>
    onChange({ accessories: accessories.filter((a) => a.id !== id) })

  return (
    <Card className="space-y-3">
      <div className="text-sm font-medium text-stone-600">{t('accessories')}</div>

      {accessories.length === 0 && <p className="text-sm text-stone-500">{t('noAccessories')}</p>}

      {accessories.map((a) => (
        <div key={a.id} className="space-y-3 rounded-lg border border-stone-200 p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Field label={t('accessoryName')} hint={t('accessoryNameHint')}>
                <input
                  className={inputClass}
                  value={a.name}
                  onChange={(e) => set(a.id, { name: e.target.value })}
                />
              </Field>
            </div>
            <Button variant="ghost" onClick={() => remove(a.id)}>
              ✕
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t('accessorySize')} hint={t('accessorySizeHint')}>
              <input
                className={inputClass}
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
          </div>

          <Field label={t('notes')}>
            <input
              className={inputClass}
              value={a.notes ?? ''}
              onChange={(e) => set(a.id, { notes: e.target.value })}
            />
          </Field>
        </div>
      ))}

      <Button onClick={add}>+ {t('addAccessory')}</Button>
    </Card>
  )
}
