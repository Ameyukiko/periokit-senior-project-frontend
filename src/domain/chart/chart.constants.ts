import type { SiteIndex } from './chart.types'

export const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
export const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
export const ALL_TEETH = [...UPPER_TEETH, ...LOWER_TEETH]

export const UPPER_ARCH = [
  [18, 17, 16, 15, 14],
  [13, 12, 11, 21, 22, 23],
  [24, 25, 26, 27, 28]
]

export const LOWER_ARCH = [
  [48, 47, 46, 45, 44],
  [43, 42, 41, 31, 32, 33],
  [34, 35, 36, 37, 38]
]

export const BUCCAL_ROWS = ['Implant', 'Mobility', 'Keratinized', 'BOP', 'PI', 'Recession', 'PD', 'CAL']
export const INNER_SURFACE_ROWS = ['CAL', 'PD', 'Recession', 'PI', 'BOP', 'Keratinized', 'Mobility', 'Implant']
export const LINGUAL_ROWS = ['Keratinized', 'BOP', 'PI', 'Recession', 'PD', 'CAL']
export const PALATAL_ROWS = ['CAL', 'PD', 'Recession', 'PI', 'BOP', 'Keratinized']
export const SITE_INDEXES: SiteIndex[] = [0, 1, 2]

export const CHART_LEGEND_ITEMS = {
  Implant: 'Implant marker',
  Mobility: 'Grade 0-3',
  Keratinized: 'Width in mm',
  Furcation: 'Grade 0-3',
  BOP: ' Red ',
  PI: '  Blue ',
  Recession: 'Recession in mm',
  PD: 'Depth in mm',
  CAL: 'Level in mm',
  Ext: 'Extracted tooth'
}
