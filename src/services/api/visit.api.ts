import { apolloClient } from '../apollo-client'
import { gql } from '@apollo/client/core'

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

const VISITS_BY_PATIENT = gql`
  query VisitsByPatient($patientId: ID!) {
    visitsByPatient(patientId: $patientId) {
      id
      patientId
      visitDate
      phase
      doctorName
      studentId
      status
      hasChart
      createdAt
    }
  }
`

export const visitApi = {
  async getByPatient(patientId: string): Promise<Visit[]> {
    const { data } = await apolloClient.query({
      query: VISITS_BY_PATIENT,
      variables: { patientId },
      fetchPolicy: 'network-only',
    })
    const list: Visit[] = data?.visitsByPatient || []
    // Compute visitNumber client-side (oldest = 1)
    const sorted = [...list].sort(
      (a, b) =>
        new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime() ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
        a.id.localeCompare(b.id)
    )
    const numberById = new Map(sorted.map((v, i) => [v.id, i + 1]))
    return list.map(v => ({ ...v, visitNumber: numberById.get(v.id) }))
  },
}
