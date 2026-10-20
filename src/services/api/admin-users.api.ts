import { apiRequest } from './http'
import type {
  AdminUser,
  AdminUserPage,
  AdminUserProfileInput,
  AdminUserQuery,
  LifecycleAction,
  StatusTab,
  UserRole,
} from '@/domain/admin/admin-users.types'

// Shapes returned by the backend admin-users module (src/modules/admin-users).
type ApiAdminUser = {
  userId: string
  email: string
  firstName: string
  lastName: string
  studentId: number | null
  role: UserRole
  isActive: boolean
  isDeleted: boolean
  deletedAt: string | null
  createdAt: string
  lastSignInAt: string | null
}

type ApiAdminUserPage = {
  users: ApiAdminUser[]
  total: number
  counts: { all: number; active: number; deactivated: number; deleted: number }
}

const toAdminUser = (u: ApiAdminUser): AdminUser => ({
  id: u.userId,
  firstName: u.firstName,
  lastName: u.lastName,
  email: u.email,
  studentId: u.studentId === null ? null : String(u.studentId),
  role: u.role,
  status: u.isDeleted ? 'deleted' : u.isActive ? 'active' : 'inactive',
  createdAt: u.createdAt,
  lastSignInAt: u.lastSignInAt,
  deletedAt: u.deletedAt,
})

const API_STATUS: Record<StatusTab, string> = {
  all: 'all',
  active: 'active',
  inactive: 'deactivated',
  deleted: 'deleted',
}

function toSearchParams(query: AdminUserQuery): URLSearchParams {
  const params = new URLSearchParams({
    status: API_STATUS[query.status],
    sortDirection: query.dir,
    page: String(query.page),
    pageSize: String(query.pageSize),
  })
  if (query.search.trim()) params.set('search', query.search.trim())
  if (query.role !== 'all') params.set('role', query.role)
  if (query.sort) params.set('sortBy', query.sort)
  return params
}

export async function listAdminUsers(query: AdminUserQuery, signal?: AbortSignal): Promise<AdminUserPage> {
  const res = await apiRequest<ApiAdminUserPage>(`/admin/users?${toSearchParams(query)}`, { auth: true, signal })
  const { users, total, counts } = res.data!
  return {
    items: users.map(toAdminUser),
    total,
    totals: { all: counts.all, active: counts.active, inactive: counts.deactivated, deleted: counts.deleted },
  }
}

export async function updateAdminUser(
  id: string,
  input: AdminUserProfileInput & { role?: UserRole },
): Promise<AdminUser> {
  const res = await apiRequest<ApiAdminUser>(`/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ ...input, studentId: input.studentId ? Number(input.studentId) : null }),
  })
  return toAdminUser(res.data!)
}

export async function changeAdminUserLifecycle(id: string, action: LifecycleAction): Promise<AdminUser> {
  const res = await apiRequest<ApiAdminUser>(`/admin/users/${encodeURIComponent(id)}/${action}`, {
    method: 'POST',
    auth: true,
  })
  return toAdminUser(res.data!)
}
