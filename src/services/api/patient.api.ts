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

const MY_PATIENTS = gql`
  query MyPatients($search: String, $dateFrom: String, $dateTo: String, $page: Int, $pageSize: Int) {
    myPatients(search: $search, dateFrom: $dateFrom, dateTo: $dateTo, page: $page, pageSize: $pageSize) {
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

  async getById(id: string): Promise<Patient | null> {
    const { data } = await apolloClient.query({
      query: PATIENT_BY_ID,
      variables: { id },
      fetchPolicy: 'network-only',
    })
    return data?.patientById || null
  },


  async getMyPatients(
    page: number = 1,
    pageSize: number = 10,
    search: string = '',
    dateFrom: string = '',
    dateTo: string = ''
  ): Promise<PatientListResponse> {
    const variables: Record<string, any> = { page, pageSize }
    if (search) variables.search = search
    if (dateFrom) variables.dateFrom = dateFrom
    if (dateTo) variables.dateTo = dateTo

    const { data } = await apolloClient.query({
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


  async getPatients(
    page: number = 1,
    pageSize: number = 10,
    search: string = '',
    sortsStr: string = '{}',
    startDate: string = '',
    endDate: string = '',
    gender: string = '',
    minAge: number | null = null,
    maxAge: number | null = null
  ): Promise<PatientListResponse> {
    const variables: Record<string, any> = {
      page,
      pageSize,
    }

    if (search) variables.search = search
    if (startDate) variables.dateFrom = startDate
    if (endDate) variables.dateTo = endDate

    const { data } = await apolloClient.query({
      query: MY_PATIENTS,
      variables,
      fetchPolicy: 'network-only',
    })

    const result = data?.myPatients



    let filteredItems = [...(result?.items || [])]

    if (gender) {


      const genderLower = gender.toLowerCase()
      filteredItems = filteredItems.filter(
        (p: Patient) => (p.gender ?? '').toLowerCase() === genderLower
      )
    }

    if (minAge !== null || maxAge !== null) {
      filteredItems = filteredItems.filter((p: Patient) => {
        const age = p.age ?? 0
        let isValid = true
        if (minAge !== null) isValid = isValid && age >= minAge
        if (maxAge !== null) isValid = isValid && age <= maxAge
        return isValid
      })
    }


    let sorts = { date: 'date_desc', age: null, name: null }
    try {
      sorts = JSON.parse(sortsStr)
    } catch (e) {}


    const sortedItems = [...filteredItems].sort((a: Patient, b: Patient) => {

      if (sorts.date) {
        const dateA = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0
        const dateB = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0
        const dateCmp = sorts.date === 'date_asc' ? dateA - dateB : dateB - dateA
        if (dateCmp !== 0) return dateCmp
      }


      if (sorts.age) {
        const ageA = a.age ?? 0
        const ageB = b.age ?? 0
        const ageCmp = sorts.age === 'age_asc' ? ageA - ageB : ageB - ageA
        if (ageCmp !== 0) return ageCmp
      }


      if (sorts.name) {
        const nameCmp =
          sorts.name === 'name_asc'
            ? a.firstName.localeCompare(b.firstName)
            : b.firstName.localeCompare(a.firstName)
        if (nameCmp !== 0) return nameCmp
      }

      return 0
    })

    return {
      items: sortedItems,
      total: sortedItems.length,
      page: result?.page ?? page,
      pageSize: result?.pageSize ?? pageSize,
      totalPages: Math.ceil(sortedItems.length / pageSize),
    }
  },



  async createPatient(data: Omit<Patient, 'id' | 'lastVisitDate'>): Promise<Patient> {


    const newPatient: Patient = {
      ...data,
      id: `temp-${Date.now()}`,
      lastVisitDate: null,
    }

    return newPatient
  },
}
