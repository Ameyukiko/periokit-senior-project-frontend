import { ROLE_LABELS, type AdminUser, type AdminUserProfileInput, type LifecycleAction, type UserRole } from './admin-users.types'

export type ConfirmChange =
  | { kind: 'role'; role: UserRole; input: AdminUserProfileInput & { role?: UserRole } }
  | { kind: 'lifecycle'; action: LifecycleAction }

export type ConfirmTone = 'amber' | 'emerald' | 'red' | 'blue'

export interface PendingConfirm {
  user: AdminUser
  change: ConfirmChange
  /** Key into the dialog's icon map. */
  icon: LifecycleAction | 'role'
  tone: ConfirmTone
  title: string
  message: string
  confirmText: string
}

const LIFECYCLE_COPY: Record<LifecycleAction, { verb: string; text: string; tone: ConfirmTone }> = {
  deactivate: {
    verb: 'Deactivate',
    text: 'They can no longer sign in. Their patients and visits are kept and the account can be reactivated later.',
    tone: 'amber',
  },
  reactivate: { verb: 'Reactivate', text: 'They will be able to sign in again.', tone: 'emerald' },
  delete: {
    verb: 'Delete',
    text: 'The account is hidden and can no longer sign in. Their records are kept, and it can be restored from the Deleted filter.',
    tone: 'red',
  },
  restore: {
    verb: 'Restore',
    text: 'The account comes back as Deactivated. Reactivate it when they should be able to sign in again.',
    tone: 'blue',
  },
}

/** Builds plain-text confirmation copy; never interpolated as HTML. */
export function confirmationFor(user: AdminUser, change: ConfirmChange): PendingConfirm {
  const name = `${user.firstName} ${user.lastName}`.trim()
  if (change.kind === 'role') {
    return {
      user,
      change,
      icon: 'role',
      tone: 'blue',
      title: `Change ${name}'s role?`,
      message: `${ROLE_LABELS[user.role]} → ${ROLE_LABELS[change.role]}. This changes what they can access immediately.`,
      confirmText: 'Change role',
    }
  }
  const copy = LIFECYCLE_COPY[change.action]
  return {
    user,
    change,
    icon: change.action,
    tone: copy.tone,
    title: `${copy.verb} ${name}?`,
    message: copy.text,
    confirmText: copy.verb,
  }
}
