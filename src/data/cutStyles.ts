import type { Garment } from '../types'

export interface CutOption {
  key: string
  values: string[]
}

/**
 * Standardised dropdowns. Every option list gets an "Other →" escape hatch in the UI
 * (see CutStyleFields) so the tailor is never trapped by our vocabulary.
 */
export const CUT_OPTIONS: Record<Garment, CutOption[]> = {
  jacket: [
    { key: 'breast', values: ['single', 'double'] },
    { key: 'buttons', values: ['1', '2', '3'] },
    { key: 'vent', values: ['none', 'single', 'double'] },
    { key: 'lapel', values: ['notch', 'peak', 'shawl'] },
    { key: 'fit', values: ['slim', 'regular'] },
  ],
  trousers: [
    { key: 'fit', values: ['slim', 'regular', 'loose'] },
    { key: 'pleats', values: ['none', 'one', 'two'] },
    { key: 'cuff', values: ['yes', 'no'] },
    { key: 'rise_style', values: ['low', 'mid', 'high'] },
    { key: 'taper', values: ['yes', 'no'] },
  ],
  shirt: [
    { key: 'fit', values: ['slim', 'regular'] },
    { key: 'collar', values: ['spread', 'point', 'button_down', 'cutaway'] },
    { key: 'cuff_style', values: ['barrel', 'french'] },
    { key: 'pocket', values: ['yes', 'no'] },
  ],
  waistcoat: [
    { key: 'breast', values: ['single', 'double'] },
    { key: 'buttons', values: ['4', '5', '6'] },
    { key: 'back', values: ['lining', 'same_fabric'] },
  ],
}

export const OTHER = '__other__'
