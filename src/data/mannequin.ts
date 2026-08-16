/**
 * Mannequin geometry. A plain line figure with arms out and legs apart so every
 * measurement line has clear space around it.
 *
 * Coordinate space is the SVG viewBox below — nothing here depends on render size.
 */

/**
 * The body occupies x 40–360; the extra 130 units on each side are label gutters.
 * Indonesian labels are long ("Lingkar lengan atas", "Panjang celana luar") and clipped
 * against a body-tight viewBox.
 */
export const VIEW_BOX = '-130 0 660 620'

export type View = 'front' | 'back'

/** The body itself. Torso is a filled path; limbs are thick round-capped strokes. */
export const BODY = {
  head: { cx: 200, cy: 60, r: 30 },
  neck: { x: 188, y: 84, w: 24, h: 28 },
  torso: 'M152,112 L248,112 L254,180 L242,238 L252,292 L148,292 L158,238 L146,180 Z',
  arms: ['M158,122 L106,216 L70,300', 'M242,122 L294,216 L330,300'],
  hands: [
    { cx: 62, cy: 314, r: 11 },
    { cx: 338, cy: 314, r: 11 },
  ],
  legs: ['M178,290 L150,420 L134,548', 'M222,290 L250,420 L266,548'],
  feet: [
    { cx: 128, cy: 558, rx: 20, ry: 10 },
    { cx: 272, cy: 558, rx: 20, ry: 10 },
  ],
}

export interface MeasureLine {
  field: string
  view: View
  /** Polyline with an arrowhead at each end. */
  points: [number, number][]
  label: [number, number]
  anchor: 'start' | 'middle' | 'end'
}

/**
 * Lines are filtered by the garment group being edited — 25 lines at once is unreadable
 * spaghetti, which is exactly what this screen exists to avoid.
 */
export const LINES: MeasureLine[] = [
  // ---- girths and widths, front ----
  { field: 'neck', view: 'front', points: [[182, 96], [218, 96]], label: [172, 100], anchor: 'end' },
  {
    field: 'shoulder_width',
    view: 'front',
    points: [[150, 108], [250, 108]],
    label: [262, 112],
    anchor: 'start',
  },
  {
    field: 'chest',
    view: 'front',
    points: [[144, 172], [256, 172]],
    label: [268, 176],
    anchor: 'start',
  },
  {
    field: 'waist',
    view: 'front',
    points: [[156, 238], [244, 238]],
    label: [146, 242],
    anchor: 'end',
  },
  {
    field: 'shirt_waist',
    view: 'front',
    points: [[156, 238], [244, 238]],
    label: [146, 242],
    anchor: 'end',
  },
  {
    field: 'seat',
    view: 'front',
    points: [[146, 292], [254, 292]],
    label: [266, 296],
    anchor: 'start',
  },

  // ---- arm, front ----
  {
    field: 'bicep',
    view: 'front',
    points: [[119, 162], [145, 176]],
    label: [110, 152],
    anchor: 'end',
  },
  {
    field: 'wrist',
    view: 'front',
    points: [[67, 277], [89, 287]],
    label: [58, 268],
    anchor: 'end',
  },
  {
    field: 'cuff',
    view: 'front',
    points: [[67, 277], [89, 287]],
    label: [58, 268],
    anchor: 'end',
  },
  {
    field: 'sleeve_length',
    view: 'front',
    points: [[140, 116], [86, 212], [50, 296]],
    label: [34, 224],
    anchor: 'end',
  },

  // ---- lengths, drawn down the centre front where the torso is empty ----
  {
    field: 'jacket_length',
    view: 'front',
    points: [[200, 114], [200, 352]],
    label: [208, 348],
    anchor: 'start',
  },
  {
    field: 'shirt_length',
    view: 'front',
    points: [[200, 114], [200, 334]],
    label: [208, 330],
    anchor: 'start',
  },
  {
    field: 'waistcoat_length',
    view: 'front',
    points: [[200, 114], [200, 286]],
    label: [208, 282],
    anchor: 'start',
  },

  // ---- trousers, front ----
  {
    field: 'trouser_waist',
    view: 'front',
    points: [[154, 250], [246, 250]],
    label: [144, 254],
    anchor: 'end',
  },
  {
    field: 'thigh',
    view: 'front',
    points: [[151, 318], [191, 326]],
    label: [142, 310],
    anchor: 'end',
  },
  {
    field: 'knee',
    view: 'front',
    points: [[132, 418], [168, 422]],
    label: [122, 412],
    anchor: 'end',
  },
  {
    field: 'hem',
    view: 'front',
    points: [[121, 533], [151, 537]],
    label: [111, 528],
    anchor: 'end',
  },
  {
    field: 'rise',
    view: 'front',
    points: [[200, 250], [200, 300]],
    label: [208, 278],
    anchor: 'start',
  },
  {
    field: 'inseam',
    view: 'front',
    points: [[200, 300], [152, 545]],
    label: [216, 470],
    anchor: 'start',
  },
  {
    field: 'outseam',
    view: 'front',
    points: [[96, 250], [96, 548]],
    label: [86, 400],
    anchor: 'end',
  },

  // ---- back view ----
  {
    field: 'shoulder_width',
    view: 'back',
    points: [[150, 108], [250, 108]],
    label: [262, 112],
    anchor: 'start',
  },
  {
    field: 'back_width',
    view: 'back',
    points: [[158, 152], [242, 152]],
    label: [254, 156],
    anchor: 'start',
  },
  {
    field: 'sleeve_length',
    view: 'back',
    points: [[140, 116], [86, 212], [50, 296]],
    label: [34, 224],
    anchor: 'end',
  },
  {
    field: 'jacket_length',
    view: 'back',
    points: [[200, 114], [200, 352]],
    label: [208, 348],
    anchor: 'start',
  },
  {
    field: 'shirt_length',
    view: 'back',
    points: [[200, 114], [200, 334]],
    label: [208, 330],
    anchor: 'start',
  },
  {
    field: 'waistcoat_length',
    view: 'back',
    points: [[200, 114], [200, 286]],
    label: [208, 282],
    anchor: 'start',
  },
  {
    field: 'chest',
    view: 'back',
    points: [[144, 172], [256, 172]],
    label: [268, 176],
    anchor: 'start',
  },
  {
    field: 'waist',
    view: 'back',
    points: [[156, 238], [244, 238]],
    label: [146, 242],
    anchor: 'end',
  },
]

/** Fields that have no line on a given view still need to be reachable — the form lists them all. */
export const linesFor = (view: View, fields: string[]) =>
  LINES.filter((l) => l.view === view && fields.includes(l.field))
