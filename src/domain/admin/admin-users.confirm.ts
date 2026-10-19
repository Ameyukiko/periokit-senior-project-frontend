import { ROLE_LABELS, type AdminUser, type AdminUserProfileInput, type LifecycleAction, type UserRole } from './admin-users.types'

export type ConfirmChange =
  | { kind: 'role'; role: UserRole; input: AdminUserProfileInput & { role?: UserRole } }
  | { kind: 'lifecycle'; action: LifecycleAction }

export interface PendingConfirm {
  user: AdminUser
  change: ConfirmChange
  title: string
  message: string
  confirmText: string
  danger: boolean
}

const LIFECYCLE_COPY: Record<LifecycleAction, { title: string; verb: string; effect: string; danger: boolean }> = {
  deactivate: { title: 'Deactivate account', verb: 'Deactivate', effect: 'They will not be able to sign in until reactivated.', danger: true },
  reactivate: { title: 'Reactivate account', verb: 'Reactivate', effect: 'They will be able to sign in again.', danger: false },
  delete: { title: 'Delete account', verb: 'Delete', effect: 'The account is soft-deleted and can be restored later.', danger: true },
  restore: { title: 'Restore account', verb: 'Restore', effect: 'The account will be active again.', danger: false },
}

/** Builds plain-text confirmation copy; never interpolated as HTML. */
export function confirmationFor(user: AdminUser, change: ConfirmChange): PendingConfirm {
  const name = `${user.firstName} ${user.lastName}`.trim()
  if (change.kind === 'role') {
    return {
      user,
      change,
      title: 'Change role',
      message: `Change ${name} from ${ROLE_LABELS[user.role]} to ${ROLE_LABELS[change.role]}?\nThis changes what they can access immediately.`,
      confirmText: 'Change role',
      danger: change.role === 'dentist' || change.role === 'super_admin',
    }
  }
  const copy = LIFECYCLE_COPY[change.action]
  return {
    user,
    change,
    title: copy.title,
    message: `${copy.verb} ${name} (${user.email})?\n${copy.effect}`,
    confirmText: copy.verb,
    danger: copy.danger,
  }
}
