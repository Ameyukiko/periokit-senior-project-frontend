<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { patientApi, type Patient } from '../services/api/patient.api'
import { visitApi, type Visit } from '../services/api/visit.api'
import Navbar from '../components/layout/Navbar.vue'
import FilterPanel from '../components/common/FilterPanel.vue'
import PatientDrawer from '../components/patients/VisitListPanel.vue'
import type { FilterConfig } from '../components/common/FilterPanel.vue'
import { Search, Plus, Calendar, ChevronLeft, ChevronRight, X, AlertCircle, User } from 'lucide-vue-next'
import { usePeriodontalChartStore } from '@/stores/periodontal-chart'
import { useVisitStore } from '@/stores/visit'

const route = useRoute()
const router = useRouter()
const drawerOpen = ref(false)

const chartStore = usePeriodontalChartStore()
const visitStore = useVisitStore()

const patientId = route.params.patientId as string
const patient = ref<Patient | null>(null)
const visits = ref<Visit[]>([])
const isLoading = ref(true)

// UI States
const searchInput = ref('')
const compareAnchorVisitId = ref<string | null>(null)
const page = ref(1)
const pageSize = ref(10)

// Filter configs
const filterConfigs: FilterConfig[] = [
  {
    type: 'phase',
    label: 'Phase',
    icon: User,
    color: 'blue',
    options: [
      { value: 'before_hygienic', label: 'Before hygienic phase' },
      { value: 'after_hygienic', label: 'After hygienic phase' },
      { value: 'after_corrective', label: 'After corrective phase' }
    ]
  },
  {
    type: 'date',
    label: 'Date Range & Sort',
    icon: Calendar,
    color: 'emerald',
    isDateRange: true,
    isSort: true
  }
]

// Filter values
const filterValues = ref<Record<string, any>>({
  phase: '',
  date: { sort: null, from: '', to: '' }
})

const fetchPatientAndVisits = async () => {
  isLoading.value = true
  try {
    const [patientData, visitsData] = await Promise.all([
      patientApi.getById(patientId),
      visitApi.getByPatient(patientId)
    ])
    patient.value = patientData
    // Sort visits by date descending
    visits.value = [...visitsData].sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())

    // Update chartStore patientInfo so VisitListPanel shows correct patient name
    await chartStore.loadPatientById(patientId)

    // Load visits into visitStore
    await visitStore.loadVisits(patientId)
  } catch (error) {
    console.error('Failed to fetch patient data:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchPatientAndVisits()
})

const openChart = (visitId: string) => {
  router.push({
    name: 'chart',
    query: { patientId, visitId }
  })
}

const handleCompare = (visitId: string) => {
  const visit = visits.value.find(v => v.id === visitId)
  if (!visit?.hasChart) return

  if (!compareAnchorVisitId.value) {
    // First time: set anchor visit
    compareAnchorVisitId.value = visitId
  } else {
    // Second time: navigate to compare (if it's not the same visit)
    if (compareAnchorVisitId.value === visitId) {
      compareAnchorVisitId.value = null
      return
    }
    router.push({
      name: 'compare-charts',
      query: {
        visitA: compareAnchorVisitId.value,
        visitB: visitId,
      }
    })
    compareAnchorVisitId.value = null
  }
}

const cancelCompare = () => {
  compareAnchorVisitId.value = null
}

const compareAnchorVisitNumber = computed(() => {
  if (!compareAnchorVisitId.value) return null
  return getVisitNumber(compareAnchorVisitId.value)
})

const getVisitNumber = (visitId: string) => {
  const index = visits.value.findIndex(v => v.id === visitId)
  if (index === -1) return 0
  return visits.value.length - index
}

const createNewVisit = () => {
  router.push({ name: 'chart', query: { patientId } })
}

const formatDateThai = (dateString: string) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ]
  const day = date.getDate()
  const month = thaiMonths[date.getMonth()]
  const year = date.getFullYear() + 543
  return `${day} ${month} ${year}`
}

const totalPages = computed(() => Math.ceil(filteredVisits.value.length / pageSize.value))

const paginatedVisits = computed(() => {
  const start = (page.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredVisits.value.slice(start, end)
})

// Filter Logic
const filteredVisits = computed(() => {
  let result = [...visits.value]

  // Filter by phase
  if (filterValues.value.phase) {
    result = result.filter(v => v.phase === filterValues.value.phase)
  }

  // Filter by date range
  const dateFilter = filterValues.value.date
  if (dateFilter?.from) {
    result = result.filter(v => new Date(v.visitDate) >= new Date(dateFilter.from))
  }
  if (dateFilter?.to) {
    result = result.filter(v => new Date(v.visitDate) <= new Date(dateFilter.to))
  }

  // Filter by search input (visit number or date)
  if (searchInput.value) {
    const search = searchInput.value.toLowerCase()
    result = result.filter(v =>
      v.visitDate.toLowerCase().includes(search) ||
      v.phase.toLowerCase().includes(search) ||
      v.doctorName?.toLowerCase().includes(search)
    )
  }

  // Sort by date
  const sortOrder = filterValues.value.date?.sort
  if (sortOrder === 'date_asc') {
    result.sort((a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime())
  } else {
    // Default is desc
    result.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())
  }

  return result
})

// Reset page when filters change
watch(() => filterValues.value, () => {
  page.value = 1
}, { deep: true })

const goBack = () => {
  router.push({ name: 'my-patients' })
}

// Reset patient info when leaving the page
onUnmounted(() => {
  chartStore.updatePatientInfo({
    hn: '',
    patientName: '',
    age: null,
    gender: '',
    nationality: '',
    date: new Date().toISOString().split('T')[0],
    doctor: chartStore.patientInfo?.doctor || '',
    studentId: chartStore.patientInfo?.studentId || '',
    visitPhase: 'before_hygienic'
  })

  // Clear visits from visitStore
  visitStore.visits = []
  visitStore.setActiveVisit(null)
})
</script>

<template>
  <div class="min-h-screen bg-[#f1f5f9] font-sans">
    <Navbar @toggle-drawer="drawerOpen = !drawerOpen" />
    <PatientDrawer v-model:open="drawerOpen" />

    <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Breadcrumb / Header Area -->
      <div class="flex flex-col md:flex-row md:items-start justify-between mb-4 gap-4">
        <div class="min-w-0 md:flex-1">
          <button @click="goBack" class="text-slate-500 hover:text-[#0052ff] font-medium text-sm transition-colors mb-1">
            My Patients
          </button>
          <h1 class="text-xl font-bold text-slate-900 flex items-baseline gap-2 flex-wrap">
            <span>Patient: {{ patient?.firstName }} {{ patient?.lastName }}</span>
            <span class="text-slate-500 text-sm font-medium whitespace-nowrap">({{ filteredVisits.length }} of {{ patient?.visitCount || visits.length }} visits)</span>
          </h1>
        </div>

        <div class="flex flex-wrap md:flex-nowrap items-center gap-3 md:shrink-0">
          <!-- Search -->
          <div class="relative w-full md:w-80">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search class="h-5 w-5 text-slate-400" />
            </div>
            <input
              v-model="searchInput"
              type="text"
              class="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-full bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052ff] focus:border-transparent text-sm shadow-sm transition-all"
              placeholder="Search . . ."
            />
          </div>

          <!-- Filter Panel -->
          <FilterPanel v-model="filterValues" :configs="filterConfigs" />

          <!-- New Visit Button -->
          <button
            @click="createNewVisit"
            class="px-4 py-2.5 bg-[#0052ff] text-white rounded-full text-sm font-medium shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2 shrink-0"
          >
            <Plus class="w-4 h-4" />
            New Visit
          </button>
        </div>
      </div>

      <!-- Active filter chips (populated by FilterPanel via teleport) -->
      <div id="active-filter-chips" class="empty:mb-0 mb-6"></div>

      <!-- Compare Mode Banner -->
      <div v-if="compareAnchorVisitId" class="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
        <div class="flex items-center gap-3">
          <AlertCircle class="w-5 h-5 text-[#0052ff]" />
          <p class="text-blue-900 font-medium text-sm">
            กำลังเลือก Visit #{{ compareAnchorVisitNumber }} เพื่อ Compare — เลือก Visit ที่ 2
          </p>
        </div>
        <button @click="cancelCompare" class="text-slate-500 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-blue-100">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Visit Timeline Card -->
      <div class="bg-white shadow-sm rounded-2xl border border-slate-100 overflow-hidden">
        <div class="px-6 py-5 border-b border-slate-100">
          <h2 class="text-lg font-bold text-slate-800">Visit Timeline</h2>
        </div>

        <div class="p-6 space-y-4">
          <div v-if="isLoading" class="text-center py-8 text-slate-500">
            Loading visits...
          </div>
          <div v-else-if="filteredVisits.length === 0" class="text-center py-12 text-slate-500">
            No visits found matching the current filters.
          </div>

          <div
            v-else
            v-for="visit in paginatedVisits"
            :key="visit.id"
            class="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-xl border transition-all duration-200"
            :class="[
              compareAnchorVisitId === visit.id
                ? 'border-[#0052ff] ring-1 ring-[#0052ff] bg-blue-50/30'
                : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
            ]"
          >
            <!-- Visit Info -->
            <div class="flex items-start gap-4 mb-4 sm:mb-0">
              <div class="w-12 h-12 rounded-full bg-[#eef4ff] text-[#0052ff] flex items-center justify-center font-bold text-lg shrink-0">
                {{ getVisitNumber(visit.id) }}
              </div>
              <div>
                <div class="flex items-center gap-3 mb-1.5">
                  <h3 class="text-base font-bold text-slate-900">
                    Visit #{{ getVisitNumber(visit.id) }}
                  </h3>
                  <span class="px-2.5 py-0.5 rounded-full text-[11px] font-medium border"
                    :class="visit.phase.toLowerCase().includes('after') ? 'bg-blue-50 text-[#0052ff] border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'"
                  >
                    {{ visit.phase.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) }}
                  </span>
                </div>
                <div class="flex items-center gap-3 text-sm text-slate-500">
                  <div class="flex items-center gap-1.5">
                    <Calendar class="w-4 h-4" />
                    {{ formatDateThai(visit.visitDate) }}
                  </div>
                  <span>•</span>
                  <span>by {{ visit.doctorName || 'Unknown Doctor' }}</span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-3 sm:ml-4">
              <button
                @click="openChart(visit.id)"
                class="px-5 py-2 bg-[#0052ff] text-white rounded-lg text-sm font-medium shadow-sm hover:bg-blue-700 transition-colors"
              >
                Chart
              </button>

              <div class="relative group flex">
                <button
                  @click="handleCompare(visit.id)"
                  :disabled="!visit.hasChart"
                  class="px-5 py-2 bg-white text-[#0052ff] border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:border-slate-200 disabled:text-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed uppercase text-[11px] tracking-wider"
                  :class="{ 'ring-2 ring-[#0052ff] ring-offset-1': compareAnchorVisitId === visit.id }"
                >
                  {{ compareAnchorVisitId === visit.id ? 'Cancel' : 'Compare' }}
                </button>
                <div v-if="!visit.hasChart" class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  ยังไม่มี chart
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 0" class="bg-white px-6 py-4 flex items-center justify-between border-t border-slate-100">
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-end">
            <nav class="relative z-0 inline-flex items-center gap-2" aria-label="Pagination">
              <button
                @click="page > 1 && page--"
                :disabled="page === 1"
                class="relative inline-flex items-center px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm gap-1"
              >
                <ChevronLeft class="h-4 w-4" /> Previous
              </button>

              <div class="flex items-center gap-1 mx-2">
                <button
                  v-for="p in totalPages"
                  :key="p"
                  @click="page !== p && (page = p)"
                  class="relative inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold transition-colors"
                  :class="[
                    p === page
                      ? 'bg-[#0052ff] text-white shadow-sm'
                      : 'bg-transparent text-slate-600 hover:bg-slate-100'
                  ]"
                >
                  {{ p }}
                </button>
              </div>

              <button
                @click="page < totalPages && page++"
                :disabled="page === totalPages"
                class="relative inline-flex items-center px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm gap-1"
              >
                Next <ChevronRight class="h-4 w-4" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
