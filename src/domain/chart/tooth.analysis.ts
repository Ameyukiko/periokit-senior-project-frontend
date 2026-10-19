import type { ToothData } from '@/domain/chart/chart.types'

export type PrognosisMN = 'Good' | 'Fair' | 'Poor' | 'Questionable' | 'Hopeless' | 'Good (Fixed)' | 'N/A'
export type PrognosisKC = 'Favorable' | 'Questionable' | 'Unfavorable' | 'Hopeless' | 'N/A'

export interface ToothAnalysis {
  prognosisKC: PrognosisKC
  prognosisMN: PrognosisMN
  buccalKTW: string
  innerSurfaceKTW: string
  mobility: string
  furcation: number
  furcationLabel: string
  buccalPD: string[]
  innerSurfacePD: string[]
  buccalCAL: string[]
  innerSurfaceCAL: string[]
  bopPercentage: string
  piPercentage: string
  note: string
  extracted: boolean
  implant: boolean
}

export const calculateCALValue = (
  pd: string | number,
  rec: string | number,
): number => {
  const p = Number.parseInt(String(pd), 10) || 0
  const r = Number.parseInt(String(rec), 10) || 0
  return Math.max(0, p + r)
}

export const calculatePrognosisMN = (data: ToothData | null | undefined): PrognosisMN => {
  if (!data || data.extracted) return 'N/A'
  if (data.implant) return 'Good (Fixed)'

  const allCAL = [...(data.buccal?.cal || []), ...(data.lingual?.cal || [])].map(
    value => Number.parseInt(String(value), 10) || 0,
  )
  const maxCAL = allCAL.length > 0 ? Math.max(...allCAL) : 0

  const allFur = [...(data.fur?.buccal || []), ...(data.fur?.lingual || [])].map(
    value => Number.parseInt(String(value), 10) || 0,
  )
  const maxFur = allFur.length > 0 ? Math.max(0, ...allFur) : 0
  const mobility = Number.parseInt(String(data.mo), 10) || 0

  if (maxCAL > 8 || mobility >= 3) return 'Hopeless'
  if (maxCAL > 6 || maxFur >= 2 || mobility >= 2) return 'Questionable'
  if (maxCAL > 5 || maxFur === 2) return 'Poor'
  if (maxCAL >= 4 || maxFur === 1) return 'Fair'

  return 'Good'
}

export const calculatePrognosisKC = (data: ToothData | null | undefined): PrognosisKC => {
  if (!data || data.extracted) return 'N/A'
  if (data.implant) return 'Favorable'

  const mn = calculatePrognosisMN(data)

  switch (mn) {
    case 'Good':
    case 'Fair':
      return 'Favorable'
    case 'Poor':
      return 'Questionable'
    case 'Questionable':
      return 'Unfavorable'
    case 'Hopeless':
      return 'Hopeless'
    default:
      return 'Favorable'
  }
}

export const calculatePercentage = (active: number, total: number): string => {
  if (total === 0) return '0%'
  return `${Math.round((active / total) * 100)}%`
}

export const calculateToothBopPercentage = (data: ToothData | null | undefined): string => {
  if (!data || data.extracted) return '0%'
  const activeCount = [...(data.buccal?.bop || []), ...(data.lingual?.bop || [])].filter(value => value === true).length
  return calculatePercentage(activeCount, 6)
}

export const calculateToothPiPercentage = (data: ToothData | null | undefined): string => {
  if (!data || data.extracted) return '0%'
  const activeCount = [...(data.buccal?.pi || []), ...(data.lingual?.pi || [])].filter(value => value === true).length
  return calculatePercentage(activeCount, 6)
}

export const getSafePDValues = (pdArray: unknown[] | undefined): string[] => {
  if (!Array.isArray(pdArray)) return ['0', '0', '0']
  return pdArray.map(value => value !== null && value !== undefined && value !== '' ? String(value) : '0')
}

export const getSafeCALValues = (calArray: unknown[] | undefined): string[] => {
  if (!Array.isArray(calArray)) return ['0', '0', '0']
  return calArray.map(value => value !== null && value !== undefined && value !== '' ? String(value) : '0')
}

export const getToothFurcationGrade = (data: ToothData | null | undefined): number => {
  if (!data) return 0
  const allFur = [...(data.fur?.buccal || []), ...(data.fur?.lingual || [])].map(
    value => Number.parseInt(String(value), 10) || 0,
  )
  return allFur.length > 0 ? Math.max(0, ...allFur) : 0
}

export const formatFurcationGrade = (grade: number | undefined): string => {
  if (!grade) return '-'
  return ['-', 'Grade I', 'Grade II', 'Grade III'][grade] ?? `Grade ${grade}`
}

export const buildToothAnalysis = (data: ToothData | null | undefined): ToothAnalysis | null => {
  if (!data) return null

  const furcation = getToothFurcationGrade(data)

  return {
    prognosisKC: calculatePrognosisKC(data),
    prognosisMN: calculatePrognosisMN(data),
    buccalKTW: data.buccal?.ktw || '0',
    innerSurfaceKTW: data.lingual?.ktw || '0',
    mobility: data.mo || '0',
    furcation,
    furcationLabel: formatFurcationGrade(furcation),
    buccalPD: getSafePDValues(data.buccal?.pd),
    innerSurfacePD: getSafePDValues(data.lingual?.pd),
    buccalCAL: getSafeCALValues(data.buccal?.cal),
    innerSurfaceCAL: getSafeCALValues(data.lingual?.cal),
    bopPercentage: calculateToothBopPercentage(data),
    piPercentage: calculateToothPiPercentage(data),
    note: data.note || '',
    extracted: data.extracted,
    implant: data.implant,
  }
}
