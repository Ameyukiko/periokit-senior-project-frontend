<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { Download, FileText, Image as ImageIcon, Plus, Save, Stethoscope, Loader2 } from 'lucide-vue-next'
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
import { ref, watch, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const chartStore = usePeriodontalChartStore()
chartStore.initializeChart()
const validationStore = useClinicalValidationStore()
const visitStore = useVisitStore()
const notifStore = useNotificationStore()

const drawerOpen = ref(false)
const urlVisitId = ref<string | null>(null)

onMounted(async () => {
  const visitId = route.query.visitId as string | undefined
  const patientId = route.query.patientId as string | undefined

  if (patientId && visitId) {
    urlVisitId.value = visitId
    try {
      await chartStore.loadPatientById(patientId)
      await visitStore.loadVisits(patientId)
      visitStore.setActiveVisit(visitId)
      if (visitId !== 'new') {
        await chartStore.loadFromBackend(visitId)
      } else {
        chartStore.resetChart()
      }
    } catch (error) {
      console.error('Failed to load chart:', error)
    }
  } else if (patientId) {
    visitStore.setActiveVisit(null)
    chartStore.resetChart()
    try {
      await Promise.all([
        chartStore.loadPatientById(patientId),
        visitStore.loadVisits(patientId),
      ])
    } catch (error) {
      console.error('Failed to load patient:', error)
    }
  } else if (visitId) {
    urlVisitId.value = visitId
    visitStore.setActiveVisit(visitId)
    if (visitId !== 'new') {
      try {
        await chartStore.loadFromBackend(visitId)
      } catch (error) {
        console.error('Failed to load chart:', error)
      }
    } else {
      chartStore.resetChart()
    }
  } else {
    visitStore.setActiveVisit(null)
    chartStore.resetChart()
  }
})

// Watch for visitId changes (when user navigates to different visit)
watch(() => route.query.visitId, async (newVisitId) => {
  if (newVisitId && typeof newVisitId === 'string') {
    urlVisitId.value = newVisitId
    visitStore.setActiveVisit(newVisitId)
    if (newVisitId !== 'new') {
      try {
        await chartStore.loadFromBackend(newVisitId)
      } catch (error) {
        console.error('Failed to load chart:', error)
      }
    } else {
      chartStore.resetChart()
    }
  } else if (newVisitId === undefined && route.query.patientId === undefined) {
    visitStore.setActiveVisit(null)
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
  await visitStore.loadVisits(newPatientId)
  if (visitStore.visits.length > 0) {
    await handleSwitchVisit(visitStore.visits[0].id)
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

const showOverviewModal = ref(false)
const showSaveConfirmModal = ref(false)
const showValidation = ref(false)

const handleUpdateNote = ({ id, note }: { id: string | number; note: string }) => {
  chartStore.updateNote(Number(id) as ToothId, note)
}

// Switch to a different visit (tab click)
const handleSwitchVisit = async (visitId: string) => {
  if (visitId === activeVisitId.value) return

  visitStore.setActiveVisit(visitId)

  // Update URL without page refresh
  router.replace({
    name: 'chart',
    query: { ...route.query, visitId }
  })

  // Load chart for this visit
  try {
    await chartStore.loadFromBackend(visitId)
  } catch (error) {
    console.error('Failed to load chart for visit:', error)
  }
}

// Close a visit tab (UI only — does not delete the visit on the backend).
const handleCloseVisit = async (visitId: string) => {
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

// Create a new visit for current patient
const handleNewVisit = async () => {
  const patientId = currentPatientId.value || route.query.patientId as string | undefined

  if (!patientId) {
    notifStore.error('Please select a patient first')
    return
  }

  try {
    // Create new visit for this patient
    const today = new Date().toISOString().split('T')[0]
    const newVisit = await visitStore.createVisit(patientId, today, 'before_hygienic')

    // Reset chart for new visit
    chartStore.resetChart()
    await chartStore.loadPatientById(patientId)

    // Update URL to new visit
    router.replace({
      name: 'chart',
      query: { patientId, visitId: newVisit.id }
    })
  } catch (error) {
    console.error('Failed to create new visit:', error)
    notifStore.error('Failed to create new visit')
  }
}

const isSaving = ref(false)

const handleSaveClick = () => {
  if (isSaving.value) return
  showValidation.value = true

  if (!patientInfo.value.hn) {
    notifStore.error('Please enter HN before saving')
    return
  }
  if (!patientInfo.value.patientName) {
    notifStore.error('Please enter patient name before saving')
    return
  }
  showSaveConfirmModal.value = true
}

const confirmSaveChart = async () => {
  showSaveConfirmModal.value = false
  if (isSaving.value) return
  isSaving.value = true
  try {
    await chartStore.saveToBackend()

    const activeVisit = activeVisitId.value
    if (activeVisit && route.query.visitId !== activeVisit) {
      router.replace({ query: { ...route.query, visitId: activeVisit } })
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

// Computed: show empty state if no patient selected
const hasPatient = computed(() => Boolean(currentPatientId.value || route.query.patientId))

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
            <button class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-[11px] shadow-sm hover:bg-slate-50 transition-colors" @click="handleNewVisit">
              <Plus class="w-3.5 h-3.5" /> New Visit
            </button>
            <button
              @click="handleSaveClick"
              :disabled="isSaving"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] shadow-md transition-colors"
              :class="[
                isSaving
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-50'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              ]"
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
            <!-- Visit Tabs -->
            <div class="flex items-center gap-0 relative z-10">
              <template v-if="visits.length === 0">
                <div class="px-4 py-2 text-xs text-slate-400 italic">
                  No visits yet. Click "New Visit" to create one.
                </div>
              </template>

              <template v-else>
                <div
                  v-for="visit in visits"
                  :key="visit.id"
                  class="relative group"
                  @click="handleSwitchVisit(visit.id)"
                >
                  <div
                    class="px-4 py-1.5 rounded-t-xl border-t border-l border-r text-[10px] font-black flex items-center gap-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] -mb-px transition-all cursor-pointer"
                    :class="visit.id === activeVisitId
                      ? 'bg-white border-slate-200 text-[#0052ff]'
                      : 'bg-slate-100 border-transparent text-slate-400 hover:text-slate-600'"
                  >
                    <span class="max-w-24 truncate">Visit #{{ visit.visitNumber || '-' }}</span>
                    <span class="text-[9px] text-slate-400 font-normal">{{ formatDate(visit.visitDate) }}</span>
                    <span v-if="!visit.hasChart" class="text-[8px] bg-amber-100 text-amber-600 px-1 rounded">Empty</span>
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
              @update:patient-info="chartStore.updatePatientInfo"
            />

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

          <ToothSidebarOverlay
            :is-open="selectedToothId !== null"
            :tooth-id="selectedToothId"
            :tooth-data="selectedToothData"
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
            message="Are you sure you want to save this chart?"
            confirm-text="Save"
            cancel-text="Cancel"
            @confirm="confirmSaveChart"
            @cancel="showSaveConfirmModal = false"
          />
        </div>
      </template>
    </main>
  </div>
</template>
