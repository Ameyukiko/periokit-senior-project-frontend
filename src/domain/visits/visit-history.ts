import type { Visit } from '@/services/api/visit.api'

export interface VisitFilters {
  phase: string
  date: string | null
}

export interface VisitComparison {
  anchorId: string | null
  secondId: string | null
}

export function sortVisits(visits: Visit[], oldestFirst = false): Visit[] {
  const direction = oldestFirst ? 1 : -1
  return [...visits].sort((a, b) =>
    direction * (
      new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime() ||
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
      a.id.localeCompare(b.id)
    ),
  )
}

export function filterVisits(visits: Visit[], filters: VisitFilters, searchInput: string): Visit[] {
  const search = searchInput.trim().toLowerCase()
  const matches = visits.filter(visit =>
    (!filters.phase || visit.phase === filters.phase) &&
    (!search || [visit.visitDate, visit.phase, visit.doctorName ?? '']
      .some(value => value.toLowerCase().includes(search))),
  )
  return sortVisits(matches, filters.date === 'date_asc')
}

export function selectVisitForComparison(
  selection: VisitComparison,
  visit: Visit | undefined,
): VisitComparison {
  if (!visit?.hasChart) return selection
  if (selection.anchorId === visit.id) {
    return { anchorId: selection.secondId, secondId: null }
  }
  if (selection.secondId === visit.id) {
    return { ...selection, secondId: null }
  }
  if (!selection.anchorId) return { anchorId: visit.id, secondId: null }
  if (!selection.secondId) return { ...selection, secondId: visit.id }
  return selection
}
