import { computed, onScopeDispose, reactive, ref, shallowRef, watch } from 'vue'
import { handleUnauthorizedSession } from '@/services/session'
import { ApiError } from '@/services/api/http'
import { listAuditLogs } from '@/services/api/admin-audit.api'
import type { AuditLog, AuditLogQuery } from '@/domain/admin/admin-audit.types'

const SEARCH_DEBOUNCE_MS = 300

export function useAdminAuditLog() {
  const query = reactive<AuditLogQuery>({ search: '', action: 'all', page: 1, pageSize: 10 })
  const logs = shallowRef<AuditLog[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / query.pageSize)))

  function setQuery(patch: Partial<AuditLogQuery>) {
    Object.assign(query, patch)
    if (!('page' in patch)) query.page = 1
  }

  const searchInput = ref('')
  let searchTimer: ReturnType<typeof setTimeout> | undefined
  watch(searchInput, (value) => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => setQuery({ search: value.trim() }), SEARCH_DEBOUNCE_MS)
  })

  let controller: AbortController | null = null

  async function load() {
    controller?.abort()
    const current = (controller = new AbortController())
    loading.value = true
    error.value = null
    try {
      const page = await listAuditLogs({ ...query }, current.signal)
      logs.value = page.items
      total.value = page.total
    } catch (e) {
      if (current.signal.aborted) return
      if (e instanceof ApiError && e.status === 401) return handleUnauthorizedSession()
      error.value = e instanceof ApiError && e.status === 403
        ? 'Only a super admin can view the activity log.'
        : 'Could not load the activity log.'
    } finally {
      if (controller === current) loading.value = false
    }
  }

  watch(() => ({ ...query }), load, { immediate: true, deep: true })

  onScopeDispose(() => {
    clearTimeout(searchTimer)
    controller?.abort()
  })

  return { query, searchInput, logs, total, totalPages, loading, error, setQuery, reload: load }
}
