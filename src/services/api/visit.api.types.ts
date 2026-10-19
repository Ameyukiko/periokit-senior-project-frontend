export interface Visit {
  id: string
  patientId: string
  visitDate: string
  phase: string
  doctorName: string | null
  studentId: number | null
  status: string
  hasChart: boolean
  visitNumber?: number
  createdAt: string
}

export interface VisitsByPatientQueryData {
  visitsByPatient: Visit[] | null
}

export interface VisitsByPatientQueryVariables {
  patientId: string
}
