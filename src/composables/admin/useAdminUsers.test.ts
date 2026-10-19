import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, reactive, type EffectScope } from 'vue'
import { ApiError } from '@/services/api/http'

const route = reactive({ query: {} as Record<string, string> })
const router = { replace: vi.fn(async ({ query }) => { route.query = query }) }
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => router }))
const notify = { success: vi.fn(), error: vi.fn() }
vi.mock('@/stores/notification', () => ({ useNotificationStore: () => notify }))
const api = { listAdminUsers: vi.fn(), updateAdminUser: vi.fn(), changeAdminUserLifecycle: vi.fn() }
vi.mock('@/services/api/admin-users.api', () => api)

const { useAdminUsers } = await import('./useAdminUsers')

const page = (ids: string[]) => ({
  items: ids.map((id) => ({ id })),
  total: ids.length,
  totals: { all: ids.length, active: ids.length, inactive: 0, deleted: 0 },
})
const deferred = <T>() => {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}
const flush = () => new Promise((r) => setTimeout(r))
const scopes: EffectScope[] = []
const setup = () => {
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(() => useAdminUsers())!
}

afterEach(() => scopes.splice(0).forEach((s) => s.stop()))
const user = { id: 'u1' } as never

beforeEach(() => {
  route.query = {}
  api.listAdminUsers.mockResolvedValue(page(['a']))
})

describe('useAdminUsers', () => {
  it('loads from URL state', async () => {
    route.query = { role: 'admin', page: '2' }
    const s = setup()
    await flush()
    expect(api.listAdminUsers.mock.calls[0][0]).toMatchObject({ role: 'admin', page: 2 })
    expect(s.users.value).toEqual([{ id: 'a' }])
  })

  it('resets to page 1 when a filter changes but not when paging', async () => {
    route.query = { page: '3' }
    const s = setup()
    await s.setQuery({ role: 'dentist' })
    expect(route.query).toEqual({ role: 'dentist' })
    await s.setQuery({ page: 2 })
    expect(route.query).toEqual({ role: 'dentist', page: '2' })
  })

  it('debounces trimmed search and clears it', async () => {
    vi.useFakeTimers()
    const s = setup()
    s.searchInput.value = ' pl'
    await nextTick()
    s.searchInput.value = ' ploy '
    await nextTick()
    await vi.advanceTimersByTimeAsync(299)
    expect(router.replace).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(router.replace).toHaveBeenCalledTimes(1)
    expect(route.query).toEqual({ q: 'ploy' })
    s.searchInput.value = ''
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)
    expect(route.query).toEqual({})
    vi.useRealTimers()
  })

  it('ignores stale responses and aborts the older request', async () => {
    const first = deferred<ReturnType<typeof page>>()
    const second = deferred<ReturnType<typeof page>>()
    api.listAdminUsers.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const s = setup()
    route.query = { q: 'new' }
    await nextTick()
    const firstSignal: AbortSignal = api.listAdminUsers.mock.calls[0][1]
    expect(firstSignal.aborted).toBe(true)
    second.resolve(page(['new']))
    await flush()
    first.resolve(page(['old']))
    await flush()
    expect(s.users.value).toEqual([{ id: 'new' }])
  })

  it('shows a retryable error state', async () => {
    api.listAdminUsers.mockRejectedValueOnce(new Error('boom'))
    const s = setup()
    await flush()
    expect(s.error.value).toBe('Could not load users.')
    await s.reload()
    expect(s.error.value).toBeNull()
  })

  it.each([403, 409])('handles %i on mutation by notifying and refreshing', async (status) => {
    const s = setup()
    await flush()
    api.listAdminUsers.mockClear()
    api.changeAdminUserLifecycle.mockRejectedValueOnce(new ApiError('Conflict', status))
    expect(await s.changeLifecycle(user, 'delete')).toBe(false)
    expect(notify.error).toHaveBeenCalled()
    expect(api.listAdminUsers).toHaveBeenCalledTimes(1)
    expect(s.pendingId.value).toBeNull()
  })

  it('does not refresh after an unexpected failed mutation', async () => {
    const s = setup()
    await flush()
    api.listAdminUsers.mockClear()
    api.updateAdminUser.mockRejectedValueOnce(new Error('network'))
    expect(await s.saveUser(user, { firstName: 'a', lastName: 'b', studentId: null })).toBe(false)
    expect(notify.error).toHaveBeenCalledWith('Something went wrong. Please try again.')
    expect(api.listAdminUsers).not.toHaveBeenCalled()
  })

  it('blocks concurrent mutations and reloads after success', async () => {
    const s = setup()
    await flush()
    const pending = deferred<unknown>()
    api.updateAdminUser.mockReturnValueOnce(pending.promise)
    const first = s.saveUser(user, { firstName: 'a', lastName: 'b', studentId: null })
    expect(s.pendingId.value).toBe('u1')
    expect(await s.changeLifecycle(user, 'delete')).toBe(false)
    pending.resolve({})
    expect(await first).toBe(true)
    expect(notify.success).toHaveBeenCalledWith('User updated')
  })
})
