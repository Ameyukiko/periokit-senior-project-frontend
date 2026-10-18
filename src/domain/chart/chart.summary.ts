import type { ChartData, Surface } from './chart.types'
import { getSiteLabel, getSiteRegion, type SiteRegion } from './chart.mapper'

const toNumber = (value: string) => Number.parseInt(value, 10) || 0





export interface SiteRef {
  label: string
  region: SiteRegion
}

export interface ToothSiteEntry {
  toothId: number
  sites: SiteRef[]
}

const SURFACES: Surface[] = ['buccal', 'lingual']

const sortedToothIds = (chartData: ChartData): number[] =>
  Object.keys(chartData).map(Number).sort((a, b) => a - b)



const pushSite = (
  map: Map<number, ToothSiteEntry>,
  toothId: number,
  surface: Surface,
  siteIndex: number,
) => {
  let entry = map.get(toothId)
  if (!entry) {
    entry = { toothId, sites: [] }
    map.set(toothId, entry)
  }
  entry.sites.push({
    label: getSiteLabel(toothId, surface, siteIndex),
    region: getSiteRegion(toothId, surface),
  })
}

const toEntries = (map: Map<number, ToothSiteEntry>): ToothSiteEntry[] =>
  Array.from(map.values()).sort((a, b) => a.toothId - b.toothId)









export const getTeethByPdRange = (
  chartData: ChartData,
  min: number,
  max?: number,
): number[] => {
  const result: number[] = []
  const surfaces: Surface[] = ['buccal', 'lingual']

  Object.entries(chartData).forEach(([toothId, tooth]) => {
    if (tooth.extracted) return

    surfaces.forEach((surface) => {
      tooth[surface].pd.forEach((value) => {
        const pd = toNumber(value)
        if (pd > 0 && pd >= min && (max === undefined || pd <= max)) {
          if (!result.includes(Number.parseInt(toothId, 10))) {
            result.push(Number.parseInt(toothId, 10))
          }
        }
      })
    })
  })

  return result.sort((a, b) => a - b)
}








export const getTeethByCalRange = (
  chartData: ChartData,
  min: number,
  max?: number,
): number[] => {
  const result: number[] = []
  const surfaces: Surface[] = ['buccal', 'lingual']

  Object.entries(chartData).forEach(([toothId, tooth]) => {
    if (tooth.extracted) return

    surfaces.forEach((surface) => {
      tooth[surface].cal.forEach((value) => {
        const cal = toNumber(value)
        if (cal > 0 && cal >= min && (max === undefined || cal <= max)) {
          if (!result.includes(Number.parseInt(toothId, 10))) {
            result.push(Number.parseInt(toothId, 10))
          }
        }
      })
    })
  })

  return result.sort((a, b) => a - b)
}







export const getTeethByMobility = (
  chartData: ChartData,
  grade: number,
): number[] => {
  const result: number[] = []

  Object.entries(chartData).forEach(([toothId, tooth]) => {
    if (tooth.extracted || tooth.implant) return
    if (toNumber(tooth.mo) === grade) {
      result.push(Number.parseInt(toothId, 10))
    }
  })

  return result.sort((a, b) => a - b)
}







export const getTeethByFurcation = (
  chartData: ChartData,
  grade: number,
): number[] => {
  const result: number[] = []
  const surfaces: Surface[] = ['buccal', 'lingual']

  Object.entries(chartData).forEach(([toothId, tooth]) => {
    if (tooth.extracted || tooth.implant) return


    let maxFur = 0
    surfaces.forEach((surface) => {
      tooth.fur[surface].forEach((furValue) => {
        if (furValue > maxFur) {
          maxFur = furValue
        }
      })
    })


    if (maxFur === grade) {
      result.push(Number.parseInt(toothId, 10))
    }
  })

  return result.sort((a, b) => a - b)
}






export const getTeethWithBop = (chartData: ChartData): number[] => {
  const result: number[] = []
  const surfaces: Surface[] = ['buccal', 'lingual']

  Object.entries(chartData).forEach(([toothId, tooth]) => {
    if (tooth.extracted) return

    surfaces.forEach((surface) => {
      if (tooth[surface].bop.some((b) => b)) {
        if (!result.includes(Number.parseInt(toothId, 10))) {
          result.push(Number.parseInt(toothId, 10))
        }
      }
    })
  })

  return result.sort((a, b) => a - b)
}






export const getTeethWithPi = (chartData: ChartData): number[] => {
  const result: number[] = []
  const surfaces: Surface[] = ['buccal', 'lingual']

  Object.entries(chartData).forEach(([toothId, tooth]) => {
    if (tooth.extracted) return

    surfaces.forEach((surface) => {
      if (tooth[surface].pi.some((p) => p)) {
        if (!result.includes(Number.parseInt(toothId, 10))) {
          result.push(Number.parseInt(toothId, 10))
        }
      }
    })
  })

  return result.sort((a, b) => a - b)
}







export const getPrognosisSummary = (
  chartData: ChartData,
): Record<string, number[]> => {
  const summary: Record<string, number[]> = {
    Good: [],
    Fair: [],
    Poor: [],
    Questionable: [],
    Hopeless: [],
    'N/A': [],
    'Good (Fixed)': [],
  }

  Object.entries(chartData).forEach(([toothId, tooth]) => {
    if (tooth.extracted) {
      summary['N/A'].push(Number.parseInt(toothId, 10))
      return
    }

    if (tooth.implant) {
      summary['Good (Fixed)'].push(Number.parseInt(toothId, 10))
      return
    }

    const surfaces: Surface[] = ['buccal', 'lingual']
    const allCAL: number[] = []
    const maxFurValues: number[] = []

    surfaces.forEach((surface) => {
      tooth[surface].cal.forEach((cal) => {
        allCAL.push(toNumber(cal))
      })
      tooth.fur[surface].forEach((fur) => {
        maxFurValues.push(fur)
      })
    })

    const maxCAL = allCAL.length > 0 ? Math.max(...allCAL) : 0
    const maxFur = maxFurValues.length > 0 ? Math.max(...maxFurValues) : 0
    const mobility = toNumber(tooth.mo)

    let prognosis = 'Good'
    if (maxCAL > 8 || mobility >= 3) prognosis = 'Hopeless'
    else if (maxCAL > 6 || maxFur >= 2 || mobility >= 2) prognosis = 'Questionable'
    else if (maxCAL > 5 || maxFur === 2) prognosis = 'Poor'
    else if (maxCAL >= 4 || maxFur === 1) prognosis = 'Fair'

    summary[prognosis].push(Number.parseInt(toothId, 10))
  })

  return summary
}






export const getTeethByKtwLessThanTwo = (chartData: ChartData): number[] => {
  const result: number[] = []
  const surfaces: Surface[] = ['buccal', 'lingual']

  Object.entries(chartData).forEach(([toothId, tooth]) => {
    if (tooth.extracted) return

    const hasLowKtw = surfaces.some((surface) => {
      const val = parseFloat(tooth[surface].ktw)
      return val > 0 && val < 2
    })

    if (hasLowKtw) {
      result.push(Number.parseInt(toothId, 10))
    }
  })

  return result.sort((a, b) => a - b)
}







export const getPdByValueWithSites = (
  chartData: ChartData,
): Record<number, ToothSiteEntry[]> => {
  const grouped: Record<number, Map<number, ToothSiteEntry>> = {}

  sortedToothIds(chartData).forEach((toothId) => {
    const tooth = chartData[toothId]
    if (tooth.extracted) return

    SURFACES.forEach((surface) => {
      tooth[surface].pd.forEach((value, siteIndex) => {
        const pd = toNumber(value)
        if (pd > 4) {
          if (!grouped[pd]) grouped[pd] = new Map()
          pushSite(grouped[pd], toothId, surface, siteIndex)
        }
      })
    })
  })

  const out: Record<number, ToothSiteEntry[]> = {}
  Object.keys(grouped).forEach((key) => {
    out[Number(key)] = toEntries(grouped[Number(key)])
  })
  return out
}






export const getKtwByValueWithSites = (
  chartData: ChartData,
): Record<string, ToothSiteEntry[]> => {
  const grouped: Record<string, Map<number, ToothSiteEntry>> = {}

  sortedToothIds(chartData).forEach((toothId) => {
    const tooth = chartData[toothId]
    if (tooth.extracted) return

    SURFACES.forEach((surface) => {
      const val = parseFloat(tooth[surface].ktw)
      if (val > 0 && val < 2) {
        const key = String(val)
        if (!grouped[key]) grouped[key] = new Map()
        pushSite(grouped[key], toothId, surface, 1)
      }
    })
  })

  const out: Record<string, ToothSiteEntry[]> = {}
  Object.keys(grouped).forEach((key) => {
    out[key] = toEntries(grouped[key])
  })
  return out
}





export const getFurcationWithSites = (
  chartData: ChartData,
  grade: number,
): ToothSiteEntry[] => {
  const entries: ToothSiteEntry[] = []

  sortedToothIds(chartData).forEach((toothId) => {
    const tooth = chartData[toothId]
    if (tooth.extracted || tooth.implant) return

    let maxFur = 0
    SURFACES.forEach((surface) => {
      tooth.fur[surface].forEach((f) => {
        if (f > maxFur) maxFur = f
      })
    })
    if (maxFur !== grade) return

    const sites: SiteRef[] = []
    SURFACES.forEach((surface) => {
      tooth.fur[surface].forEach((f, siteIndex) => {
        if (f === maxFur && siteIndex <= 2) {
          sites.push({
            label: getSiteLabel(toothId, surface, siteIndex),
            region: getSiteRegion(toothId, surface),
          })
        }
      })
    })

    entries.push({ toothId, sites })
  })

  return entries
}

