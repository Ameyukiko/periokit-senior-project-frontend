<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Navbar from '../components/layout/Navbar.vue'
import PeriodontalChartGrid from '../components/chart/PeriodontalChartGrid.vue'
import CompareSidebarCard from '../components/chart/CompareSidebarCard.vue'
import { ArrowLeft, ArrowRight } from 'lucide-vue-next'
import { visitApi, type Visit } from '../services/api/visit.api'
import { chartApi } from '../services/api/chart.api'
import { mapPayloadToChart } from '@/domain/chart/chart.mapper'
import { UPPER_TEETH, LOWER_TEETH } from '@/domain/chart/chart.constants'
import type { ChartData, ToothId } from '@/domain/chart/chart.types'

const route = useRoute()
const router = useRouter()

const patientId = route.query.patientId as string
const selectedVisitIdA = ref(route.query.visitA as string)
const selectedVisitIdB = ref(route.query.visitB as string)

const visits = ref<Visit[]>([])
const chartDataA = ref<ChartData | null>(null)
const chartDataB = ref<ChartData | null>(null)

const isLoading = ref(true)

const selectedToothId = ref<ToothId | null>(null)
const archFilter = ref<'upper' | 'lower'>('upper')

const visitA = computed(() => visits.value.find(v => v.id === selectedVisitIdA.value))
const visitB = computed(() => visits.value.find(v => v.id === selectedVisitIdB.value))

// Place the sidebar on the side opposite the clicked tooth so it never covers it.
// Teeth in the right half of the arch row → sidebar on the left, and vice versa.
const sidebarOnLeft = computed(() => {
  const id = selectedToothId.value
  if (id == null) return false
  const row = UPPER_TEETH.includes(Number(id)) ? UPPER_TEETH : LOWER_TEETH
  return row.indexOf(Number(id)) >= row.length / 2
})

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

onMounted(async () => {
  await fetchPatientVisits()
  await refreshCharts()
})

watch([selectedVisitIdA, selectedVisitIdB], async () => {
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
    <Navbar />

    <main class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      <div class="max-w-7xl mx-auto mb-4 flex items-center gap-4">
        <button @click="goBack" class="group flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-slate-600 hover:text-[#0052ff] hover:border-[#0052ff] hover:bg-blue-50 font-medium text-sm shadow-sm transition-all w-fit">
          <ArrowLeft class="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          BACK
        </button>
        <h1 class="text-3xl font-black text-slate-900 mx-auto absolute left-1/2 -translate-x-1/2">
          Compare Charts
        </h1>
      </div>

      <div class="max-w-7xl mx-auto space-y-6">
        <!-- Select Visits to Compare -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
          <h2 class="text-sm font-bold text-slate-800 mb-4">Select Visits to Compare</h2>
          <div class="flex items-center gap-6 justify-between">
            <div class="flex-1">
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
            
            <div class="flex items-center justify-center pt-5">
              <ArrowRight class="w-6 h-6 text-slate-400" />
            </div>

            <div class="flex-1">
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
          
          <div v-else-if="chartDataA && chartDataB" class="space-y-6 relative">
            
            <!-- Header Row 1 -->
            <div class="flex items-center justify-between">
              <!-- Arch Toggle -->
              <div class="flex bg-slate-100 p-1 rounded-full border border-slate-200 w-[140px] justify-center">
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
              <div class="text-xs font-black text-slate-700">summary</div>
              <button class="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                Overview
              </button>
            </div>

            <!-- Visit 1 -->
            <div class="compare-chart-block relative bg-white border border-teal-600/80 rounded-[32px] overflow-hidden p-6 px-8">
              <div class="flex justify-center mb-6">
                 <h3 class="text-xl font-medium text-slate-800">Visit {{ visitA?.visitNumber }}</h3>
              </div>
              <PeriodontalChartGrid
                :key="selectedVisitIdA"
                :chart-data="chartDataA"
                :selected-tooth-id="selectedToothId"
                :readonly="true"
                :arch-filter="archFilter"
                :summary-mode="true"
                :get-field-validation="() => 'none'"
                @tooth-click="handleToothClick"
              />
              
              <!-- Floating Sidebar Visit 1 -->
              <div v-if="selectedToothId" :class="['absolute top-6 bottom-6 w-[320px] shadow-2xl rounded-3xl animate-in fade-in duration-200 z-50', sidebarOnLeft ? 'left-6 slide-in-from-left-8' : 'right-6 slide-in-from-right-8']">
                <CompareSidebarCard
                  :tooth-id="selectedToothId"
                  :tooth-data="chartDataA?.[selectedToothId]"
                  :visit-label="`Visit ${visitA?.visitNumber}`"
                  :readonly="true"
                  @close="selectedToothId = null"
                />
              </div>
            </div>

            <!-- Header Row 2 -->
            <div class="flex items-center justify-between pt-2">
              <div class="w-[140px]"></div>
              
              <div class="text-xs font-black text-slate-700">summary</div>
              
              <button class="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                Overview
              </button>
            </div>

            <!-- Visit 2 -->
            <div class="compare-chart-block relative bg-white border border-teal-600/80 rounded-[32px] overflow-hidden p-6 px-8">
              <div class="flex justify-center mb-6">
                 <h3 class="text-xl font-medium text-slate-800">Visit {{ visitB?.visitNumber }}</h3>
              </div>
              <PeriodontalChartGrid
                :key="selectedVisitIdB"
                :chart-data="chartDataB"
                :selected-tooth-id="selectedToothId"
                :readonly="true"
                :arch-filter="archFilter"
                :summary-mode="true"
                :get-field-validation="() => 'none'"
                @tooth-click="handleToothClick"
              />

              <!-- Floating Sidebar Visit 2 -->
              <div v-if="selectedToothId" :class="['absolute top-6 bottom-6 w-[320px] shadow-2xl rounded-3xl animate-in fade-in duration-200 delay-75 z-50', sidebarOnLeft ? 'left-6 slide-in-from-left-8' : 'right-6 slide-in-from-right-8']">
                <CompareSidebarCard
                  :tooth-id="selectedToothId"
                  :tooth-data="chartDataB?.[selectedToothId]"
                  :visit-label="`Visit ${visitB?.visitNumber}`"
                  :readonly="true"
                  @close="selectedToothId = null"
                />
              </div>
            </div>
          </div>
          <div v-else class="text-center py-20 text-slate-500 font-medium">
            Could not load chart data. Please ensure both visits have saved charts.
          </div>
        </div>
      </div>
      
      <!-- Invisible backdrop to catch outside clicks -->
      <div v-if="selectedToothId" class="fixed inset-0 z-40 transition-opacity" @click="selectedToothId = null"></div>

    </main>
  </div>
</template>
