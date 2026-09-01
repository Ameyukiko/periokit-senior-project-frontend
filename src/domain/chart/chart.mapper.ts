import { isUpperTooth } from './chart.rules'
import { calculateChartSummary } from './chart.calculations'
import { createInitialChartData } from './chart.factory'
import type { ChartData, PatientInfo, ToothData } from './chart.types'

// ── Surface mapping ──────────────────────────────────────────────────────────
// Frontend uses only 'buccal' | 'lingual' as keys for both upper and lower teeth.
// When saving to DB, the inner surface of upper teeth must be stored as 'palatal'.

type DbSurface = 'buccal' | 'palatal' | 'lingual'

function toDbSurface(toothFdi: number, frontendSurface: 'buccal' | 'lingual'): DbSurface {
  if (frontendSurface === 'buccal') return 'buccal'
  return isUpperTooth(toothFdi) ? 'palatal' : 'lingual'
}

// ── Site position mapping ─────────────────────────────────────────────────────
// Frontend stores sites as index [0, 1, 2] = Mesial, Center, Distal.
// DB stores named positions per surface (MB/B/DB for buccal, MP/P/DP for palatal, ML/L/DL for lingual).

const SITE_POSITION_MAP: Record<DbSurface, readonly [string, string, string]> = {
  buccal:  ['MB', 'B',  'DB'],
  palatal: ['MP', 'P',  'DP'],
  lingual: ['ML', 'L',  'DL'],
}

// ── Site region helpers (for UI display) ───────────────────────────────────────
// Buccal exists on both arches, so it splits into buccal-upper / buccal-lower.
// Palatal (upper) and lingual (lower) already imply their arch.

export type SiteRegion = 'buccal-upper' | 'palatal' | 'lingual' | 'buccal-lower'

export function getSiteRegion(fdi: number, surface: 'buccal' | 'lingual'): SiteRegion {
  const db = toDbSurface(fdi, surface)
  if (db === 'palatal') return 'palatal'
  if (db === 'lingual') return 'lingual'
  return isUpperTooth(fdi) ? 'buccal-upper' : 'buccal-lower'
}

// Base position label (without arch superscript), e.g. 'MB' | 'B' | 'DB' | 'MP' …
export function getSiteLabel(fdi: number, surface: 'buccal' | 'lingual', siteIndex: number): string {
  return SITE_POSITION_MAP[toDbSurface(fdi, surface)][siteIndex]
}

// ── Tooth status ──────────────────────────────────────────────────────────────
// Frontend uses two separate booleans; DB uses a single status enum.

function toDbToothStatus(tooth: ToothData): 'present' | 'missing' | 'implant' {
  if (tooth.implant)   return 'implant'
  if (tooth.extracted) return 'missing'
  return 'present'
}

// ── Furcation grade ───────────────────────────────────────────────────────────
// Frontend stores furcation as integer 0-3; DB uses enum strings.

function toFurcationGrade(grade: number): string {
  return grade === 0 ? 'none' : `grade_${grade}`
}

// ── Numeric parsing helpers ───────────────────────────────────────────────────
// Frontend stores numeric fields as strings; '' means "not entered" → null in DB.

const parseIntOrNull = (value: string): number | null => {
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? null : parsed
}

const parseFloatOrNull = (value: string): number | null => {
  const parsed = parseFloat(value)
  return isNaN(parsed) ? null : parsed
}

// ── Types for the DB payload ──────────────────────────────────────────────────

export interface DbSitePayload {
  site_position: string
  pd_mm:         number | null
  recession_mm:  number | null
  cal_mm:        number | null
  bop:           boolean
  plaque:        boolean
}

export interface DbSurfacePayload {
  surface: DbSurface
  ktw_mm:  number | null
  sites:   DbSitePayload[]
}

export interface DbFurcationPayload {
  surface:    DbSurface
  site_index: number
  grade:      string
}

export interface DbToothPayload {
  tooth_number: number
  tooth_arch:   'upper' | 'lower'
  status:       'present' | 'missing' | 'implant'
  mobility:     number | null
  prognosis_kc: string | null
  prognosis_mn: string | null
  tooth_note:   string | null
  surfaces:     DbSurfacePayload[]
  furcations:   DbFurcationPayload[]
}

export interface DbSummaryPayload {
  total_teeth:       number
  total_sites:       number
  bop_site_count:    number
  bop_percentage:    number
  plaque_site_count: number
  plaque_percentage: number
}

export interface ChartPayload {
  chart_name:   string
  patient_info: PatientInfo
  teeth:        DbToothPayload[]
  summary:      DbSummaryPayload
}

// ── Main export ───────────────────────────────────────────────────────────────

export function mapChartToPayload(chart: {
  name:        string
  patientInfo: PatientInfo
  teethData:   ChartData
}): ChartPayload {
  const summary = calculateChartSummary(chart.teethData)
  const totalSites = summary.totalTeeth * 6

  const teeth: DbToothPayload[] = Object.entries(chart.teethData).map(([fdiStr, tooth]) => {
    const fdi   = Number(fdiStr)
    const arch: 'upper' | 'lower' = isUpperTooth(fdi) ? 'upper' : 'lower'
    const frontendSurfaces = ['buccal', 'lingual'] as const

    const surfaces: DbSurfacePayload[] = frontendSurfaces.map(frontendSurface => {
      const dbSurface = toDbSurface(fdi, frontendSurface)
      const s         = tooth[frontendSurface]
      const labels    = SITE_POSITION_MAP[dbSurface]

      return {
        surface: dbSurface,
        ktw_mm:  parseFloatOrNull(s.ktw),
        sites: [0, 1, 2].map(i => ({
          site_position: labels[i],
          pd_mm:         parseIntOrNull(s.pd[i]),
          recession_mm:  parseIntOrNull(s.rec[i]),
          cal_mm:        parseIntOrNull(s.cal[i]),
          bop:           s.bop[i],
          plaque:        s.pi[i],
        })),
      }
    })

    // Furcation: only include surfaces that have at least one site defined (array length > 0)
    const furcations: DbFurcationPayload[] = frontendSurfaces.flatMap(frontendSurface => {
      const dbSurface  = toDbSurface(fdi, frontendSurface)
      const furArray   = tooth.fur[frontendSurface]
      return furArray.map((grade, siteIndex) => ({
        surface:    dbSurface,
        site_index: siteIndex,
        grade:      toFurcationGrade(grade),
      }))
    })

    return {
      tooth_number: fdi,
      tooth_arch:   arch,
      status:       toDbToothStatus(tooth),
      mobility:     tooth.mo !== '' ? Number(tooth.mo) : null,
      prognosis_kc: tooth.prognosisKC || null,
      prognosis_mn: tooth.prognosisMN || null,
      tooth_note:   tooth.note        || null,
      surfaces,
      furcations,
    }
  })

  return {
    chart_name:   chart.name,
    patient_info: chart.patientInfo,
    teeth,
    summary: {
      total_teeth:       summary.totalTeeth,
      total_sites:       totalSites,
      bop_site_count:    Math.round(summary.bopPercentage * totalSites / 100),
      bop_percentage:    summary.bopPercentage,
      plaque_site_count: Math.round(summary.piPercentage * totalSites / 100),
      plaque_percentage: summary.piPercentage,
    },
  }
}

export function mapPayloadToChart(payload: ChartPayload): {
  name: string
  patientInfo: PatientInfo
  teethData: ChartData
} {
  const chartData = createInitialChartData()

  for (const tooth of payload.teeth) {
    const fdi = tooth.tooth_number as any
    const tData = chartData[fdi]
    if (!tData) continue

    tData.implant = tooth.status === 'implant'
    tData.extracted = tooth.status === 'missing'
    tData.mo = tooth.mobility !== null ? tooth.mobility.toString() : ''
    tData.prognosisKC = tooth.prognosis_kc || ''
    tData.prognosisMN = tooth.prognosis_mn || ''
    tData.note = tooth.tooth_note || ''

    for (const surface of tooth.surfaces) {
      const frontendSurface = surface.surface === 'palatal' ? 'lingual' : surface.surface
      const sData = tData[frontendSurface]

      sData.ktw = surface.ktw_mm !== null ? surface.ktw_mm.toString() : ''

      for (let i = 0; i < 3; i++) {
        if (surface.sites[i]) {
          const site = surface.sites[i]
          sData.bop[i] = site.bop
          sData.pi[i] = site.plaque
          sData.pd[i] = site.pd_mm !== null ? site.pd_mm.toString() : ''
          sData.rec[i] = site.recession_mm !== null ? site.recession_mm.toString() : ''
          sData.cal[i] = site.cal_mm !== null ? site.cal_mm.toString() : ''
        }
      }
    }

    for (const furcation of tooth.furcations) {
      const frontendSurface = furcation.surface === 'palatal' ? 'lingual' : furcation.surface
      const grade = furcation.grade === 'none' ? 0 : parseInt(furcation.grade.replace('grade_', ''), 10)
      if (tData.fur[frontendSurface] && typeof tData.fur[frontendSurface][furcation.site_index] !== 'undefined') {
        tData.fur[frontendSurface][furcation.site_index] = grade
      }
    }
  }

  return {
    name: payload.chart_name,
    patientInfo: payload.patient_info,
    teethData: chartData
  }
}
