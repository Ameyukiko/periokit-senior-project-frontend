import { apiRequest } from './http'
import * as mock from './admin-users.mock'
import type {
  AdminUser,
  AdminUserPage,
  AdminUserProfileInput,
  AdminUserQuery,
  LifecycleAction,
  UserRole,
} from '@/domain/admin/admin-users.types'

// The admin backend is not available yet (PER-266 depends on it). Set
// VITE_ADMIN_USERS_MOCK=false once the REST contract below is live.
const useMock = import.meta.env.VITE_ADMIN_USERS_MOCK !== 'false'

export async function listAdminUsers(query: AdminUserQuery, signal?: AbortSignal): Promise<AdminUserPage> {
  if (useMock) return mock.listAdminUsers(query, signal)
  const params = new URLSearchParams(
    Object.entries(query).map(([k, v]) => [k, String(v)]),
  )
  const res = await apiRequest<AdminUserPage>(`/admin/users?${params}`, { auth: true, signal })
  return res.data!
}

export async function updateAdminUser(
  id: string,
  input: AdminUserProfileInput & { role?: UserRole },
): Promise<AdminUser> {
  if (useMock) return mock.updateAdminUser(id, input)
  const res = await apiRequest<AdminUser>(`/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(input),
  })
  return res.data!
}

export async function changeAdminUserLifecycle(id: string, action: LifecycleAction): Promise<AdminUser> {
  if (useMock) return mock.changeAdminUserLifecycle(id, action)
  const res = await apiRequest<AdminUser>(`/admin/users/${encodeURIComponent(id)}/${action}`, {
    method: 'POST',
    auth: true,
  })
  return res.data!
}
