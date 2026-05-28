import { isUpperTooth } from './chart.rules'
import type { ToothData, Surface, ToothId } from './chart.types'

type FurMarkerPosition = {
  top: string
  singleLeft: string
  firstLeft: string
  secondLeft: string
}

type ClinicalSurface = 'buccal' | 'palatal' | 'lingual'

const getClinicalSurface = (id: number | string, surface: Surface): ClinicalSurface => {
  if (isUpperTooth(id) && surface === 'lingual') return 'palatal'
  return surface
}

const TOOTH_IMAGE_TOP_OFFSETS: Record<`${number}-${ClinicalSurface}`, number> = {
  '18-buccal': -2,
  '17-buccal': 0,
  '16-buccal': 4,
  '15-buccal': 5,
  '14-buccal': 4,
  '13-buccal': 4,
  '12-buccal': 5,
  '11-buccal': 9,
  '21-buccal': 8,
  '22-buccal': 6,
  '23-buccal': 3,
  '24-buccal': 4,
  '25-buccal': 5,
  '26-buccal': 4,
  '27-buccal': 0,
  '28-buccal': -2,
  '18-palatal': 23,
  '17-palatal': 24,
  '16-palatal': 22,
  '15-palatal': 22,
  '14-palatal': 22,
  '13-palatal': 16,
  '12-palatal': 18,
  '11-palatal': 15,
  '21-palatal': 14,
  '22-palatal': 17,
  '23-palatal': 15,
  '24-palatal': 21,
  '25-palatal': 21,
  '26-palatal': 21,
  '27-palatal': 24,
  '28-palatal': 23,
  '48-buccal': 24,
  '47-buccal': 22,
  '46-buccal': 23,
  '45-buccal': 20,
  '44-buccal': 20,
  '43-buccal': 15,
  '42-buccal': 15,
  '41-buccal': 15,
  '31-buccal': 15,
  '32-buccal': 15,
  '33-buccal': 15,
  '34-buccal': 20,
  '35-buccal': 20,
  '36-buccal': 23,
  '37-buccal': 21,
  '38-buccal': 21,
  '48-lingual': -4,
  '47-lingual': -4,
  '46-lingual': -1,
  '45-lingual': -1,
  '44-lingual': -1,
  '43-lingual': 4,
  '42-lingual': 3,
  '41-lingual': 1,
  '31-lingual': 1,
  '32-lingual': 3,
  '33-lingual': 4,
  '34-lingual': 0,
  '35-lingual': 0,
  '36-lingual': 0,
  '37-lingual': -4,
  '38-lingual': -3
}

const TOOTH_COLUMN_WIDTHS: Record<ToothId, number> = {
  18: 63,
  17: 63,
  16: 70,
  15: 48,
  14: 45,
  13: 45,
  12: 43,
  11: 56,
  21: 56,
  22: 42,
  23: 48,
  24: 45,
  25: 45,
  26: 70,
  27: 63,
  28: 63,
  48: 65,
  47: 65,
  46: 70,
  45: 45,
  44: 45,
  43: 45,
  42: 42,
  41: 45,
  31: 45,
  32: 42,
  33: 45,
  34: 43,
  35: 46,
  36: 70,
  37: 63,
  38: 70
}

const SITE_POSITIONS_BUCCAL: Record<number, [number, number, number]> = {
  18: [0.21, 0.49, 0.77],
  17: [0.19, 0.49, 0.79],
  16: [0.11, 0.48, 0.84],
  15: [0.31, 0.50, 0.69],
  14: [0.26, 0.47, 0.68],
  13: [0.20, 0.37, 0.69],
  12: [0.30, 0.57, 0.80],
  11: [0.25, 0.58, 0.80],
  21: [0.21, 0.41, 0.72],
  22: [0.17, 0.42, 0.75],
  23: [0.31, 0.61, 0.79],
  24: [0.28, 0.52, 0.77],
  25: [0.20, 0.47, 0.75],
  26: [0.13, 0.51, 0.89],
  27: [0.20, 0.50, 0.80],
  28: [0.21, 0.49, 0.77],
  48: [0.09, 0.46, 0.83],
  47: [0.12, 0.51, 0.90],
  46: [0.14, 0.51, 0.89],
  45: [0.29, 0.53, 0.78],
  44: [0.27, 0.51, 0.76],
  43: [0.22, 0.49, 0.76],
  42: [0.23, 0.50, 0.77],
  41: [0.24, 0.49, 0.73],
  31: [0.26, 0.51, 0.77],
  32: [0.23, 0.49, 0.75],
  33: [0.22, 0.50, 0.78],
  34: [0.22, 0.49, 0.76],
  35: [0.21, 0.46, 0.71],
  36: [0.12, 0.49, 0.86],
  37: [0.09, 0.48, 0.87],
  38: [0.18, 0.52, 0.87]
}

const SITE_POSITIONS_PALATAL: Record<number, [number, number, number]> = {
  18: [0.13, 0.47, 0.81],
  17: [0.13, 0.47, 0.81],
  16: [0.09, 0.45, 0.81],
  15: [0.18, 0.48, 0.78],
  14: [0.17, 0.49, 0.81],
  13: [0.19, 0.51, 0.83],
  12: [0.10, 0.45, 0.80],
  11: [0.15, 0.44, 0.72],
  21: [0.26, 0.54, 0.83],
  22: [0.17, 0.51, 0.86],
  23: [0.16, 0.46, 0.76],
  24: [0.17, 0.49, 0.81],
  25: [0.21, 0.52, 0.83],
  26: [0.18, 0.54, 0.89],
  27: [0.17, 0.52, 0.87],
  28: [0.19, 0.52, 0.86]
}

const SITE_POSITIONS_LINGUAL: Record<number, [number, number, number]> = {
  48: [0.09, 0.37, 0.85],
  47: [0.12, 0.46, 0.80],
  46: [0.13, 0.46, 0.79],
  45: [0.30, 0.49, 0.68],
  44: [0.30, 0.49, 0.68],
  43: [0.34, 0.52, 0.70],
  42: [0.30, 0.45, 0.61],
  41: [0.30, 0.46, 0.61],
  31: [0.36, 0.53, 0.71],
  32: [0.37, 0.52, 0.68],
  33: [0.28, 0.47, 0.66],
  34: [0.30, 0.50, 0.70],
  35: [0.32, 0.50, 0.68],
  36: [0.21, 0.54, 0.87],
  37: [0.18, 0.53, 0.88],
  38: [0.20, 0.62, 0.90]
}


const FUR_MARKER_POSITIONS: Record<'upper' | 'lower', FurMarkerPosition> = {
  upper: {
    top: '49%',
    singleLeft: '50%',
    firstLeft: '35%',
    secondLeft: '65%'
  },
  lower: {
    top: '50%',
    singleLeft: '40%',
    firstLeft: '80%',
    secondLeft: '65%'
  }
}

const FUR_MARKER_POSITIONS_BY_TOOTH: Partial<Record<`${number}-${ClinicalSurface}`, FurMarkerPosition>> = {
  '18-buccal': FUR_MARKER_POSITIONS.upper,
  '17-buccal': FUR_MARKER_POSITIONS.upper,
  '16-buccal': FUR_MARKER_POSITIONS.upper,
  '14-palatal': {top: '55%',singleLeft: '20%',firstLeft: '25%',secondLeft: '75%'},
  '18-palatal': {top: '55%',singleLeft: '20%',firstLeft: '25%',secondLeft: '65%'},
  '17-palatal': {top: '55%',singleLeft: '20%',firstLeft: '25%',secondLeft: '65%'},
  '16-palatal': {top: '55%',singleLeft: '20%',firstLeft: '25%',secondLeft: '65%'},
  '24-palatal': {top: '55%',singleLeft: '20%',firstLeft: '25%',secondLeft: '75%'},
  '26-buccal': FUR_MARKER_POSITIONS.upper,
  '27-buccal': FUR_MARKER_POSITIONS.upper,
  '28-buccal': FUR_MARKER_POSITIONS.upper,
  '26-palatal': {top: '55%',singleLeft: '20%',firstLeft: '35%',secondLeft: '75%'},
  '27-palatal': {top: '55%',singleLeft: '20%',firstLeft: '35%',secondLeft: '75%'},
  '28-palatal': {top: '55%',singleLeft: '20%',firstLeft: '35%',secondLeft: '75%'},
  '48-buccal': {top: '52%',singleLeft: '45%',firstLeft: '35%',secondLeft: '75%'},
  '47-buccal': {top: '52%',singleLeft: '50%',firstLeft: '35%',secondLeft: '75%'},
  '46-buccal': {top: '52%',singleLeft: '55%',firstLeft: '35%',secondLeft: '75%'},
  '38-buccal': {top: '50%',singleLeft: '56%',firstLeft: '35%',secondLeft: '75%'},
  '37-buccal': {top: '50%',singleLeft: '49%',firstLeft: '35%',secondLeft: '75%'},
  '36-buccal': {top: '50%',singleLeft: '45%',firstLeft: '35%',secondLeft: '75%'},
  '48-lingual': {top: '45%',singleLeft: '45%',firstLeft: '35%',secondLeft: '75%'},
  '47-lingual': {top: '45%',singleLeft: '52%',firstLeft: '35%',secondLeft: '75%'},
  '46-lingual': {top: '45%',singleLeft: '45%',firstLeft: '35%',secondLeft: '75%'},
  '38-lingual': {top: '45%',singleLeft: '55%',firstLeft: '35%',secondLeft: '75%'},
  '37-lingual': {top: '45%',singleLeft: '50%',firstLeft: '35%',secondLeft: '75%'},
  '36-lingual': {top: '45%',singleLeft: '55%',firstLeft: '35%',secondLeft: '75%'}
}

export const getFurImage = (grade: number) => {
  if (grade === 1) return '/images/teeth/vacio.png'
  if (grade === 2) return '/images/teeth/mediolleno.png'
  if (grade === 3) return '/images/teeth/lleno.png'
  return ''
}

export const getToothImage = (id: number | string, surface: Surface, data?: ToothData) => {
  const arch = isUpperTooth(id) ? 'arriba' : 'abajo'
  const clinicalSurface = getClinicalSurface(id, surface)
  const suffix = clinicalSurface === 'palatal' || (!isUpperTooth(id) && clinicalSurface === 'buccal') ? 'b' : ''

  let state = ''
  if (data?.extracted) state = 'tachados-'
  else if (data?.implant) state = 'tornillo-'

  return `/images/teeth/periodontograma-dientes-${arch}-${state}${id}${suffix}.png`
}

export const getToothImageTopOffset = (id: ToothId, surface: Surface) => {
  return TOOTH_IMAGE_TOP_OFFSETS[`${id}-${getClinicalSurface(id, surface)}`] ?? 0
}

export const getToothColumnWidth = (id: ToothId) => {
  return TOOTH_COLUMN_WIDTHS[id] ?? 54
}


export const getToothSitePositions = (id: ToothId, surface: Surface): [number, number, number] => {
  const clinicalSurface = getClinicalSurface(id, surface)
  if (clinicalSurface === 'buccal') {
    return SITE_POSITIONS_BUCCAL[id] ?? [0.2, 0.5, 0.8]
  } else if (clinicalSurface === 'palatal') {
    return SITE_POSITIONS_PALATAL[id] ?? [0.2, 0.5, 0.8]
  } else {
    return SITE_POSITIONS_LINGUAL[id] ?? [0.2, 0.5, 0.8]
  }
}

export const getFurMarkerStyle = (id: ToothId, surface: Surface, index: number, totalSites: number) => {
  const clinicalSurface = getClinicalSurface(id, surface)
  const position = FUR_MARKER_POSITIONS_BY_TOOTH[`${id}-${clinicalSurface}`] ?? FUR_MARKER_POSITIONS[isUpperTooth(id) ? 'upper' : 'lower']

  return {
    top: position.top,
    left: totalSites > 1 ? (index === 0 ? position.firstLeft : position.secondLeft) : position.singleLeft
  }
}

// KTW Warning marker positions (displayed when KTW < 2mm)
// Positioned at the top of upper teeth, bottom of lower teeth
type KtwWarningPosition = {
  top: string
  left: string
}

const KTW_WARNING_BASE_POSITIONS: Record<'upper' | 'lower', KtwWarningPosition> = {
  upper: { top: '8%', left: '50%' },   // Top of upper teeth
  lower: { top: '92%', left: '50%' }   // Bottom of lower teeth
}

export const getKtwWarningStyle = (id: ToothId, _surface: Surface): KtwWarningPosition => {
  // Base position depends on arch
  return KTW_WARNING_BASE_POSITIONS[isUpperTooth(id) ? 'upper' : 'lower']
}

// Check if KTW warning should be displayed (KTW < 2mm and has a value)
// Uses parseFloat to support decimal values like 1.5, 1.9
export const shouldShowKtwWarning = (ktwValue: string): boolean => {
  const num = parseFloat(ktwValue) || 0
  return num > 0 && num < 2
}
