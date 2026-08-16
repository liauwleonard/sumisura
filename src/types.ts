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
  notes?: string
}

export interface Material {
  fabric?: string
  color?: string
  meters?: number
  lining?: string
  notes?: string
}

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
  price: number
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
