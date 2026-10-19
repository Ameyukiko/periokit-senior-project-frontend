import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, reactive, ref, toRefs } from 'vue'

const chart = reactive({ patientInfo: { hn: '1', date: '2026-10-19' }, isDirty: true })
const notify = { success: vi.fn(), warning: vi.fn(), error: vi.fn() }
vi.mock('pinia', () => ({ storeToRefs: toRefs }))
vi.mock('@/stores/periodontal-chart', () => ({ usePeriodontalChartStore: () => chart }))
vi.mock('@/stores/diagnosis', () => ({ useDiagnosisStore: () => ({ isDirty: false }) }))
vi.mock('@/stores/visit', () => ({ useVisitStore: () => ({ visits: [] }) }))
vi.mock('@/stores/xray-board', () => ({ useXrayBoardStore: () => ({ editable: false, isDirty: false }) }))
vi.mock('@/stores/notification', () => ({ useNotificationStore: () => notify }))

const preview = ref<{ snapshotVersion: string } | null>(null)
const refresh = vi.fn()
vi.mock('./useExportPreview', () => ({
  useExportPreview: () => ({ preview, loading: ref(false), error: ref(null), refresh }),
}))
const start = vi.fn()
vi.mock('./useExportDownload', () => ({
  useExportDownload: () => ({ status: ref('idle'), start, cancel: vi.fn() }),
}))

const { useExportReport } = await import('./useExportReport')

const setup = (visitId = 'v1') => effectScope().run(() => useExportReport(ref(visitId)))!

beforeEach(() => {
  preview.value = { snapshotVersion: 'old' }
  start.mockResolvedValue({ status: 'completed', filename: 'f.pdf' })
})

describe('useExportReport', () => {
  it('flags unsaved local changes', () => {
    expect(setup().hasUnsavedChanges.value).toBe(true)
  })

  it('Save & Export does not export when saving fails', async () => {
    await setup().saveAndExport(async () => false)
    expect(refresh).not.toHaveBeenCalled()
    expect(start).not.toHaveBeenCalled()
  })

  it('Save & Export refreshes the preview after saving and exports the new snapshot', async () => {
    const order: string[] = []
    refresh.mockImplementationOnce(async () => {
      order.push('refresh')
      preview.value = { snapshotVersion: 'new' }
    })
    await setup().saveAndExport(async () => (order.push('save'), true))
    expect(order).toEqual(['save', 'refresh'])
    expect(start).toHaveBeenCalledWith('v1', expect.any(Object), 'new')
  })

  it('Export saved version leaves local state untouched', async () => {
    await setup().exportSaved()
    expect(start).toHaveBeenCalledWith('v1', expect.any(Object), 'old')
    expect(chart.isDirty).toBe(true)
  })

  it('refreshes the preview instead of downloading on 409', async () => {
    start.mockResolvedValueOnce({ status: 'stale' })
    await setup().exportSaved()
    expect(notify.warning).toHaveBeenCalled()
    expect(refresh).toHaveBeenCalled()
  })
})
