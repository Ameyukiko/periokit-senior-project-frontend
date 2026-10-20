import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import type { AdminUserQuery, SortDir, SortField, StatusTab, UserRole } from './admin-users.types'

export const DEFAULT_QUERY: AdminUserQuery = {
  status: 'all',
  search: '',
  role: 'all',
  sort: null,
  dir: 'asc',
  page: 1,
  pageSize: 10,
}

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback

const STATUSES: StatusTab[] = ['all', 'active', 'inactive', 'deleted']
const ROLES: (UserRole | 'all')[] = ['all', 'dentist', 'admin', 'super_admin']
const SORTS: SortField[] = ['studentId', 'createdAt']

/** Reads table state from the URL, falling back to defaults for anything invalid. */
export function parseAdminQuery(q: LocationQuery): AdminUserQuery {
  const page = Number(q.page)
  return {
    status: pick(q.status, STATUSES, DEFAULT_QUERY.status),
    search: typeof q.q === 'string' ? q.q.trim() : '',
    role: pick(q.role, ROLES, DEFAULT_QUERY.role),
    sort: SORTS.includes(q.sort as SortField) ? (q.sort as SortField) : null,
    dir: pick(q.dir, ['asc', 'desc'] as const, DEFAULT_QUERY.dir),
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: DEFAULT_QUERY.pageSize,
  }
}

/** Writes only non-default values so URLs stay short. */
export function serializeAdminQuery(q: AdminUserQuery): LocationQueryRaw {
  const out: LocationQueryRaw = {}
  if (q.status !== DEFAULT_QUERY.status) out.status = q.status
  if (q.search) out.q = q.search
  if (q.role !== DEFAULT_QUERY.role) out.role = q.role
  if (q.sort) {
    out.sort = q.sort
    if (q.dir !== DEFAULT_QUERY.dir) out.dir = q.dir
  }
  if (q.page !== 1) out.page = String(q.page)
  return out
}

/** Column header click cycles ascending → descending → off. */
export function nextSort(q: AdminUserQuery, field: SortField): { sort: SortField | null; dir: SortDir } {
  if (q.sort !== field) return { sort: field, dir: 'asc' }
  if (q.dir === 'asc') return { sort: field, dir: 'desc' }
  return { sort: null, dir: 'asc' }
}

/** Filter popover state counts toward the badge on the Filter button. */
export const activeFilterCount = (q: AdminUserQuery) => Number(q.role !== DEFAULT_QUERY.role)
