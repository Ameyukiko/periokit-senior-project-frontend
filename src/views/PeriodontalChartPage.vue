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
import ExportPanel from '@/components/export/ExportPanel.vue'
import { usePeriodontalChartStore } from '@/stores/periodontal-chart'
import { useClinicalValidationStore } from '@/stores/clinical-validation'
import { useVisitStore } from '@/stores/visit'
import { useXrayBoardStore } from '@/stores/xray-board'
import { useDiagnosisStore, resolveDiagnosisKey } from '@/stores/diagnosis'
import { useVisitSave } from '@/composables/useVisitSave'
import { useVisitLoad } from '@/composables/useVisitLoad'
import { useVisitTabs } from '@/composables/useVisitTabs'
import { useXrayLeaveGuard, XRAY_LEAVE_WARNING } from '@/composables/useXrayLeaveGuard'
import type { ToothId } from '@/domain/chart/chart.types'
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import draggable from 'vuedraggable'

const route = useRoute()
const router = useRouter()
const chartStore = usePeriodontalChartStore()
chartStore.initializeChart()
const validationStore = useClinicalValidationStore()
const visitStore = useVisitStore()
const diagnosisStore = useDiagnosisStore()
const { loadVisit } = useVisitLoad()

const drawerOpen = ref(false)
const urlVisitId = ref<string | null>(null)





async function enterNewVisitState() {


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







function keepDraftVisit(patientId: string) {
  visitStore.visits = []
  visitStore.addDraftVisit(
    patientId,
    chartStore.patientInfo.date || new Date().toISOString().split('T')[0],
    chartStore.patientInfo.visitPhase || 'before_hygienic',
  )
}












const hasOpenDraft = () => chartStore.isDirty && visitStore.activeVisitId === 'new'






const restoreOpenDraft = (
  patientId: string | null,
  extraQuery: Record<string, string | undefined> = {},
) => {
  keepDraftVisit(patientId ?? '')
  return navigate({
    name: 'chart',
    query: { ...(patientId ? { patientId } : {}), visitId: 'new', ...extraQuery },
  })
}



const draftRestored = ref(false)

onMounted(async () => {
  const visitId = route.query.visitId as string | undefined
  const patientId = route.query.patientId as string | undefined


  const requestedTab = route.query.tab
  const wantsTab =
    requestedTab === 'xray' || requestedTab === 'export' ? requestedTab : null

  const tabQuery = wantsTab ? { tab: wantsTab } : {}



  const hadDirtyWork = chartStore.isDirty
  const persistedPatientId = chartStore.currentPatientId








  const keepsDraft = (forPatientId?: string | null) =>
    hadDirtyWork && (persistedPatientId ?? null) === (forPatientId ?? null)







  const draftMatchesUrl =
    hasOpenDraft() && (!patientId || (persistedPatientId ?? null) === patientId)

  if (patientId && visitId) {
    urlVisitId.value = visitId
    const keepingDraft = visitId === 'new' && keepsDraft(patientId)






    if (!keepingDraft) chartStore.currentPatientId = null
    try {
      if (!keepingDraft) await chartStore.loadPatientById(patientId)
      const fetchedVisits = await visitStore.loadVisits(patientId)
      visitStore.setActiveVisit(visitId)
      if (visitId !== 'new') {
        const selectedVisit = fetchedVisits.find(v => v.id === visitId)
        if (selectedVisit) {
          visitStore.visits = [selectedVisit]
        } else {
          visitStore.visits = []
        }
        await loadVisit(visitId)
      } else if (keepingDraft) {
        keepDraftVisit(patientId)
      } else {
        visitStore.visits = []
        await enterNewVisitState()
      }
    } catch (error) {
      console.error('Failed to load chart:', error)
    }
  } else if (!visitId && draftMatchesUrl) {
    draftRestored.value = true
    const draftPatientId = patientId ?? persistedPatientId ?? null
    restoreOpenDraft(draftPatientId, tabQuery)
  } else if (patientId) {
    visitStore.setActiveVisit(null)
    chartStore.resetChart()
    try {
      await chartStore.loadPatientById(patientId)
      const fetchedVisits = await visitStore.loadVisits(patientId)

      if (fetchedVisits.length === 0) {
        visitStore.visits = []
        await enterNewVisitState()
        navigate({ name: 'chart', query: { patientId, visitId: 'new', ...tabQuery } })
      } else {

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


    const keepingDraft = visitId === 'new' && keepsDraft(null)
    chartStore.currentPatientId = null
    visitStore.setActiveVisit(visitId)
    if (visitId !== 'new') {
      try {
        await loadVisit(visitId)
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
    } else if (keepingDraft) {
      keepDraftVisit('')
    } else {
      visitStore.visits = []
      await enterNewVisitState()
    }
  } else {
    visitStore.visits = []
    await enterNewVisitState()
  }



  if (wantsTab) chartStore.activeSubNav = wantsTab
})











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


watch(() => route.query.visitId, async (newVisitId, oldVisitId) => {






  if (
    newVisitId === 'new' &&
    oldVisitId === undefined &&
    hasOpenDraft() &&
    ((route.query.patientId as string | undefined) ?? null) === chartStore.currentPatientId
  ) {
    urlVisitId.value = 'new'
    return
  }

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
        await loadVisit(newVisitId)
      } catch (error) {
        console.error('Failed to load chart:', error)
      }
    } else {
      await enterNewVisitState()
    }
  } else if (newVisitId === undefined && route.query.patientId === undefined) {



    if (hasOpenDraft()) {
      restoreOpenDraft(chartStore.currentPatientId)
      return
    }
    visitStore.clearVisits()
    chartStore.resetChart()
  }
})



watch(() => route.query.patientId, (newPatientId, oldPatientId) => {
  if (newPatientId === undefined && oldPatientId !== undefined && route.query.visitId === undefined) {

    if (hasOpenDraft()) {
      restoreOpenDraft(chartStore.currentPatientId)
      return
    }
    visitStore.clearVisits()
    chartStore.resetChart()
  }
})





watch(() => chartStore.currentPatientId, async (newPatientId, oldPatientId) => {
  if (!newPatientId || newPatientId === oldPatientId || oldPatientId === null) return
  visitStore.clearVisits()
  const fetchedVisits = await visitStore.loadVisits(newPatientId)
  if (fetchedVisits.length > 0) {

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



  editMode,
} = storeToRefs(chartStore)

const { visits, activeVisitId } = storeToRefs(visitStore)

const showOverviewModal = ref(false)
const showSaveConfirmModal = ref(false)
const showDraftRecoveryModal = ref(false)
const showValidation = ref(false)
const showCancelEditConfirmModal = ref(false)





const {
  showLeaveWarning: showXrayLeaveWarningModal,
  hasUnsavedBoard,
  isBypassing,
  navigate,
  guard: guardUnsavedXray,
  confirmLeave: confirmLeaveXray,
  cancelLeave: cancelLeaveXray,
  askBeforeLeaving,
} = useXrayLeaveGuard()


const enableAutoFit = ref(false)

const isTouchDevice = ref(false)
onMounted(() => {
  isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0
})

onBeforeRouteUpdate((to, from) => {



  const sameBoard =
    to.query.visitId === from.query.visitId && to.query.patientId === from.query.patientId
  if (isBypassing() || sameBoard || !hasUnsavedBoard()) return true
  return askBeforeLeaving(to)
})

onBeforeRouteLeave(to => {



  if (to.name !== 'chart' && to.name !== 'diagnosis') chartStore.editMode = false


  const toSameVisitDiagnosis =
    to.name === 'diagnosis' &&
    (to.query.visitId ?? null) === xrayVisitId.value &&
    (to.query.patientId ?? null) === xrayPatientId.value
  if (isBypassing() || toSameVisitDiagnosis || !hasUnsavedBoard()) return true
  return askBeforeLeaving(to)
})


const {
  showCloseTabWarning: showCloseTabWarningModal,
  switchVisit: handleSwitchVisit,
  closeVisit: handleCloseVisit,
  confirmCloseTab,
  cancelCloseTab,
  newVisit: handleNewVisit,
} = useVisitTabs({ navigate, guard: guardUnsavedXray, enterNewVisitState })




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



const { isSaving, validate, saveVisit } = useVisitSave()

const handleSaveClick = () => {
  if (isSaving.value) return


  showValidation.value = true
  if (!validate()) return
  showSaveConfirmModal.value = true
}

const confirmSaveChart = async () => {
  showSaveConfirmModal.value = false
  const saved = await saveVisit()
  if (!saved) return false

  const { visitId: activeVisit, patientId } = saved





  if (activeVisit && (route.query.visitId !== activeVisit || (patientId && route.query.patientId !== patientId))) {
    navigate({
      query: {
        ...route.query,
        visitId: activeVisit,
        ...(patientId ? { patientId } : {}),
      },
    })
  }
  return true
}

// Export tab: save chart + diagnosis (if needed) and the X-ray board before exporting.
const saveForExport = async () => {
  const needsVisitSave = activeVisitId.value === 'new' || chartStore.isDirty || diagnosisStore.isDirty
  if (needsVisitSave) {
    showValidation.value = true
    if (!validate() || !(await confirmSaveChart())) return false
  }
  if (hasUnsavedBoard()) return useXrayBoardStore().saveBoard()
  return true
}


const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}



const hasPatient = computed(() => {





  const isDraft = route.query.visitId === 'new' || activeVisitId.value === 'new'

  const hasNoQueryParams = !route.query.patientId && !route.query.visitId
  return isDraft || hasNoQueryParams || Boolean(currentPatientId.value || route.query.patientId)
})




const isNewPatientMode = computed(() => {
  return !route.query.patientId && !currentPatientId.value
})


const isXrayTab = computed(() => activeSubNav.value === 'xray' && hasPatient.value)
const xrayPatientId = computed(
  () => currentPatientId.value || (route.query.patientId as string) || null,
)
const xrayVisitId = computed(() => activeVisitId.value || (route.query.visitId as string) || null)




const isExistingVisit = computed(
  () => activeVisitId.value !== 'new' && activeVisitId.value !== null
)

const chartEditable = computed(
  () => !isExistingVisit.value || editMode.value
)

const patientFieldsEditable = computed(() => !isExistingVisit.value)




const buttonRowRef = ref<HTMLElement | null>(null)
const actionsFloating = ref(false)

const updateActionsFloating = () => {
  const rect = buttonRowRef.value?.getBoundingClientRect()

  const desktop = window.matchMedia('(min-width: 1280px) and (pointer: fine)').matches
  actionsFloating.value = desktop && !!rect && rect.bottom < 110
}



onMounted(() => {
  window.addEventListener('scroll', updateActionsFloating, { passive: true })
  window.addEventListener('resize', updateActionsFloating)
  updateActionsFloating()
})
onUnmounted(() => {
  window.removeEventListener('scroll', updateActionsFloating)
  window.removeEventListener('resize', updateActionsFloating)
})

const actionButtonShape = computed(() =>
  actionsFloating.value ? 'p-4 rounded-full shadow-lg' : 'px-3 py-1.5 rounded-lg shadow-sm'
)
const actionIconSize = computed(() => (actionsFloating.value ? 'w-5 h-5' : 'w-3.5 h-3.5'))


watch(chartEditable, value => { chartStore.readonly = !value }, { immediate: true })

watch(
  [activeVisitId, currentPatientId],
  ([newVisit, newPatient]) => {
    diagnosisStore.openFor(newVisit, newPatient)
  },
  { immediate: true },
)






watch(activeVisitId, (newVisitId, oldVisitId) => {
  if (oldVisitId === null || newVisitId === oldVisitId) return
  editMode.value = false
})

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

  const visitId = activeVisitId.value
  if (visitId && visitId !== 'new') {
    try { await loadVisit(visitId) } catch (e) { console.error(e) }
  }
  diagnosisStore.revertToSaved(resolveDiagnosisKey(activeVisitId.value, currentPatientId.value))
}





const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
  if (chartStore.isDirty || diagnosisStore.isDirty || hasUnsavedBoard()) {
    e.preventDefault()

    e.returnValue = ''
  }
}
onMounted(() => { window.addEventListener('beforeunload', beforeUnloadHandler) })
onUnmounted(() => { window.removeEventListener('beforeunload', beforeUnloadHandler) })




onMounted(() => {



  if (chartStore.isDirty && !route.query.visitId && !draftRestored.value) {
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


    <XrayBoardPanel
      v-if="isXrayTab"
      :patient-id="xrayPatientId"
      :visit-id="xrayVisitId"
    />


    <ExportPanel
      v-else-if="activeSubNav === 'export' && hasPatient"
      :patient-id="xrayPatientId"
      :visit-id="xrayVisitId"
      :save="saveForExport"
      @switch-visit="handleSwitchVisit"
    />

    <main v-else class="max-w-400 mx-auto px-4 py-3">


      <section
        v-if="!hasPatient"
        class="bg-white rounded-3xl shadow-md border border-slate-200 p-10 flex flex-col items-center gap-3 mt-3"
      >
        <Users class="w-8 h-8 text-slate-300" />
        <p class="text-[13px] font-bold text-slate-700">No patient open yet</p>
        <p class="text-[12px] text-slate-400 text-center max-w-100">
          The chart records one patient at a time. Open My Patients and select a patient to
          view or record visits.
        </p>
        <button
          class="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0052ff] text-white rounded-lg font-bold text-[11px] shadow-md hover:bg-blue-700 transition-colors"
          @click="router.push({ name: 'my-patients' })"
        >
          <Users class="w-3.5 h-3.5" /> My patients
        </button>
      </section>

      <template v-else>
        <div ref="buttonRowRef" class="flex flex-wrap items-center sm:justify-between gap-2 sm:gap-4 mb-3">
          <button
            class="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 flex items-center gap-1.5 shadow-sm hover:bg-slate-50 transition-all duration-500"
            :class="selectedToothId !== null ? 'xl:ml-18' : 'xl:ml-63'"
            @click="showOverviewModal = true"
          >
            <FileText class="w-3.5 h-3.5" /> Overview
          </button>

          <div class="flex flex-wrap items-center gap-2 xl:mr-50 max-sm:contents">
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




            <div :class="actionsFloating ? 'fixed bottom-8 right-8 z-40 flex items-center gap-2' : 'flex flex-wrap items-center gap-2 max-sm:contents'">

              <button
                v-if="isExistingVisit && !editMode"
                @click="handleEditVisit"
                class="flex items-center gap-1.5 bg-white border border-amber-400 text-amber-600 font-bold text-[11px] hover:bg-amber-50 transition-colors"
                :class="actionButtonShape"
                aria-label="Edit"
                title="Edit"
              >
                <Pencil :class="actionIconSize" /><span v-if="!actionsFloating">Edit</span>
              </button>


              <button
                v-if="isExistingVisit && editMode"
                @click="handleCancelEditClick"
                class="flex items-center gap-1.5 bg-white border border-red-300 text-red-600 font-bold text-[11px] hover:bg-red-50 transition-colors"
                :class="actionButtonShape"
                aria-label="Cancel"
                title="Cancel"
              >
                <X :class="actionIconSize" /><span v-if="!actionsFloating">Cancel</span>
              </button>


              <button
                v-if="chartEditable"
                @click="handleSaveClick"
                aria-label="Save Chart"
                title="Save Chart"
                :disabled="isSaving || (isExistingVisit && editMode && !chartStore.isDirty && !diagnosisStore.isDirty)"
                class="flex items-center gap-1.5 font-bold text-[11px] transition-colors"
                :class="[actionButtonShape, (isSaving || (isExistingVisit && editMode && !chartStore.isDirty && !diagnosisStore.isDirty)) ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-50' : 'bg-blue-600 text-white hover:bg-blue-700']"
              >
                <Loader2 v-if="isSaving" class="animate-spin" :class="actionIconSize" />
                <Save v-else :class="actionIconSize" />
                <span v-if="!actionsFloating">{{ isSaving ? 'Saving...' : 'Save Chart' }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="flex flex-col xl:flex-row gap-4 transition-all duration-500">
          <ChartLegend :is-sidebar-open="selectedToothId !== null" class="hidden xl:flex" />

          <div class="w-full xl:w-255 shrink-0 flex flex-col gap-0 transition-all duration-500 min-w-0">

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
            :patient-id="xrayPatientId"
            :visit-id="xrayVisitId"
            @close="selectedToothId = null"
            @update-note="handleUpdateNote"
          />


          <ChartOverviewModal
            :show="showOverviewModal"
            :chart-data="teethData"
            @close="showOverviewModal = false"
          />


          <ConfirmModal
            :show="showSaveConfirmModal"
            title="Save Chart"
            message="<span class='text-slate-800 font-bold text-lg block mb-1'>Do you want to save this chart?</span><span class='text-slate-500 font-normal'>Once saved, you can still click Edit to modify it later.</span>"
            confirm-text="Save"
            cancel-text="Cancel"
            @confirm="confirmSaveChart"
            @cancel="showSaveConfirmModal = false"
          />


          <ConfirmModal
            :show="showCloseTabWarningModal"
            title="Unsaved Changes"
            message="<span class='text-slate-800 font-bold text-lg block mb-1'>This chart has not been saved.</span><span class='text-slate-500 font-normal'>Are you sure you want to close this tab? Your data will be lost.</span>"
            confirm-text="Close Tab"
            cancel-text="Cancel"
            type="danger"
            @confirm="confirmCloseTab"
            @cancel="cancelCloseTab"
          />


          <ConfirmModal
            :show="showDraftRecoveryModal"
            title="Draft Found"
            :message="`<span class='text-slate-800 font-bold text-lg block mb-1'>Found unsaved chart data for ${patientInfo.patientName || 'patient'}.</span><span class='text-slate-500 font-normal'>Do you want to recover this data to continue working?</span>`"
            confirm-text="Recover Data"
            cancel-text="Discard Data"
            @confirm="showDraftRecoveryModal = false"
            @cancel="discardDraft"
          />


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


          <VirtualNumpad />
        </div>
      </template>
    </main>



    <ConfirmModal
      :show="showXrayLeaveWarningModal"
      :title="XRAY_LEAVE_WARNING.title"
      :message="XRAY_LEAVE_WARNING.message"
      :confirm-text="XRAY_LEAVE_WARNING.confirmText"
      :cancel-text="XRAY_LEAVE_WARNING.cancelText"
      type="danger"
      @confirm="confirmLeaveXray"
      @cancel="cancelLeaveXray"
    />
  </div>
</template>
