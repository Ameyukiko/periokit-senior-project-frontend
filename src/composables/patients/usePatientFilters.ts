import { computed, type Ref } from 'vue'
import type { FilterValues } from '@/components/common/filter.types'
import type { Patient } from '@/services/api/patient.api'

export function usePatientFilters(options: {
  patients: Ref<Patient[]>
  filterValues: Ref<FilterValues>
}) {
  const sortedPatients = computed(() => {
    const result = [...options.patients.value]
    const dateSort = options.filterValues.value.date
    const nameSort = options.filterValues.value.name

    result.sort((a, b) => {
      if (dateSort) {
        const dateA = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0
        const dateB = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0
        const cmp = dateSort === 'date_asc' ? dateA - dateB : dateB - dateA
        if (cmp !== 0) return cmp
      }

      if (nameSort) {
        const cmp = nameSort === 'name_asc'
          ? a.firstName.localeCompare(b.firstName)
          : b.firstName.localeCompare(a.firstName)
        if (cmp !== 0) return cmp
      }

      const dateA = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0
      const dateB = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0
      return dateB - dateA
    })

    return result
  })

  return {
    sortedPatients,
  }
}
