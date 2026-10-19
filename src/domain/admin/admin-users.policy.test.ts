import { describe, expect, it } from 'vitest'
import { permissionsFor, type Actor } from './admin-users.policy'
import type { AdminUser, UserRole } from './admin-users.types'

const user = (id: string, role: UserRole): AdminUser => ({
  id, role, firstName: 'A', lastName: 'B', email: `${id}@x.test`, studentId: null,
  status: 'active', createdAt: '2026-01-01', lastSignInAt: null,
})
const admin: Actor = { id: 'me', role: 'admin' }
const superAdmin: Actor = { id: 'me', role: 'super_admin' }

describe('permissionsFor', () => {
  it.each<[Actor, UserRole, [boolean, boolean, boolean]]>([
    [admin, 'dentist', [true, false, true]],
    [admin, 'admin', [false, false, false]],
    [admin, 'super_admin', [false, false, false]],
    [superAdmin, 'dentist', [true, true, true]],
    [superAdmin, 'admin', [true, true, true]],
    [superAdmin, 'super_admin', [true, true, true]],
  ])('%o on %s', (actor, role, [edit, changeRole, lifecycle]) => {
    const p = permissionsFor(actor, user('other', role))
    expect([p.canEditProfile, p.canChangeRole, p.canChangeLifecycle]).toEqual([edit, changeRole, lifecycle])
  })

  it.each([admin, superAdmin])('self: profile only, with reasons (%o)', (actor) => {
    const p = permissionsFor(actor, user('me', actor.role))
    expect(p).toMatchObject({ isSelf: true, canEditProfile: true, canChangeRole: false, canChangeLifecycle: false })
    expect(p.roleReason).toMatch(/own role/)
    expect(p.lifecycleReason).toMatch(/own account/)
  })

  it('explains why a normal admin cannot change roles', () => {
    expect(permissionsFor(admin, user('d', 'dentist')).roleReason).toMatch(/Super Admin/)
  })

  it('prefers API capabilities but still blocks self role/lifecycle', () => {
    const caps = { canEditProfile: false, canChangeRole: false, canChangeLifecycle: true }
    expect(permissionsFor(superAdmin, { ...user('x', 'dentist'), capabilities: caps }).canEditProfile).toBe(false)
    const self = permissionsFor(superAdmin, { ...user('me', 'super_admin'), capabilities: { ...caps, canChangeRole: true } })
    expect(self.canChangeRole).toBe(false)
    expect(self.canChangeLifecycle).toBe(false)
  })
})
