import { apolloClient } from '../apollo-client'
import { gql } from '@apollo/client/core'

// Types
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
  // Fetch a single patient by ID
  async getById(id: string): Promise<Patient | null> {
    const { data } = await apolloClient.query({
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

  // Fetch patients from backend
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

    // Client-side filtering for gender and age (backend doesn't support these yet)
    let filteredItems = result?.items || []

    if (gender) {
      filteredItems = filteredItems.filter((p: Patient) => p.gender === gender)
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

    // Client-side sorting (backend doesn't support sorts yet)
    let sorts = { date: 'date_desc', age: null, name: null }
    try {
      sorts = JSON.parse(sortsStr)
    } catch (e) {}

    filteredItems.sort((a: Patient, b: Patient) => {
      // Date Priority
      if (sorts.date) {
        const dateA = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0
        const dateB = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0
        const dateCmp = sorts.date === 'date_asc' ? dateA - dateB : dateB - dateA
        if (dateCmp !== 0) return dateCmp
      }

      // Age Priority
      if (sorts.age) {
        const ageA = a.age ?? 0
        const ageB = b.age ?? 0
        const ageCmp = sorts.age === 'age_asc' ? ageA - ageB : ageB - ageA
        if (ageCmp !== 0) return ageCmp
      }

      // Name Priority
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
      items: filteredItems,
      total: filteredItems.length,
      page: result?.page ?? page,
      pageSize: result?.pageSize ?? pageSize,
      totalPages: Math.ceil(filteredItems.length / pageSize),
    }
  },

  // TODO: Add createPatient mutation to backend and update this
  // For now, this creates a mock patient for testing
  async createPatient(data: Omit<Patient, 'id' | 'lastVisitDate'>): Promise<Patient> {
    // This should call the backend once createPatient mutation is available
    // For now, return a mock patient
    const newPatient: Patient = {
      ...data,
      id: `temp-${Date.now()}`,
      lastVisitDate: null,
    }

    return newPatient
  },
}
