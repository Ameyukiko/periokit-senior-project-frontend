import type { ChartData, Surface } from '@/domain/chart/chart.types'
import { getSiteLabel } from '@/domain/chart/chart.mapper'
import { calculateBopPercentage, calculatePiPercentage } from '@/domain/chart/chart.calculations'
import type { ChartFindings, SiteFinding, ToothFinding } from './diagnosis.types'

const SURFACES: Surface[] = ['buccal', 'lingual']

// Site index 1 is the mid-buccal / mid-lingual reading; 0 and 2 are mesial and
// distal, which is what "interdental" means in the AAP/EFP severity row.
const INTERDENTAL_SITES = [0, 2]
const ALL_SITES = [0, 1, 2]

const toNumber = (value: string) => Number.parseFloat(value) || 0

const sortedTeeth = (chartData: ChartData) =>
  Object.keys(chartData)
    .map(Number)
    .sort((a, b) => a - b)

/** Worst recorded value of a per-site field, and where it was recorded. */
const worstSite = (
  chartData: ChartData,
  field: 'cal' | 'pd',
  siteIndexes: number[],
): SiteFinding | null => {
  let worst: SiteFinding | null = null

  sortedTeeth(chartData).forEach(toothId => {
    const tooth = chartData[toothId]
    if (tooth.extracted) return

    SURFACES.forEach(surface => {
      siteIndexes.forEach(siteIndex => {
        const value = toNumber(tooth[surface][field][siteIndex])
        if (value <= 0 || (worst && value <= worst.value)) return
        worst = { value, toothId, site: getSiteLabel(toothId, surface, siteIndex) }
      })
    })
  })

  return worst
}

const worstFurcation = (chartData: ChartData): ToothFinding | null => {
  let worst: ToothFinding | null = null

  sortedTeeth(chartData).forEach(toothId => {
    const tooth = chartData[toothId]
    if (tooth.extracted || tooth.implant) return

    SURFACES.forEach(surface => {
      tooth.fur[surface].forEach(grade => {
        if (grade <= 0 || (worst && grade <= worst.grade)) return
        worst = { grade, toothId }
      })
    })
  })

  return worst
}

const worstMobility = (chartData: ChartData): ToothFinding | null => {
  let worst: ToothFinding | null = null

  sortedTeeth(chartData).forEach(toothId => {
    const tooth = chartData[toothId]
    if (tooth.extracted || tooth.implant) return

    const grade = toNumber(tooth.mo)
    if (grade <= 0 || (worst && grade <= worst.grade)) return
    worst = { grade, toothId }
  })

  return worst
}

/**
 * A tooth counts as affected when any of its sites carries attachment loss or a
 * pocket deep enough to probe as disease. This is what the localized /
 * generalized split is counted over.
 */
const isAffected = (chartData: ChartData, toothId: number): boolean => {
  const tooth = chartData[toothId]

  return SURFACES.some(surface => {
    const hasCal = INTERDENTAL_SITES.some(i => toNumber(tooth[surface].cal[i]) >= 1)
    const hasPocket = ALL_SITES.some(i => toNumber(tooth[surface].pd[i]) >= 4)
    return hasCal || hasPocket
  })
}

/** Read the chart once and hand the diagnosis page everything it can answer. */
export const collectChartFindings = (chartData: ChartData): ChartFindings => {
  const missingTeeth = sortedTeeth(chartData).filter(id => chartData[id].extracted)
  const presentTeeth = sortedTeeth(chartData).filter(id => !chartData[id].extracted)
  const affectedTeeth = presentTeeth.filter(id => isAffected(chartData, id))

  return {
    interdentalCal: worstSite(chartData, 'cal', INTERDENTAL_SITES),
    probingDepth: worstSite(chartData, 'pd', ALL_SITES),
    furcation: worstFurcation(chartData),
    mobility: worstMobility(chartData),
    missingTeeth,
    remainingTeeth: presentTeeth.length,
    affectedTeeth: affectedTeeth.length,
    affectedToothIds: affectedTeeth,
    affectedPercentage: presentTeeth.length
      ? Math.round((affectedTeeth.length / presentTeeth.length) * 100)
      : 0,
    // The biofilm half of the case phenotype. 0% cannot be told apart from a
    // chart where plaque was never marked, so the rules treat it as unrecorded.
    plaquePercentage: calculatePiPercentage(chartData),
    bopPercentage: calculateBopPercentage(chartData),
  }
}
