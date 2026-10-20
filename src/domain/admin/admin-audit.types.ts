import type { UserRole } from './admin-users.types'

export type AuditAction = 'profile_updated' | 'role_changed' | 'deactivated' | 'reactivated' | 'deleted' | 'restored'

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  profile_updated: 'Profile updated',
  role_changed: 'Role changed',
  deactivated: 'Deactivated',
  reactivated: 'Reactivated',
  deleted: 'Deleted',
  restored: 'Restored',
}

export interface AuditUser {
  id: string
  firstName: string
  lastName: string
  email: string
}

/** Snapshot of the target user stored with each audit entry. */
export type AuditSnapshot = Partial<{ firstName: string; lastName: string; studentId: number | null; role: UserRole }>

export interface AuditLog {
  id: string
  action: AuditAction
  actor: AuditUser
  actorRole: UserRole
  target: AuditUser
  roleBefore: UserRole | null
  roleAfter: UserRole | null
  before: AuditSnapshot
  after: AuditSnapshot
  createdAt: string
}

export interface AuditLogQuery {
  search: string
  action: AuditAction | 'all'
  page: number
  pageSize: number
}

export interface AuditLogPage {
  items: AuditLog[]
  total: number
}
