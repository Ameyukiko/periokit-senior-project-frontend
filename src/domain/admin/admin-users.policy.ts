import type { AdminUser, UserCapabilities, UserRole } from './admin-users.types'

export interface Actor {
  id: string
  role: UserRole
}

export interface UserPermissions extends UserCapabilities {
  isSelf: boolean
  /** Why the role selector is disabled, if it is. */
  roleReason: string | null
  /** Why lifecycle actions are disabled, if they are. */
  lifecycleReason: string | null
}

/** UX-only mirror of the backend matrix; the API remains authoritative. */
function localCapabilities(actor: Actor, target: AdminUser): UserCapabilities {
  if (actor.role === 'super_admin') return { canEditProfile: true, canChangeRole: true, canChangeLifecycle: true }
  if (actor.role === 'admin' && target.role === 'dentist') {
    return { canEditProfile: true, canChangeRole: false, canChangeLifecycle: true }
  }
  return { canEditProfile: false, canChangeRole: false, canChangeLifecycle: false }
}

export function permissionsFor(actor: Actor, target: AdminUser): UserPermissions {
  const isSelf = actor.id === target.id
  const base = target.capabilities ?? localCapabilities(actor, target)
  const caps: UserCapabilities = isSelf
    ? { canEditProfile: true, canChangeRole: false, canChangeLifecycle: false }
    : base

  let roleReason: string | null = null
  if (isSelf) roleReason = 'You cannot change your own role.'
  else if (!caps.canChangeRole) roleReason = 'Only a Super Admin can change roles.'

  let lifecycleReason: string | null = null
  if (isSelf) lifecycleReason = 'You cannot deactivate or delete your own account.'
  else if (!caps.canChangeLifecycle) lifecycleReason = 'Only a Super Admin can manage privileged accounts.'

  return { ...caps, isSelf, roleReason, lifecycleReason }
}
