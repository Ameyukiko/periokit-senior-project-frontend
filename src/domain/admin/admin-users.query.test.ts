import { describe, expect, it } from 'vitest'
import { DEFAULT_QUERY, parseAdminQuery, serializeAdminQuery } from './admin-users.query'
import { confirmationFor } from './admin-users.confirm'
import type { AdminUser } from './admin-users.types'

describe('admin query URL state', () => {
  it('falls back to defaults for missing or invalid values', () => {
    expect(parseAdminQuery({ role: 'root', page: '-2', sort: 'x' })).toEqual(DEFAULT_QUERY)
  })

  it('round-trips non-default values', () => {
    const q = { ...DEFAULT_QUERY, status: 'inactive', search: 'ploy', role: 'super_admin', lastSignIn: 'never', sort: 'studentId', dir: 'asc', page: 3 } as const
    expect(serializeAdminQuery(q)).toEqual({ status: 'inactive', q: 'ploy', role: 'super_admin', signin: 'never', sort: 'studentId', dir: 'asc', page: '3' })
    expect(parseAdminQuery(serializeAdminQuery(q) as Record<string, string>)).toEqual(q)
  })

  it('trims search and omits defaults', () => {
    expect(parseAdminQuery({ q: '  a  ' }).search).toBe('a')
    expect(serializeAdminQuery(DEFAULT_QUERY)).toEqual({})
  })
})

describe('confirmationFor', () => {
  const u = { id: '1', firstName: '<b>Eve</b>', lastName: 'X', email: 'e@x.test', role: 'admin', status: 'active' } as AdminUser

  it('describes role changes in plain text', () => {
    const c = confirmationFor(u, { kind: 'role', role: 'dentist', input: { firstName: '', lastName: '', studentId: null, role: 'dentist' } })
    expect(c.message).toContain('<b>Eve</b> X from Admin to Dentist')
    expect(c.danger).toBe(true)
  })

  it('marks destructive lifecycle actions', () => {
    expect(confirmationFor(u, { kind: 'lifecycle', action: 'delete' })).toMatchObject({ confirmText: 'Delete', danger: true })
    expect(confirmationFor(u, { kind: 'lifecycle', action: 'restore' }).danger).toBe(false)
  })
})
