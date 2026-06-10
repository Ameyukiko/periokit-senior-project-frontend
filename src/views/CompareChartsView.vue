<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Navbar from '../components/layout/Navbar.vue'
import PeriodontalChartGrid from '../components/chart/PeriodontalChartGrid.vue'
import CompareSidebarCard from '../components/chart/CompareSidebarCard.vue'
import CompareSummaryCard from '../components/chart/CompareSummaryCard.vue'
import ChartOverviewModal from '../components/chart/ChartOverviewModal.vue'
import PatientDrawer from '@/components/patients/VisitListPanel.vue'
import { ArrowLeft, ArrowRight, Activity } from 'lucide-vue-next'
import { visitApi, type Visit } from '../services/api/visit.api'
import { chartApi } from '../services/api/chart.api'
import { mapPayloadToChart } from '@/domain/chart/chart.mapper'
import { calculateChartSummary } from '@/domain/chart/chart.calculations'
import type { ChartData, ToothId } from '@/domain/chart/chart.types'
import { UPPER_ARCH, LOWER_ARCH } from '@/domain/chart/chart.constants'
import { getToothColumnWidth } from '@/domain/chart/chart.image'

const route = useRoute()
const router = useRouter()

const patientId = route.query.patientId as string
const selectedVisitIdA = ref(route.query.visitA as string)
const selectedVisitIdB = ref(route.query.visitB as string)

const visits = ref<Visit[]>([])
const chartDataA = ref<ChartData | null>(null)
const chartDataB = ref<ChartData | null>(null)

const isLoading = ref(false)

const selectedToothId = ref<ToothId | null>(null)
const archFilter = ref<'upper' | 'lower'>('upper')
const summaryMode = ref(true)
const showOverviewA = ref(false)
const showOverviewB = ref(false)
const showSummaryA = ref(false)
const showSummaryB = ref(false)
const drawerOpen = ref(false)

// Scale-to-fit logic for compare chart blocks
const chartWrapperRef = ref<HTMLElement | null>(null)
const chartContentRefA = ref<HTMLElement | null>(null)
const chartScale = ref(1)
const scaledChartHeight = ref(0)

const getChartNaturalWidth = () => {
  const groups = archFilter.value === 'lower' ? LOWER_ARCH : UPPER_ARCH
  const teethWidth = groups.reduce((total, group) => {
    return total + group.reduce((s, id) => s + getToothColumnWidth(id), 0) + 4 // +4 for group borders
  }, 0)
  return 80 + teethWidth + (groups.length - 1) * 16 + 24 // label + gaps + padding
}

const updateScaleAndHeight = async () => {
  if (!chartWrapperRef.value) return
  const containerWidth = chartWrapperRef.value.clientWidth
  const naturalWidth = getChartNaturalWidth()
  chartScale.value = Math.min(1, containerWidth / naturalWidth)
  await nextTick()
  if (chartContentRefA.value) {
    scaledChartHeight.value = chartContentRefA.value.scrollHeight * chartScale.value
  }
}

const chartScaleStyle = computed(() => ({
  transform: `scale(${chartScale.value})`,
  transformOrigin: 'top left',
  width: chartScale.value < 1 ? `${(100 / chartScale.value).toFixed(2)}%` : '100%'
}))

let resizeObserver: ResizeObserver | null = null

const visitA = computed(() => visits.value.find(v => v.id === selectedVisitIdA.value))
const visitB = computed(() => visits.value.find(v => v.id === selectedVisitIdB.value))

const summaryA = computed(() => chartDataA.value ? calculateChartSummary(chartDataA.value) : null)
const summaryB = computed(() => chartDataB.value ? calculateChartSummary(chartDataB.value) : null)

const fetchPatientVisits = async () => {
  if (!patientId) return
  try {
    const data = await visitApi.getByPatient(patientId)
    // Only visits that have charts
    visits.value = data.filter(v => v.hasChart).sort(
      (a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime() || a.id.localeCompare(b.id)
    )
  } catch (error) {
    console.error('Failed to fetch visits:', error)
  }
}

const loadChartData = async (visitId: string): Promise<ChartData | null> => {
  if (!visitId) return null
  try {
    const res = await chartApi.getByVisit(visitId)
    const raw = res.data?.chartByVisit
    if (!raw?.teethData) return null
    const rehydrated = mapPayloadToChart({
      chart_name: raw.chartName || '',
      patient_info: raw.patientInfo || {} as any,
      teeth: raw.teethData,
      summary: raw.summary as any
    })
    return rehydrated.teethData
  } catch (e) {
    console.error('Failed to load chart data for visit', visitId, e)
    return null
  }
}

const refreshCharts = async () => {
  isLoading.value = true
  const [dataA, dataB] = await Promise.all([
    loadChartData(selectedVisitIdA.value),
    loadChartData(selectedVisitIdB.value)
  ])
  chartDataA.value = dataA
  chartDataB.value = dataB
  isLoading.value = false
}

const canCompare = computed(() => !!selectedVisitIdA.value && !!selectedVisitIdB.value)

onMounted(async () => {
  await fetchPatientVisits()
  if (canCompare.value) await refreshCharts()
  await nextTick()
  resizeObserver = new ResizeObserver(updateScaleAndHeight)
  if (chartWrapperRef.value) resizeObserver.observe(chartWrapperRef.value)
  await updateScaleAndHeight()
})

onUnmounted(() => resizeObserver?.disconnect())

watch([chartDataA, archFilter], async () => {
  if (chartDataA.value) await updateScaleAndHeight()
})

// Re-run the comparison automatically whenever either visit selection changes.
watch([selectedVisitIdA, selectedVisitIdB], async () => {
  if (!canCompare.value) return
  selectedToothId.value = null
  router.replace({
    name: 'compare-charts',
    query: {
      patientId,
      visitA: selectedVisitIdA.value,
      visitB: selectedVisitIdB.value
    }
  })
  await refreshCharts()
})

const handleToothClick = (toothId: ToothId) => {
  selectedToothId.value = selectedToothId.value === toothId ? null : toothId
}

const formatDate = (dateString?: string) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

const goBack = () => {
  router.push({ name: 'patient-visits', params: { patientId } })
}
</script>

<template>
  <div class="min-h-screen bg-[#f1f5f9] font-sans flex flex-col h-screen overflow-hidden">
    <Navbar @toggle-drawer="drawerOpen = !drawerOpen" />
    <PatientDrawer v-model:open="drawerOpen" />

    <main
      class="flex-1 overflow-y-auto px-4 xl:px-6 xl:px-8 py-8 relative transition-[padding] duration-300 ease-out"
      style="zoom: 0.9;"
    >
      <div class="max-w-7xl mx-auto mb-4 flex items-center gap-4">
        <button @click="goBack" class="group flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-slate-600 hover:text-[#0052ff] hover:border-[#0052ff] hover:bg-blue-50 font-medium text-sm shadow-sm transition-all w-fit">
          <ArrowLeft class="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          BACK
        </button>
        <h1 class="text-3xl font-black text-slate-900 mx-auto absolute left-1/2 -translate-x-1/2">
          Compare Charts
        </h1>
      </div>

      <div class="flex flex-col xl:flex-row gap-6 max-w-[1600px] mx-auto items-start justify-center transition-all duration-500">
        <!-- Main container -->
        <div class="flex-1 max-w-7xl w-full space-y-6 transition-all duration-500 min-w-0">
        <!-- Select Visits to Compare -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
          <h2 class="text-sm font-bold text-slate-800 mb-4">Select Visits to Compare</h2>
          <div class="flex flex-col xl:flex-row items-center gap-4 xl:gap-6 justify-between">
            <div class="flex-1 w-full xl:w-auto">
              <label class="block text-xs font-medium text-slate-500 mb-1">First Visit (Top)</label>
              <div class="relative">
                <select v-model="selectedVisitIdA" class="w-full appearance-none bg-slate-100 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-[#0052ff] focus:border-transparent font-medium">
                  <option v-for="v in visits" :key="v.id" :value="v.id">
                    Visit #{{ v.visitNumber }} - {{ formatDate(v.visitDate) }}
                  </option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
            
            <div class="flex items-center justify-center pt-0 xl:pt-5">
              <ArrowRight class="w-6 h-6 text-slate-400 rotate-90 xl:rotate-0" />
            </div>

            <div class="flex-1 w-full xl:w-auto">
              <label class="block text-xs font-medium text-slate-500 mb-1">Second Visit (Bottom)</label>
              <div class="relative">
                <select v-model="selectedVisitIdB" class="w-full appearance-none bg-slate-100 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-[#0052ff] focus:border-transparent font-medium">
                  <option v-for="v in visits" :key="v.id" :value="v.id">
                    Visit #{{ v.visitNumber }} - {{ formatDate(v.visitDate) }}
                  </option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Chart Comparison -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 min-h-[500px]">
          <h2 class="text-sm font-bold text-slate-800 mb-6">Chart Comparison</h2>

          <div v-if="isLoading" class="flex justify-center items-center py-20 text-slate-400">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0052ff]"></div>
          </div>
          
          <div v-else-if="chartDataA && chartDataB" class="flex gap-6 items-start">

            <!-- Charts column -->
            <div class="flex-1 min-w-0 space-y-6 transition-all duration-300">

              <!-- Header Row 1 -->
              <div class="flex flex-col xl:flex-row items-center w-full gap-3 xl:gap-4 mb-4">
                <!-- Arch Toggle -->
                <div class="flex bg-slate-100 p-1 rounded-full border border-slate-200 w-full xl:w-[140px] justify-center shrink-0">
                  <button
                    @click="archFilter = 'upper'"
                    :class="['px-4 py-1.5 rounded-full text-xs font-bold transition-all w-1/2', archFilter === 'upper' ? 'bg-[#0052ff] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700']"
                  >
                    Upper
                  </button>
                  <button
                    @click="archFilter = 'lower'"
                    :class="['px-4 py-1.5 rounded-full text-xs font-bold transition-all w-1/2', archFilter === 'lower' ? 'bg-[#0052ff] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700']"
                  >
                    Lower
                  </button>
                </div>
                
                <!-- Summary (Long Bar) -->
                <!-- Summary (Long Bar) -->
                <button
                  @click="showSummaryA = true"
                  :class="['flex-1 w-full flex justify-center items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold uppercase tracking-widest transition-all duration-300 border', showSummaryA ? 'bg-[#0052ff] text-white border-[#0052ff] shadow-md shadow-blue-500/20' : 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100 hover:border-blue-200']"
                >
                  <Activity class="w-4 h-4" /> summary
                </button>

                <!-- Overview Button -->
                <button @click="showOverviewA = true" class="w-full xl:w-auto shrink-0 flex justify-center items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  Overview
                </button>
              </div>

              <!-- Visit 1 -->
              <div class="compare-chart-block bg-white border border-teal-600/80 rounded-[32px] overflow-hidden p-4 xl:p-6 xl:px-8">
                <div class="flex justify-center mb-6">
                  <h3 class="text-xl font-medium text-slate-800">Visit {{ visitA?.visitNumber }}</h3>
                </div>
                <div ref="chartWrapperRef" class="w-full overflow-hidden" :style="scaledChartHeight ? { height: `${scaledChartHeight}px` } : {}">
                  <div ref="chartContentRefA" :style="chartScaleStyle">
                    <PeriodontalChartGrid
                      :key="selectedVisitIdA"
                      :chart-data="chartDataA"
                      :selected-tooth-id="selectedToothId"
                      :readonly="true"
                      :arch-filter="archFilter"
                      :summary-mode="summaryMode"
                      :fit-width="true"
                      :get-field-validation="() => 'none'"
                      @tooth-click="handleToothClick"
                    />
                  </div>
                </div>
              </div>

              <!-- Header Row 2 -->
              <div class="flex flex-col xl:flex-row items-center w-full gap-3 xl:gap-4 pt-2 mb-4">
                <div class="w-full xl:w-[140px] hidden xl:block shrink-0"></div>
                <!-- Summary (Long Bar) -->
                <!-- Summary (Long Bar) -->
                <button
                  @click="showSummaryB = true"
                  :class="['flex-1 w-full flex justify-center items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold uppercase tracking-widest transition-all duration-300 border', showSummaryB ? 'bg-[#0052ff] text-white border-[#0052ff] shadow-md shadow-blue-500/20' : 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100 hover:border-blue-200']"
                >
                  <Activity class="w-4 h-4" /> summary
                </button>

                <button @click="showOverviewB = true" class="w-full xl:w-auto shrink-0 flex justify-center items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  Overview
                </button>
              </div>

              <!-- Visit 2 -->
              <div class="compare-chart-block bg-white border border-teal-600/80 rounded-[32px] overflow-hidden p-4 xl:p-6 xl:px-8">
                <div class="flex justify-center mb-6">
                  <h3 class="text-xl font-medium text-slate-800">Visit {{ visitB?.visitNumber }}</h3>
                </div>
                <div class="w-full overflow-hidden" :style="scaledChartHeight ? { height: `${scaledChartHeight}px` } : {}">
                  <div :style="chartScaleStyle">
                    <PeriodontalChartGrid
                      :key="selectedVisitIdB"
                      :chart-data="chartDataB"
                      :selected-tooth-id="selectedToothId"
                      :readonly="true"
                      :arch-filter="archFilter"
                      :summary-mode="summaryMode"
                      :fit-width="true"
                      :get-field-validation="() => 'none'"
                      @tooth-click="handleToothClick"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-20 text-slate-500 font-medium">
            Could not load chart data. Please ensure both visits have saved charts.
          </div>
        </div>
        </div>

        <!-- Combined dual-visit sidebar -->
        <CompareSidebarCard
          :open="!!selectedToothId"
          :tooth-id="selectedToothId"
          :tooth-data-a="selectedToothId ? (chartDataA?.[selectedToothId] ?? null) : null"
          :tooth-data-b="selectedToothId ? (chartDataB?.[selectedToothId] ?? null) : null"
          :visit-label-a="`Visit ${visitA?.visitNumber}`"
          :visit-label-b="`Visit ${visitB?.visitNumber}`"
          @close="selectedToothId = null"
        />
      </div>

      <!-- Summary Modals -->
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showSummaryA && summaryA"
          class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        >
          <div class="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" @click="showSummaryA = false"></div>
          <Transition
            appear
            enter-active-class="transition-all duration-250 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-2"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-2"
          >
            <div class="relative z-10 w-auto">
              <CompareSummaryCard :summary="summaryA" :label="`Visit ${visitA?.visitNumber}`" @close="showSummaryA = false" />
            </div>
          </Transition>
        </div>
      </Transition>

      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showSummaryB && summaryB"
          class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        >
          <div class="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" @click="showSummaryB = false"></div>
          <Transition
            appear
            enter-active-class="transition-all duration-250 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-2"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-2"
          >
            <div class="relative z-10 w-auto">
              <CompareSummaryCard :summary="summaryB" :label="`Visit ${visitB?.visitNumber}`" @close="showSummaryB = false" />
            </div>
          </Transition>
        </div>
      </Transition>

      <!-- Overview Modals -->
      <ChartOverviewModal
        v-if="chartDataA"
        :show="showOverviewA"
        :chart-data="chartDataA"
        @close="showOverviewA = false"
      />
      <ChartOverviewModal
        v-if="chartDataB"
        :show="showOverviewB"
        :chart-data="chartDataB"
        @close="showOverviewB = false"
      />
    </main>
  </div>
</template>
