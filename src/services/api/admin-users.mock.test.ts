import { beforeEach, describe, expect, it, vi } from 'vitest'

const profile = { value: { id: 'me', email: 'me@x.test', first_name: 'Me', last_name: 'Self', role: 'admin' } as { id: string; role: string } & Record<string, string> | null }
vi.mock('../token-storage', () => ({ getStoredUserProfile: () => profile.value }))
vi.useFakeTimers()

const mock = await import('./admin-users.mock')
const { DEFAULT_QUERY } = await import('@/domain/admin/admin-users.query')

const run = async <T>(p: Promise<T>) => {
  await vi.runAllTimersAsync()
  return p
}
const rejects = async (p: Promise<unknown>, status: number) => {
  const assertion = expect(p).rejects.toMatchObject({ status })
  await vi.runAllTimersAsync()
  await assertion
}
const list = (patch = {}) => run(mock.listAdminUsers({ ...DEFAULT_QUERY, pageSize: 100, ...patch }))

beforeEach(() => {
  mock.resetMockUsers()
  profile.value = { id: 'me', email: 'me@x.test', first_name: 'Me', last_name: 'Self', role: 'admin' }
})

describe('admin users mock API', () => {
  it('rejects dentists with 403', async () => {
    profile.value = { ...profile.value!, role: 'dentist' }
    await rejects(mock.listAdminUsers(DEFAULT_QUERY), 403)
  })

  it('searches name, email and student ID case-insensitively', async () => {
    const byName = await list({ search: 'NARIN sri' })
    expect(byName.items.length).toBeGreaterThan(0)
    expect(byName.items.every((u) => `${u.firstName} ${u.lastName}`.toLowerCase().includes('narin sri'))).toBe(true)
    expect((await list({ search: 'user12@' })).items.map((u) => u.email)).toEqual(['user12@periokit.test'])
    const sid = (await list({ role: 'dentist' })).items[0].studentId!
    expect((await list({ search: sid.slice(2) })).items.some((u) => u.studentId === sid)).toBe(true)
  })

  it('filters by role and status, and paginates', async () => {
    expect((await list({ role: 'super_admin' })).items.every((u) => u.role === 'super_admin')).toBe(true)
    expect((await list({ status: 'deleted' })).items.every((u) => u.status === 'deleted')).toBe(true)
    const page2 = await run(mock.listAdminUsers({ ...DEFAULT_QUERY, page: 2, pageSize: 5 }))
    expect(page2.items).toHaveLength(5)
  })

  it('filters by created date', async () => {
    const age = (u: { createdAt: string }) => (Date.now() - Date.parse(u.createdAt)) / 86_400_000
    const week = (await list({ created: 'week' })).items
    expect(week.length).toBeGreaterThan(0)
    expect(week.every((u) => age(u) <= 7)).toBe(true)
    expect((await list({ created: 'older' })).items.every((u) => age(u) > 30)).toBe(true)
  })

  it('sorts blank student IDs last', async () => {
    const sorted = (await list({ sort: 'studentId', dir: 'desc' })).items
    const firstBlank = sorted.findIndex((u) => !u.studentId)
    expect(sorted.slice(firstBlank).every((u) => !u.studentId)).toBe(true)
  })

  it('restores deleted accounts as deactivated', async () => {
    profile.value = { ...profile.value!, role: 'super_admin' }
    const deleted = (await list({ status: 'deleted' })).items[0]
    expect(deleted.deletedAt).toBeTruthy()
    const restored = await run(mock.changeAdminUserLifecycle(deleted.id, 'restore'))
    expect(restored).toMatchObject({ status: 'inactive', deletedAt: null })
  })

  it('aborts with AbortError', async () => {
    const c = new AbortController()
    const p = mock.listAdminUsers(DEFAULT_QUERY, c.signal)
    c.abort()
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('forbids a normal admin from changing roles or privileged accounts', async () => {
    const { items } = await list()
    const dentist = items.find((u) => u.role === 'dentist')!
    const other = items.find((u) => u.role === 'super_admin')!
    await rejects(mock.updateAdminUser(dentist.id, { firstName: 'N', lastName: 'L', studentId: null, role: 'admin' }), 403)
    await rejects(mock.changeAdminUserLifecycle(other.id, 'deactivate'), 403)
    await rejects(mock.changeAdminUserLifecycle('me', 'delete'), 403)
    expect((await run(mock.updateAdminUser(dentist.id, { firstName: 'N', lastName: 'L', studentId: null }))).firstName).toBe('N')
  })

  it('returns 409 for stale lifecycle transitions', async () => {
    profile.value = { ...profile.value!, role: 'super_admin' }
    const target = (await list({ role: 'admin' })).items.find((u) => u.status === 'active')!
    await run(mock.changeAdminUserLifecycle(target.id, 'deactivate'))
    await rejects(mock.changeAdminUserLifecycle(target.id, 'deactivate'), 409)
  })
})
