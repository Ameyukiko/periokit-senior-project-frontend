import { describe, expect, it } from 'vitest'
import { buildExportRequest, exportErrorMessage, filenameFromDisposition } from './export.mapping'
import type { ExportState } from './export.constants'

const state = (patch: Partial<ExportState> = {}): ExportState => ({
  format: 'pdf',
  paper: 'a4',
  pngDpi: 150,
  orient: { chart: 'portrait', diagnosis: 'portrait', images: 'landscape', imageNotes: 'portrait' },
  on: { chart: true, diagnosis: true, images: true, imageNotes: true },
  gray: false,
  ...patch,
})

describe('buildExportRequest', () => {
  it('maps ticked sections, their orientations and options', () => {
    expect(buildExportRequest(state({ gray: true }), {}, ' HN-1_report ')).toEqual({
      format: 'pdf',
      sections: ['chart', 'diagnosis', 'images', 'imageNotes'],
      paperSize: 'a4',
      orientations: { chart: 'portrait', diagnosis: 'portrait', images: 'landscape', imageNotes: 'portrait' },
      grayscale: true,
      baseFilename: 'HN-1_report',
    })
  })

  it('passes extended paper sizes through', () => {
    expect(buildExportRequest(state({ paper: 'jis-b4' }), {}, 'a').paperSize).toBe('jis-b4')
  })

  it('sends pngDpi only for PNG', () => {
    expect(buildExportRequest(state(), {}, 'a').pngDpi).toBeUndefined()
    expect(buildExportRequest(state({ format: 'png', pngDpi: 300 }), {}, 'a').pngDpi).toBe(300)
  })

  it('drops unavailable sections and children of unticked parents', () => {
    const s = state()
    s.on.images = false
    const req = buildExportRequest(s, { diagnosis: { available: false, reason: 'No saved diagnosis' } }, '')
    expect(req.sections).toEqual(['chart'])
    expect(req.baseFilename).toBe('periodontal-report')
  })
})

describe('filenameFromDisposition', () => {
  it('prefers the UTF-8 filename', () => {
    const header = `attachment; filename="HN-___.pdf"; filename*=UTF-8''HN-%E0%B8%81.pdf`
    expect(filenameFromDisposition(header, 'x')).toBe('HN-ก.pdf')
  })
  it('falls back to the ASCII filename, then the default', () => {
    expect(filenameFromDisposition('attachment; filename="a.zip"', 'x')).toBe('a.zip')
    expect(filenameFromDisposition(null, 'x')).toBe('x')
  })
})

describe('exportErrorMessage', () => {
  it('maps known codes and 429', () => {
    expect(exportErrorMessage({ code: 'EXPORT_SOURCE_CHANGED' })).toMatch(/changed/)
    expect(exportErrorMessage({ status: 429, code: 'X' })).toMatch(/busy/)
    expect(exportErrorMessage({ message: 'boom' })).toBe('boom')
  })
})
