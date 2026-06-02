<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { Download, FileText, Image as ImageIcon, Plus, Save, Stethoscope, X, Loader2 } from 'lucide-vue-next'
import Navbar from '@/components/layout/Navbar.vue'
import ChartLegend from '@/components/chart/ChartLegend.vue'
import ChartOverviewModal from '@/components/chart/ChartOverviewModal.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import PatientChartHeader from '@/components/chart/PatientChartHeader.vue'
import PeriodontalChartGrid from '@/components/chart/PeriodontalChartGrid.vue'
import ToothSidebarOverlay from '@/components/chart/ToothSidebarOverlay.vue'
import PatientDrawer from '@/components/patients/PatientDrawer.vue'
import { usePeriodontalChartStore } from '@/stores/periodontal-chart'
import { useClinicalValidationStore } from '@/stores/clinical-validation'
import { useVisitStore } from '@/stores/visit'
import { useNotificationStore } from '@/stores/notification'
import type { ToothId } from '@/domain/chart/chart.types'
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const chartStore = usePeriodontalChartStore()
chartStore.initializeChart()
const validationStore = useClinicalValidationStore()
const visitStore = useVisitStore()
const notifStore = useNotificationStore()

const drawerOpen = ref(false)

// Read visitId from URL query params
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
      await chartStore.loadFromBackend(visitId)
    } catch (error) {
      console.error('Failed to load chart:', error)
    }
  } else if (visitId) {
    urlVisitId.value = visitId
    visitStore.setActiveVisit(visitId)
    try {
      await chartStore.loadFromBackend(visitId)
    } catch (error) {
      console.error('Failed to load chart:', error)
    }
  }
})

// Watch for visitId changes (when user navigates to different visit)
watch(() => route.query.visitId, async (newVisitId) => {
  if (newVisitId && typeof newVisitId === 'string') {
    urlVisitId.value = newVisitId
    visitStore.setActiveVisit(newVisitId)
    try {
      await chartStore.loadFromBackend(newVisitId)
    } catch (error) {
      console.error('Failed to load chart:', error)
    }
  }
})

const {
  patientInfo,
  teethData,
  selectedToothId,
  selectedToothData,
  activeSubNav,
  summary,
  charts,
  activeChartId
} = storeToRefs(chartStore)

const editingChartId = ref<string | null>(null)
const editingChartName = ref('')
const showOverviewModal = ref(false)
const showDeleteConfirmModal = ref(false)
const showSaveConfirmModal = ref(false)
const chartToDelete = ref<string | null>(null)
const showValidation = ref(false)

const handleUpdateNote = ({ id, note }: { id: string | number; note: string }) => {
  chartStore.updateNote(Number(id) as ToothId, note)
}

const handleNewChart = () => {
  chartStore.createNewChart()
}

const isSaving = ref(false)

const handleSaveClick = () => {
  if (isSaving.value) return
  // Show validation errors first
  showValidation.value = true
  // Check if required fields are filled
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
    
    // Replace mock/old visitId in route query with the resolved visitId from the store
    const activeVisitId = visitStore.activeVisitId
    if (activeVisitId && route.query.visitId !== activeVisitId) {
      router.replace({ query: { ...route.query, visitId: activeVisitId } })
    }
  } catch (error) {
    console.error('Failed to save chart:', error)
  } finally {
    isSaving.value = false
  }
}

const handleSwitchChart = (chartId: string) => {
  chartStore.switchChart(chartId)
}

const handleDeleteChart = (chartId: string, event: Event) => {
  event.stopPropagation()
  if (charts.value.length <= 1) return
  chartToDelete.value = chartId
  showDeleteConfirmModal.value = true
}

const confirmDeleteChart = () => {
  if (chartToDelete.value) {
    chartStore.deleteChart(chartToDelete.value)
  }
  showDeleteConfirmModal.value = false
  chartToDelete.value = null
}

const cancelDeleteChart = () => {
  showDeleteConfirmModal.value = false
  chartToDelete.value = null
}

const startEditingChartName = (chart: { id: string; name: string }) => {
  editingChartId.value = chart.id
  editingChartName.value = chart.name
}

const finishEditingChartName = () => {
  if (editingChartId.value && editingChartName.value.trim()) {
    chartStore.updateChartName(editingChartId.value, editingChartName.value.trim())
  }
  editingChartId.value = null
  editingChartName.value = ''
}

const cancelEditingChartName = () => {
  editingChartId.value = null
  editingChartName.value = ''
}

const handleChartNameKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    finishEditingChartName()
  } else if (e.key === 'Escape') {
    cancelEditingChartName()
  }
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

    <!-- Tooth Sidebar -->

    <main class="max-w-400 mx-auto px-4 py-3">
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
          <button class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-[11px] shadow-sm hover:bg-slate-50 transition-colors" @click="handleNewChart">
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
          <!-- Chart Tabs -->
          <div class="flex items-center gap-0 relative z-10">
            <div
              v-for="chart in charts"
              :key="chart.id"
              class="relative group"
              @click="editingChartId !== chart.id && handleSwitchChart(chart.id)"
            >
              <div
                class="px-4 py-1.5 rounded-t-xl border-t border-l border-r text-[10px] font-black flex items-center gap-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] -mb-px transition-all cursor-pointer"
                :class="chart.id === activeChartId
                  ? 'bg-white border-slate-200 text-[#0052ff]'
                  : 'bg-slate-100 border-transparent text-slate-400 hover:text-slate-600'"
              >
                <template v-if="editingChartId === chart.id">
                  <input
                    v-model="editingChartName"
                    @blur="finishEditingChartName"
                    @keydown="handleChartNameKeydown"
                    @click.stop
                    class="w-24 bg-slate-100 text-[10px] font-black outline-none px-1 rounded"
                    ref="chartNameInput"
                  >
                </template>
                <template v-else>
                  <span @dblclick="startEditingChartName(chart)" class="max-w-20 truncate">{{ chart.name }}</span>
                </template>
                <X
                  v-if="charts.length > 1"
                  class="w-3 h-3 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                  @click="handleDeleteChart(chart.id, $event)"
                />
              </div>
            </div>
            <button
              class="p-1.5 text-slate-400 hover:text-[#0052ff] transition-colors"
              @click="handleNewChart"
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

        <!-- Delete Chart Confirmation Modal -->
        <ConfirmModal
          :show="showDeleteConfirmModal"
          title="Delete Chart"
          message="Are you sure you want to delete this chart?<br>This action cannot be undone."
          confirm-text="Delete"
          cancel-text="Cancel"
          type="danger"
          @confirm="confirmDeleteChart"
          @cancel="cancelDeleteChart"
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
    </main>
  </div>
</template>
