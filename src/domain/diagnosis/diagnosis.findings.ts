import type { ChartData, Surface, ToothId } from '@/domain/chart/chart.types'
import { getSiteLabel } from '@/domain/chart/chart.mapper'
import { calculateBopPercentage, calculatePiPercentage } from '@/domain/chart/chart.calculations'
import type { ChartFindings, SiteFinding, ToothFinding } from './diagnosis.types'

const SURFACES: Surface[] = ['buccal', 'lingual']



const INTERDENTAL_SITES = [0, 2]
const ALL_SITES = [0, 1, 2]

const toNumber = (value: string) => Number.parseFloat(value) || 0

const sortedTeeth = (chartData: ChartData) =>
  Object.keys(chartData)
    .map(Number)
    .sort((a, b) => a - b)


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












const hasInterdentalLoss = (chartData: ChartData, toothId: number): boolean =>
  SURFACES.some(surface =>
    INTERDENTAL_SITES.some(i => toNumber(chartData[toothId][surface].cal[i]) >= 2),
  )


const hasFacialLoss = (chartData: ChartData, toothId: number): boolean =>
  SURFACES.some(
    surface =>
      toNumber(chartData[toothId][surface].cal[1]) >= 3 &&
      toNumber(chartData[toothId][surface].pd[1]) > 3,
  )

const isAffected = (chartData: ChartData, toothId: number): boolean =>
  hasInterdentalLoss(chartData, toothId) || hasFacialLoss(chartData, toothId)







const areAdjacent = (a: ToothId, b: ToothId): boolean => {
  const [qa, pa] = [Math.floor(a / 10), a % 10]
  const [qb, pb] = [Math.floor(b / 10), b % 10]

  if (qa === qb) return Math.abs(pa - pb) === 1
  if (pa !== 1 || pb !== 1) return false
  return (qa === 1 && qb === 2) || (qa === 2 && qb === 1) || (qa === 3 && qb === 4) || (qa === 4 && qb === 3)
}


const hasNonAdjacentPair = (toothIds: ToothId[]): boolean =>
  toothIds.some((a, i) => toothIds.slice(i + 1).some(b => !areAdjacent(a, b)))


export const collectChartFindings = (chartData: ChartData): ChartFindings => {
  const missingTeeth = sortedTeeth(chartData).filter(id => chartData[id].extracted)
  const presentTeeth = sortedTeeth(chartData).filter(id => !chartData[id].extracted)
  const affectedTeeth = presentTeeth.filter(id => isAffected(chartData, id))






  const interdentalTeeth = presentTeeth.filter(id => hasInterdentalLoss(chartData, id))
  const facialTeeth = presentTeeth.filter(id => hasFacialLoss(chartData, id))

  const interdentalCal = worstSite(chartData, 'cal', INTERDENTAL_SITES)

  return {
    meetsCaseDefinition: hasNonAdjacentPair(interdentalTeeth) || facialTeeth.length >= 2,
    interdentalCal,
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


    plaquePercentage: calculatePiPercentage(chartData),
    bopPercentage: calculateBopPercentage(chartData),
  }
}
