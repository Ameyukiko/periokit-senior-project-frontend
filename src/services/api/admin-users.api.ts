import { apiRequest } from './http'
import type {
  AdminUser,
  AdminUserPage,
  AdminUserProfileInput,
  AdminUserQuery,
  LifecycleAction,
  UserRole,
} from '@/domain/admin/admin-users.types'

// REST contract expected from the Admin Dashboard backend (PER-266 dependency).
export async function listAdminUsers(query: AdminUserQuery, signal?: AbortSignal): Promise<AdminUserPage> {
  const params = new URLSearchParams(
    Object.entries(query).filter(([, v]) => v !== null).map(([k, v]) => [k, String(v)]),
  )
  const res = await apiRequest<AdminUserPage>(`/admin/users?${params}`, { auth: true, signal })
  return res.data!
}

export async function updateAdminUser(
  id: string,
  input: AdminUserProfileInput & { role?: UserRole },
): Promise<AdminUser> {
  const res = await apiRequest<AdminUser>(`/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(input),
  })
  return res.data!
}

export async function changeAdminUserLifecycle(id: string, action: LifecycleAction): Promise<AdminUser> {
  const res = await apiRequest<AdminUser>(`/admin/users/${encodeURIComponent(id)}/${action}`, {
    method: 'POST',
    auth: true,
  })
  return res.data!
}
