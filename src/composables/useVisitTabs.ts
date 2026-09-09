import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { usePeriodontalChartStore } from '@/stores/periodontal-chart'
import { useVisitStore } from '@/stores/visit'
import { useNotificationStore } from '@/stores/notification'

export interface VisitTabsDeps {
  /** The page's own router move — already past the unsaved-board gate. */
  navigate: (to: RouteLocationRaw, mode?: 'push' | 'replace') => unknown
  /** Asks about an unsaved X-ray board before running the move. */
  guard: (proceed: () => unknown) => unknown
  /** Puts the page into local draft mode for a brand-new visit. */
  enterNewVisitState: () => Promise<void>
}

/**
 * The visit tab strip: opening one, closing one, starting a fresh draft.
 *
 * Every one of these is the same two steps in a different order — move the
 * active visit, then move the URL to match — and they have to stay together,
 * because a tab that changes without the query (or the other way round) leaves
 * the page and the router disagreeing about which visit is open.
 *
 * The X-ray question is asked through `guard` rather than answered here: which
 * moves reload the board is this strip's business, but what to do about it is
 * the guard's.
 */
export function useVisitTabs(deps: VisitTabsDeps) {
  const route = useRoute()
  const chartStore = usePeriodontalChartStore()
  const visitStore = useVisitStore()
  const notifStore = useNotificationStore()
  const { currentPatientId } = storeToRefs(chartStore)
  const { visits, activeVisitId } = storeToRefs(visitStore)

  const showCloseTabWarning = ref(false)
  // ID of the visit tab the user is trying to close (pending confirmation)
  let pendingCloseVisitId: string | null = null

  // Switch to a different visit (tab click)
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

    // The route watcher handles 'new' (draft) tabs — skip loadFromBackend for them.
    if (visitId === 'new') return

    try {
      await chartStore.loadFromBackend(visitId)
    } catch (error) {
      console.error('Failed to load chart for visit:', error)
    }
  }

  // Close a visit tab. If the visit has unsaved changes, show a warning first.
  const closeVisit = async (visitId: string) => {
    if (visits.value.length <= 1) return
    // Closing the open tab takes its X-ray board with it, so that gets asked
    // about before the chart's own warning.
    if (visitId === activeVisitId.value) {
      deps.guard(() => closeVisitTab(visitId))
      return
    }
    await closeVisitTab(visitId)
  }

  const closeVisitTab = async (visitId: string) => {
    // Only warn for the draft (id='new') or a visit with dirty unsaved edits
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
        await chartStore.loadFromBackend(nextActiveId)
      } catch (error) {
        console.error('Failed to load chart for visit:', error)
      }
    } else {
      // No tabs left — clear the visit from the URL and blank the chart.
      const query = { ...route.query }
      delete query.visitId
      deps.navigate({ name: 'chart', query })
      chartStore.resetChart()
      const patientId = currentPatientId.value
      if (patientId) await chartStore.loadPatientById(patientId)
    }
  }

  /**
   * Start a new visit for the current patient. The visit is only persisted on
   * the backend once its chart is saved (saveChart with no visitId creates it),
   * so here we just enter the local 'new' draft state.
   */
  const newVisit = async () => {
    const patientId = currentPatientId.value || (route.query.patientId as string | undefined)

    if (!patientId) {
      notifStore.error('Please select a patient first')
      return
    }

    // Already drafting a new visit — just give a fresh blank chart.
    if (route.query.visitId === 'new') {
      await deps.enterNewVisitState()
      return
    }

    // Navigating to the 'new' sentinel triggers the route watcher, which puts
    // the page into draft mode (blank chart, same patient) — and reloads the
    // X-ray board over whatever was on it. Asked here rather than left to the
    // route guard, because the active visit has to move together with the URL
    // or the two end up disagreeing about which visit is open.
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
