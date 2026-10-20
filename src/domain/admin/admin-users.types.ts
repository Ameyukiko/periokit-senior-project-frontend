export type UserRole = 'dentist' | 'admin' | 'super_admin'
export type UserStatus = 'active' | 'inactive' | 'deleted'
export type StatusTab = 'all' | UserStatus
export type SortField = 'studentId' | 'createdAt'
export type SortDir = 'asc' | 'desc'

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  dentist: 'Dentist',
}

export const PRIVILEGED_ROLES: UserRole[] = ['admin', 'super_admin']

export interface UserCapabilities {
  canEditProfile: boolean
  canChangeRole: boolean
  canChangeLifecycle: boolean
}

export interface AdminUser {
  id: string
  firstName: string
  lastName: string
  email: string
  studentId: string | null
  role: UserRole
  status: UserStatus
  createdAt: string
  lastSignInAt: string | null
  deletedAt?: string | null
  /** Provided by the API when available; preferred over the local policy. */
  capabilities?: UserCapabilities
}

export interface AdminUserQuery {
  status: StatusTab
  search: string
  role: UserRole | 'all'
  /** null keeps the server's default order. */
  sort: SortField | null
  dir: SortDir
  page: number
  pageSize: number
}

export interface AdminUserPage {
  items: AdminUser[]
  total: number
  totals: Record<StatusTab, number>
}

export interface AdminUserProfileInput {
  firstName: string
  lastName: string
  studentId: string | null
}

export type LifecycleAction = 'deactivate' | 'reactivate' | 'delete' | 'restore'

export const isPrivileged = (role: string | undefined | null): role is UserRole =>
  PRIVILEGED_ROLES.includes(role as UserRole)
