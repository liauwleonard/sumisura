import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useShop } from '../shop/ShopProvider'
import { useSettings } from '../i18n'
import { discountAmount, subtotalOf, type Order } from '../types'
import { formatDate, formatMoney } from '../lib/format'
import { Button } from '../components/ui'
import { CUT_OPTIONS } from '../data/cutStyles'
import logo from '../assets/shop-logo.jpg'
import backdrop from '../assets/invoice-backdrop.png'

/**
 * A printable invoice, handed over at the first meeting.
 *
 * Deliberately not a statement of account: no deposit or balance line. Leonard's call — the
 * money owed lives on the order, and this sheet is printed before any of it is settled.
 * No measurements either; it says what was ordered, not how it will be cut.
 *
 * Printing goes through the browser, so "Save as PDF" and a paper copy are the same action,
 * and the PDF is what gets shared on WhatsApp.
 *
 * The letterhead and the backdrop are HARDCODED, because there is exactly one shop. When a
 * second one arrives they become two more columns on `shops` and two more fields on the Profile
 * screen; nothing else here has to change. Both are <img> rather than CSS backgrounds — browsers
 * drop background images when printing, and this sheet exists to be printed.
 */
export function Invoice({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { t, lang } = useSettings()
  const shop = useShop()

  const order = useLiveQuery(() => db.orders.get(orderId), [orderId])
  const customer = useLiveQuery(
    async () => (order ? db.customers.get(order.customerId) : undefined),
    [order?.customerId],
  )

  if (!order) return null

  const accessories = order.accessories ?? []
  const discount = discountAmount(order)

  // On paper the width cap is dropped: max-w-3xl is ~203mm, wider than A5's 128mm printable
  // width, and overflowing the page box brings back the very shrink-to-fit that the A5 @page
  // rule exists to avoid.
  return (
    <div className="mx-auto max-w-3xl p-4 print:max-w-none print:p-0">
      <div className="print-hide mb-4 flex items-center gap-2">
        <Button variant="ghost" onClick={onClose}>
          ‹ {t('goBack')}
        </Button>
        <Button variant="primary" className="ml-auto" onClick={() => window.print()}>
          {t('printInvoice')}
        </Button>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-8 text-stone-800 print:rounded-none print:border-0 print:p-0">
        {/* --- header: wordmark left, document identity right --- */}
        <div className="flex items-start justify-between gap-6">
          <div>
            {/* The mark is the name — set in text underneath it, it read as a stutter. The shop
                name still comes from the profile everywhere else. */}
            <img src={logo} alt={shop.name} className="print-image h-24 w-auto" />
          </div>
          <div className="text-right">
            <div className="text-xl font-semibold uppercase tracking-widest">{t('invoice')}</div>
            <div className="mt-1 text-sm text-stone-600">
              {t('invoiceNo')} #{order.number}
            </div>
            <div className="text-sm text-stone-600">
              {t('invoiceDate')} {formatDate(order.createdAt, lang)}
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-stone-200 pt-4">
          <div className="text-xs uppercase tracking-widest text-stone-500">{t('invoiceFor')}</div>
          <div className="font-medium">{customer?.name ?? '—'}</div>
          {customer?.phone && <div className="text-sm text-stone-600">{customer.phone}</div>}
        </div>

        {/* --- what was ordered --- */}
        {/* The minimum height is for the backdrop, not the rows: a one-item invoice would
            otherwise leave it an inch tall and pointless. */}
        <div className="relative mt-6 min-h-[360px] print:min-h-[240px]">
          {/* Taller than the rows and centred on them, so it reads as a mark on the sheet rather
              than a picture in a box. The cut-out has no background of its own, so there is no
              panel edge to give it away and no block of grey to pay for in toner — only the
              garments. 25% is what it takes to read as a mark at all; what makes that safe is the
              weight of the text over it, not a weaker image — see `Detail` below. */}
          <img
            src={backdrop}
            alt=""
            aria-hidden
            className="print-image pointer-events-none absolute left-1/2 top-1/2 h-[135%] w-auto max-w-none -translate-x-1/2 -translate-y-1/2 opacity-25"
          />
          <table className="relative w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-stone-300 text-left">
                <th className="py-2 font-medium">{t('invoiceItem')}</th>
                <th className="py-2 text-right font-medium">{t('invoiceAmount')}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-stone-200 align-top">
                  <td className="py-3">
                    <div className="font-medium">{t(`garment_${item.garment}`)}</div>
                    <Detail lines={materialLines(item.material, t)} />
                    <Detail lines={cutLines(item.garment, item.cutStyle, t)} />
                    {item.notes && <div className="text-[13px] text-stone-800">{item.notes}</div>}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {formatMoney(item.price ?? 0, lang)}
                  </td>
                </tr>
              ))}

              {accessories.map((a) => (
                <tr key={a.id} className="border-b border-stone-200 align-top">
                  <td className="py-3">
                    <div className="font-medium">
                      {a.name || t('accessories')}
                      {(a.qty ?? 1) > 1 && ` ×${a.qty}`}
                    </div>
                    <Detail
                      lines={[a.size, a.material, a.notes].filter(Boolean).map((v) => String(v))}
                    />
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {formatMoney((a.price ?? 0) * (a.qty ?? 1), lang)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- money --- */}
        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            {discount > 0 && (
              <>
                <Line label={t('subtotal')} value={formatMoney(subtotalOf(order), lang)} />
                <Line label={t('discount')} value={`− ${formatMoney(discount, lang)}`} />
              </>
            )}
            <div className="flex justify-between border-t border-stone-300 pt-2 text-base font-semibold">
              <span>{t('total')}</span>
              <span className="tabular-nums">{formatMoney(order.price, lang)}</span>
            </div>
          </div>
        </div>

        {/* --- footer: how to pay, and where the shop is --- */}
        <div className="avoid-break mt-10 flex justify-between gap-8 border-t border-stone-200 pt-4 text-xs text-stone-600">
          <div>
            {(shop.bankName || shop.bankAccount || shop.bankHolder) && (
              <>
                <div className="font-medium text-stone-700">{t('payTo')}</div>
                {shop.bankName && <div>{shop.bankName}</div>}
                {shop.bankAccount && <div className="tabular-nums">{shop.bankAccount}</div>}
                {shop.bankHolder && <div>{shop.bankHolder}</div>}
              </>
            )}
            {shop.phone && <div className="mt-2">{shop.phone}</div>}
          </div>
          {shop.address && (
            <div className="max-w-[45%] whitespace-pre-line text-right">{shop.address}</div>
          )}
        </div>
      </div>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-stone-600">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

/**
 * Same colour as the garment name above it, and only a point smaller — the hierarchy is carried
 * by weight, not by greyness. This is the cloth and the cut, the part a customer actually
 * checks, and it has to hold up over the backdrop and through a photocopy. Caption grey lost it
 * on both counts; stone-700 was still losing it at a readable backdrop strength.
 */
function Detail({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null
  return <div className="text-[13px] text-stone-800">{lines.join(' · ')}</div>
}

/** Meters are left out on purpose: the customer is buying a garment, not a length of cloth. */
function materialLines(material: Order['items'][number]['material'], t: ReturnType<typeof useSettings>['t']) {
  if (!material) return []
  const out: string[] = []
  if (material.fabric) out.push(material.fabric)
  if (material.color) out.push(material.color)
  if (material.lining) out.push(`${t('lining')}: ${material.lining}`)
  if (material.notes) out.push(material.notes)
  return out
}

function cutLines(
  garment: Order['items'][number]['garment'],
  cutStyle: Record<string, string>,
  t: ReturnType<typeof useSettings>['t'],
) {
  return CUT_OPTIONS[garment]
    .filter((opt) => (cutStyle[opt.key] ?? '').trim() !== '')
    .map((opt) => {
      const value = cutStyle[opt.key].trim()
      const known = opt.values.includes(value)
      const label = t(`c_${opt.key}` as never)
      return `${label}: ${known ? t(`v_${value}` as never) : value}`
    })
}
