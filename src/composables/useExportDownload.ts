import { onScopeDispose, ref } from 'vue'
import { ExportApiError, downloadExportFile, type ExportPreviewRequest } from '@/services/api/export.api'

export type ExportStatus = 'idle' | 'queued' | 'preparing' | 'downloading' | 'completed' | 'cancelled' | 'failed'
export type ExportResult =
  | { status: 'completed'; filename: string }
  | { status: 'cancelled' }
  | { status: 'stale' }
  | { status: 'failed'; error: unknown }

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function useExportDownload(save: typeof saveBlob = saveBlob) {
  const status = ref<ExportStatus>('idle')
  let controller: AbortController | null = null

  function cancel() {
    if (!controller) return
    controller.abort()
    controller = null
    status.value = 'cancelled'
  }

  async function start(visitId: string, request: ExportPreviewRequest, snapshotVersion: string): Promise<ExportResult> {
    cancel()
    const mine = new AbortController()
    controller = mine
    status.value = 'queued'
    // The server only reports queue state with the finished response, so show progress optimistically.
    const preparing = setTimeout(() => status.value === 'queued' && (status.value = 'preparing'), 300)
    try {
      const { blob, filename } = await downloadExportFile(
        visitId,
        { ...request, expectedSnapshotVersion: snapshotVersion },
        mine.signal,
        () => (status.value = 'downloading'),
      )
      if (mine.signal.aborted) return { status: 'cancelled' }
      save(blob, filename)
      status.value = 'completed'
      return { status: 'completed', filename }
    } catch (error) {
      if (mine.signal.aborted) return { status: 'cancelled' }
      status.value = 'failed'
      if (error instanceof ExportApiError && error.code === 'EXPORT_SOURCE_CHANGED') return { status: 'stale' }
      return { status: 'failed', error }
    } finally {
      clearTimeout(preparing)
      if (controller === mine) controller = null
    }
  }

  onScopeDispose(cancel)

  return { status, start, cancel }
}
