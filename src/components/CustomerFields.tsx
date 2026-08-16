import { saveCustomer } from '../db/changelog'
import type { Customer } from '../types'
import { formatPhone } from '../lib/format'
import { useSettings } from '../i18n'
import { Field, inputClass } from './ui'

/**
 * The customer's editable details — one component, used both inside an order and from the
 * Customers tab. Shared rather than duplicated so the two can never drift into offering
 * different fields, which is confusing when it is the same record either way.
 *
 * Edits save immediately and go through saveCustomer, so they land in the change log.
 */
export function CustomerFields({ customer }: { customer: Customer }) {
  const { t } = useSettings()

  return (
    <div className="space-y-3">
      <Field label={t('name')}>
        <input
          className={inputClass}
          value={customer.name}
          onChange={(e) => saveCustomer({ ...customer, name: e.target.value })}
        />
      </Field>

      <Field label={t('phone')}>
        <input
          className={inputClass}
          inputMode="tel"
          value={customer.phone ?? ''}
          onChange={(e) => saveCustomer({ ...customer, phone: formatPhone(e.target.value) })}
        />
      </Field>

      <Field label={t('address')}>
        <input
          className={inputClass}
          value={customer.address ?? ''}
          onChange={(e) => saveCustomer({ ...customer, address: e.target.value })}
        />
      </Field>

      <Field label={t('notes')}>
        <textarea
          className={inputClass}
          rows={3}
          value={customer.notes ?? ''}
          onChange={(e) => saveCustomer({ ...customer, notes: e.target.value })}
        />
      </Field>
    </div>
  )
}
