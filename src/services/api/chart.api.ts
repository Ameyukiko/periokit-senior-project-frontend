import { apolloClient } from '../apollo-client'
import { gql } from '@apollo/client/core'

const SAVE_CHART = gql`
  mutation SaveChart($input: SaveChartInput!) {
    saveChart(input: $input) {
      id
      visitId
      chartName
      status
      updatedAt
      patientInfo {
        hn
        patientName
        age
        gender
        nationality
        date
        doctor
        studentId
      }
    }
  }
`
const CHART_BY_VISIT = gql`
  query ChartByVisit($visitId: ID!) {
    chartByVisit(visitId: $visitId) {
      id
      visitId
      chartName
      status
      teethData
      summary
      updatedAt
      patientInfo {
        hn
        patientName
        age
        gender
        nationality
        date
        doctor
        studentId
      }
    }
  }
`

export const chartApi = {
  save: (input: {
    visitId: string
    chartName?: string
    teethData: unknown
    // Patient info
    patientHn?: string
    patientFirstName: string
    patientLastName: string
    patientAge?: number
    patientGender?: string
    patientNationality?: string
    // Visit info
    visitDate: string
    visitPhase?: string
  }) =>
    apolloClient.mutate({ mutation: SAVE_CHART, variables: { input } }),
  getByVisit: (visitId: string) =>
    apolloClient.query({ query: CHART_BY_VISIT, variables: { visitId }, fetchPolicy: 'network-only' }),
}
