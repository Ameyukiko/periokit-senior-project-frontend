// In-memory stand-in for the admin users REST API until the backend lands.
// It enforces the same permission matrix so Forbidden/Conflict flows can be exercised.
import { ApiError } from './http'
import { getStoredUserProfile } from '../token-storage'
import { permissionsFor, type Actor } from '@/domain/admin/admin-users.policy'
import {
  isPrivileged,
  type AdminUser,
  type AdminUserPage,
  type AdminUserProfileInput,
  type AdminUserQuery,
  type LifecycleAction,
  type StatusTab,
  type UserRole,
} from '@/domain/admin/admin-users.types'

const DAY = 86_400_000
const FIRST = ['Narin', 'Ploy', 'Krit', 'Mali', 'Tawan', 'Ananda', 'Chai', 'Dao', 'Fah', 'Kanya', 'Lek', 'Mint']
const LAST = ['Srisuk', 'Wongsa', 'Chaiyaporn', 'Thongdee', 'Rattana', 'Kittisak']
const ROLES: UserRole[] = ['dentist', 'dentist', 'dentist', 'dentist', 'admin', 'super_admin']

function seed(): AdminUser[] {
  const now = Date.now()
  return Array.from({ length: 42 }, (_, i) => {
    const role = ROLES[i % ROLES.length]
    return {
      id: `mock-${i + 1}`,
      firstName: FIRST[i % FIRST.length],
      lastName: LAST[i % LAST.length],
      email: `user${i + 1}@periokit.test`,
      studentId: role === 'dentist' ? String(6400000 + i * 37) : null,
      role,
      status: i % 11 === 5 ? 'inactive' : i % 13 === 7 ? 'deleted' : 'active',
      deletedAt: i % 13 === 7 ? new Date(now - (i % 20) * DAY).toISOString() : null,
      createdAt: new Date(now - (i * 9 + 3) * DAY).toISOString(),
      lastSignInAt: i % 7 === 3 ? null : new Date(now - ((i * 5) % 120) * DAY).toISOString(),
    }
  })
}

let users = seed()

export function resetMockUsers() {
  users = seed()
}

function actor(): Actor {
  const profile = getStoredUserProfile()
  if (!profile || !isPrivileged(profile.role)) throw new ApiError('Forbidden', 403)
  if (!users.some((u) => u.id === profile.id)) {
    users.unshift({
      id: profile.id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email,
      studentId: profile.student_id ?? null,
      role: profile.role,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastSignInAt: new Date().toISOString(),
    })
  }
  return { id: profile.id, role: profile.role }
}

function delay<T>(value: () => T, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    if (signal?.aborted) return abort()
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      try {
        resolve(value())
      } catch (e) {
        reject(e)
      }
    }, 250)
    signal?.addEventListener('abort', abort, { once: true })
  })
}

function matches(u: AdminUser, q: AdminUserQuery): boolean {
  const term = q.search.trim().toLowerCase()
  if (term) {
    const hay = [u.firstName, u.lastName, `${u.firstName} ${u.lastName}`, u.email, u.studentId ?? '']
    if (!hay.some((v) => v.toLowerCase().includes(term))) return false
  }
  if (q.role !== 'all' && u.role !== q.role) return false
  if (q.lastSignIn === 'never') return u.lastSignInAt === null
  if (q.lastSignIn !== 'any') {
    if (!u.lastSignInAt) return false
    const days = (Date.now() - Date.parse(u.lastSignInAt)) / DAY
    return q.lastSignIn === 'week' ? days <= 7 : days > 30
  }
  return true
}

// Blank student IDs and never-signed-in users always sort last.
function compare(a: AdminUser, b: AdminUser, q: AdminUserQuery): number {
  if (!q.sort) return 0
  const va = a[q.sort]
  const vb = b[q.sort]
  if (va === vb) return 0
  if (va === null) return 1
  if (vb === null) return -1
  return (va < vb ? -1 : 1) * (q.dir === 'asc' ? 1 : -1)
}

export function listAdminUsers(q: AdminUserQuery, signal?: AbortSignal): Promise<AdminUserPage> {
  return delay(() => {
    const me = actor()
    const filtered = users.filter((u) => matches(u, q))
    const totals: Record<StatusTab, number> = { all: 0, active: 0, inactive: 0, deleted: 0 }
    for (const u of filtered) {
      totals[u.status]++
      if (u.status !== 'deleted') totals.all++
    }
    const inTab = filtered.filter((u) => (q.status === 'all' ? u.status !== 'deleted' : u.status === q.status))
    const start = (q.page - 1) * q.pageSize
    const items = inTab
      .sort((a, b) => compare(a, b, q))
      .slice(start, start + q.pageSize)
      .map((u) => ({ ...u, capabilities: permissionsFor(me, u) }))
    return { items, total: inTab.length, totals }
  }, signal)
}

function find(id: string): AdminUser {
  const user = users.find((u) => u.id === id)
  if (!user) throw new ApiError('User not found', 404)
  return user
}

export function updateAdminUser(id: string, input: AdminUserProfileInput & { role?: UserRole }): Promise<AdminUser> {
  return delay(() => {
    const me = actor()
    const user = find(id)
    const perms = permissionsFor(me, user)
    if (!perms.canEditProfile) throw new ApiError('You do not have permission to edit this account', 403)
    if (input.role && input.role !== user.role && !perms.canChangeRole) {
      throw new ApiError('You do not have permission to change this role', 403)
    }
    if (input.studentId && users.some((u) => u.id !== id && u.studentId === input.studentId)) {
      throw new ApiError('Student ID is already used by another account', 409)
    }
    Object.assign(user, input, { role: input.role ?? user.role })
    return { ...user, capabilities: permissionsFor(me, user) }
  })
}

const TRANSITIONS: Record<LifecycleAction, { from: AdminUser['status']; to: AdminUser['status'] }> = {
  deactivate: { from: 'active', to: 'inactive' },
  reactivate: { from: 'inactive', to: 'active' },
  delete: { from: 'active', to: 'deleted' },
  // Restored accounts come back deactivated; reactivate separately.
  restore: { from: 'deleted', to: 'inactive' },
}

export function changeAdminUserLifecycle(id: string, action: LifecycleAction): Promise<AdminUser> {
  return delay(() => {
    const me = actor()
    const user = find(id)
    if (!permissionsFor(me, user).canChangeLifecycle) {
      throw new ApiError('You do not have permission to change this account', 403)
    }
    const t = TRANSITIONS[action]
    const allowed = action === 'delete' ? user.status !== 'deleted' : user.status === t.from
    if (!allowed) throw new ApiError('This account has already changed. Refresh and try again.', 409)
    user.status = t.to
    user.deletedAt = t.to === 'deleted' ? new Date().toISOString() : null
    return { ...user, capabilities: permissionsFor(me, user) }
  })
}
