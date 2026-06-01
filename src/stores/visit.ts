import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useVisitStore = defineStore('visit', () => {
  const activeVisitId = ref<string | null>(null)

  function setActiveVisit(visitId: string | null) {
    activeVisitId.value = visitId
  }

  return {
    activeVisitId,
    setActiveVisit
  }
})
