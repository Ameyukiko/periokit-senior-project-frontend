import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notification'
import { ApiError } from '@/services/api/http'
import { changeAdminUserLifecycle, listAdminUsers, updateAdminUser } from '@/services/api/admin-users.api'
import { parseAdminQuery, serializeAdminQuery } from '@/domain/admin/admin-users.query'
import type {
  AdminUser,
  AdminUserProfileInput,
  AdminUserQuery,
  LifecycleAction,
  StatusTab,
  UserRole,
} from '@/domain/admin/admin-users.types'

const SEARCH_DEBOUNCE_MS = 300

const LIFECYCLE_DONE: Record<LifecycleAction, string> = {
  deactivate: 'Account deactivated',
  reactivate: 'Account reactivated',
  delete: 'Account deleted',
  restore: 'Account restored',
}

export function adminErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'You no longer have permission to do this. The list has been refreshed.'
    if (error.status === 409) return error.message || 'This account was changed by someone else. The list has been refreshed.'
    if (error.status === 404) return 'This account no longer exists.'
    if (error.status === 422 || error.status === 400) return error.message || 'Please check the entered values.'
  }
  return 'Something went wrong. Please try again.'
}

export function useAdminUsers() {
  const route = useRoute()
  const router = useRouter()
  const notify = useNotificationStore()

  const query = computed(() => parseAdminQuery(route.query))
  const users = shallowRef<AdminUser[]>([])
  const total = ref(0)
  const totals = ref<Record<StatusTab, number>>({ all: 0, active: 0, inactive: 0, deleted: 0 })
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pendingId = ref<string | null>(null)
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / query.value.pageSize)))

  function setQuery(patch: Partial<AdminUserQuery>) {
    const next = { ...query.value, ...patch }
    if (!('page' in patch)) next.page = 1
    return router.replace({ query: serializeAdminQuery(next) })
  }

  // Search input is debounced; the effective (trimmed) query lives in the URL.
  const searchInput = ref(query.value.search)
  let searchTimer: ReturnType<typeof setTimeout> | undefined
  watch(searchInput, (value) => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      if (value.trim() !== query.value.search) setQuery({ search: value.trim() })
    }, SEARCH_DEBOUNCE_MS)
  })
  watch(
    () => query.value.search,
    (search) => {
      if (search !== searchInput.value.trim()) searchInput.value = search
    },
  )

  let controller: AbortController | null = null
  let requestId = 0

  async function load() {
    controller?.abort()
    controller = new AbortController()
    const id = ++requestId
    loading.value = true
    error.value = null
    try {
      const page = await listAdminUsers(query.value, controller.signal)
      if (id !== requestId) return
      users.value = page.items
      total.value = page.total
      totals.value = page.totals
    } catch (e) {
      if (id !== requestId || (e instanceof DOMException && e.name === 'AbortError')) return
      error.value = e instanceof ApiError && e.status === 403
        ? 'You do not have access to user management.'
        : 'Could not load users.'
    } finally {
      if (id === requestId) loading.value = false
    }
  }

  watch(() => JSON.stringify(query.value), load, { immediate: true })

  async function mutate(userId: string, run: () => Promise<unknown>, done: string): Promise<boolean> {
    if (pendingId.value) return false
    pendingId.value = userId
    try {
      await run()
      notify.success(done)
      await load()
      return true
    } catch (e) {
      notify.error(adminErrorMessage(e))
      if (e instanceof ApiError && (e.status === 403 || e.status === 409 || e.status === 404)) await load()
      return false
    } finally {
      pendingId.value = null
    }
  }

  const saveUser = (user: AdminUser, input: AdminUserProfileInput & { role?: UserRole }) =>
    mutate(user.id, () => updateAdminUser(user.id, input), 'User updated')

  const changeLifecycle = (user: AdminUser, action: LifecycleAction) =>
    mutate(user.id, () => changeAdminUserLifecycle(user.id, action), LIFECYCLE_DONE[action])

  onScopeDispose(() => {
    clearTimeout(searchTimer)
    controller?.abort()
    requestId++
  })

  return {
    query,
    searchInput,
    users,
    total,
    totals,
    totalPages,
    loading,
    error,
    pendingId,
    setQuery,
    reload: load,
    saveUser,
    changeLifecycle,
  }
}
