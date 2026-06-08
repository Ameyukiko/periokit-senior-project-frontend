import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Visit } from '@/services/api/visit.api'
import { registerSessionClearListener } from '@/services/session'

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

  // Add a local draft tab immediately so the user sees the new visit in the
  // strip before saving. The draft (id='new') is replaced by the real visit
  // when loadVisits refreshes after a successful save.
  function addDraftVisit(patientId: string, visitDate: string, phase: string) {
    const existingIdx = visits.value.findIndex(v => v.id === 'new')
    if (existingIdx !== -1) visits.value.splice(existingIdx, 1)
    visits.value.push({
      id: 'new',
      patientId,
      visitDate,
      phase,
      doctorName: null,
      studentId: null,
      status: 'draft',
      hasChart: false,
    })
    activeVisitId.value = 'new'
  }

  return {
    activeVisitId,
    visits,
    setActiveVisit,
    clearVisits,
    removeVisit,
    loadVisits,
    addDraftVisit,
  }
})

registerSessionClearListener(() => {
  const store = useVisitStore()
  store.clearVisits()
})

