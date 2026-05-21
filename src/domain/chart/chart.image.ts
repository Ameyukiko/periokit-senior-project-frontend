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
  '11-buccal': 14,
  '21-buccal': 12,
  '22-buccal': 6,
  '23-buccal': 3,
  '24-buccal': 0,
  '25-buccal': 5,
  '26-buccal': 4,
  '27-buccal': 0,
  '28-buccal': -2,
  '18-palatal': 23,
  '17-palatal': 24,
  '16-palatal': 22,
  '15-palatal': 17,
  '14-palatal': 17,
  '13-palatal': 16,
  '12-palatal': 18,
  '11-palatal': 12,
  '21-palatal': 11,
  '22-palatal': 17,
  '23-palatal': 15,
  '24-palatal': 16,
  '25-palatal': 16,
  '26-palatal': 21,
  '27-palatal': 24,
  '28-palatal': 23,
  '48-buccal': 24,
  '47-buccal': 22,
  '46-buccal': 23,
  '45-buccal': 20,
  '44-buccal': 13,
  '43-buccal': 12,
  '42-buccal': 15,
  '41-buccal': 19,
  '31-buccal': 19,
  '32-buccal': 15,
  '33-buccal': 12,
  '34-buccal': 13,
  '35-buccal': 20,
  '36-buccal': 23,
  '37-buccal': 21,
  '38-buccal': 21,
  '48-lingual': -4,
  '47-lingual': -4,
  '46-lingual': -1,
  '45-lingual': 3,
  '44-lingual': 4,
  '43-lingual': 7,
  '42-lingual': 3,
  '41-lingual': 1,
  '31-lingual': 1,
  '32-lingual': 3,
  '33-lingual': 7,
  '34-lingual': 3,
  '35-lingual': 1,
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
  '46-buccal': {top: '49%',singleLeft: '55%',firstLeft: '35%',secondLeft: '75%'},
  '38-buccal': {top: '53%',singleLeft: '56%',firstLeft: '35%',secondLeft: '75%'},
  '37-buccal': {top: '50%',singleLeft: '49%',firstLeft: '35%',secondLeft: '75%'},
  '36-buccal': {top: '49%',singleLeft: '45%',firstLeft: '35%',secondLeft: '75%'},
  '48-lingual': {top: '45%',singleLeft: '45%',firstLeft: '35%',secondLeft: '75%'},
  '47-lingual': {top: '45%',singleLeft: '52%',firstLeft: '35%',secondLeft: '75%'},
  '46-lingual': {top: '50%',singleLeft: '45%',firstLeft: '35%',secondLeft: '75%'},
  '38-lingual': {top: '45%',singleLeft: '55%',firstLeft: '35%',secondLeft: '75%'},
  '37-lingual': {top: '45%',singleLeft: '50%',firstLeft: '35%',secondLeft: '75%'},
  '36-lingual': {top: '51%',singleLeft: '55%',firstLeft: '35%',secondLeft: '75%'}
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
export const shouldShowKtwWarning = (ktwValue: string): boolean => {
  const num = parseInt(ktwValue) || 0
  return num > 0 && num < 2
}
