import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import type { ExportPreviewRequest } from '@/services/api/export.api'
import type { SectionAvailability } from '@/domain/export/export.mapping'

const fetchExportPreview = vi.fn()
vi.mock('@/services/api/export.api', async () => {
  const { ExportApiError } = await vi.importActual<typeof import('@/services/api/export.api')>('@/services/api/export.api')
  return { ExportApiError, fetchExportPreview }
})
vi.mock('@/services/session', () => ({ handleUnauthorizedSession: vi.fn() }))
vi.mock('@/services/token-storage', () => ({ getAuthHeaders: () => ({}) }))

const { useExportPreview } = await import('./useExportPreview')
const { ExportApiError } = await import('@/services/api/export.api')

const req = (format: 'pdf' | 'png' = 'pdf'): ExportPreviewRequest => ({
  format, sections: ['chart'], paperSize: 'a4', orientations: {}, grayscale: false, baseFilename: 'r',
})
const result = (snapshotVersion: string) => ({ snapshotVersion, availability: {}, pageCount: 1, pages: [], warnings: [] })

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

function setup(visitId = 'v1', request = req()) {
  const visit = ref<string | null>(visitId)
  const body = ref<ExportPreviewRequest | null>(request)
  const availability = ref<SectionAvailability>({})
  const scope = effectScope()
  const api = scope.run(() => useExportPreview(visit, body, availability, 100))!
  return { visit, body, availability, scope, ...api }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useExportPreview', () => {
  it('debounces option changes into one request', async () => {
    fetchExportPreview.mockResolvedValue(result('a'))
    const p = setup()
    p.body.value = req('png')
    await nextTick()
    p.body.value = req('pdf')
    await nextTick()
    await vi.advanceTimersByTimeAsync(100)
    expect(fetchExportPreview).toHaveBeenCalledTimes(1)
    expect(p.preview.value?.snapshotVersion).toBe('a')
  })

  it('aborts the old request and ignores its late response after a visit change', async () => {
    const first = deferred<ReturnType<typeof result>>()
    fetchExportPreview.mockReturnValueOnce(first.promise).mockResolvedValueOnce(result('v2'))
    const p = setup()
    await vi.advanceTimersByTimeAsync(100)
    const firstSignal = fetchExportPreview.mock.calls[0]![2] as AbortSignal

    p.visit.value = 'v2'
    await nextTick()
    expect(firstSignal.aborted).toBe(true)
    await vi.advanceTimersByTimeAsync(100)
    first.resolve(result('v1-late'))
    await vi.runAllTimersAsync()
    expect(p.preview.value?.snapshotVersion).toBe('v2')
  })

  it('does not preview a new (unsaved) visit', async () => {
    const p = setup('new')
    await vi.advanceTimersByTimeAsync(100)
    expect(fetchExportPreview).not.toHaveBeenCalled()
    expect(p.preview.value).toBeNull()
  })

  it('marks sections unavailable on EXPORT_DATA_UNAVAILABLE', async () => {
    fetchExportPreview.mockRejectedValueOnce(
      new ExportApiError('x', 422, 'EXPORT_DATA_UNAVAILABLE', { unavailable: [{ section: 'chart', reason: 'No saved periodontal chart' }] }),
    )
    const p = setup()
    await vi.advanceTimersByTimeAsync(100)
    expect(p.availability.value.chart).toEqual({ available: false, reason: 'No saved periodontal chart' })
    expect(p.error.value).toBeNull()
  })

  it('aborts on scope dispose', async () => {
    fetchExportPreview.mockReturnValueOnce(new Promise(() => {}))
    const p = setup()
    await vi.advanceTimersByTimeAsync(100)
    p.scope.stop()
    expect((fetchExportPreview.mock.calls[0]![2] as AbortSignal).aborted).toBe(true)
  })
})
