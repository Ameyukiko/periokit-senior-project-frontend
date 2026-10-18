import { ref } from 'vue'
import { useDiagnosisStore } from '@/stores/diagnosis'
import { usePeriodontalChartStore } from '@/stores/periodontal-chart'
import { useVisitStore } from '@/stores/visit'
import { useVisitLoad } from '@/composables/useVisitLoad'

export type DiagnosisLoadStatus = 'loading' | 'loaded' | 'error'






export function useDiagnosisVisitContext() {
  const chartStore = usePeriodontalChartStore()
  const visitStore = useVisitStore()
  const diagnosisStore = useDiagnosisStore()
  const { loadVisit } = useVisitLoad()
  const loadStatus = ref<DiagnosisLoadStatus>('loading')
  let requestId = 0

  chartStore.initializeChart()

  async function open(visitId: string | null, patientId: string | null) {
    const currentRequest = ++requestId
    diagnosisStore.openFor(visitId, patientId)

    const contextAlreadyOpen =
      visitStore.activeVisitId === visitId &&
      (!patientId || chartStore.currentPatientId === patientId)
    if (contextAlreadyOpen) {
      loadStatus.value = 'loaded'
      return
    }

    loadStatus.value = 'loading'

    try {
      if (visitId === 'new') {

        chartStore.resetChart()
        visitStore.setActiveVisit('new')
        if (patientId) await chartStore.loadPatientById(patientId)
      } else if (visitId) {


        visitStore.setActiveVisit(visitId)
        if (patientId && chartStore.currentPatientId !== patientId) {
          await chartStore.loadPatientById(patientId)
        }
        if (currentRequest !== requestId) return
        await loadVisit(visitId)
      } else {
        visitStore.setActiveVisit(null)
      }

      if (currentRequest === requestId) loadStatus.value = 'loaded'
    } catch (error) {
      if (currentRequest !== requestId) return
      console.error('Failed to load visit for diagnosis:', error)
      loadStatus.value = 'error'
    }
  }

  return { loadStatus, open }
}
