import type { ChartData, Surface } from './chart.types'

const toNumber = (value: string) => Number.parseInt(value, 10) || 0


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
