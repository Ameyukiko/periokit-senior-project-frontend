import { describe, expect, it } from 'vitest'
import { DEFAULT_QUERY, activeFilterCount, nextSort, parseAdminQuery, serializeAdminQuery } from './admin-users.query'
import { confirmationFor } from './admin-users.confirm'
import type { AdminUser } from './admin-users.types'

describe('admin query URL state', () => {
  it('falls back to defaults for missing or invalid values', () => {
    expect(parseAdminQuery({ role: 'root', page: '-2', sort: 'x' })).toEqual(DEFAULT_QUERY)
  })

  it('round-trips non-default values', () => {
    const q = { ...DEFAULT_QUERY, status: 'inactive', search: 'ploy', role: 'super_admin', lastSignIn: 'never', sort: 'studentId', dir: 'desc', page: 3 } as const
    expect(serializeAdminQuery(q)).toEqual({ status: 'inactive', q: 'ploy', role: 'super_admin', signin: 'never', sort: 'studentId', dir: 'desc', page: '3' })
    expect(parseAdminQuery(serializeAdminQuery(q) as Record<string, string>)).toEqual(q)
  })

  it('trims search and omits defaults', () => {
    expect(parseAdminQuery({ q: '  a  ' }).search).toBe('a')
    expect(serializeAdminQuery(DEFAULT_QUERY)).toEqual({})
  })
})

describe('nextSort', () => {
  it('cycles ascending, descending, off', () => {
    const a = { ...DEFAULT_QUERY, ...nextSort(DEFAULT_QUERY, 'createdAt') }
    expect(a).toMatchObject({ sort: 'createdAt', dir: 'asc' })
    const d = { ...a, ...nextSort(a, 'createdAt') }
    expect(d).toMatchObject({ sort: 'createdAt', dir: 'desc' })
    expect(nextSort(d, 'createdAt')).toEqual({ sort: null, dir: 'asc' })
    expect(nextSort(d, 'studentId')).toEqual({ sort: 'studentId', dir: 'asc' })
  })

  it('counts active popover filters', () => {
    expect(activeFilterCount(DEFAULT_QUERY)).toBe(0)
    expect(activeFilterCount({ ...DEFAULT_QUERY, role: 'admin', lastSignIn: 'stale' })).toBe(2)
  })
})

describe('confirmationFor', () => {
  const u = { id: '1', firstName: '<b>Eve</b>', lastName: 'X', email: 'e@x.test', role: 'admin', status: 'active' } as AdminUser

  it('describes role changes in plain text', () => {
    const c = confirmationFor(u, { kind: 'role', role: 'dentist', input: { firstName: '', lastName: '', studentId: null, role: 'dentist' } })
    expect(c.title).toBe("Change <b>Eve</b> X's role?")
    expect(c.message).toContain('Admin → Dentist')
  })

  it('uses the prototype tone and copy per action', () => {
    expect(confirmationFor(u, { kind: 'lifecycle', action: 'delete' })).toMatchObject({ title: 'Delete <b>Eve</b> X?', confirmText: 'Delete', tone: 'red' })
    expect(confirmationFor(u, { kind: 'lifecycle', action: 'deactivate' }).tone).toBe('amber')
    expect(confirmationFor(u, { kind: 'lifecycle', action: 'restore' }).message).toMatch(/Deactivated/)
  })
})
