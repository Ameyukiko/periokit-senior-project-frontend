import { describe, expect, it } from 'vitest'
import { profileMenuItems } from './profile-menu'

describe('profileMenuItems', () => {
  it.each(['admin', 'super_admin'])('shows Admin Dashboard to %s', (role) => {
    expect(profileMenuItems(role, '/patients')).toEqual(['admin-dashboard', 'sign-out'])
  })

  it.each(['dentist', undefined])('hides Admin Dashboard from %s', (role) => {
    expect(profileMenuItems(role, '/patients')).toEqual(['sign-out'])
  })

  it('offers the way back to the dentist workspace on admin pages', () => {
    expect(profileMenuItems('super_admin', '/admin')).toEqual(['dentist-workspace', 'sign-out'])
  })
})
