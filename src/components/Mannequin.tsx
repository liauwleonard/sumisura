import type { Garment } from '../types'
import { VIEW_BOX, figureFor, linesFor, type Shape, type View } from '../data/mannequin'
import { toDisplay } from '../data/measurements'
import { label, useSettings } from '../i18n'

interface Props {
  garment: Garment
  view: View
  values: Record<string, number | null>
  activeField: string | null
  onPick: (field: string) => void
}

/** The garment being measured, and the lines that say which number belongs where on it. */
export function Mannequin({ garment, view, values, activeField, onPick }: Props) {
  const { t, unit } = useSettings()
  const figure = figureFor(garment, view)
  const lines = linesFor(garment, view)

  return (
    <svg
      viewBox={VIEW_BOX}
      className="w-full max-w-[560px] mx-auto select-none touch-manipulation"
      role="img"
      aria-label={`${t(`garment_${garment}`)} — ${t(view)}`}
    >
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,1 L9,5 L0,9 z" className="fill-stone-500" />
        </marker>
        <marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,1 L9,5 L0,9 z" className="fill-amber-600" />
        </marker>
      </defs>

      {/* ---- the garment ---- */}
      <g className="fill-stone-200 stroke-stone-500" strokeWidth="2">
        {figure.garment.map((s, i) => renderShape(s, i, 'stroke-stone-200', 'stroke-stone-500'))}
      </g>

      {/* ---- seams, creases, buttons ---- */}
      <g className="fill-none stroke-stone-500" strokeWidth="2">
        {figure.detail.map((s, i) => renderShape(s, i, 'stroke-stone-500', 'stroke-stone-500'))}
      </g>

      {/* ---- measurement lines ---- */}
      {lines.map((line) => {
        const active = line.field === activeField
        const value = values[line.field] ?? null
        const text = `${label(t, 'm_', line.field)}${value !== null ? `  ${toDisplay(value, unit)}` : ''}`
        const points = line.points.map(([x, y]) => `${x},${y}`).join(' ')
        return (
          <g key={line.field} onClick={() => onPick(line.field)} className="cursor-pointer">
            <polyline
              points={points}
              fill="none"
              strokeWidth={active ? 3 : 2}
              className={active ? 'stroke-amber-600' : 'stroke-stone-500'}
              markerStart={`url(#${active ? 'arrow-active' : 'arrow'})`}
              markerEnd={`url(#${active ? 'arrow-active' : 'arrow'})`}
            />
            {/* Invisible fat line so a fingertip can hit it on the iPad. */}
            <polyline points={points} fill="none" stroke="transparent" strokeWidth={22} />
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

/**
 * A thick `stroke` is a solid limb or sleeve, so it paints in the layer's FILL colour, not its
 * outline colour — otherwise a sleeve arrives as a heavy dark bar beside a pale body.
 *
 * SVG gives a stroke no outline of its own, so each one is drawn twice: a wider pass in the
 * outline colour, then the fill colour on top. Without it, sleeves float against the page with
 * no edge while the body beside them is cleanly outlined.
 */
function renderShape(shape: Shape, i: number, limbFill: string, limbOutline: string) {
  switch (shape.kind) {
    case 'path':
      return <path key={i} d={shape.d} />
    case 'circle':
      return <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} />
    case 'ellipse':
      return <ellipse key={i} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />
    case 'rect':
      return <rect key={i} x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.rx} />
    case 'stroke':
      return (
        <g key={i} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={shape.d} strokeWidth={shape.width + 4} className={limbOutline} />
          <path d={shape.d} strokeWidth={shape.width} className={limbFill} />
        </g>
      )
    case 'line':
      return <path key={i} d={shape.d} fill="none" />
  }
}
