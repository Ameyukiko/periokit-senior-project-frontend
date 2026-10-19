import { isPrivileged } from './admin-users.types'

export type ProfileMenuItem = 'admin-dashboard' | 'dentist-workspace' | 'sign-out'

/** Admin Dashboard is UX-only for privileged roles; the backend still authorizes /admin data. */
export function profileMenuItems(role: string | undefined, path: string): ProfileMenuItem[] {
  if (path.startsWith('/admin')) return ['dentist-workspace', 'sign-out']
  return isPrivileged(role) ? ['admin-dashboard', 'sign-out'] : ['sign-out']
}
