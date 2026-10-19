import type { ChartPayload } from '@/domain/chart/chart.mapper'
import type { PatientInfo } from '@/domain/chart/chart.types'

export interface SaveChartInput {
  visitId?: string | null
  chartName?: string | null
  teethData: ChartPayload
  patientHn?: string
  patientFirstName: string
  patientLastName: string
  patientAge?: number | null
  patientGender?: string | null
  patientNationality?: string | null
  visitDate: string
  visitPhase?: string
  completeVisit?: boolean
}

export interface SavedChart {
  id: string
  visitId: string | null
  patientId: string | null
  chartName: string | null
  status: string | null
  updatedAt: string | null
  patientInfo: PatientInfo | null
}

export interface SaveChartMutationData {
  saveChart: SavedChart | null
}

export interface SaveChartMutationVariables {
  input: SaveChartInput
}

export interface ChartByVisit {
  id: string
  visitId: string
  patientId: string | null
  chartName: string | null
  status: string | null
  teethData: ChartPayload['teeth'] | null
  summary: ChartPayload['summary'] | null
  updatedAt: string | null
  patientInfo: PatientInfo | null
}

export interface ChartByVisitQueryData {
  chartByVisit: ChartByVisit | null
}

export interface ChartByVisitQueryVariables {
  visitId: string
}
