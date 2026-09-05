<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { Download, FileText, Image as ImageIcon, Plus, Save, Stethoscope, Loader2, Users, X, Pencil } from 'lucide-vue-next'
import Navbar from '@/components/layout/Navbar.vue'
import ChartLegend from '@/components/chart/ChartLegend.vue'
import ChartOverviewModal from '@/components/chart/ChartOverviewModal.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import PatientChartHeader from '@/components/chart/PatientChartHeader.vue'
import PeriodontalChartGrid from '@/components/chart/PeriodontalChartGrid.vue'
import ToothSidebarOverlay from '@/components/chart/ToothSidebarOverlay.vue'
import VirtualNumpad from '@/components/chart/VirtualNumpad.vue'
import AutoFitWrapper from '@/components/common/AutoFitWrapper.vue'
import PatientDrawer from '@/components/patients/VisitListPanel.vue'
import XrayBoardPanel from '@/components/xray/XrayBoardPanel.vue'
import { usePeriodontalChartStore } from '@/stores/periodontal-chart'
import { useXrayBoardStore, xrayBoardKey } from '@/stores/xray-board'
import { useClinicalValidationStore } from '@/stores/clinical-validation'
import { useVisitStore } from '@/stores/visit'
import { useNotificationStore } from '@/stores/notification'
import { useDiagnosisStore, resolveDiagnosisKey } from '@/stores/diagnosis'
import type { ToothId } from '@/domain/chart/chart.types'
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import draggable from 'vuedraggable'

const route = useRoute()
const router = useRouter()
const chartStore = usePeriodontalChartStore()
chartStore.initializeChart()
const validationStore = useClinicalValidationStore()
const visitStore = useVisitStore()
const notifStore = useNotificationStore()
const xrayStore = useXrayBoardStore()
const diagnosisStore = useDiagnosisStore()

const drawerOpen = ref(false)
const urlVisitId = ref<string | null>(null)

// Put the page into "new visit" draft mode. The backend has no standalone
// create-visit mutation: a visit is persisted only when its chart is saved
// (saveChart with no visitId). So a new visit is a local draft — a blank chart
// that keeps the current patient's identity — until the user hits Save.
async function enterNewVisitState() {
  // Use only the URL param — never chartStore.currentPatientId, which may still
  // hold a previous patient's id before resetChart() has cleared it.
  const patientId = route.query.patientId as string | undefined
  const today = new Date().toISOString().split('T')[0]
  chartStore.resetChart()
  if (patientId) {
    await chartStore.loadPatientById(patientId)
  }
  chartStore.patientInfo.date = today
  chartStore.patientInfo.visitPhase = 'before_hygienic'
  visitStore.addDraftVisit(patientId || '', today, 'before_hygienic')
}

onMounted(async () => {
  const visitId = route.query.visitId as string | undefined
  const patientId = route.query.patientId as string | undefined
  // Read before the branches below: they can resetChart() (which forces the tab
  // back to 'chart') and router.replace() away the query we are reading from.
  const requestedTab = route.query.tab
  const wantsTab =
    requestedTab === 'xray' || requestedTab === 'export' ? requestedTab : null
  // Carried through the redirects below so a reload keeps the same tab open.
  const tabQuery = wantsTab ? { tab: wantsTab } : {}

  // Capture persisted state before any mutations so we can detect a page reload
  // where the user had an unsaved draft for this patient.
  const hadDirtyWork = chartStore.isDirty
  const persistedPatientId = chartStore.currentPatientId

  if (patientId && visitId) {
    urlVisitId.value = visitId
    // Null out currentPatientId before loadPatientById so that if Pinia's
    // persisted state has a different (non-null) patient, the
    // currentPatientId watcher fires with oldPatientId===null and skips,
    // avoiding a race where it clears our visits mid-setup.
    chartStore.currentPatientId = null
    try {
      await chartStore.loadPatientById(patientId)
      const fetchedVisits = await visitStore.loadVisits(patientId)
      visitStore.setActiveVisit(visitId)
      if (visitId !== 'new') {
        const selectedVisit = fetchedVisits.find(v => v.id === visitId)
        if (selectedVisit) {
          visitStore.visits = [selectedVisit]
        } else {
          visitStore.visits = []
        }
        await chartStore.loadFromBackend(visitId)
      } else if (hadDirtyWork && persistedPatientId === patientId) {
        // Page reload with an unsaved draft for this patient — keep teethData
        // intact (restored from sessionStorage) but re-add the draft tab to the
        // visit strip, since the visit store isn't persisted and loadVisits above
        // only returns backend visits.
        visitStore.visits = []
        visitStore.addDraftVisit(
          patientId,
          chartStore.patientInfo.date || new Date().toISOString().split('T')[0],
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
      // Patient has no visits yet — auto-open a blank draft so the tab row shows immediately
      if (fetchedVisits.length === 0) {
        visitStore.visits = []
        await enterNewVisitState()
        navigate({ name: 'chart', query: { patientId, visitId: 'new', ...tabQuery } })
      } else {
        // Redirect to the latest visit's chart (sorted by visitNumber)
        const sorted = [...fetchedVisits].sort((a, b) => (a.visitNumber ?? 0) - (b.visitNumber ?? 0))
        const latest = sorted[sorted.length - 1]
        visitStore.visits = [latest]
        navigate({ name: 'chart', query: { patientId, visitId: latest.id, ...tabQuery } })
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

  // Deep link from the Visit History list, or a reload of the tab the user was
  // already on — either way the query is the only thing that survived.
  if (wantsTab) chartStore.activeSubNav = wantsTab
})

/**
 * Keeps `?tab=` alongside the open sub-tab, so reloading the X-ray board comes
 * back to the X-ray board instead of dropping the doctor on the chart.
 *
 * Watched rather than wired to the tab buttons: `resetChart()` sets the tab back
 * to 'chart' on its own, and the deep link sets it during mount, so the button
 * is not the only thing that moves it. Replaces rather than pushes — switching
 * tabs is not a place in history to come back to — and goes through `navigate`
 * so the unsaved-board guard treats it as this page's own doing.
 */
watch(
  () => chartStore.activeSubNav,
  tab => {
    const current = (route.query.tab as string | undefined) ?? 'chart'
    if (current === tab) return
    const query = { ...route.query }
    if (tab === 'chart') delete query.tab
    else query.tab = tab
    navigate({ name: 'chart', query })
  },
)

// Watch for visitId changes (when user navigates to different visit)
watch(() => route.query.visitId, async (newVisitId) => {
  if (newVisitId && typeof newVisitId === 'string') {
    urlVisitId.value = newVisitId
    visitStore.setActiveVisit(newVisitId)
    if (newVisitId !== 'new') {
      // Ensure this visit is in visitStore.visits (our opened tabs)
      const existing = visitStore.visits.find(v => v.id === newVisitId)
      if (!existing) {
        const selectedVisit = visitStore.patientVisits.find(v => v.id === newVisitId)
        if (selectedVisit) {
          visitStore.visits.push(selectedVisit)
        } else {
          // Fallback: load patient visits and find it
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

// When patientId is removed from the URL without a visitId change (e.g. navigating
// to /chart from a patient-specific chart), enter new-patient mode.
watch(() => route.query.patientId, (newPatientId, oldPatientId) => {
  if (newPatientId === undefined && oldPatientId !== undefined && route.query.visitId === undefined) {
    visitStore.clearVisits()
    chartStore.resetChart()
  }
})

// Watch for patient changes - reset visits when switching patients.
// Skip the initial mount transition (oldPatientId === null): onMounted already
// loads the visits, so re-loading here would double-fetch and clobber the
// active visit via clearVisits().
watch(() => chartStore.currentPatientId, async (newPatientId, oldPatientId) => {
  if (!newPatientId || newPatientId === oldPatientId || oldPatientId === null) return
  visitStore.clearVisits()
  const fetchedVisits = await visitStore.loadVisits(newPatientId)
  if (fetchedVisits.length > 0) {
    // Open the latest visit as a tab by default
    const sorted = [...fetchedVisits].sort((a, b) => (a.visitNumber ?? 0) - (b.visitNumber ?? 0))
    const latest = sorted[sorted.length - 1]
    visitStore.visits = [latest]
    await handleSwitchVisit(latest.id)
  } else {
    chartStore.resetChart()
    await chartStore.loadPatientById(newPatientId)
  }
})

const {
  patientInfo,
  teethData,
  selectedToothId,
  selectedToothData,
  activeSubNav,
  summary,
  currentPatientId,
} = storeToRefs(chartStore)

const { visits, activeVisitId } = storeToRefs(visitStore)

// Edit mode for saved visits (read-only by default — see computeds below).
const editMode = ref(false)

const showOverviewModal = ref(false)
const showSaveConfirmModal = ref(false)
const showCloseTabWarningModal = ref(false)
const showDraftRecoveryModal = ref(false)
const showValidation = ref(false)
const showCancelEditConfirmModal = ref(false)

const showXrayLeaveWarningModal = ref(false)

// ID of the visit tab the user is trying to close (pending confirmation)
let pendingCloseVisitId: string | null = null
// What to run once the doctor agrees to leave unsaved X-ray work behind.
// Its result is never read — router.push hands back a NavigationFailure that
// the guard has no use for — so the action is free to return anything.
let pendingXrayNavigation: (() => unknown) | null = null

// Auto-fit scale toggle
const enableAutoFit = ref(false)

const isTouchDevice = ref(false)
onMounted(() => {
  isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0
})

// The X-ray board is only in memory until it is saved, and opening another
// visit reloads it from storage on top of whatever was there — so anything that
// changes which visit is open asks first (SRS-363). Moving between the Chart
// and X-ray sub-tabs is safe: the board reloads only when its visit changes.
/**
 * Is there anything to ask about? PER-259 §B1 gates the question on being in
 * edit mode as well as dirty. `editable` is this board's version of that: a
 * saved board is read-only until Edit is pressed, and a board that failed to
 * load is nobody's to change either.
 *
 * It is `editable` rather than `editMode` because the card's two modes assume
 * every board has already been saved once. A Draft has never been written down,
 * so `editMode` is false while the doctor is free to arrange films on it — and
 * that is exactly the board whose work has nowhere else to survive.
 */
const hasUnsavedBoard = () => xrayStore.editable && xrayStore.isDirty

const guardUnsavedXray = (proceed: () => unknown) => {
  if (!hasUnsavedBoard()) return proceed()
  // A question about one way out is already on screen. Whatever arrives behind
  // it is dropped rather than queued: replacing the pending answer would send
  // the doctor somewhere they were never asked about, and the second route is
  // cancelled by its own guard either way.
  if (showXrayLeaveWarningModal.value) return
  pendingXrayNavigation = proceed
  showXrayLeaveWarningModal.value = true
}

const confirmLeaveXray = async () => {
  showXrayLeaveWarningModal.value = false
  const proceed = pendingXrayNavigation
  pendingXrayNavigation = null
  await proceed?.()
}

const cancelLeaveXray = () => {
  showXrayLeaveWarningModal.value = false
  pendingXrayNavigation = null
}

/**
 * The page's own navigations have already been past the gate, or are the gate's
 * own doing — following a just-saved visit to its real id, blanking the URL
 * after the last tab closes. This marks them so the route guards below let them
 * through instead of asking a second time about work the doctor kept.
 */
let bypassRouteGuard = false
const navigate = (to: RouteLocationRaw, mode: 'push' | 'replace' = 'replace') => {
  bypassRouteGuard = true
  const navigation = mode === 'push' ? router.push(to) : router.replace(to)
  return navigation.finally(() => {
    bypassRouteGuard = false
  })
}

/**
 * Nothing outside this page knows the X-ray board exists: the visit drawer, the
 * sidebar links and the browser's own Back button all go straight through the
 * router (SRS-363). Asking here rather than at each call site is what covers
 * the ones nobody has written yet.
 *
 * Leaving does not throw the board away by itself — it survives in the store —
 * but opening any other visit does, and by then the question would be on the
 * wrong page with the films already gone. This is the last moment to ask.
 */
/**
 * Whether the navigation being asked about is the browser going backwards.
 * vue-router does not say, and it changes what "Leave" has to do: cancelling a
 * Back makes the router put the current page back, so pushing the destination
 * afterwards would stack it in front of the page the doctor was returning to,
 * and Back would bring them straight here again.
 *
 * Read from the history entry rather than from a `popstate` listener. The
 * browser moves the entry before it fires the event, so by the time a guard
 * runs, `history.state.position` is already the destination's — while a push or
 * replace has not touched history yet and still reads as where we are. A flag
 * set by the listener would also survive a Back that was never asked about and
 * send the *next* navigation backwards instead.
 *
 * `position` is vue-router's own bookkeeping; if it ever stops being there,
 * every navigation reads as forward, which is what the code did before.
 */
const historyPosition = () => {
  const position = (window.history.state as { position?: unknown } | null)?.position
  return typeof position === 'number' ? position : null
}

let currentPosition = historyPosition()
const stopTrackingPosition = router.afterEach(() => {
  currentPosition = historyPosition()
})
onUnmounted(stopTrackingPosition)

const isGoingBack = () => {
  const target = historyPosition()
  return target !== null && currentPosition !== null && target < currentPosition
}

/** Goes where the cancelled navigation was heading, the way it was heading. */
const resumeLeaving = (to: RouteLocationNormalized, wasBack: boolean) => {
  if (!wasBack) return navigate(to.fullPath, 'push')

  // `history.go` hands back no promise to close the gate with, so it is closed
  // by the navigation that follows and by a timer behind it. A gate stuck open
  // means the next unsaved board leaves without a word, which is far worse than
  // the spare history entry this avoids.
  bypassRouteGuard = true
  const failsafe = window.setTimeout(() => {
    bypassRouteGuard = false
  }, 2000)
  const stopWatching = router.afterEach(() => {
    window.clearTimeout(failsafe)
    bypassRouteGuard = false
    stopWatching()
  })
  router.go(-1)
}

/**
 * Nothing outside this page knows the X-ray board exists: the visit drawer, the
 * sidebar links and the browser's own Back button all go straight through the
 * router (SRS-363). Asking here rather than at each call site is what covers
 * the ones nobody has written yet.
 *
 * Leaving does not throw the board away by itself — it survives in the store —
 * but opening any other visit does, and by then the question would be on the
 * wrong page with the films already gone. This is the last moment to ask.
 */
const askBeforeLeaving = (to: RouteLocationNormalized) => {
  // Read now, not when the doctor answers: by then the router has already put
  // the URL back and the history position no longer says where they were going.
  const wasBack = isGoingBack()
  guardUnsavedXray(() => resumeLeaving(to, wasBack))
  return false
}


onBeforeRouteUpdate((to, from) => {
  // Only a change of visit or patient reloads the board over what is on screen.
  // Toggling between the Chart and X-ray sub-tabs is a query change as well,
  // and that one must never ask (SRS-365).
  const sameBoard =
    to.query.visitId === from.query.visitId && to.query.patientId === from.query.patientId
  if (bypassRouteGuard || sameBoard || !hasUnsavedBoard()) return true
  return askBeforeLeaving(to)
})

onBeforeRouteLeave(to => {
  if (bypassRouteGuard || !hasUnsavedBoard()) return true
  return askBeforeLeaving(to)
})

// Switch to a different visit (tab click)
const handleSwitchVisit = (visitId: string) => {
  if (visitId === activeVisitId.value) return
  guardUnsavedXray(() => doSwitchVisit(visitId))
}

const doSwitchVisit = async (visitId: string) => {
  visitStore.setActiveVisit(visitId)

  navigate({
    name: 'chart',
    query: { ...route.query, visitId }
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
const handleCloseVisit = async (visitId: string) => {
  if (visits.value.length <= 1) return
  // Closing the open tab takes its X-ray board with it, so that gets asked
  // about before the chart's own warning.
  if (visitId === activeVisitId.value) {
    guardUnsavedXray(() => closeVisitTab(visitId))
    return
  }
  await closeVisitTab(visitId)
}

const closeVisitTab = async (visitId: string) => {
  // Only warn for the draft (id='new') or a visit with dirty unsaved edits
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
  if (pendingCloseVisitId) {
    await doCloseVisit(pendingCloseVisitId)
    pendingCloseVisitId = null
  }
}

const doCloseVisit = async (visitId: string) => {
  const wasActive = visitId === activeVisitId.value
  const nextActiveId = visitStore.removeVisit(visitId)

  if (!wasActive) return

  if (nextActiveId) {
    navigate({ name: 'chart', query: { ...route.query, visitId: nextActiveId } })
    try {
      await chartStore.loadFromBackend(nextActiveId)
    } catch (error) {
      console.error('Failed to load chart for visit:', error)
    }
  } else {
    // No tabs left — clear the visit from the URL and blank the chart.
    const query = { ...route.query }
    delete query.visitId
    navigate({ name: 'chart', query })
    chartStore.resetChart()
    const patientId = currentPatientId.value
    if (patientId) await chartStore.loadPatientById(patientId)
  }
}

// Start a new visit for the current patient. The visit is only persisted on
// the backend once its chart is saved (saveChart with no visitId creates it),
// so here we just enter the local 'new' draft state.
const handleNewVisit = async () => {
  const patientId = currentPatientId.value || route.query.patientId as string | undefined

  if (!patientId) {
    notifStore.error('Please select a patient first')
    return
  }

  // Already drafting a new visit — just give a fresh blank chart.
  if (route.query.visitId === 'new') {
    await enterNewVisitState()
    return
  }

  // Navigating to the 'new' sentinel triggers the route watcher, which puts the
  // page into draft mode (blank chart, same patient) — and reloads the X-ray
  // board over whatever was on it. Asked here rather than left to the route
  // guard, because the active visit has to move together with the URL or the
  // two end up disagreeing about which visit is open.
  guardUnsavedXray(async () => {
    visitStore.setActiveVisit('new')
    await navigate({ name: 'chart', query: { patientId, visitId: 'new' } })
  })
}

// Open the AAP/EFP staging and grading worksheet for the visit on screen.
// Pushed through the router rather than `navigate`, so an unsaved X-ray board
// gets the same question here as it does for every other way off this page.
const handleOpenDiagnosis = () => {
  const patientId = currentPatientId.value || (route.query.patientId as string | undefined)
  const visitId = activeVisitId.value || (route.query.visitId as string | undefined)

  router.push({
    name: 'diagnosis',
    query: {
      ...(patientId ? { patientId } : {}),
      ...(visitId ? { visitId } : {}),
    },
  })
}

const isSaving = ref(false)

const validateBeforeSave = () => {
  showValidation.value = true
  if (!patientInfo.value.hn) {
    notifStore.error('Please enter HN before saving')
    return false
  }
  if (!patientInfo.value.patientName) {
    notifStore.error('Please enter patient name before saving')
    return false
  }
  if (!chartStore.hasChartData) {
    notifStore.error('Please enter clinical chart data before saving')
    return false
  }
  return true
}

const handleSaveClick = () => {
  if (isSaving.value) return
  if (!validateBeforeSave()) return
  showSaveConfirmModal.value = true
}

const confirmSaveChart = async () => {
  showSaveConfirmModal.value = false
  if (isSaving.value) return
  isSaving.value = true
  try {
    const prevPatientId = currentPatientId.value
    const prevVisitId = activeVisitId.value
    const oldDiagnosisKey = resolveDiagnosisKey(prevVisitId, prevPatientId)

    await chartStore.saveToBackend(true)

    editMode.value = false

    const activeVisit = activeVisitId.value
    const patientId = currentPatientId.value

    // Rekey and commit diagnosis data with the newly saved visit record
    const newDiagnosisKey = resolveDiagnosisKey(activeVisit, patientId)
    diagnosisStore.rekey(oldDiagnosisKey, newDiagnosisKey)
    diagnosisStore.commitSaved(newDiagnosisKey)

    // The draft visit now has a real id — move its X-ray board along with it,
    // and with it the visit its films upload to.
    await xrayStore.rekeyBoard(xrayBoardKey(patientId, activeVisit), activeVisit)

    // Saving never leaves this page, not even for a brand-new patient (PER-261).
    // The backend hands back the ids it just minted; writing them into the query
    // is all it takes for the X-ray and Diagnosis tabs to be about the new visit,
    // so the doctor can carry on with it instead of picking it out of a list.
    if (activeVisit && (route.query.visitId !== activeVisit || (patientId && route.query.patientId !== patientId))) {
      navigate({
        query: {
          ...route.query,
          visitId: activeVisit,
          ...(patientId ? { patientId } : {}),
        },
      })
    }
  } catch (error) {
    console.error('Failed to save chart:', error)
  } finally {
    isSaving.value = false
  }
}

// Format date for display
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Computed: show empty state only if we have no patient and no query params (i.e., user just clicked a drawer item but patient isn't loaded yet)
// If there are no query params at all, we're in "new patient" mode - show the blank chart
const hasPatient = computed(() => {
  // If there are no query params at all, we're in blank chart mode (new patient flow)
  const hasNoQueryParams = !route.query.patientId && !route.query.visitId
  return hasNoQueryParams || Boolean(currentPatientId.value || route.query.patientId)
})

// Computed: true if we're in blank chart mode (creating new patient from scratch)
const isNewPatientMode = computed(() => {
  return !route.query.patientId && !route.query.visitId && !currentPatientId.value
})

// The X-ray tab replaces the chart area with a full-height board.
const isXrayTab = computed(() => activeSubNav.value === 'xray' && hasPatient.value)
const xrayPatientId = computed(
  () => currentPatientId.value || (route.query.patientId as string) || null,
)
const xrayVisitId = computed(() => activeVisitId.value || (route.query.visitId as string) || null)

// --- Read-only / edit mode for saved visits ---
// - id='new' (unsaved draft): always editable, no Edit button needed
// - existing draft/completed: read-only by default, Edit button unlocks
const isExistingVisit = computed(
  () => activeVisitId.value !== 'new' && activeVisitId.value !== null
)
// Editable when: new unsaved visit OR (existing visit AND editMode is on)
const chartEditable = computed(
  () => !isExistingVisit.value || editMode.value
)
// Patient-identity fields stay locked on existing visits
const patientFieldsEditable = computed(() => !isExistingVisit.value)

// Keep the store's read-only guard in sync with the editable state.
watch(chartEditable, value => { chartStore.readonly = !value }, { immediate: true })
// Reset edit mode and sync diagnosis whenever the active visit or patient changes.
watch(
  [activeVisitId, currentPatientId],
  ([newVisit, newPatient]) => {
    editMode.value = false
    diagnosisStore.openFor(newVisit, newPatient)
  },
  { immediate: true },
)

const handleEditVisit = () => { editMode.value = true }

const handleCancelEditClick = () => {
  if (chartStore.isDirty || diagnosisStore.isDirty) {
    showCancelEditConfirmModal.value = true
  } else {
    editMode.value = false
  }
}

const confirmCancelEdit = async () => {
  showCancelEditConfirmModal.value = false
  editMode.value = false
  // Discard unsaved edits by reloading from backend
  const visitId = activeVisitId.value
  if (visitId && visitId !== 'new') {
    try { await chartStore.loadFromBackend(visitId) } catch (e) { console.error(e) }
  }
  diagnosisStore.revertToSaved(resolveDiagnosisKey(activeVisitId.value, currentPatientId.value))
}

// --- beforeunload guard (crash/accidental tab close protection) ---
// The wording of this one belongs to the browser; there is no way to set it.
// Removed again in onUnmounted below, or it would go on stopping people from
// leaving pages that have nothing to lose.
const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
  if (chartStore.isDirty || diagnosisStore.isDirty || hasUnsavedBoard()) {
    e.preventDefault()
    // Ignored by current browsers, still required by older Chrome.
    e.returnValue = ''
  }
}
onMounted(() => { window.addEventListener('beforeunload', beforeUnloadHandler) })
onUnmounted(() => { window.removeEventListener('beforeunload', beforeUnloadHandler) })

// --- Draft Recovery ---
// On mount, if localStorage has isDirty=true (restored by Pinia persist) and the
// current session has no active visit, offer to restore the draft.
onMounted(() => {
  if (chartStore.isDirty && !route.query.visitId) {
    showDraftRecoveryModal.value = true
  }
})

const discardDraft = () => {
  showDraftRecoveryModal.value = false
  chartStore.resetChart()
}

const handleUpdateNote = ({ id, note }: { id: string | number; note: string }) => {
  chartStore.updateNote(Number(id) as ToothId, note)
}
</script>

<template>
  <div
    class="min-h-screen bg-[#f1f5f9] font-sans text-[#1e293b]"
    :class="{ 'h-screen flex flex-col overflow-hidden': isXrayTab }"
  >
    <Navbar @toggle-drawer="drawerOpen = !drawerOpen" />
    <PatientDrawer v-model:open="drawerOpen" />

    <div class="bg-white border-b border-slate-200 py-1.5 sticky top-16 z-40 shrink-0">
      <div class="max-w-400 mx-auto px-4 flex items-center justify-center">
        <div class="flex items-center gap-1.5 p-0.5 bg-slate-100/80 rounded-xl border border-slate-200 overflow-x-auto min-w-max">
          <button
            class="flex items-center gap-1.5 px-4 py-1 rounded-lg text-[12px] font-bold transition-all duration-200"
            :class="activeSubNav === 'chart' ? 'bg-white text-[#0052ff] shadow-sm' : 'text-slate-500 hover:text-slate-700'"
            @click="chartStore.activeSubNav = 'chart'"
          >
            <FileText class="w-3.5 h-3.5" />
            Periodontal Chart
          </button>
          <button
            class="flex items-center gap-1.5 px-4 py-1 rounded-lg text-[12px] font-bold transition-all duration-200"
            :class="activeSubNav === 'xray' ? 'bg-white text-[#0052ff] shadow-sm' : 'text-slate-500 hover:text-slate-700'"
            @click="chartStore.activeSubNav = 'xray'"
          >
            <ImageIcon class="w-3.5 h-3.5" />
            X-ray
          </button>
          <div class="w-px h-3 bg-slate-300 my-auto mx-0.5"></div>
          <button
            class="flex items-center gap-1.5 px-4 py-1 rounded-lg text-[12px] font-bold transition-all duration-200"
            :class="activeSubNav === 'export' ? 'bg-white text-[#0052ff] shadow-sm' : 'text-slate-500 hover:text-slate-700'"
            @click="chartStore.activeSubNav = 'export'"
          >
            <Download class="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>
    </div>

    <!-- X-ray board: free canvas of radiographs for the active visit -->
    <XrayBoardPanel
      v-if="isXrayTab"
      :patient-id="xrayPatientId"
      :visit-id="xrayVisitId"
    />

    <main v-else class="max-w-400 mx-auto px-4 py-3">
      <!-- Empty state when no patient selected. Same card as the one the
           diagnosis page shows when it has no chart to read. -->
      <section
        v-if="!hasPatient"
        class="bg-white rounded-3xl shadow-md border border-slate-200 p-10 flex flex-col items-center gap-3 mt-3"
      >
        <Users class="w-8 h-8 text-slate-300" />
        <p class="text-[13px] font-bold text-slate-700">No patient open yet</p>
        <p class="text-[12px] text-slate-400 text-center max-w-100">
          The chart records one patient at a time. Open My Patients and pick one — their visits
          appear along the top, ready to chart.
        </p>
        <button
          class="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0052ff] text-white rounded-lg font-bold text-[11px] shadow-md hover:bg-blue-700 transition-colors"
          @click="router.push({ name: 'my-patients' })"
        >
          <Users class="w-3.5 h-3.5" /> My patients
        </button>
      </section>

      <template v-else>
        <div class="flex flex-wrap items-center justify-between gap-4 mb-3">
          <button
            class="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 flex items-center gap-1.5 shadow-sm hover:bg-slate-50 transition-all duration-500"
            :class="selectedToothId !== null ? 'xl:ml-18' : 'xl:ml-63'"
            @click="showOverviewModal = true"
          >
            <FileText class="w-3.5 h-3.5" /> Overview
          </button>

          <div class="flex flex-wrap items-center gap-2 xl:mr-50">
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#9333ea]/30 text-[#9333ea] rounded-lg font-bold text-[11px] shadow-sm hover:bg-purple-50 transition-colors"
              @click="handleOpenDiagnosis"
            >
              <Stethoscope class="w-3.5 h-3.5" /> Diagnosis
            </button>
            <button 
              class="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg font-bold text-[11px] transition-all duration-200 xl:hidden" 
              @click="enableAutoFit = !enableAutoFit"
              :class="enableAutoFit ? 'bg-[#0052ff] border-[#0052ff] text-white shadow-inner transform scale-[0.98]' : 'bg-white border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50'"
            >
              Zoom to Fit
            </button>
            <button v-if="!isNewPatientMode" class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-[11px] shadow-sm hover:bg-slate-50 transition-colors" @click="handleNewVisit">
              <Plus class="w-3.5 h-3.5" /> New Visit
            </button>

            <!-- Edit button: existing visit, not yet in edit mode -->
            <button
              v-if="isExistingVisit && !editMode"
              @click="handleEditVisit"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-[11px] shadow-sm hover:bg-slate-50 transition-colors"
            >
              <Pencil class="w-3.5 h-3.5" /> Edit
            </button>

            <!-- Cancel edit: discard unsaved edits -->
            <button
              v-if="isExistingVisit && editMode"
              @click="handleCancelEditClick"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-[11px] shadow-sm hover:bg-slate-50 transition-colors"
            >
              <X class="w-3.5 h-3.5" /> Cancel
            </button>

            <!-- Save Chart: new unsaved visit OR existing visit in edit mode -->
            <button
              v-if="chartEditable"
              @click="handleSaveClick"
              :disabled="isSaving || (isExistingVisit && editMode && !chartStore.isDirty && !diagnosisStore.isDirty)"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] shadow-md transition-colors"
              :class="(isSaving || (isExistingVisit && editMode && !chartStore.isDirty && !diagnosisStore.isDirty)) ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-50' : 'bg-blue-600 text-white hover:bg-blue-700'"
            >
              <Loader2 v-if="isSaving" class="w-3.5 h-3.5 animate-spin" />
              <Save v-else class="w-3.5 h-3.5" />
              {{ isSaving ? 'Saving...' : 'Save Chart' }}
            </button>
          </div>
        </div>

        <div class="flex flex-col xl:flex-row gap-4 transition-all duration-500">
          <ChartLegend :is-sidebar-open="selectedToothId !== null" class="hidden xl:flex" />

          <div class="w-full xl:w-255 shrink-0 flex flex-col gap-0 transition-all duration-500 min-w-0">
            <!-- Visit Tabs: always visible when there are visits/drafts -->
            <div v-if="!isNewPatientMode || visits.length > 0" class="flex items-center gap-0 relative z-10">
              <template v-if="visits.length === 0">
                <div class="px-4 py-2 text-xs text-slate-400 italic">
                  No visits yet. Click "New Visit" to create one.
                </div>
              </template>

              <template v-else>
                <draggable
                  v-model="visits"
                  group="visits"
                  item-key="id"
                  class="flex items-center gap-0"
                  ghost-class="opacity-30"
                  drag-class="cursor-grabbing"
                  animation="200"
                >
                  <template #item="{ element: visit }">
                    <div
                      class="relative group"
                      @click="handleSwitchVisit(visit.id)"
                    >
                      <div
                        class="px-4 py-1.5 rounded-t-xl border-t border-l border-r text-[10px] font-black flex items-center gap-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] -mb-px transition-all cursor-grab active:cursor-grabbing"
                        :class="visit.id === activeVisitId
                          ? 'bg-white border-slate-200 text-[#0052ff]'
                          : 'bg-slate-100 border-transparent text-slate-400 hover:text-slate-600'"
                      >
                        <span class="max-w-24 truncate">{{ visit.id === 'new' ? 'New Visit' : `Visit #${visit.visitNumber || '-'}` }}</span>
                        <span class="text-[9px] text-slate-400 font-normal">{{ formatDate(visit.visitDate) }}</span>
                        <span v-if="visit.id === 'new'" class="text-[8px] bg-blue-100 text-blue-600 px-1 rounded">Draft</span>
                        <span v-else-if="!visit.hasChart" class="text-[8px] bg-amber-100 text-amber-600 px-1 rounded">Empty</span>
                        <button
                          v-if="visits.length > 1"
                          class="ml-0.5 -mr-1 p-0.5 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                          title="Close tab"
                          @click.stop="handleCloseVisit(visit.id)"
                        >
                          <X class="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </template>
                </draggable>
              </template>

              <button
                class="p-1.5 text-slate-400 hover:text-[#0052ff] transition-colors"
                @click="handleNewVisit"
                title="Create new visit for this patient"
              >
                <Plus class="w-4 h-4" />
              </button>
            </div>

            <PatientChartHeader
              :patient-info="patientInfo"
              :summary="summary"
              :show-validation="showValidation"
              :patient-fields-disabled="!patientFieldsEditable"
              :visit-fields-disabled="!chartEditable"
              @update:patient-info="chartStore.updatePatientInfo"
            />

            <!-- fieldset disables native inputs/checkboxes when read-only; the
                 store guard covers the div-based toggles (BoP/PI/fur/Ext). -->
            <fieldset :disabled="!chartEditable" class="border-0 p-0 m-0 min-w-0">
              <div class="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent" :class="isTouchDevice ? 'pb-96' : 'pb-4'">
                <AutoFitWrapper :enable-auto-fit="enableAutoFit">
                  <div class="min-w-max">
                    <PeriodontalChartGrid
                      :chart-data="teethData"
                      :selected-tooth-id="selectedToothId"
                      @select-tooth="chartStore.selectTooth"
                      @toggle-bop="chartStore.toggleBop"
                      @toggle-pi="chartStore.togglePi"
                      @toggle-fur="chartStore.toggleFur"
                      @update-pd="chartStore.updatePd"
                      @update-rec="chartStore.updateRec"
                      @update-mobility="chartStore.updateMobility"
                      @update-ktw="chartStore.updateKtw"
                      :get-field-validation="validationStore.getFieldValidation"
                      @validate-field="validationStore.setFieldValidation"
                      @toggle-extracted="chartStore.toggleExtracted"
                      @toggle-implant="chartStore.toggleImplant"
                    />
                  </div>
                </AutoFitWrapper>
              </div>
            </fieldset>
          </div>

          <ToothSidebarOverlay
            :is-open="selectedToothId !== null"
            :tooth-id="selectedToothId"
            :tooth-data="selectedToothData"
            :readonly="!chartEditable"
            @close="selectedToothId = null"
            @update-note="handleUpdateNote"
          />

          <!-- Overview Modal -->
          <ChartOverviewModal
            :show="showOverviewModal"
            :chart-data="teethData"
            @close="showOverviewModal = false"
          />

          <!-- Save Chart Confirmation Modal -->
          <ConfirmModal
            :show="showSaveConfirmModal"
            title="Save Chart"
            message="<span class='text-slate-800 font-bold text-lg block mb-1'>Do you want to save this chart?</span><span class='text-slate-500 font-normal'>Once saved, you can still click Edit to modify it later.</span>"
            confirm-text="Save"
            cancel-text="Cancel"
            @confirm="confirmSaveChart"
            @cancel="showSaveConfirmModal = false"
          />

          <!-- Close Tab Warning Modal -->
          <ConfirmModal
            :show="showCloseTabWarningModal"
            title="Unsaved Changes"
            message="<span class='text-slate-800 font-bold text-lg block mb-1'>This chart has not been saved.</span><span class='text-slate-500 font-normal'>Are you sure you want to close this tab? Your data will be lost.</span>"
            confirm-text="Close Tab"
            cancel-text="Cancel"
            type="danger"
            @confirm="confirmCloseTab"
            @cancel="showCloseTabWarningModal = false"
          />

          <!-- Unsaved X-ray Board Warning -->
          <ConfirmModal
            :show="showXrayLeaveWarningModal"
            title="Leave without saving?"
            message="<span class='text-slate-500 font-normal'>Any unsaved changes will be lost.</span>"
            confirm-text="Leave"
            cancel-text="Stay"
            type="danger"
            @confirm="confirmLeaveXray"
            @cancel="cancelLeaveXray"
          />

          <!-- Draft Recovery Modal -->
          <ConfirmModal
            :show="showDraftRecoveryModal"
            title="Draft Found"
            :message="`<span class='text-slate-800 font-bold text-lg block mb-1'>Found unsaved chart data for ${patientInfo.patientName || 'patient'}.</span><span class='text-slate-500 font-normal'>Do you want to recover this data to continue working?</span>`"
            confirm-text="Recover Data"
            cancel-text="Discard Data"
            @confirm="showDraftRecoveryModal = false"
            @cancel="discardDraft"
          />

          <!-- Cancel Edit Confirmation Modal -->
          <ConfirmModal
            :show="showCancelEditConfirmModal"
            title="Cancel Editing"
            message="<span class='text-slate-800 font-bold text-lg block mb-1'>Are you sure you want to cancel?</span><span class='text-slate-500 font-normal'>Any unsaved changes will be lost.</span>"
            confirm-text="Discard Changes"
            cancel-text="Continue Editing"
            type="danger"
            @confirm="confirmCancelEdit"
            @cancel="showCancelEditConfirmModal = false"
          />

          <!-- Virtual Numpad -->
          <VirtualNumpad />
        </div>
      </template>
    </main>
  </div>
</template>
