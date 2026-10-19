import { computed, onMounted, ref, watch, type Ref } from 'vue'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'
import type { useNotificationStore } from '@/stores/notification'
import type { usePeriodontalChartStore } from '@/stores/periodontal-chart'
import type { useVisitStore } from '@/stores/visit'

type ChartStore = ReturnType<typeof usePeriodontalChartStore>
type VisitStore = ReturnType<typeof useVisitStore>
type NotificationStore = ReturnType<typeof useNotificationStore>

const todayIsoDate = () => new Date().toISOString().split('T')[0]

const latestVisit = <T extends { visitNumber?: number }>(visits: T[]) => {
  const sorted = [...visits].sort((a, b) => (a.visitNumber ?? 0) - (b.visitNumber ?? 0))
  return sorted[sorted.length - 1]
}

export function useChartRouteState(options: {
  chartStore: ChartStore
  visitStore: VisitStore
  notifStore: NotificationStore
  route: RouteLocationNormalizedLoaded
  router: Router
  activeVisitId: Ref<string | null>
  currentPatientId: Ref<string | null>
  visitCount: Ref<number>
  showCloseTabWarningModal: Ref<boolean>
}) {
  const {
    chartStore,
    visitStore,
    notifStore,
    route,
    router,
    activeVisitId,
    currentPatientId,
    visitCount,
    showCloseTabWarningModal,
  } = options

  const urlVisitId = ref<string | null>(null)
  let pendingCloseVisitId: string | null = null

  const isNewPatientMode = computed(() => (
    !route.query.patientId && !route.query.visitId && !currentPatientId.value
  ))

  const hasPatient = computed(() => {
    const hasNoQueryParams = !route.query.patientId && !route.query.visitId
    return hasNoQueryParams || Boolean(currentPatientId.value || route.query.patientId)
  })

  async function enterNewVisitState() {
    const patientId = route.query.patientId as string | undefined
    const today = todayIsoDate()

    chartStore.resetChart()
    if (patientId) {
      await chartStore.loadPatientById(patientId)
    }

    chartStore.patientInfo.date = today
    chartStore.patientInfo.visitPhase = 'before_hygienic'
    visitStore.addDraftVisit(patientId || '', today, 'before_hygienic')
  }

  const handleSwitchVisit = async (visitId: string) => {
    if (visitId === activeVisitId.value) return

    visitStore.setActiveVisit(visitId)
    router.replace({
      name: 'chart',
      query: { ...route.query, visitId },
    })

    if (visitId === 'new') return

    try {
      await chartStore.loadFromBackend(visitId)
    } catch (error) {
      console.error('Failed to load chart for visit:', error)
    }
  }

  const doCloseVisit = async (visitId: string) => {
    const wasActive = visitId === activeVisitId.value
    const nextActiveId = visitStore.removeVisit(visitId)

    if (!wasActive) return

    if (nextActiveId) {
      router.replace({ name: 'chart', query: { ...route.query, visitId: nextActiveId } })
      try {
        await chartStore.loadFromBackend(nextActiveId)
      } catch (error) {
        console.error('Failed to load chart for visit:', error)
      }
      return
    }

    const query = { ...route.query }
    delete query.visitId
    router.replace({ name: 'chart', query })
    chartStore.resetChart()

    const patientId = currentPatientId.value
    if (patientId) {
      await chartStore.loadPatientById(patientId)
    }
  }

  const handleCloseVisit = async (visitId: string) => {
    if (visitCount.value <= 1) return

    const isDirtyTab = visitId === 'new' && chartStore.isDirty
    if (isDirtyTab && visitId === activeVisitId.value) {
      pendingCloseVisitId = visitId
      showCloseTabWarningModal.value = true
      return
    }

    await doCloseVisit(visitId)
  }

  const confirmCloseTab = async () => {
    showCloseTabWarningModal.value = false
    if (!pendingCloseVisitId) return

    await doCloseVisit(pendingCloseVisitId)
    pendingCloseVisitId = null
  }

  const handleNewVisit = async () => {
    const patientId = currentPatientId.value || route.query.patientId as string | undefined

    if (!patientId) {
      notifStore.error('Please select a patient first')
      return
    }

    if (route.query.visitId === 'new') {
      await enterNewVisitState()
      return
    }

    visitStore.setActiveVisit('new')
    router.replace({ name: 'chart', query: { patientId, visitId: 'new' } })
  }

  onMounted(async () => {
    const visitId = route.query.visitId as string | undefined
    const patientId = route.query.patientId as string | undefined
    const hadDirtyWork = chartStore.isDirty
    const persistedPatientId = chartStore.currentPatientId

    if (patientId && visitId) {
      urlVisitId.value = visitId
      chartStore.currentPatientId = null
      try {
        await chartStore.loadPatientById(patientId)
        const fetchedVisits = await visitStore.loadVisits(patientId)
        visitStore.setActiveVisit(visitId)
        if (visitId !== 'new') {
          const selectedVisit = fetchedVisits.find(v => v.id === visitId)
          visitStore.visits = selectedVisit ? [selectedVisit] : []
          await chartStore.loadFromBackend(visitId)
        } else if (hadDirtyWork && persistedPatientId === patientId) {
          visitStore.visits = []
          visitStore.addDraftVisit(
            patientId,
            chartStore.patientInfo.date || todayIsoDate(),
            chartStore.patientInfo.visitPhase || 'before_hygienic',
          )
        } else {
          visitStore.visits = []
          await enterNewVisitState()
        }
      } catch (error) {
        console.error('Failed to load chart:', error)
      }
    } else if (patientId) {
      visitStore.setActiveVisit(null)
      chartStore.resetChart()
      try {
        await chartStore.loadPatientById(patientId)
        const fetchedVisits = await visitStore.loadVisits(patientId)
        if (fetchedVisits.length === 0) {
          visitStore.visits = []
          await enterNewVisitState()
          router.replace({ name: 'chart', query: { patientId, visitId: 'new' } })
        } else {
          const latest = latestVisit(fetchedVisits)
          visitStore.visits = [latest]
          router.replace({ name: 'chart', query: { patientId, visitId: latest.id } })
        }
      } catch (error) {
        console.error('Failed to load patient:', error)
      }
    } else if (visitId) {
      urlVisitId.value = visitId
      chartStore.currentPatientId = null
      visitStore.setActiveVisit(visitId)
      if (visitId !== 'new') {
        try {
          await chartStore.loadFromBackend(visitId)
          if (chartStore.currentPatientId) {
            const fetchedVisits = await visitStore.loadVisits(chartStore.currentPatientId)
            const selectedVisit = fetchedVisits.find(v => v.id === visitId)
            if (selectedVisit) {
              visitStore.visits = [selectedVisit]
            }
          }
        } catch (error) {
          console.error('Failed to load chart:', error)
        }
      } else {
        visitStore.visits = []
        await enterNewVisitState()
      }
    } else {
      visitStore.visits = []
      await enterNewVisitState()
    }
  })

  watch(() => route.query.visitId, async (newVisitId) => {
    if (newVisitId && typeof newVisitId === 'string') {
      urlVisitId.value = newVisitId
      visitStore.setActiveVisit(newVisitId)
      if (newVisitId !== 'new') {
        const existing = visitStore.visits.find(v => v.id === newVisitId)
        if (!existing) {
          const selectedVisit = visitStore.patientVisits.find(v => v.id === newVisitId)
          if (selectedVisit) {
            visitStore.visits.push(selectedVisit)
          } else {
            const patientId = route.query.patientId as string || chartStore.currentPatientId
            if (patientId) {
              const fetchedVisits = await visitStore.loadVisits(patientId)
              const updatedVisit = fetchedVisits.find(v => v.id === newVisitId)
              if (updatedVisit) {
                visitStore.visits.push(updatedVisit)
              }
            }
          }
        }

        try {
          await chartStore.loadFromBackend(newVisitId)
        } catch (error) {
          console.error('Failed to load chart:', error)
        }
      } else {
        await enterNewVisitState()
      }
    } else if (newVisitId === undefined && route.query.patientId === undefined) {
      visitStore.clearVisits()
      chartStore.resetChart()
    }
  })

  watch(() => route.query.patientId, (newPatientId, oldPatientId) => {
    if (newPatientId === undefined && oldPatientId !== undefined && route.query.visitId === undefined) {
      visitStore.clearVisits()
      chartStore.resetChart()
    }
  })

  watch(() => chartStore.currentPatientId, async (newPatientId, oldPatientId) => {
    if (!newPatientId || newPatientId === oldPatientId || oldPatientId === null) return

    visitStore.clearVisits()
    const fetchedVisits = await visitStore.loadVisits(newPatientId)
    if (fetchedVisits.length > 0) {
      const latest = latestVisit(fetchedVisits)
      visitStore.visits = [latest]
      await handleSwitchVisit(latest.id)
    } else {
      chartStore.resetChart()
      await chartStore.loadPatientById(newPatientId)
    }
  })

  return {
    hasPatient,
    isNewPatientMode,
    urlVisitId,
    enterNewVisitState,
    handleSwitchVisit,
    handleCloseVisit,
    confirmCloseTab,
    handleNewVisit,
  }
}
