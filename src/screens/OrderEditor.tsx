import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId, nextOrderNumber, now } from '../db/db'
import { historyForOrder, saveOrder } from '../db/changelog'
import { prefillFromHistory, type Prefill } from '../lib/prefill'
import {
  ORDER_STATUSES,
  type ChangeLogEntry,
  type Customer,
  type Garment,
  type Order,
  type OrderType,
} from '../types'
import { ALL_FIELDS } from '../data/measurements'
import { CustomerStep } from './steps/CustomerStep'
import { MeasurementStep } from './steps/MeasurementStep'
import { MaterialCutStep } from './steps/MaterialCutStep'
import { BalanceStep } from './steps/BalanceStep'
import { label, useSettings, type T } from '../i18n'
import type { Dict } from '../i18n/en'
import { formatDate } from '../lib/format'
import { Button, Card, Chip, Field, inputClass } from '../components/ui'

const STEPS = ['customer', 'measurement', 'material', 'balance'] as const
type Step = (typeof STEPS)[number]

const GARMENTS: Garment[] = ['jacket', 'trousers', 'shirt', 'waistcoat']

const blankMeasurements = () =>
  Object.fromEntries(ALL_FIELDS.map((f) => [f, null])) as Record<string, number | null>

/** Change-log rows store stable keys; these turn them into readable labels. */
const LOG_FIELD_KEYS: Record<string, keyof Dict> = {
  price: 'price',
  payments: 'deposit',
  status: 'status',
  type: 'orderType',
  dueDate: 'dueDate',
  notes: 'notes',
  posture: 'posture',
  postureNotes: 'postureNotes',
  fabric: 'fabric',
  color: 'color',
  meters: 'meters',
  lining: 'lining',
  name: 'name',
  phone: 'phone',
  address: 'address',
}

function logLabel(t: T, section: string, field: string) {
  if (section === 'measurement') return label(t, 'm_', field)
  if (section === 'cut_style' && field.includes('.')) {
    const [garment, option] = field.split('.')
    return `${t(`garment_${garment}` as keyof Dict)} · ${label(t, 'c_', option)}`
  }
  const key = LOG_FIELD_KEYS[field]
  return key ? t(key) : field
}

interface Props {
  shopId: string
  orderId: string | null
  onClose: () => void
}

export function OrderEditor({ shopId, orderId, onClose }: Props) {
  const { t, lang } = useSettings()
  const [draft, setDraft] = useState<Order | null>(null)
  const [step, setStep] = useState<Step>('customer')
  const [dirty, setDirty] = useState(false)
  const [prefill, setPrefill] = useState<Prefill | null>(null)
  const [showLog, setShowLog] = useState(false)

  const isExisting = orderId !== null

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (orderId) {
        const existing = await db.orders.get(orderId)
        if (!cancelled && existing) {
          setDraft(existing)
          setStep('measurement')
        }
        return
      }
      const fresh: Order = {
        id: newId(),
        shopId,
        customerId: '',
        number: await nextOrderNumber(shopId),
        type: 'custom',
        status: 'measured',
        items: [],
        measurements: blankMeasurements(),
        measurementSource: {},
        posture: [],
        material: {},
        price: 0,
        payments: [],
        createdAt: now(),
        updatedAt: now(),
      }
      if (!cancelled) setDraft(fresh)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [orderId, shopId])

  const log = useLiveQuery(
    (): Promise<ChangeLogEntry[]> =>
      draft && isExisting ? historyForOrder(draft.id) : Promise.resolve([]),
    [draft?.id, isExisting],
    [] as ChangeLogEntry[],
  )

  if (!draft) return null

  const change = (patch: Partial<Order>) => {
    setDraft({ ...draft, ...patch })
    setDirty(true)
  }

  async function persist(next: Order = draft!) {
    if (!next.customerId) return
    await saveOrder(next)
    setDirty(false)
  }

  async function goToStep(target: Step) {
    // Save on step change so a long measuring session isn't lost, while still keeping the
    // change log coarse — one entry per editing session per field, not one per keystroke.
    if (dirty) await persist()
    setStep(target)
  }

  async function pickCustomer(customer: Customer) {
    const { prefill: pf } = await prefillFromHistory(customer.id, draft!.id)
    setPrefill(pf)
    const merged: Order = {
      ...draft!,
      customerId: customer.id,
      measurements: { ...draft!.measurements, ...pf.measurements },
      measurementSource: pf.sources,
      items: draft!.items.map((i) => ({
        ...i,
        cutStyle: Object.keys(i.cutStyle).length ? i.cutStyle : (pf.cutStyle[i.garment] ?? {}),
      })),
    }
    setDraft(merged)
    setDirty(true)
    await saveOrder(merged)
    setDirty(false)
  }

  const addGarment = (garment: Garment) =>
    change({
      items: [
        ...draft.items,
        { id: newId(), garment, cutStyle: { ...(prefill?.cutStyle[garment] ?? {}) } },
      ],
    })

  const removeGarment = (id: string) => change({ items: draft.items.filter((i) => i.id !== id) })

  return (
    <div className="mx-auto max-w-5xl p-4 pb-28">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={onClose}>
          ‹ {t('goBack')}
        </Button>
        <h1 className="text-xl font-semibold">
          {t('orderNumber')} #{draft.number}
        </h1>
        {dirty && <Chip tone="warn">•</Chip>}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="primary" disabled={!draft.customerId} onClick={() => persist()}>
            {dirty ? t('save') : t('saved')}
          </Button>
        </div>
      </header>

      {/* step tabs — not a locked wizard, he can jump around and leave things half-done */}
      <nav className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-stone-200 p-1">
        {STEPS.map((s) => (
          <button
            key={s}
            onClick={() => goToStep(s)}
            disabled={s !== 'customer' && !draft.customerId}
            className={`flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium disabled:opacity-40 ${
              step === s ? 'bg-white shadow-sm' : ''
            }`}
          >
            {t(`step_${s}`)}
          </button>
        ))}
      </nav>

      {step === 'customer' && (
        <CustomerStep
          order={draft}
          onPickCustomer={pickCustomer}
          onChangeCustomer={() => change({ customerId: '' })}
        />
      )}

      {step === 'measurement' && (
        <div className="space-y-4">
          <GarmentPicker
            order={draft}
            onAdd={addGarment}
            onRemove={removeGarment}
          />
          <MeasurementStep order={draft} saved={isExisting} onChange={change} />
        </div>
      )}

      {step === 'material' && <MaterialCutStep order={draft} onChange={change} />}

      {step === 'balance' && (
        <div className="space-y-4">
          <Card className="grid gap-3 sm:grid-cols-2">
            <Field label={t('orderType')}>
              <select
                className={inputClass}
                value={draft.type}
                onChange={(e) => change({ type: e.target.value as OrderType })}
              >
                <option value="custom">{t('type_custom')}</option>
                <option value="alteration">{t('type_alteration')}</option>
              </select>
            </Field>
            <Field label={t('status')}>
              <select
                className={inputClass}
                value={draft.status}
                onChange={(e) => change({ status: e.target.value as Order['status'] })}
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`status_${s}`)}
                  </option>
                ))}
              </select>
            </Field>
          </Card>
          <BalanceStep order={draft} onChange={change} />
        </div>
      )}

      {isExisting && (
        <Card className="mt-6">
          <button
            onClick={() => setShowLog(!showLog)}
            className="w-full text-left font-semibold text-stone-700"
          >
            {showLog ? '▾' : '▸'} {t('changeLog')} ({log?.length ?? 0})
          </button>
          {showLog &&
            (log && log.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {log.map((e) => (
                  <li key={e.id} className="text-sm">
                    <span className="text-stone-500">{formatDate(e.at, lang)} · </span>
                    <span className="font-medium">{logLabel(t, e.section, e.field)}</span>
                    {': '}
                    <span className="text-stone-400 line-through">{e.oldValue ?? '—'}</span>
                    {' → '}
                    <span className="font-medium">{e.newValue ?? '—'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-stone-500">{t('noHistory')}</p>
            ))}
        </Card>
      )}
    </div>
  )
}

function GarmentPicker({
  order,
  onAdd,
  onRemove,
}: {
  order: Order
  onAdd: (g: Garment) => void
  onRemove: (id: string) => void
}) {
  const { t } = useSettings()
  return (
    <Card className="space-y-3">
      <div className="text-sm font-medium text-stone-600">{t('items')}</div>
      <div className="flex flex-wrap gap-2">
        {order.items.map((item) => (
          <span
            key={item.id}
            className="inline-flex items-center gap-2 rounded-full bg-stone-800 px-3 py-1.5 text-sm text-white"
          >
            {t(`garment_${item.garment}`)}
            <button onClick={() => onRemove(item.id)} className="text-stone-400 hover:text-white">
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {GARMENTS.map((g) => (
          <Button key={g} onClick={() => onAdd(g)}>
            + {t(`garment_${g}`)}
          </Button>
        ))}
      </div>
    </Card>
  )
}
