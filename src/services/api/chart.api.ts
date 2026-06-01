import { gql } from '@apollo/client/core'
import { apolloClient } from '../apollo-client'
import type { ChartPayload } from '@/domain/chart/chart.mapper'

export const SAVE_CHART_MUTATION = gql`
  mutation SaveChart($input: SaveChartInput!) {
    saveChart(input: $input) {
      id
      success
      message
    }
  }
`

export const CHART_BY_VISIT_QUERY = gql`
  query ChartByVisit($visitId: ID!) {
    chartByVisit(visitId: $visitId) {
      chart_name
      patient_info {
        hn
        doctor
        studentId
        patientName
        age
        nationality
        gender
        date
      }
      teeth {
        tooth_number
        tooth_arch
        status
        mobility
        prognosis_kc
        prognosis_mn
        tooth_note
        surfaces {
          surface
          ktw_mm
          sites {
            site_position
            pd_mm
            recession_mm
            cal_mm
            bop
            plaque
          }
        }
        furcations {
          surface
          site_index
          grade
        }
      }
      summary {
        total_teeth
        total_sites
        bop_site_count
        bop_percentage
        plaque_site_count
        plaque_percentage
      }
    }
  }
`

export const chartApi = {
  async saveChart(payload: ChartPayload, patientId: string, visitId: string) {
    try {
      const response = await apolloClient.mutate({
        mutation: SAVE_CHART_MUTATION,
        variables: {
          input: {
            patientId,
            visitId,
            ...payload
          }
        }
      })
      return response.data.saveChart
    } catch (error) {
      console.error('Error saving chart:', error)
      throw error
    }
  },

  async getChartByVisit(visitId: string): Promise<ChartPayload | null> {
    try {
      const response = await apolloClient.query({
        query: CHART_BY_VISIT_QUERY,
        variables: { visitId },
        fetchPolicy: 'network-only' // Ensure we get the latest when loading
      })
      return response.data.chartByVisit
    } catch (error) {
      console.error('Error fetching chart by visit:', error)
      throw error
    }
  }
}
