import type { Garment } from '../types'

/**
 * Figure geometry for the measurement screen.
 *
 * Each garment gets its own drawing, in two depths:
 *
 *   garment  — the piece itself. This is what carries the measurement.
 *   detail   — thin seams, creases, plackets. Read as "this is a shirt, not a blazer".
 *
 * There is deliberately no body behind it. A ghost figure was tried and dropped: one set of
 * human proportions cannot serve a drawing scaled to fill the frame for four different
 * garments, so the body came out long in the torso and short in the leg on every one of them.
 * The tailor knows where a chest is; what he needs is which number goes where on THIS piece.
 *
 * Coordinate space is the SVG viewBox below — nothing here depends on render size. Every
 * garment uses the SAME viewBox so the card does not change height when the tailor switches
 * tabs mid-measurement, which is jarring on an iPad held in one hand.
 *
 * Because the view is the same size for every garment, each drawing is scaled to FILL it.
 * Trousers are no longer the bottom half of a small full-body figure; they are a full-frame
 * pair of trousers, which is the whole point of the change.
 */

/**
 * The figure occupies x 40–360; the extra 130 units on each side are label gutters.
 * Indonesian labels are long ("Lingkar lengan atas", "Panjang celana luar") and clipped
 * against a body-tight viewBox.
 */
export const VIEW_BOX = '-130 0 660 620'

export type View = 'front' | 'back'

/**
 * Drawing primitives. A tiny union beats one path string per garment: `stroke` gives round-cap
 * limbs and sleeves for free, and keeping shapes separate means a sleeve can be nudged without
 * re-deriving an outline.
 */
export type Shape =
  | { kind: 'path'; d: string }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; rx?: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  /** Thick round-capped line — arms, legs, sleeves, cuffs. */
  | { kind: 'stroke'; d: string; width: number }
  /** Hairline detail — seams, creases, plackets, vents. */
  | { kind: 'line'; d: string }

export interface Figure {
  garment: Shape[]
  detail: Shape[]
}

// ---------------------------------------------------------------------------
// Garment outlines
// ---------------------------------------------------------------------------

/** Shoulders sit wider than the body's — that is the padding, and it is what makes it a blazer. */
const BLAZER_BODY: Shape[] = [
  { kind: 'stroke', d: 'M130,168 L100,300 L92,436', width: 44 },
  { kind: 'stroke', d: 'M270,168 L300,300 L308,436', width: 44 },
  { kind: 'path', d: 'M120,152 L280,152 L288,244 L272,330 L278,498 L122,498 L128,330 L112,244 Z' },
]

const SHIRT_BODY: Shape[] = [
  // Curved tail, which is the fastest way to say "shirt" at a glance.
  { kind: 'stroke', d: 'M134,172 L110,300 L100,422', width: 36 },
  { kind: 'stroke', d: 'M266,172 L290,300 L300,422', width: 36 },
  { kind: 'rect', x: 80, y: 410, w: 40, h: 32, rx: 3 },
  { kind: 'rect', x: 280, y: 410, w: 40, h: 32, rx: 3 },
  {
    kind: 'path',
    d: 'M126,158 L274,158 L282,248 L266,334 L272,440 Q200,490 128,440 L134,334 L118,248 Z',
  },
]

/** No sleeves, deep armholes, pointed hem. */
const VEST_BODY: Shape[] = [
  {
    kind: 'path',
    d: 'M152,158 L248,158 Q238,206 258,262 L264,340 L258,412 L200,452 L142,412 L136,340 L142,262 Q162,206 152,158 Z',
  },
]

const TROUSERS_BODY: Shape[] = [
  {
    kind: 'path',
    d: 'M136,34 L264,34 L276,140 L284,556 L224,556 L206,248 L200,230 L194,248 L176,556 L116,556 L124,140 Z',
  },
  { kind: 'rect', x: 134, y: 34, w: 132, h: 32 },
]

// ---------------------------------------------------------------------------
// Figures
// ---------------------------------------------------------------------------

export const FIGURES: Record<Garment, Record<View, Figure>> = {
  blazer: {
    front: {
      garment: [
        ...BLAZER_BODY,
        { kind: 'path', d: 'M174,152 L182,130 L218,130 L226,152 Z' },
        { kind: 'path', d: 'M174,152 L146,176 L128,212 L148,240 L200,344 L190,198 Z' },
        { kind: 'path', d: 'M226,152 L254,176 L272,212 L252,240 L200,344 L210,198 Z' },
        { kind: 'rect', x: 132, y: 394, w: 64, h: 24, rx: 2 },
        { kind: 'rect', x: 204, y: 394, w: 64, h: 24, rx: 2 },
        { kind: 'rect', x: 228, y: 262, w: 46, h: 9, rx: 1 },
      ],
      detail: [
        { kind: 'circle', cx: 200, cy: 358, r: 8 },
        { kind: 'line', d: 'M200,368 L200,498' },
      ],
    },
    back: {
      garment: [
        ...BLAZER_BODY,
        { kind: 'path', d: 'M170,152 L178,128 L222,128 L230,152 Z' },
      ],
      detail: [
        { kind: 'line', d: 'M200,152 L200,498' },
        { kind: 'line', d: 'M146,206 L142,498' },
        { kind: 'line', d: 'M254,206 L258,498' },
      ],
    },
  },

  trousers: {
    front: {
      garment: TROUSERS_BODY,
      detail: [
        { kind: 'line', d: 'M202,70 L198,152' },
        { kind: 'line', d: 'M158,120 L146,550' },
        { kind: 'line', d: 'M242,120 L254,550' },
        { kind: 'line', d: 'M136,74 L152,118' },
        { kind: 'line', d: 'M264,74 L248,118' },
      ],
    },
    back: {
      garment: [
        ...TROUSERS_BODY,
        { kind: 'rect', x: 148, y: 118, w: 48, h: 9 },
        { kind: 'rect', x: 204, y: 118, w: 48, h: 9 },
      ],
      detail: [
        { kind: 'line', d: 'M200,66 L200,230' },
        { kind: 'line', d: 'M158,140 L146,550' },
        { kind: 'line', d: 'M242,140 L254,550' },
      ],
    },
  },

  shirt: {
    front: {
      garment: [
        ...SHIRT_BODY,
        { kind: 'path', d: 'M178,158 L184,130 L216,130 L222,158 Z' },
        { kind: 'path', d: 'M178,148 L154,176 L196,216 L192,150 Z' },
        { kind: 'path', d: 'M222,148 L246,176 L204,216 L208,150 Z' },
        { kind: 'rect', x: 192, y: 200, w: 16, h: 246 },
      ],
      detail: [
        { kind: 'circle', cx: 200, cy: 236, r: 5 },
        { kind: 'circle', cx: 200, cy: 290, r: 5 },
        { kind: 'circle', cx: 200, cy: 344, r: 5 },
        { kind: 'circle', cx: 200, cy: 398, r: 5 },
      ],
    },
    back: {
      garment: [
        ...SHIRT_BODY,
        { kind: 'path', d: 'M174,158 L182,132 L218,132 L226,158 Z' },
      ],
      detail: [
        { kind: 'line', d: 'M132,200 L268,200' },
        { kind: 'line', d: 'M186,200 L186,236' },
        { kind: 'line', d: 'M214,200 L214,236' },
      ],
    },
  },

  vest: {
    front: {
      garment: [
        ...VEST_BODY,
        { kind: 'rect', x: 148, y: 372, w: 44, h: 9 },
        { kind: 'rect', x: 210, y: 372, w: 44, h: 9 },
      ],
      detail: [
        { kind: 'line', d: 'M178,158 L200,330 L222,158' },
        { kind: 'circle', cx: 200, cy: 346, r: 5 },
        { kind: 'circle', cx: 200, cy: 374, r: 5 },
        { kind: 'circle', cx: 200, cy: 402, r: 5 },
        { kind: 'circle', cx: 200, cy: 430, r: 5 },
      ],
    },
    back: {
      garment: [
        ...VEST_BODY,
        // The back strap and buckle. A vest back is plain, so this is the only thing to draw.
        { kind: 'rect', x: 140, y: 354, w: 120, h: 14, rx: 3 },
        { kind: 'rect', x: 192, y: 350, w: 18, h: 22, rx: 2 },
      ],
      detail: [{ kind: 'line', d: 'M200,158 L200,350' }],
    },
  },
}

// ---------------------------------------------------------------------------
// Measurement lines
// ---------------------------------------------------------------------------

export interface MeasureLine {
  field: string
  /** Polyline with an arrowhead at each end. */
  points: [number, number][]
  label: [number, number]
  anchor: 'start' | 'middle' | 'end'
}

/**
 * One list per garment per view, because a line is only meaningful against a specific drawing:
 * `chest` sits at y=248 on a blazer and y=266 on a vest, and sharing one coordinate would put
 * the arrow in mid-air on one of them.
 *
 * Length runs as a vertical dimension line down the LEFT, clear of the garment, and labels
 * itself BELOW the line, centred, so a long Indonesian word has the whole width to spread into
 * instead of fighting the side gutters. Down the centre it cut the figure in half.
 */
export const LINES: Record<Garment, Record<View, MeasureLine[]>> = {
  blazer: {
    front: [
      { field: 'shoulder_width', points: [[120, 152], [280, 152]], label: [300, 156], anchor: 'start' },
      { field: 'chest', points: [[112, 248], [288, 248]], label: [40, 252], anchor: 'end' },
      { field: 'waist', points: [[128, 334], [272, 334]], label: [40, 338], anchor: 'end' },
      { field: 'seat', points: [[125, 424], [275, 424]], label: [40, 428], anchor: 'end' },
      { field: 'bicep', points: [[258, 206], [310, 216]], label: [322, 200], anchor: 'start' },
      { field: 'elbow', points: [[276, 297], [322, 303]], label: [338, 288], anchor: 'start' },
      { field: 'arm_length', points: [[298, 160], [328, 300], [336, 442]], label: [350, 356], anchor: 'start' },
      { field: 'wrist', points: [[284, 434], [334, 442]], label: [348, 468], anchor: 'start' },
      { field: 'blazer_length', points: [[52, 152], [52, 498]], label: [52, 524], anchor: 'middle' },
    ],
    back: [
      { field: 'shoulder_width', points: [[120, 152], [280, 152]], label: [300, 156], anchor: 'start' },
      { field: 'back_width', points: [[142, 214], [258, 214]], label: [40, 218], anchor: 'end' },
      { field: 'chest', points: [[112, 248], [288, 248]], label: [40, 256], anchor: 'end' },
      { field: 'waist', points: [[128, 334], [272, 334]], label: [40, 338], anchor: 'end' },
      { field: 'arm_length', points: [[298, 160], [328, 300], [336, 442]], label: [350, 356], anchor: 'start' },
      { field: 'blazer_length', points: [[52, 152], [52, 498]], label: [52, 524], anchor: 'middle' },
    ],
  },

  trousers: {
    front: [
      { field: 'trouser_waist', points: [[136, 38], [264, 38]], label: [276, 42], anchor: 'start' },
      { field: 'seat', points: [[122, 170], [278, 170]], label: [110, 174], anchor: 'end' },
      { field: 'rise', points: [[200, 38], [200, 230]], label: [212, 120], anchor: 'start' },
      { field: 'thigh', points: [[121, 290], [191, 290]], label: [109, 294], anchor: 'end' },
      { field: 'knee', points: [[119, 384], [186, 384]], label: [107, 388], anchor: 'end' },
      { field: 'calf', points: [[118, 450], [182, 450]], label: [106, 454], anchor: 'end' },
      { field: 'hem', points: [[116, 540], [177, 540]], label: [104, 544], anchor: 'end' },
      { field: 'outseam', points: [[102, 38], [98, 556]], label: [90, 500], anchor: 'end' },
      { field: 'inseam', points: [[200, 230], [176, 556]], label: [216, 430], anchor: 'start' },
    ],
    back: [
      { field: 'trouser_waist', points: [[136, 38], [264, 38]], label: [276, 42], anchor: 'start' },
      { field: 'seat', points: [[122, 170], [278, 170]], label: [290, 174], anchor: 'start' },
      { field: 'rise', points: [[200, 38], [200, 230]], label: [212, 120], anchor: 'start' },
      { field: 'outseam', points: [[102, 38], [98, 556]], label: [90, 500], anchor: 'end' },
    ],
  },

  shirt: {
    front: [
      { field: 'neck', points: [[180, 136], [220, 136]], label: [168, 140], anchor: 'end' },
      { field: 'shoulder_width', points: [[126, 158], [274, 158]], label: [304, 162], anchor: 'start' },
      { field: 'chest', points: [[118, 252], [282, 252]], label: [50, 256], anchor: 'end' },
      { field: 'shirt_waist', points: [[134, 338], [266, 338]], label: [50, 342], anchor: 'end' },
      { field: 'bicep', points: [[251, 206], [295, 214]], label: [307, 200], anchor: 'start' },
      { field: 'elbow', points: [[268, 296], [308, 303]], label: [320, 282], anchor: 'start' },
      { field: 'arm_length', points: [[290, 164], [314, 300], [324, 424]], label: [336, 318], anchor: 'start' },
      { field: 'cuff', points: [[278, 432], [324, 438]], label: [336, 464], anchor: 'start' },
      { field: 'shirt_length', points: [[62, 158], [62, 462]], label: [62, 500], anchor: 'middle' },
    ],
    back: [
      { field: 'shoulder_width', points: [[126, 158], [274, 158]], label: [304, 162], anchor: 'start' },
      { field: 'back_width', points: [[142, 216], [258, 216]], label: [50, 220], anchor: 'end' },
      { field: 'chest', points: [[118, 252], [282, 252]], label: [50, 258], anchor: 'end' },
      { field: 'arm_length', points: [[290, 164], [314, 300], [324, 424]], label: [336, 318], anchor: 'start' },
      { field: 'shirt_length', points: [[62, 158], [62, 462]], label: [62, 500], anchor: 'middle' },
    ],
  },

  vest: {
    front: [
      { field: 'shoulder_width', points: [[152, 158], [248, 158]], label: [260, 162], anchor: 'start' },
      { field: 'chest', points: [[142, 266], [258, 266]], label: [270, 270], anchor: 'start' },
      { field: 'waist', points: [[136, 344], [264, 344]], label: [100, 348], anchor: 'end' },
      { field: 'vest_length', points: [[112, 158], [112, 450]], label: [112, 478], anchor: 'middle' },
    ],
    back: [
      { field: 'shoulder_width', points: [[152, 158], [248, 158]], label: [260, 162], anchor: 'start' },
      { field: 'back_width', points: [[150, 214], [250, 214]], label: [100, 218], anchor: 'end' },
      { field: 'chest', points: [[142, 266], [258, 266]], label: [270, 270], anchor: 'start' },
      { field: 'waist', points: [[136, 344], [264, 344]], label: [100, 348], anchor: 'end' },
      { field: 'vest_length', points: [[112, 158], [112, 450]], label: [112, 478], anchor: 'middle' },
    ],
  },
}

/**
 * A garment this build does not know about must not take the screen down with it. Migration
 * handles the renames we know of; this catches anything that still slips through, such as a row
 * from a newer build arriving over sync.
 */
const known = (garment: Garment): Garment => (garment in FIGURES ? garment : 'blazer')

export const figureFor = (garment: Garment, view: View) => FIGURES[known(garment)][view]

/** Fields with no line on a given view are still reachable — the form lists them all. */
export const linesFor = (garment: Garment, view: View) => LINES[known(garment)][view]
