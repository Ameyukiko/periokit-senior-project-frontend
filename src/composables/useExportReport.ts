import { computed, nextTick, reactive, ref, watch, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { usePeriodontalChartStore } from '@/stores/periodontal-chart'
import { useDiagnosisStore } from '@/stores/diagnosis'
import { useVisitStore } from '@/stores/visit'
import { useXrayBoardStore } from '@/stores/xray-board'
import { useNotificationStore } from '@/stores/notification'
import { PAPER_SIZES, SECTIONS, mmToPx, type ExportState } from '@/domain/export/export.constants'
import { buildExportRequest, exportErrorMessage, type SectionAvailability } from '@/domain/export/export.mapping'
import { useExportPreview } from './useExportPreview'
import { useExportDownload } from './useExportDownload'

export function useExportReport(visitId: Ref<string | null>) {
  const chartStore = usePeriodontalChartStore()
  const diagnosisStore = useDiagnosisStore()
  const visitStore = useVisitStore()
  const board = useXrayBoardStore()
  const notify = useNotificationStore()
  const { patientInfo } = storeToRefs(chartStore)

  const state = reactive<ExportState>({
    format: 'pdf',
    paper: 'a4',
    pngDpi: 150,
    orient: { chart: 'landscape', diagnosis: 'portrait', images: 'landscape', imageNotes: 'portrait' },
    on: Object.fromEntries(SECTIONS.map((s) => [s.id, true])) as ExportState['on'],
    gray: false,
  })

  const visit = computed(() => visitStore.visits.find((v) => v.id === visitId.value) ?? null)
  const isNewVisit = computed(() => !visitId.value || visitId.value === 'new')
  const hasUnsavedChanges = computed(
    () => chartStore.isDirty || diagnosisStore.isDirty || (board.editable && board.isDirty),
  )
  const visitDate = computed(() => patientInfo.value.date || visit.value?.visitDate?.slice(0, 10) || '')
  const defaultFileName = computed(() => `HN-${patientInfo.value.hn || 'unknown'}_${visitDate.value}_perio-report`)
  const fileName = ref(defaultFileName.value)
  watch(defaultFileName, (name) => (fileName.value = name))

  const availability = ref<SectionAvailability>({})
  const request = computed(() => buildExportRequest(state, availability.value, fileName.value))
  const { preview, loading, error, refresh } = useExportPreview(visitId, request, availability)
  const download = useExportDownload()
  watch(visitId, download.cancel)

  const qualityHint = computed(() => {
    const [w, h] = PAPER_SIZES.find((p) => p.id === state.paper)!.mm
    const label = { 96: 'small file, for screen and chat', 150: 'sharp on screen and slides', 300: 'best for printing, larger file' }[state.pngDpi]
    return `${mmToPx(w, state.pngDpi)} × ${mmToPx(h, state.pngDpi)} px · ${label}`
  })

  /** Exports exactly what the server has saved; local edits are left untouched. */
  async function exportSaved() {
    const id = visitId.value
    const current = preview.value
    if (!id || !current) return
    const result = await download.start(id, request.value, current.snapshotVersion)
    if (result.status === 'completed') notify.success(`${result.filename} downloaded`)
    else if (result.status === 'stale') {
      notify.warning(exportErrorMessage({ code: 'EXPORT_SOURCE_CHANGED' }))
      await refresh()
    } else if (result.status === 'failed') notify.error(exportErrorMessage(result.error))
  }

  /** Runs the existing save flow first; exports only once chart, diagnosis and X-ray are saved. */
  async function saveAndExport(save: () => Promise<boolean>) {
    if (!(await save())) return
    await nextTick()
    await refresh()
    if (!preview.value) {
      if (error.value) notify.error(error.value)
      return
    }
    await exportSaved()
  }

  return {
    state,
    visit,
    isNewVisit,
    hasUnsavedChanges,
    fileName,
    availability,
    qualityHint,
    preview,
    previewLoading: loading,
    previewError: error,
    exportStatus: download.status,
    cancelExport: download.cancel,
    exportSaved,
    saveAndExport,
  }
}
