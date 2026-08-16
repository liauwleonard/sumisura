import { BODY, VIEW_BOX, linesFor, type View } from '../data/mannequin'
import { toDisplay } from '../data/measurements'
import { label, useSettings } from '../i18n'

interface Props {
  view: View
  /** Only the active garment's fields are drawn — 25 lines at once is unreadable. */
  fields: string[]
  values: Record<string, number | null>
  activeField: string | null
  onPick: (field: string) => void
}

export function Mannequin({ view, fields, values, activeField, onPick }: Props) {
  const { t, unit } = useSettings()
  const lines = linesFor(view, fields)

  return (
    <svg
      viewBox={VIEW_BOX}
      className="w-full max-w-[560px] mx-auto select-none touch-manipulation"
      role="img"
      aria-label={t(view === 'front' ? 'front' : 'back')}
    >
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,1 L9,5 L0,9 z" className="fill-stone-500" />
        </marker>
        <marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,1 L9,5 L0,9 z" className="fill-amber-600" />
        </marker>
      </defs>

      {/* ---- body ---- */}
      <g className="fill-stone-200 stroke-stone-400" strokeWidth="2">
        <circle cx={BODY.head.cx} cy={BODY.head.cy} r={BODY.head.r} />
        <rect x={BODY.neck.x} y={BODY.neck.y} width={BODY.neck.w} height={BODY.neck.h} />
        <path d={BODY.torso} />
        {BODY.hands.map((h, i) => (
          <circle key={i} cx={h.cx} cy={h.cy} r={h.r} />
        ))}
        {BODY.feet.map((f, i) => (
          <ellipse key={i} cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} />
        ))}
      </g>
      <g className="stroke-stone-200" strokeWidth="26" strokeLinecap="round" fill="none">
        {BODY.arms.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g className="stroke-stone-200" strokeWidth="34" strokeLinecap="round" fill="none">
        {BODY.legs.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* ---- measurement lines ---- */}
      {lines.map((line) => {
        const active = line.field === activeField
        const value = values[line.field] ?? null
        const text = `${label(t, 'm_', line.field)}${value !== null ? `  ${toDisplay(value, unit)}` : ''}`
        return (
          <g
            key={`${line.view}-${line.field}`}
            onClick={() => onPick(line.field)}
            className="cursor-pointer"
          >
            <polyline
              points={line.points.map(([x, y]) => `${x},${y}`).join(' ')}
              fill="none"
              strokeWidth={active ? 3 : 2}
              className={active ? 'stroke-amber-600' : 'stroke-stone-500'}
              markerStart={`url(#${active ? 'arrow-active' : 'arrow'})`}
              markerEnd={`url(#${active ? 'arrow-active' : 'arrow'})`}
            />
            {/* Invisible fat line so a fingertip can hit it on the iPad. */}
            <polyline
              points={line.points.map(([x, y]) => `${x},${y}`).join(' ')}
              fill="none"
              stroke="transparent"
              strokeWidth={22}
            />
            <text
              x={line.label[0]}
              y={line.label[1]}
              textAnchor={line.anchor}
              className={`text-[13px] font-medium ${
                active ? 'fill-amber-700' : value !== null ? 'fill-stone-700' : 'fill-stone-400'
              }`}
            >
              {text}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
