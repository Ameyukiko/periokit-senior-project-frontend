import { ref } from 'vue'
import { usePeriodontalChartStore } from '@/stores/periodontal-chart'
import { useVisitStore } from '@/stores/visit'
import { useNotificationStore } from '@/stores/notification'
import { useDiagnosisStore, resolveDiagnosisKey } from '@/stores/diagnosis'
import { useXrayBoardStore, xrayBoardKey } from '@/stores/xray-board'

/**
 * The one Save this visit has. The chart page and the Diagnosis page are two
 * views of the same visit — the diagnosis is saved inside the chart mutation,
 * and the X-ray board hangs off the same visit id — so pressing Save on either
 * writes all three. Kept here rather than on the chart page so the Diagnosis
 * page cannot drift into saving something slightly different.
 */
export function useVisitSave() {
  const chartStore = usePeriodontalChartStore()
  const visitStore = useVisitStore()
  const notifStore = useNotificationStore()
  const diagnosisStore = useDiagnosisStore()
  const xrayStore = useXrayBoardStore()

  const isSaving = ref(false)

  /** Everything the backend refuses a chart without, said before it is asked. */
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

  /**
   * Writes the visit and moves everything keyed by its id onto the id the
   * backend settled on — a draft saved for the first time is minted a real one.
   * Returns those ids so the caller can put them in its own URL, or null when
   * the save failed (the notification has already been shown).
   */
  const saveVisit = async () => {
    if (isSaving.value) return null
    isSaving.value = true
    try {
      const oldDiagnosisKey = resolveDiagnosisKey(
        visitStore.activeVisitId,
        chartStore.currentPatientId,
      )

      await chartStore.saveToBackend(true)

      // Saved visits open read-only; this one has just become a saved visit.
      chartStore.editMode = false

      const visitId = visitStore.activeVisitId
      const patientId = chartStore.currentPatientId

      const newDiagnosisKey = resolveDiagnosisKey(visitId, patientId)
      diagnosisStore.rekey(oldDiagnosisKey, newDiagnosisKey)
      diagnosisStore.commitSaved(newDiagnosisKey)

      // The draft visit now has a real id — move its X-ray board along with it,
      // and with it the visit its films upload to.
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
