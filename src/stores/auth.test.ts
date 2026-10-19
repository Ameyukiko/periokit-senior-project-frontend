import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const api = { logoutUser: vi.fn(), loginUser: vi.fn(), registerUser: vi.fn(), getMe: vi.fn() }
vi.mock('../services/api/auth.api', () => api)
const session = { clearClientSession: vi.fn(), handleUnauthorizedSession: vi.fn(), registerSessionClearListener: vi.fn() }
vi.mock('../services/session', () => session)
vi.mock('../services/token-storage', () => ({
  getAccessToken: () => 'token',
  getStoredUserProfile: () => ({ id: 'me', role: 'admin' }),
  saveSession: vi.fn(),
}))

const { useAuthStore } = await import('./auth')

beforeEach(() => setActivePinia(createPinia()))

describe('auth store logout', () => {
  it('signs out on the backend, then clears the client session', async () => {
    api.logoutUser.mockResolvedValue(undefined)
    await useAuthStore().logout()
    expect(api.logoutUser).toHaveBeenCalled()
    expect(session.clearClientSession).toHaveBeenCalled()
  })

  it('still clears the client session when the backend call fails', async () => {
    api.logoutUser.mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await useAuthStore().logout()
    expect(session.clearClientSession).toHaveBeenCalled()
  })
})
