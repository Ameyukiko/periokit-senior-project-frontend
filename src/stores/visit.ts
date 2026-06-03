import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Visit } from '@/services/api/visit.api'

export const useVisitStore = defineStore('visit', () => {
  const activeVisitId = ref<string | null>(null)
  const visits = ref<Visit[]>([])

  function setActiveVisit(visitId: string | null) {
    activeVisitId.value = visitId
  }

  function clearVisits() {
    visits.value = []
    activeVisitId.value = null
  }

  // Remove a visit tab from the local strip (UI only — does not delete the
  // visit on the backend). If the closed tab was active, the active visit is
  // moved to the neighbouring tab. Returns the new active visit id (or null
  // when no tabs remain).
  function removeVisit(visitId: string): string | null {
    const idx = visits.value.findIndex(v => v.id === visitId)
    if (idx === -1) return activeVisitId.value

    visits.value.splice(idx, 1)

    if (activeVisitId.value === visitId) {
      const neighbour = visits.value[idx] ?? visits.value[idx - 1] ?? null
      activeVisitId.value = neighbour?.id ?? null
    }

    return activeVisitId.value
  }

  async function loadVisits(patientId: string) {
    const { visitApi } = await import('@/services/api/visit.api')
    visits.value = await visitApi.getByPatient(patientId)
  }

  async function createVisit(patientId: string, visitDate: string, phase: string) {
    const { visitApi } = await import('@/services/api/visit.api')
    const newVisit = await visitApi.createVisit(patientId, visitDate, phase)

    // Add to visits array and set as active
    visits.value.push(newVisit)
    activeVisitId.value = newVisit.id

    return newVisit
  }

  return {
    activeVisitId,
    visits,
    setActiveVisit,
    clearVisits,
    removeVisit,
    loadVisits,
    createVisit,
  }
})
