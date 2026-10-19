import type { Visit } from '@/services/api/visit.api'

export interface Patient {
  id: string
  hn: string
  firstName: string
  lastName: string
  age: number | null
  gender: string | null
  nationality?: string | null
  lastVisitDate: string | null
  visitCount?: number
  visits?: Visit[]
}

export interface PatientListResponse {
  items: Patient[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface PatientByIdQueryData {
  patientById: Patient | null
}

export interface PatientByIdQueryVariables {
  id: string
}

export interface MyPatientsQueryData {
  myPatients: PatientListResponse | null
}

export interface MyPatientsQueryVariables {
  page: number
  pageSize: number
  search?: string
  dateFrom?: string
  dateTo?: string
  sort?: 'date_asc' | 'date_desc' | 'name_asc' | 'name_desc'
}
