import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useVisitStore = defineStore('visit', () => {
  const activeVisitId = ref<string | null>(null)

  function setActiveVisit(visitId: string | null) {
    activeVisitId.value = visitId
  }

  async function createVisit(patientId: string, visitDate: string, phase: string) {
    // Mock implementation for creating a visit since backend may not be ready
    const newVisitId = `visit-${Date.now()}`
    activeVisitId.value = newVisitId
    return { id: newVisitId, patientId, visitDate, phase }
  }

  const visits = ref<any[]>([])

  async function loadVisits(patientId: string) {
    const { visitApi } = await import('@/services/api/visit.api')
    visits.value = await visitApi.getByPatient(patientId)
  }

  return {
    activeVisitId,
    visits,
    setActiveVisit,
    createVisit,
    loadVisits
  }
})
