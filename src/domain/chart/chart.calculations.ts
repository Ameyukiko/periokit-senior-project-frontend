import type { ChartData, ChartSummary, PdBreakdown, PdCategories, Surface } from './chart.types'

const toNumber = (value: string) => Number.parseInt(value, 10) || 0

export const calculateCal = (pd: string, rec: string) => String(toNumber(pd) + toNumber(rec))

const getActiveTeeth = (chartData: ChartData) => Object.values(chartData).filter(tooth => !tooth.extracted)

const countSites = (chartData: ChartData, key: 'bop' | 'pi') => {
  const activeTeeth = getActiveTeeth(chartData)
  const totalSites = activeTeeth.length * 6
  const markedSites = activeTeeth.reduce((sum, tooth) => {
    return sum + tooth.buccal[key].filter(Boolean).length + tooth.lingual[key].filter(Boolean).length
  }, 0)

  return { markedSites, totalSites }
}

const calculatePercentage = (markedSites: number, totalSites: number) => {
  if (totalSites === 0) return 0
  return Math.round((markedSites / totalSites) * 100)
}

export const calculateBopPercentage = (chartData: ChartData) => {
  const { markedSites, totalSites } = countSites(chartData, 'bop')
  return calculatePercentage(markedSites, totalSites)
}

export const calculatePiPercentage = (chartData: ChartData) => {
  const { markedSites, totalSites } = countSites(chartData, 'pi')
  return calculatePercentage(markedSites, totalSites)
}

export const calculatePdCategories = (chartData: ChartData): PdCategories => {
  const categories = { healthy: 0, warning: 0, deep: 0 }
  const surfaces: Surface[] = ['buccal', 'lingual']

  getActiveTeeth(chartData).forEach(tooth => {
    surfaces.forEach(surface => {
      tooth[surface].pd.forEach(value => {
        const pd = toNumber(value)
        if (pd <= 0) return
        if (pd <= 3) categories.healthy += 1
        else if (pd <= 5) categories.warning += 1
        else categories.deep += 1
      })
    })
  })

  return categories
}

export const calculatePdBreakdown = (chartData: ChartData): PdBreakdown => {
  const breakdown: PdBreakdown = {}
  const surfaces: Surface[] = ['buccal', 'lingual']

  getActiveTeeth(chartData).forEach(tooth => {
    let maxPd = 0
    surfaces.forEach(surface => {
      tooth[surface].pd.forEach(value => {
        const pd = toNumber(value)
        if (pd > maxPd) maxPd = pd
      })
    })

    // Count teeth with max PD > 4
    if (maxPd > 4) {
      breakdown[maxPd] = (breakdown[maxPd] || 0) + 1
    }
  })

  return breakdown
}

export const calculateChartSummary = (chartData: ChartData): ChartSummary => {
  const pdCategories = calculatePdCategories(chartData)
  const pdBreakdown = calculatePdBreakdown(chartData)
  const bopPercentage = calculateBopPercentage(chartData)
  const piPercentage = calculatePiPercentage(chartData)

  // Count teeth with mobility
  const mobilityCount = Object.values(chartData).filter(tooth => {
    if (tooth.extracted) return false
    const moValue = toNumber(tooth.mo)
    return moValue > 0
  }).length

  // Count teeth with furcation involvement
  const furcationCount = Object.values(chartData).filter(tooth => {
    if (tooth.extracted) return false
    const surfaces: Surface[] = ['buccal', 'lingual']
    return surfaces.some(surface => {
      const furcationSites = tooth.fur?.[surface] || []
      return furcationSites.some(value => value > 0)
    })
  }).length

  // Count teeth with keratinized width < 2mm
  const keratinizedLowCount = Object.values(chartData).filter(tooth => {
    if (tooth.extracted) return false
    const ktwValue = toNumber(tooth.buccal.ktw)
    return ktwValue > 0 && ktwValue < 2
  }).length

  // Health distribution based on PD categories (standard periodontal classification)
  const totalSites = pdCategories.healthy + pdCategories.warning + pdCategories.deep || 1
  const healthyPercent = Math.round((pdCategories.healthy / totalSites) * 100)
  const moderatePercent = Math.round((pdCategories.warning / totalSites) * 100)
  const severePercent = Math.max(0, 100 - healthyPercent - moderatePercent)

  return {
    totalTeeth: Object.keys(chartData).length,
    missingTeeth: Object.values(chartData).filter(tooth => tooth.extracted).length,
    implantTeeth: Object.values(chartData).filter(tooth => tooth.implant).length,
    bopPercentage,
    piPercentage,
    pdCategories,
    pdBreakdown,
    healthDistribution: {
      healthy: healthyPercent,
      moderate: moderatePercent,
      severe: severePercent
    },
    mobilityCount,
    furcationCount,
    keratinizedLowCount
  }
}
