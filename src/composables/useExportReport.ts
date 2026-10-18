import { computed, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { usePeriodontalChartStore } from '@/stores/periodontal-chart'
import { useVisitStore } from '@/stores/visit'
import { useXrayBoardStore } from '@/stores/xray-board'
import { LAYOUT_DIVIDER_Y, INTRAORAL_SLOTS } from '@/domain/xray/xray.constants'
import type { XrayObject } from '@/domain/xray/xray.types'
import { PAPER_MM, SECTIONS, pagePx, mmToPx, type ExportState, type PageSection } from '@/domain/export/export.constants'

export interface ReportPageSpec {
  section: PageSection

  name: string
  landscape: boolean

  width: number
  height: number
  board?: { title: string; objects: XrayObject[] }
}

const FILE_SUFFIX = { pdf: 'perio-report.pdf', png: 'perio-images.zip', xlsx: 'perio-data.xlsx' } as const
const INTRAORAL_CODES = new Set(INTRAORAL_SLOTS.map((s) => s.code))


const isIntraoral = (o: XrayObject) =>
  o.objectType === 'image' && o.slotCode ? INTRAORAL_CODES.has(o.slotCode) : o.posY + o.height / 2 > LAYOUT_DIVIDER_Y


export function useExportReport() {
  const chartStore = usePeriodontalChartStore()
  const visitStore = useVisitStore()
  const board = useXrayBoardStore()
  const { patientInfo } = storeToRefs(chartStore)

  const state = reactive<ExportState>({
    format: 'pdf',
    paper: 'A4',
    pngScale: 150,
    orient: { chart: 'portrait', diagnosis: 'portrait', xray: 'landscape', intraoral: 'landscape' },
    on: Object.fromEntries(SECTIONS.map((s) => [s.id, true])) as ExportState['on'],
    gray: false,
  })

  const visit = computed(() => visitStore.visits.find((v) => v.id === visitStore.activeVisitId) ?? null)
  const isDraft = computed(() => !visit.value || visit.value.id === 'new' || visit.value.status === 'draft')
  const visitDate = computed(() => patientInfo.value.date || visit.value?.visitDate?.slice(0, 10) || '')
  const fileName = computed(() => `HN-${patientInfo.value.hn || 'unknown'}_${visitDate.value}_${FILE_SUFFIX[state.format]}`)

  const films = computed(() => board.sortedObjects.filter((o) => !isIntraoral(o)))
  const photos = computed(() => board.sortedObjects.filter(isIntraoral))
  const keep = (list: XrayObject[], notes: boolean) => list.filter((o) => o.objectType === 'image' || notes)

  const pages = computed<ReportPageSpec[]>(() => {
    const spec = (section: PageSection, name: string, b?: ReportPageSpec['board']): ReportPageSpec => {
      const landscape = state.orient[section] === 'landscape'
      const [w, h] = pagePx(state.paper, state.orient[section])
      return { section, name, landscape, width: w - 80, height: h - 64, board: b }
    }
    const out: ReportPageSpec[] = []
    if (state.on.chart) out.push(spec('chart', 'periodontal-chart'))
    if (state.on.diagnosis) out.push(spec('diagnosis', 'diagnosis'))

    if (state.on.xray) out.push(spec('xray', 'xray-films', { title: 'X-ray board', objects: keep(films.value, state.on.xrayNotes) }))
    if (state.on.intraoral)
      out.push(spec('intraoral', 'intraoral-photos', { title: 'Intraoral photographs', objects: keep(photos.value, state.on.intraoralNotes) }))
    return out
  })

  const qualityHint = computed(() => {
    const [w, h] = PAPER_MM[state.paper]!
    const label = { 96: 'small file, for screen and chat', 150: 'sharp on screen and slides', 300: 'best for printing, larger file' }[state.pngScale]
    return `${state.paper}: ${mmToPx(w, state.pngScale)} × ${mmToPx(h, state.pngScale)} px · ${label}`
  })

  return { state, visit, isDraft, visitDate, fileName, pages, qualityHint }
}
