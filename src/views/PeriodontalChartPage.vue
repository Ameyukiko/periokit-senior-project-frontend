<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { Download, FileText, Image as ImageIcon, Plus, Save, Stethoscope, Loader2, X, Pencil } from 'lucide-vue-next'
import Navbar from '@/components/layout/Navbar.vue'
import ChartLegend from '@/components/chart/ChartLegend.vue'
import ChartOverviewModal from '@/components/chart/ChartOverviewModal.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import PatientChartHeader from '@/components/chart/PatientChartHeader.vue'
import PeriodontalChartGrid from '@/components/chart/PeriodontalChartGrid.vue'
import ToothSidebarOverlay from '@/components/chart/ToothSidebarOverlay.vue'
import PatientDrawer from '@/components/patients/VisitListPanel.vue'
import { usePeriodontalChartStore } from '@/stores/periodontal-chart'
import { useClinicalValidationStore } from '@/stores/clinical-validation'
import { useVisitStore } from '@/stores/visit'
import { useNotificationStore } from '@/stores/notification'
import type { ToothId } from '@/domain/chart/chart.types'
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import draggable from 'vuedraggable'

const route = useRoute()
const router = useRouter()
const chartStore = usePeriodontalChartStore()
chartStore.initializeChart()
const validationStore = useClinicalValidationStore()
const visitStore = useVisitStore()
const notifStore = useNotificationStore()

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

  // Capture persisted state before any mutations so we can detect a page reload
  // where the user had an unsaved draft for this patient.
  const hadDirtyWork = chartStore.isDirty
  const persistedPatientId = chartStore.currentPatientId

  if (patientId && visitId) {
    urlVisitId.value = visitId
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
        router.replace({ name: 'chart', query: { patientId, visitId: 'new' } })
      } else {
        // Redirect to the latest visit's chart (sorted by visitNumber)
        const sorted = [...fetchedVisits].sort((a, b) => (a.visitNumber ?? 0) - (b.visitNumber ?? 0))
        const latest = sorted[sorted.length - 1]
        visitStore.visits = [latest]
        router.replace({ name: 'chart', query: { patientId, visitId: latest.id } })
      }
    } catch (error) {
      console.error('Failed to load patient:', error)
    }
  } else if (visitId) {
    urlVisitId.value = visitId
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

// ID of the visit tab the user is trying to close (pending confirmation)
let pendingCloseVisitId: string | null = null

// Switch to a different visit (tab click)
const handleSwitchVisit = async (visitId: string) => {
  if (visitId === activeVisitId.value) return

  visitStore.setActiveVisit(visitId)

  router.replace({
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
    router.replace({ name: 'chart', query: { ...route.query, visitId: nextActiveId } })
    try {
      await chartStore.loadFromBackend(nextActiveId)
    } catch (error) {
      console.error('Failed to load chart for visit:', error)
    }
  } else {
    // No tabs left — clear the visit from the URL and blank the chart.
    const query = { ...route.query }
    delete query.visitId
    router.replace({ name: 'chart', query })
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
  // page into draft mode (blank chart, same patient).
  visitStore.setActiveVisit('new')
  router.replace({ name: 'chart', query: { patientId, visitId: 'new' } })
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
  const wasNewPatient = isNewPatientMode.value
  try {
    await chartStore.saveToBackend(true)

    editMode.value = false

    const activeVisit = activeVisitId.value
    const patientId = currentPatientId.value

    if (wasNewPatient && patientId) {
      router.push({ name: 'patient-visits', params: { patientId } })
      return
    }

    if (activeVisit && (route.query.visitId !== activeVisit || (patientId && route.query.patientId !== patientId))) {
      router.replace({
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
// Reset edit mode whenever the active visit changes.
watch(activeVisitId, () => { editMode.value = false })

const handleEditVisit = () => { editMode.value = true }

const handleCancelEditClick = () => {
  if (chartStore.isDirty) {
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
}

// --- beforeunload guard (crash/accidental tab close protection) ---
const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
  if (chartStore.isDirty) {
    e.preventDefault()
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
  <div class="min-h-screen bg-[#f1f5f9] font-sans text-[#1e293b]">
    <Navbar @toggle-drawer="drawerOpen = !drawerOpen" />
    <PatientDrawer v-model:open="drawerOpen" />

    <div class="bg-white border-b border-slate-200 py-1.5 sticky top-16 z-40">
      <div class="max-w-400 mx-auto px-4 flex items-center justify-center">
        <div class="inline-flex p-0.5 bg-slate-100/80 rounded-xl border border-slate-200">
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

    <main class="max-w-400 mx-auto px-4 py-3">
      <!-- Empty state when no patient selected -->
      <div v-if="!hasPatient" class="flex flex-col items-center justify-center py-20">
        <p class="text-slate-400 text-sm">Please select a patient from the drawer</p>
      </div>

      <template v-else>
        <div class="flex items-center justify-between mb-3">
          <button
            class="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 flex items-center gap-1.5 shadow-sm hover:bg-slate-50 transition-all duration-500"
            :class="selectedToothId !== null ? 'ml-18' : 'ml-63'"
            @click="showOverviewModal = true"
          >
            <FileText class="w-3.5 h-3.5" /> Overview
          </button>

          <div class="flex items-center gap-2 mr-50">
            <button class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#9333ea]/30 text-[#9333ea] rounded-lg font-bold text-[11px] shadow-sm hover:bg-purple-50 transition-colors">
              <Stethoscope class="w-3.5 h-3.5" /> Diagnosis
            </button>
            <button v-if="!isNewPatientMode" class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-[11px] shadow-sm hover:bg-slate-50 transition-colors" @click="handleNewVisit">
              <Plus class="w-3.5 h-3.5" /> New Visit
            </button>

            <!-- Edit button: existing draft, not yet in edit mode -->
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
              :disabled="isSaving"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] shadow-md transition-colors"
              :class="isSaving ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-50' : 'bg-blue-600 text-white hover:bg-blue-700'"
            >
              <Loader2 v-if="isSaving" class="w-3.5 h-3.5 animate-spin" />
              <Save v-else class="w-3.5 h-3.5" />
              {{ isSaving ? 'Saving...' : 'Save Chart' }}
            </button>
          </div>
        </div>

        <div class="flex gap-4 transition-all duration-500">
          <ChartLegend :is-sidebar-open="selectedToothId !== null" />

          <div class="w-255 max-w-full shrink-0 flex flex-col gap-0 transition-all duration-500">
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
            message="Do you want to save this chart?<br/>Once saved, you can still click Edit to modify it later."
            confirm-text="Save"
            cancel-text="Cancel"
            @confirm="confirmSaveChart"
            @cancel="showSaveConfirmModal = false"
          />

          <!-- Close Tab Warning Modal -->
          <ConfirmModal
            :show="showCloseTabWarningModal"
            title="Unsaved Changes"
            message="This chart has <strong>not been saved</strong>.<br/>Are you sure you want to close this tab? Your data will be lost."
            confirm-text="Close Tab"
            cancel-text="Cancel"
            type="danger"
            @confirm="confirmCloseTab"
            @cancel="showCloseTabWarningModal = false"
          />

          <!-- Draft Recovery Modal -->
          <ConfirmModal
            :show="showDraftRecoveryModal"
            title="Draft Found"
            :message="`Found unsaved chart data for <strong>${patientInfo.patientName || 'patient'}</strong>.<br/>Do you want to recover this data to continue working?`"
            confirm-text="Recover Data"
            cancel-text="Discard Data"
            @confirm="showDraftRecoveryModal = false"
            @cancel="discardDraft"
          />

          <!-- Cancel Edit Confirmation Modal -->
          <ConfirmModal
            :show="showCancelEditConfirmModal"
            title="Cancel Editing"
            message="Are you sure you want to cancel?<br/>Any unsaved changes will be lost."
            confirm-text="Discard Changes"
            cancel-text="Continue Editing"
            type="danger"
            @confirm="confirmCancelEdit"
            @cancel="showCancelEditConfirmModal = false"
          />
        </div>
      </template>
    </main>
  </div>
</template>
