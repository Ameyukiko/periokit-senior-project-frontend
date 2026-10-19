import { afterEach, describe, expect, it, vi } from 'vitest'

const handleUnauthorizedSession = vi.fn()
vi.mock('../session', () => ({ handleUnauthorizedSession }))
vi.mock('../token-storage', () => ({ getAuthHeaders: () => ({ Authorization: 'Bearer t' }) }))

const { downloadExportFile, ExportApiError } = await import('./export.api')

const request = {
  format: 'excel' as const,
  sections: ['chart' as const],
  paperSize: 'a4' as const,
  orientations: {},
  grayscale: false,
  baseFilename: 'report',
  expectedSnapshotVersion: 'v'.repeat(43),
}

afterEach(() => vi.unstubAllGlobals())

describe('downloadExportFile', () => {
  it('returns the blob with the server filename', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response('xlsx', { headers: { 'Content-Disposition': 'attachment; filename="HN-1.xlsx"' } })))
    const onDownloading = vi.fn()
    const result = await downloadExportFile('id', request, new AbortController().signal, onDownloading)
    expect(result.filename).toBe('HN-1.xlsx')
    expect(await result.blob.text()).toBe('xlsx')
    expect(onDownloading).toHaveBeenCalled()
  })

  it.each([
    [409, 'EXPORT_SOURCE_CHANGED'],
    [422, 'EXPORT_LIMIT_EXCEEDED'],
    [429, 'EXPORT_QUEUE_FULL'],
  ])('throws ExportApiError for %i', async (status, code) => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ code, message: 'm' }, { status })))
    const error = await downloadExportFile('id', request, new AbortController().signal).catch((e) => e)
    expect(error).toBeInstanceOf(ExportApiError)
    expect(error).toMatchObject({ status, code })
    expect(handleUnauthorizedSession).not.toHaveBeenCalled()
  })

  it('hands 401 to the session handler', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ code: 'AUTHENTICATION_REQUIRED' }, { status: 401 })))
    await expect(downloadExportFile('id', request, new AbortController().signal)).rejects.toMatchObject({ status: 401 })
    expect(handleUnauthorizedSession).toHaveBeenCalledOnce()
  })
})
