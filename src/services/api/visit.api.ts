import { apolloClient } from '@/services/apollo-client'
import { gql } from '@apollo/client/core'
import type { Visit, VisitsByPatientQueryData, VisitsByPatientQueryVariables } from '@/services/api/visit.api.types'

export type { Visit } from '@/services/api/visit.api.types'

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
    const { data } = await apolloClient.query<VisitsByPatientQueryData, VisitsByPatientQueryVariables>({
      query: VISITS_BY_PATIENT,
      variables: { patientId },
      fetchPolicy: 'network-only',
    })
    const list: Visit[] = data?.visitsByPatient || []

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
