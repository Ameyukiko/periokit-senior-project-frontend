export type Surface = 'buccal' | 'lingual'
export type SiteIndex = 0 | 1 | 2
export type ToothId = number

export interface ToothSurfaceData {
  bop: boolean[]
  pi: boolean[]
  rec: string[]
  pd: string[]
  cal: string[]
  ktw: string
}

export interface ToothData {
  implant: boolean
  mo: string
  fur: Record<Surface, number[]>
  extracted: boolean
  prognosisKC: string
  prognosisMN: string
  buccal: ToothSurfaceData
  lingual: ToothSurfaceData
  note: string
}

export type ChartData = Record<number, ToothData>

export interface PatientInfo {
  hn: string
  doctor: string
  studentId: string
  patientName: string
  age: number | null
  nationality: string
  gender: string
  date: string
}

export interface PdCategories {
  healthy: number
  warning: number
  deep: number
}

export interface PdBreakdown {
  [depth: number]: number  // PD depth → tooth count, e.g., { 5: 3, 6: 2, 7: 1 }
}

export interface HealthDistribution {
  healthy: number
  moderate: number
  severe: number
}

export interface ChartSummary {
  totalTeeth: number
  missingTeeth: number
  implantTeeth: number
  bopPercentage: number
  piPercentage: number
  pdCategories: PdCategories
  pdBreakdown: PdBreakdown
  healthDistribution: HealthDistribution
  mobilityCount: number
  furcationCount: number
  keratinizedLowCount: number
}
