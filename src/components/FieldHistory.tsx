import { useLiveQuery } from 'dexie-react-hooks'
import { historyFor } from '../db/changelog'
import { formatDate } from '../lib/format'
import { useSettings } from '../i18n'

/**
 * The dot next to an edited field. Tapping it shows every value that field has ever held
 * on this order — old → new, when, and who.
 */
export function FieldHistory({ orderId, field }: { orderId: string; field: string }) {
  const { t, lang } = useSettings()
  const entries = useLiveQuery(() => historyFor(orderId, field), [orderId, field], [])

  if (!entries || entries.length === 0) return null

  return (
    <details className="mt-1 group">
      <summary className="cursor-pointer list-none text-xs text-amber-700 inline-flex items-center gap-1">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-600" />
        {t('history')} ({entries.length})
      </summary>
      <ul className="mt-1 space-y-1 border-l-2 border-stone-200 pl-2">
        {entries.map((e) => (
          <li key={e.id} className="text-xs text-stone-600">
            <span className="line-through text-stone-400">{e.oldValue ?? '—'}</span>
            {' → '}
            <span className="font-medium text-stone-800">{e.newValue ?? '—'}</span>
            <span className="text-stone-400"> · {formatDate(e.at, lang)}</span>
            {e.reason && <span className="block italic text-stone-500">“{e.reason}”</span>}
          </li>
        ))}
      </ul>
    </details>
  )
}
