import { computed, type Ref } from 'vue'
import type { FilterValues } from '@/components/common/filter.types'
import type { Visit } from '@/services/api/visit.api'

export function useVisitFilters(options: {
  visits: Ref<Visit[]>
  searchInput: Ref<string>
  filterValues: Ref<FilterValues>
}) {
  const filteredVisits = computed(() => {
    let result = [...options.visits.value]

    const phase = options.filterValues.value.phase
    if (typeof phase === 'string' && phase) {
      result = result.filter(visit => visit.phase === phase)
    }

    if (options.searchInput.value) {
      const search = options.searchInput.value.toLowerCase()
      result = result.filter(visit =>
        visit.visitDate.toLowerCase().includes(search) ||
        visit.phase.toLowerCase().includes(search) ||
        visit.doctorName?.toLowerCase().includes(search)
      )
    }

    const sortOrder = options.filterValues.value.date
    if (sortOrder === 'date_asc') {
      result.sort(
        (a, b) =>
          new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime() ||
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
          a.id.localeCompare(b.id)
      )
    } else {
      result.sort(
        (a, b) =>
          new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime() ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
          b.id.localeCompare(a.id)
      )
    }

    return result
  })

  return {
    filteredVisits,
  }
}
