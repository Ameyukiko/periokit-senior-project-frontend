import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = { isAuthenticated: true, user: null as { role: string } | null, fetchProfile: vi.fn() }
vi.mock('../stores/auth', () => ({ useAuthStore: () => auth }))
const token = { value: 't' as string | null }
vi.mock('../services/token-storage', () => ({ getAccessToken: () => token.value }))
vi.mock('vue-router', async (orig) => ({
  ...(await orig<typeof import('vue-router')>()),
  createWebHistory: (await orig<typeof import('vue-router')>()).createMemoryHistory,
}))
vi.mock('../views/LoginView.vue', () => ({ default: {} }))
vi.mock('../views/RegisterView.vue', () => ({ default: {} }))
vi.mock('../views/AdminDashboardView.vue', () => ({ default: {} }))
vi.mock('../views/MyPatientListView.vue', () => ({ default: {} }))

const { default: router } = await import('./index')

beforeEach(async () => {
  token.value = 't'
  auth.isAuthenticated = true
  auth.fetchProfile.mockReset()
  await router.push('/login').catch(() => {})
})

describe('admin route guard', () => {
  it.each(['admin', 'super_admin'])('lets %s in after refreshing /auth/me', async (role) => {
    auth.fetchProfile.mockImplementation(async () => { auth.user = { role } })
    await router.push('/admin')
    expect(auth.fetchProfile).toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/admin')
  })

  it('redirects dentists to /patients even if the stored role was admin', async () => {
    auth.user = { role: 'admin' }
    auth.fetchProfile.mockImplementation(async () => { auth.user = { role: 'dentist' } })
    await router.push('/admin')
    expect(router.currentRoute.value.path).toBe('/patients')
  })

  it('sends to login when the session expired during the refresh', async () => {
    auth.fetchProfile.mockImplementation(async () => {
      auth.isAuthenticated = false
      token.value = null
    })
    await router.push('/admin')
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('does not call /auth/me for non-role routes', async () => {
    await router.push('/patients')
    expect(auth.fetchProfile).not.toHaveBeenCalled()
  })
})
