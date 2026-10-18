import { describe, expect, it } from 'vitest'
import { filterVisits, selectVisitForComparison, sortVisits } from '@/domain/visits/visit-history'
import type { Visit } from '@/services/api/visit.api'

const visit = (id: string, visitDate: string, overrides: Partial<Visit> = {}): Visit => ({
  id,
  patientId: 'patient',
  visitDate,
  phase: 'before_hygienic',
  doctorName: 'Dr Smith',
  studentId: null,
  status: 'complete',
  hasChart: true,
  createdAt: `${visitDate}T09:00:00Z`,
  ...overrides,
})

describe('visit history', () => {
  const visits = [
    visit('a', '2026-01-01'),
    visit('b', '2026-02-01', { phase: 'after_hygienic', doctorName: null }),
    visit('c', '2026-02-01', { createdAt: '2026-02-02T09:00:00Z' }),
  ]

  it('sorts without changing the source list and keeps tie ordering reversible', () => {
    expect(sortVisits(visits).map(v => v.id)).toEqual(['c', 'b', 'a'])
    expect(sortVisits(visits, true).map(v => v.id)).toEqual(['a', 'b', 'c'])
    expect(visits.map(v => v.id)).toEqual(['a', 'b', 'c'])
  })

  it('combines phase, search, and date ordering', () => {
    expect(filterVisits(visits, { phase: 'before_hygienic', date: 'date_asc' }, '  dr smith ')
      .map(v => v.id)).toEqual(['a', 'c'])
    expect(filterVisits(visits, { phase: '', date: null }, 'after').map(v => v.id))
      .toEqual(['b'])
  })

  it('selects, deselects, and promotes visits while rejecting charts that do not exist', () => {
    const empty = { anchorId: null, secondId: null }
    const first = selectVisitForComparison(empty, visits[0])
    const pair = selectVisitForComparison(first, visits[1])
    expect(pair).toEqual({ anchorId: 'a', secondId: 'b' })
    expect(selectVisitForComparison(pair, visits[2])).toEqual(pair)
    expect(selectVisitForComparison(pair, visits[0]))
      .toEqual({ anchorId: 'b', secondId: null })
    expect(selectVisitForComparison(pair, visit('missing', '2026-03-01', { hasChart: false })))
      .toEqual(pair)
  })
})
