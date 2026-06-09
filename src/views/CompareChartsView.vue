<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Navbar from '../components/layout/Navbar.vue'
import PeriodontalChartGrid from '../components/chart/PeriodontalChartGrid.vue'
import CompareSidebarCard from '../components/chart/CompareSidebarCard.vue'
import { ArrowLeft, ArrowRight } from 'lucide-vue-next'
import { visitApi, type Visit } from '../services/api/visit.api'
import { chartApi } from '../services/api/chart.api'
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

const archFilter = ref<'upper' | 'lower'>('upper')
const selectedToothId = ref<ToothId | null>(null)

const visitA = computed(() => visits.value.find(v => v.id === selectedVisitIdA.value))
const visitB = computed(() => visits.value.find(v => v.id === selectedVisitIdB.value))

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

const loadChartData = async (visitId: string) => {
  if (!visitId) return null
  try {
    const res = await chartApi.getByVisit(visitId)
    return res.data.chartByVisit?.teethData as ChartData || null
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
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-sm font-bold text-slate-800">Chart Comparison</h2>
            
            <!-- Arch Toggle -->
            <div class="flex bg-slate-100 p-1 rounded-full border border-slate-200">
              <button 
                @click="archFilter = 'upper'" 
                :class="['px-4 py-1.5 rounded-full text-xs font-bold transition-all', archFilter === 'upper' ? 'bg-[#0052ff] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700']"
              >
                Upper
              </button>
              <button 
                @click="archFilter = 'lower'" 
                :class="['px-4 py-1.5 rounded-full text-xs font-bold transition-all', archFilter === 'lower' ? 'bg-[#0052ff] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700']"
              >
                Lower
              </button>
            </div>
          </div>

          <div v-if="isLoading" class="flex justify-center items-center py-20 text-slate-400">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0052ff]"></div>
          </div>
          
          <div v-else-if="chartDataA && chartDataB" class="space-y-8 relative">
            <!-- Visit 1 -->
            <div class="compare-chart-block relative bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden p-4">
              <div class="flex justify-center mb-2">
                 <h3 class="text-lg font-black text-slate-800">Visit {{ visitA?.visitNumber }}</h3>
              </div>
              <PeriodontalChartGrid
                :chart-data="chartDataA"
                :selected-tooth-id="selectedToothId"
                :readonly="true"
                :arch-filter="archFilter"
                :get-field-validation="() => 'none'"
                @tooth-click="handleToothClick"
              />
            </div>

            <!-- Visit 2 -->
            <div class="compare-chart-block relative bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden p-4">
              <div class="flex justify-center mb-2">
                 <h3 class="text-lg font-black text-slate-800">Visit {{ visitB?.visitNumber }}</h3>
              </div>
              <PeriodontalChartGrid
                :chart-data="chartDataB"
                :selected-tooth-id="selectedToothId"
                :readonly="true"
                :arch-filter="archFilter"
                :get-field-validation="() => 'none'"
                @tooth-click="handleToothClick"
              />
            </div>
          </div>
          <div v-else class="text-center py-20 text-slate-500 font-medium">
            Could not load chart data. Please ensure both visits have saved charts.
          </div>
        </div>
      </div>
      
      <!-- Dual Sidebar Panel -->
      <div v-if="selectedToothId" class="fixed right-0 top-0 bottom-0 w-[420px] z-50 pointer-events-none p-6 pt-[100px] flex flex-col gap-4">
        <div class="flex-1 pointer-events-auto shadow-2xl animate-in slide-in-from-right duration-300">
          <CompareSidebarCard
            :tooth-id="selectedToothId"
            :tooth-data="chartDataA?.[selectedToothId]"
            :readonly="true"
            @close="selectedToothId = null"
          />
        </div>
        <div class="flex-1 pointer-events-auto shadow-2xl animate-in slide-in-from-right duration-300 delay-75">
          <CompareSidebarCard
            :tooth-id="selectedToothId"
            :tooth-data="chartDataB?.[selectedToothId]"
            :readonly="true"
            @close="selectedToothId = null"
          />
        </div>
      </div>
      <!-- Dual Sidebar Backdrop -->
      <div v-if="selectedToothId" class="fixed inset-0 bg-slate-900/10 backdrop-blur-[1px] z-40 transition-opacity" @click="selectedToothId = null"></div>

    </main>
  </div>
</template>
