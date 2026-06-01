import { apolloClient } from '../apollo-client'
import { gql } from '@apollo/client/core'

const SAVE_CHART = gql`
  mutation SaveChart($input: SaveChartInput!) {
    saveChart(input: $input) {
      id visitId chartName status updatedAt
    }
  }
`
const CHART_BY_VISIT = gql`
  query ChartByVisit($visitId: ID!) {
    chartByVisit(visitId: $visitId) {
      id visitId chartName status teethData summary updatedAt
    }
  }
`

export const chartApi = {
  save: (input: { visitId: string; chartName?: string; teethData: unknown }) =>
    apolloClient.mutate({ mutation: SAVE_CHART, variables: { input } }),
  getByVisit: (visitId: string) =>
    apolloClient.query({ query: CHART_BY_VISIT, variables: { visitId }, fetchPolicy: 'network-only' }),
}
