import { describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

const downloadExportFile = vi.fn()
vi.mock('@/services/api/export.api', async () => {
  const { ExportApiError } = await vi.importActual<typeof import('@/services/api/export.api')>('@/services/api/export.api')
  return { ExportApiError, downloadExportFile }
})
vi.mock('@/services/session', () => ({ handleUnauthorizedSession: vi.fn() }))
vi.mock('@/services/token-storage', () => ({ getAuthHeaders: () => ({}) }))

const { useExportDownload } = await import('./useExportDownload')
const { ExportApiError } = await import('@/services/api/export.api')

const request = { format: 'pdf' as const, sections: ['chart' as const], paperSize: 'a4' as const, orientations: {}, grayscale: false, baseFilename: 'r' }

function setup() {
  const save = vi.fn()
  const scope = effectScope()
  return { save, scope, ...scope.run(() => useExportDownload(save))! }
}

describe('useExportDownload', () => {
  it('sends the preview snapshotVersion and saves the blob with the server filename', async () => {
    const blob = new Blob(['pdf'])
    downloadExportFile.mockImplementationOnce(async (_id, _req, _signal, onDownloading) => {
      onDownloading()
      return { blob, filename: 'HN-1.pdf' }
    })
    const d = setup()
    expect(await d.start('v1', request, 'snap')).toEqual({ status: 'completed', filename: 'HN-1.pdf' })
    expect(downloadExportFile.mock.calls[0]![1]).toMatchObject({ expectedSnapshotVersion: 'snap' })
    expect(d.save).toHaveBeenCalledWith(blob, 'HN-1.pdf')
    expect(d.status.value).toBe('completed')
  })

  it('reports stale on 409 and does not save', async () => {
    downloadExportFile.mockRejectedValueOnce(new ExportApiError('x', 409, 'EXPORT_SOURCE_CHANGED'))
    const d = setup()
    expect(await d.start('v1', request, 'snap')).toEqual({ status: 'stale' })
    expect(d.save).not.toHaveBeenCalled()
  })

  it('reports failed for other errors', async () => {
    downloadExportFile.mockRejectedValueOnce(new ExportApiError('x', 429, 'EXPORT_QUEUE_FULL'))
    const d = setup()
    expect((await d.start('v1', request, 'snap')).status).toBe('failed')
    expect(d.status.value).toBe('failed')
  })

  it('cancel aborts the request and skips the download', async () => {
    downloadExportFile.mockImplementationOnce(
      (_id, _req, signal: AbortSignal) =>
        new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('a', 'AbortError')))),
    )
    const d = setup()
    const pending = d.start('v1', request, 'snap')
    d.cancel()
    expect(await pending).toEqual({ status: 'cancelled' })
    expect(d.status.value).toBe('cancelled')
    expect(d.save).not.toHaveBeenCalled()
  })
})
