import type { ChartData, Surface } from './chart.types'
import { getSiteLabel, getSiteRegion, type SiteRegion } from './chart.mapper'

const toNumber = (value: string) => Number.parseInt(value, 10) || 0

// ── Site-aware summary types & helpers (for the Overview display) ──────────────
// Each finding keeps the affected site(s) so the UI can show *where* on the tooth
// the value was recorded, not just the tooth number.

export interface SiteRef {
  label: string       // base position label, e.g. 'MB' | 'B' | 'DB' | 'MP' …
  region: SiteRegion  // buccal-upper | palatal | lingual | buccal-lower (color + arch)
}

export interface ToothSiteEntry {
  toothId: number
  sites: SiteRef[]    // empty ⇒ whole-tooth finding (e.g. mobility)
}

const SURFACES: Surface[] = ['buccal', 'lingual']

const sortedToothIds = (chartData: ChartData): number[] =>
  Object.keys(chartData).map(Number).sort((a, b) => a - b)

// Append a site to the per-tooth accumulator, creating the entry on first hit.
// Iterating surfaces buccal→lingual and index 0→2 keeps sites in display order.
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


/**
 * Get teeth by Probing Depth (PD) range
 * @param chartData - Chart data
 * @param min - Minimum PD value (inclusive)
 * @param max - Maximum PD value (inclusive, optional for open-ended ranges)
 * @returns Array of tooth IDs that have PD in the specified range
 */
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

/**
 * Get teeth by Clinical Attachment Level (CAL) range
 * @param chartData - Chart data
 * @param min - Minimum CAL value (inclusive)
 * @param max - Maximum CAL value (inclusive, optional for open-ended ranges)
 * @returns Array of tooth IDs that have CAL in the specified range
 */
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

/**
 * Get teeth by mobility grade
 * @param chartData - Chart data
 * @param grade - Mobility grade (0-3)
 * @returns Array of tooth IDs with the specified mobility grade
 */
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

/**
 * Get teeth by furcation grade (highest grade only)
 * @param chartData - Chart data
 * @param grade - Furcation grade (1-3)
 * @returns Array of tooth IDs with maximum furcation equal to specified grade
 */
export const getTeethByFurcation = (
  chartData: ChartData,
  grade: number,
): number[] => {
  const result: number[] = []
  const surfaces: Surface[] = ['buccal', 'lingual']

  Object.entries(chartData).forEach(([toothId, tooth]) => {
    if (tooth.extracted || tooth.implant) return

    // Find maximum furcation value for this tooth
    let maxFur = 0
    surfaces.forEach((surface) => {
      tooth.fur[surface].forEach((furValue) => {
        if (furValue > maxFur) {
          maxFur = furValue
        }
      })
    })

    // Only include if max furcation equals the requested grade
    if (maxFur === grade) {
      result.push(Number.parseInt(toothId, 10))
    }
  })

  return result.sort((a, b) => a - b)
}

/**
 * Get teeth that have Bleeding on Probing (BOP)
 * @param chartData - Chart data
 * @returns Array of tooth IDs with at least one BOP site
 */
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

/**
 * Get teeth that have Plaque Index (PI)
 * @param chartData - Chart data
 * @returns Array of tooth IDs with at least one PI site
 */
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

/**
 * Get prognosis summary (McGuire & Nunn)
 * Groups teeth by prognosis category
 * @param chartData - Chart data
 * @returns Record with prognosis categories as keys and tooth arrays as values
 */
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

/**
 * Get teeth with keratinized tissue width (KTW) less than 2mm on any surface
 * @param chartData - Chart data
 * @returns Array of tooth IDs with KTW < 2mm on at least one surface
 */
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

// ── Site-aware accessors (used by the Overview's Clinical Data Summary) ────────

/**
 * Group abnormal Probing Depth (PD > 4mm) by value, keeping the affected site(s)
 * of each tooth.
 */
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

/**
 * Group keratinized tissue width (0 < KTW < 2mm) by value, keeping the affected
 * surface(s). KTW is per-surface, so the center label (index 1) is used as the
 * surface code (Bᵘ / P / L / Bˡ).
 */
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

/**
 * Teeth whose maximum furcation grade equals the requested grade (matching
 * getTeethByFurcation), keeping the site(s) that carry that grade.
 */
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

