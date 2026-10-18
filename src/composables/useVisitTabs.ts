import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { usePeriodontalChartStore } from '@/stores/periodontal-chart'
import { useVisitStore } from '@/stores/visit'
import { useNotificationStore } from '@/stores/notification'
import { useVisitLoad } from '@/composables/useVisitLoad'

export interface VisitTabsDeps {

  navigate: (to: RouteLocationRaw, mode?: 'push' | 'replace') => unknown

  guard: (proceed: () => unknown) => unknown

  enterNewVisitState: () => Promise<void>
}













export function useVisitTabs(deps: VisitTabsDeps) {
  const route = useRoute()
  const chartStore = usePeriodontalChartStore()
  const visitStore = useVisitStore()
  const notifStore = useNotificationStore()
  const { loadVisit } = useVisitLoad()
  const { currentPatientId } = storeToRefs(chartStore)
  const { visits, activeVisitId } = storeToRefs(visitStore)

  const showCloseTabWarning = ref(false)

  let pendingCloseVisitId: string | null = null


  const switchVisit = (visitId: string) => {
    if (visitId === activeVisitId.value) return
    deps.guard(() => doSwitchVisit(visitId))
  }

  const doSwitchVisit = async (visitId: string) => {
    visitStore.setActiveVisit(visitId)

    deps.navigate({
      name: 'chart',
      query: { ...route.query, visitId },
    })


    if (visitId === 'new') return

    try {
      await loadVisit(visitId)
    } catch (error) {
      console.error('Failed to load chart for visit:', error)
    }
  }


  const closeVisit = async (visitId: string) => {
    if (visits.value.length <= 1) return


    if (visitId === activeVisitId.value) {
      deps.guard(() => closeVisitTab(visitId))
      return
    }
    await closeVisitTab(visitId)
  }

  const closeVisitTab = async (visitId: string) => {

    const isDirtyTab = visitId === 'new' && chartStore.isDirty
    if (isDirtyTab && visitId === activeVisitId.value) {
      pendingCloseVisitId = visitId
      showCloseTabWarning.value = true
      return
    }
    await doCloseVisit(visitId)
  }

  const confirmCloseTab = async () => {
    showCloseTabWarning.value = false
    if (pendingCloseVisitId) {
      await doCloseVisit(pendingCloseVisitId)
      pendingCloseVisitId = null
    }
  }

  const cancelCloseTab = () => {
    showCloseTabWarning.value = false
    pendingCloseVisitId = null
  }

  const doCloseVisit = async (visitId: string) => {
    const wasActive = visitId === activeVisitId.value
    const nextActiveId = visitStore.removeVisit(visitId)

    if (!wasActive) return

    if (nextActiveId) {
      deps.navigate({ name: 'chart', query: { ...route.query, visitId: nextActiveId } })
      try {
        await loadVisit(nextActiveId)
      } catch (error) {
        console.error('Failed to load chart for visit:', error)
      }
    } else {

      const query = { ...route.query }
      delete query.visitId
      deps.navigate({ name: 'chart', query })
      chartStore.resetChart()
      const patientId = currentPatientId.value
      if (patientId) await chartStore.loadPatientById(patientId)
    }
  }






  const newVisit = async () => {
    const patientId = currentPatientId.value || (route.query.patientId as string | undefined)

    if (!patientId) {
      notifStore.error('Please select a patient first')
      return
    }


    if (route.query.visitId === 'new') {
      await deps.enterNewVisitState()
      return
    }






    deps.guard(async () => {
      visitStore.setActiveVisit('new')
      await deps.navigate({ name: 'chart', query: { patientId, visitId: 'new' } })
    })
  }

  return {
    showCloseTabWarning,
    switchVisit,
    closeVisit,
    confirmCloseTab,
    cancelCloseTab,
    newVisit,
  }
}
