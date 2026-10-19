import { apolloClient } from '@/services/apollo-client'
import { gql } from '@apollo/client/core'
import type {
  MyPatientsQueryData,
  MyPatientsQueryVariables,
  Patient,
  PatientByIdQueryData,
  PatientByIdQueryVariables,
  PatientListResponse,
} from '@/services/api/patient.api.types'

export type { Patient, PatientListResponse } from '@/services/api/patient.api.types'

const MY_PATIENTS = gql`
  query MyPatients(
    $search: String
    $dateFrom: String
    $dateTo: String
    $sort: String
    $page: Int
    $pageSize: Int
  ) {
    myPatients(
      search: $search
      dateFrom: $dateFrom
      dateTo: $dateTo
      sort: $sort
      page: $page
      pageSize: $pageSize
    ) {
      items {
        id
        hn
        firstName
        lastName
        age
        gender
        nationality
        lastVisitDate
      }
      total
      page
      pageSize
      totalPages
    }
  }
`

const PATIENT_BY_ID = gql`
  query PatientById($id: ID!) {
    patientById(id: $id) {
      id
      hn
      firstName
      lastName
      age
      gender
      nationality
      visitCount
      lastVisitDate
      visits {
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
  }
`

export const patientApi = {
  // Fetch a single patient by ID
  async getById(id: string): Promise<Patient | null> {
    const { data } = await apolloClient.query<PatientByIdQueryData, PatientByIdQueryVariables>({
      query: PATIENT_BY_ID,
      variables: { id },
      fetchPolicy: 'network-only',
    })
    return data?.patientById || null
  },

  // Fetch my patients
  async getMyPatients(
    page: number = 1,
    pageSize: number = 10,
    search: string = '',
    dateFrom: string = '',
    dateTo: string = '',
    filters: Partial<Pick<MyPatientsQueryVariables, 'sort'>> = {}
  ): Promise<PatientListResponse> {
    const variables: MyPatientsQueryVariables = { page, pageSize, ...filters }
    if (search) variables.search = search
    if (dateFrom) variables.dateFrom = dateFrom
    if (dateTo) variables.dateTo = dateTo

    const { data } = await apolloClient.query<MyPatientsQueryData, MyPatientsQueryVariables>({
      query: MY_PATIENTS,
      variables,
      fetchPolicy: 'network-only',
    })

    const result = data?.myPatients
    return {
      items: result?.items || [],
      total: result?.total || 0,
      page: result?.page || page,
      pageSize: result?.pageSize || pageSize,
      totalPages: result?.totalPages || 0
    }
  },
}
