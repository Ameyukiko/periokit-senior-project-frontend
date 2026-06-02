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
    return data?.visitsByPatient || []
  }
}
