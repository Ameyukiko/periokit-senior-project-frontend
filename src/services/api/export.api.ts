import { API_URL } from './http'
import { getAuthHeaders } from '../token-storage'
import { handleUnauthorizedSession } from '../session'
import { filenameFromDisposition, type SectionAvailability } from '@/domain/export/export.mapping'
import type { ExportFormat, Orientation, PaperSize, PngDpi, SectionId } from '@/domain/export/export.constants'

export interface ExportPreviewRequest {
  format: ExportFormat
  sections: SectionId[]
  paperSize: PaperSize
  orientations: Partial<Record<SectionId, Orientation>>
  grayscale: boolean
  pngDpi?: PngDpi
  baseFilename: string
}

export interface ExportPreviewPage {
  id: string
  section: SectionId
  title: string
  pageNumber: number
  widthMm: number
  heightMm: number
  orientation: Orientation
  html: string
}

export interface ExportPreview {
  snapshotVersion: string
  availability: SectionAvailability
  pageCount: number
  pages: ExportPreviewPage[]
  warnings: { code: string; section: SectionId; message: string }[]
}

export class ExportApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message)
    this.name = 'ExportApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

async function post(visitId: string, path: string, body: unknown, signal: AbortSignal) {
  const response = await fetch(`${API_URL}/visits/${encodeURIComponent(visitId)}/exports${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
    signal,
  })
  if (response.ok) return response

  const payload = (await response.json().catch(() => ({}))) as { code?: string; message?: string; details?: unknown }
  if (response.status === 401) void handleUnauthorizedSession()
  throw new ExportApiError(
    payload.message || 'Export request failed',
    response.status,
    payload.code || 'EXPORT_FAILED',
    payload.details,
  )
}

export async function fetchExportPreview(visitId: string, request: ExportPreviewRequest, signal: AbortSignal) {
  const response = await post(visitId, '/preview', request, signal)
  return (await response.json()) as ExportPreview
}

export async function downloadExportFile(
  visitId: string,
  request: ExportPreviewRequest & { expectedSnapshotVersion: string },
  signal: AbortSignal,
  onDownloading?: () => void,
) {
  const response = await post(visitId, '', request, signal)
  onDownloading?.()
  const blob = await response.blob()
  const filename = filenameFromDisposition(response.headers.get('Content-Disposition'), request.baseFilename)
  return { blob, filename }
}
