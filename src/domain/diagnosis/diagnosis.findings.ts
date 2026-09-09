import type { ChartData, Surface, ToothId } from '@/domain/chart/chart.types'
import { getSiteLabel } from '@/domain/chart/chart.mapper'
import { calculateBopPercentage, calculatePiPercentage } from '@/domain/chart/chart.calculations'
import type { ChartFindings, SiteFinding, ToothFinding } from './diagnosis.types'
import { estimateBoneLossPercent } from './root-length'

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
 * A tooth counts as affected on the site criteria TAP 2023 gives for a case of
 * periodontitis: interdental CAL of 2 mm or more, or buccal / oral CAL of 3 mm
 * or more at a site probing deeper than 3 mm. This is what the localized /
 * generalized split is counted over.
 *
 * The exclusions that go with those criteria — recession from brushing,
 * cervical caries, the distal of a second molar next to a third, a draining
 * endodontic lesion, a vertical root fracture — are causes the chart does not
 * record, so they stay the doctor's to apply.
 */
const hasInterdentalLoss = (chartData: ChartData, toothId: number): boolean =>
  SURFACES.some(surface =>
    INTERDENTAL_SITES.some(i => toNumber(chartData[toothId][surface].cal[i]) >= 2),
  )

// Site index 1 is the mid-buccal / mid-lingual reading.
const hasFacialLoss = (chartData: ChartData, toothId: number): boolean =>
  SURFACES.some(
    surface =>
      toNumber(chartData[toothId][surface].cal[1]) >= 3 &&
      toNumber(chartData[toothId][surface].pd[1]) > 3,
  )

const isAffected = (chartData: ChartData, toothId: number): boolean =>
  hasInterdentalLoss(chartData, toothId) || hasFacialLoss(chartData, toothId)

/**
 * Whether two teeth sit next to each other in the arch. FDI puts the quadrant in
 * the first digit and the position in the second, so neighbours share a quadrant
 * and sit one position apart — with the central incisors either side of the
 * midline (11/21, 31/41) the one pair that spans two quadrants.
 */
const areAdjacent = (a: ToothId, b: ToothId): boolean => {
  const [qa, pa] = [Math.floor(a / 10), a % 10]
  const [qb, pb] = [Math.floor(b / 10), b % 10]

  if (qa === qb) return Math.abs(pa - pb) === 1
  if (pa !== 1 || pb !== 1) return false
  return (qa === 1 && qb === 2) || (qa === 2 && qb === 1) || (qa === 3 && qb === 4) || (qa === 4 && qb === 3)
}

/** True once any two of these teeth are not neighbours. */
const hasNonAdjacentPair = (toothIds: ToothId[]): boolean =>
  toothIds.some((a, i) => toothIds.slice(i + 1).some(b => !areAdjacent(a, b)))

/** Read the chart once and hand the diagnosis page everything it can answer. */
export const collectChartFindings = (chartData: ChartData): ChartFindings => {
  const missingTeeth = sortedTeeth(chartData).filter(id => chartData[id].extracted)
  const presentTeeth = sortedTeeth(chartData).filter(id => !chartData[id].extracted)
  const affectedTeeth = presentTeeth.filter(id => isAffected(chartData, id))

  // TAP 2023, step 1: interdental CAL ≥ 2 mm at two or more non-adjacent teeth,
  // or buccal / oral CAL ≥ 3 mm with probing depth over 3 mm at two or more
  // teeth. Only the readings are checked here — ruling out recession from
  // brushing, cervical caries, a third molar next to the site, a draining
  // endodontic lesion or a root fracture is the doctor's call.
  const interdentalTeeth = presentTeeth.filter(id => hasInterdentalLoss(chartData, id))
  const facialTeeth = presentTeeth.filter(id => hasFacialLoss(chartData, id))

  const interdentalCal = worstSite(chartData, 'cal', INTERDENTAL_SITES)

  return {
    meetsCaseDefinition: hasNonAdjacentPair(interdentalTeeth) || facialTeeth.length >= 2,
    // Stands in for a radiograph the app does not hold. Overridden the moment
    // the doctor enters a figure measured off the film.
    estimatedBoneLossPercent: estimateBoneLossPercent(
      interdentalCal?.value ?? null,
      interdentalCal?.toothId ?? null,
    ),
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
    // The biofilm half of the case phenotype. 0% cannot be told apart from a
    // chart where plaque was never marked, so the rules treat it as unrecorded.
    plaquePercentage: calculatePiPercentage(chartData),
    bopPercentage: calculateBopPercentage(chartData),
  }
}
