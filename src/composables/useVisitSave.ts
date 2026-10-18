import { ref } from 'vue'
import { usePeriodontalChartStore } from '@/stores/periodontal-chart'
import { useVisitStore } from '@/stores/visit'
import { useNotificationStore } from '@/stores/notification'
import { useDiagnosisStore, resolveDiagnosisKey } from '@/stores/diagnosis'
import { useXrayBoardStore, xrayBoardKey } from '@/stores/xray-board'
import { toDiagnosisInputDto } from '@/domain/diagnosis/diagnosis.api-mapper'








export function useVisitSave() {
  const chartStore = usePeriodontalChartStore()
  const visitStore = useVisitStore()
  const notifStore = useNotificationStore()
  const diagnosisStore = useDiagnosisStore()
  const xrayStore = useXrayBoardStore()

  const isSaving = ref(false)


  const validate = () => {
    if (!chartStore.patientInfo.hn) {
      notifStore.error('Please enter HN before saving')
      return false
    }
    if (!chartStore.patientInfo.patientName) {
      notifStore.error('Please enter patient name before saving')
      return false
    }
    if (!chartStore.hasChartData) {
      notifStore.error('Please enter clinical chart data before saving')
      return false
    }
    return true
  }







  const saveVisit = async () => {
    if (isSaving.value) return null
    isSaving.value = true
    try {
      const oldDiagnosisKey = resolveDiagnosisKey(
        visitStore.activeVisitId,
        chartStore.currentPatientId,
      )

      await chartStore.saveToBackend(toDiagnosisInputDto(diagnosisStore.inputs), true)


      chartStore.editMode = false

      const visitId = visitStore.activeVisitId
      const patientId = chartStore.currentPatientId

      const newDiagnosisKey = resolveDiagnosisKey(visitId, patientId)
      diagnosisStore.rekey(oldDiagnosisKey, newDiagnosisKey)
      diagnosisStore.commitSaved(newDiagnosisKey)



      await xrayStore.rekeyBoard(xrayBoardKey(patientId, visitId), visitId)

      return { visitId, patientId }
    } catch (error) {
      console.error('Failed to save chart:', error)
      return null
    } finally {
      isSaving.value = false
    }
  }

  return { isSaving, validate, saveVisit }
}
