import { onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'
import { ExportApiError, fetchExportPreview, type ExportPreview, type ExportPreviewRequest } from '@/services/api/export.api'
import { exportErrorMessage, type SectionAvailability } from '@/domain/export/export.mapping'

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'

/**
 * Debounced server preview. Every new visit/options change aborts the request in flight,
 * and a sequence number keeps a late response from overwriting a newer one.
 */
export function useExportPreview(
  visitId: Ref<string | null>,
  request: Ref<ExportPreviewRequest | null>,
  availability: Ref<SectionAvailability>,
  debounceMs = 400,
) {
  const preview = shallowRef<ExportPreview | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  let controller: AbortController | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let seq = 0

  function cancel() {
    if (timer) clearTimeout(timer)
    timer = null
    controller?.abort()
    controller = null
    seq++
    loading.value = false
  }

  async function load() {
    cancel()
    const id = visitId.value
    const body = request.value
    if (!id || id === 'new' || !body || !body.sections.length) {
      preview.value = null
      error.value = null
      return
    }

    const mine = seq
    controller = new AbortController()
    loading.value = true
    error.value = null
    try {
      const result = await fetchExportPreview(id, body, controller.signal)
      if (mine !== seq) return
      availability.value = result.availability
      preview.value = result
    } catch (err) {
      if (mine !== seq || isAbort(err)) return
      if (err instanceof ExportApiError && err.code === 'EXPORT_DATA_UNAVAILABLE') {
        // Turn the rejected sections off; the request watcher then loads again without them.
        const unavailable = (err.details as { unavailable?: { section: string; reason: string | null }[] })?.unavailable ?? []
        availability.value = {
          ...availability.value,
          ...Object.fromEntries(unavailable.map((u) => [u.section, { available: false, reason: u.reason }])),
        }
        return
      }
      preview.value = null
      error.value = exportErrorMessage(err)
    } finally {
      if (mine === seq) loading.value = false
    }
  }

  function schedule() {
    cancel()
    loading.value = true
    timer = setTimeout(load, debounceMs)
  }

  watch(visitId, () => {
    preview.value = null
    availability.value = {}
  })
  watch([visitId, () => JSON.stringify(request.value)], schedule, { immediate: true })

  onScopeDispose(cancel)

  return { preview, loading, error, refresh: load, cancel }
}
