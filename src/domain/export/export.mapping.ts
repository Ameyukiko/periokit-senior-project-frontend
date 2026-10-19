import type { ExportPreviewRequest } from '@/services/api/export.api'
import { SECTIONS, type ExportState, type SectionId } from './export.constants'

export type SectionAvailability = Partial<Record<SectionId, { available: boolean; reason: string | null }>>

export const isSectionAvailable = (availability: SectionAvailability, id: SectionId) =>
  availability[id]?.available !== false

/** Only sections that are ticked, available, and whose parent section is ticked. */
export function selectedSections(state: ExportState, availability: SectionAvailability): SectionId[] {
  return SECTIONS.filter(
    (s) => state.on[s.id] && isSectionAvailable(availability, s.id) && (!s.parent || state.on[s.parent]),
  ).map((s) => s.id)
}

export function buildExportRequest(
  state: ExportState,
  availability: SectionAvailability,
  baseFilename: string,
): ExportPreviewRequest {
  const sections = selectedSections(state, availability)
  return {
    format: state.format,
    sections,
    paperSize: state.paper,
    orientations: Object.fromEntries(sections.map((id) => [id, state.orient[id]])),
    grayscale: state.gray,
    ...(state.format === 'png' ? { pngDpi: state.pngDpi } : {}),
    baseFilename: baseFilename.trim() || 'periodontal-report',
  }
}

/** Reads the filename the backend chose, preferring the RFC 5987 UTF-8 form. */
export function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1]
  if (encoded) {
    try {
      return decodeURIComponent(encoded.trim())
    } catch {
      // fall through to the ASCII filename
    }
  }
  return /filename="([^"]+)"/i.exec(header)?.[1] ?? fallback
}

const ERROR_MESSAGES: Record<string, string> = {
  EXPORT_SOURCE_CHANGED: 'The saved visit changed. The preview was refreshed, please review it and export again.',
  EXPORT_QUEUE_FULL: 'The export service is busy. Please try again shortly.',
  EXPORT_TIMEOUT: 'The export took too long. Try fewer sections or a lower PNG quality.',
  EXPORT_LIMIT_EXCEEDED: 'The report is too large to export. Try fewer sections or a lower PNG quality.',
  EXPORT_DATA_UNAVAILABLE: 'Some selected sections have no saved data.',
  VISIT_NOT_FOUND: 'This visit could not be found.',
  AUTHENTICATION_REQUIRED: 'Please login again.',
}

export function exportErrorMessage(error: unknown): string {
  const { code, status, message } = (error ?? {}) as { code?: string; status?: number; message?: string }
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code]
  if (status === 429) return ERROR_MESSAGES.EXPORT_QUEUE_FULL!
  return message || 'The export could not be generated'
}
