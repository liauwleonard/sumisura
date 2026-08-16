import type { ReactNode } from 'react'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-stone-600 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-stone-500 mt-1">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-stone-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  type = 'button',
  disabled,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}) {
  const styles = {
    primary: 'bg-amber-700 text-white hover:bg-amber-800',
    secondary: 'bg-white border border-stone-300 text-stone-800 hover:bg-stone-50',
    ghost: 'text-stone-600 hover:bg-stone-200',
    danger: 'bg-white border border-red-300 text-red-700 hover:bg-red-50',
  }[variant]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2.5 font-medium transition disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warn' | 'danger' | 'good' }) {
  const styles = {
    neutral: 'bg-stone-100 text-stone-600',
    warn: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-700',
    good: 'bg-emerald-100 text-emerald-800',
  }[tone]
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>{children}</span>
}
