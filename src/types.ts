export type ID = string

export type Garment = 'jacket' | 'trousers' | 'shirt' | 'waistcoat'
export type OrderType = 'custom' | 'alteration'

export const ORDER_STATUSES = [
  'measured',
  'cutting',
  'fitting',
  'finishing',
  'ready',
  'collected',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export interface Shop {
  id: ID
  name: string
  createdAt: number
}

export interface Customer {
  id: ID
  shopId: ID
  code: string // C-001, his own quick reference
  name: string
  phone?: string
  address?: string
  notes?: string
  createdAt: number
  updatedAt: number
  deletedAt?: number // soft delete only — sync and history depend on it
}

export interface OrderItem {
  id: ID
  garment: Garment
  /** cut-style option key -> chosen value. 'other' values are stored verbatim. */
  cutStyle: Record<string, string>
  /** Price for this garment alone. Optional: a lump-sum order simply leaves them unset. */
  price?: number
  notes?: string
}

export interface Material {
  fabric?: string
  color?: string
  meters?: number
  lining?: string
  notes?: string
}

export type DiscountType = 'amount' | 'percent'

export interface Payment {
  id: ID
  amount: number
  date: number
  /** Transfer/receipt number, for reconciling against the bank statement. */
  ref?: string
  note?: string
}

/** Where a prefilled measurement came from, until the tailor overwrites it. */
export interface MeasurementSource {
  orderNumber: number
  date: number
}

export interface Order {
  id: ID
  shopId: ID
  customerId: ID
  number: number
  type: OrderType
  status: OrderStatus
  items: OrderItem[]
  /** Canonical centimetres. null = not measured. Frozen snapshot for this order. */
  measurements: Record<string, number | null>
  measurementSource: Record<string, MeasurementSource>
  posture: string[]
  postureNotes?: string
  material: Material
  /**
   * The order total, and the single stored source of truth for money.
   *
   * When garments carry their own prices this is recomputed as subtotal − discount; when they
   * do not, the tailor types it directly. Keeping one stored total means receivables, revenue
   * and sync all keep working off one number rather than re-deriving it in four places.
   */
  price: number
  /** Value only — `discountType` says whether it means rupiah or per cent. */
  discount?: number
  discountType?: DiscountType
  payments: Payment[]
  dueDate?: number
  notes?: string
  createdAt: number
  updatedAt: number
  deletedAt?: number
}

export type ChangeSection =
  | 'customer'
  | 'measurement'
  | 'material'
  | 'cut_style'
  | 'balance'
  | 'status'
  | 'order'

export interface ChangeLogEntry {
  id: ID
  shopId: ID
  orderId?: ID
  customerId?: ID
  section: ChangeSection
  field: string
  oldValue: string | null
  newValue: string | null
  reason?: string
  at: number
  by: string
}

export const paidOf = (order: Order) => order.payments.reduce((sum, p) => sum + p.amount, 0)

/** Sum of the per-garment prices. Zero means this order is priced as a lump sum. */
export const itemsSubtotal = (order: Order) =>
  order.items.reduce((sum, i) => sum + (i.price ?? 0), 0)

/**
 * What `price` should become after a change to item prices or the discount.
 *
 * Falls back to the existing total when no garment is priced, so an order entered as a lump
 * sum — including every order made before per-item pricing existed — keeps its value instead
 * of silently collapsing to zero.
 */
/** What the discount comes to in rupiah, whichever way it was entered. */
export function discountAmount(order: Order): number {
  const value = order.discount ?? 0
  if (value <= 0) return 0
  if (order.discountType === 'percent') {
    // Capped at 100% so a slip of the keyboard cannot turn into a negative total.
    return Math.round((itemsSubtotal(order) * Math.min(value, 100)) / 100)
  }
  return value
}

export function recalculatedTotal(order: Order): number {
  const subtotal = itemsSubtotal(order)
  if (subtotal <= 0) return order.price
  return Math.max(0, subtotal - discountAmount(order))
}

export const balanceOf = (order: Order) => order.price - paidOf(order)

export type PaymentStatus = 'unpaid' | 'partial' | 'paid'

/**
 * Payment status is derived, never stored — it is always price vs payments. That is why it can
 * only be moved from Order → Balance, while completion status is a field the tailor sets directly.
 */
export function paymentStatusOf(order: Order): PaymentStatus {
  const paid = paidOf(order)
  if (order.price > 0 && paid >= order.price) return 'paid'
  return paid > 0 ? 'partial' : 'unpaid'
}
