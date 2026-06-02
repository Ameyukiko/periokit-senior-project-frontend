<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { patientApi, type Patient } from '../services/api/patient.api'
import { visitApi, type Visit } from '../services/api/visit.api'
import { useVisitStore } from '../stores/visit'
import Navbar from '../components/layout/Navbar.vue'
import { Search, Calendar, ChevronLeft, ChevronRight, Info, X } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const visitStore = useVisitStore()

const patientId = route.params.patientId as string
const patient = ref<Patient | null>(null)
const visits = ref<Visit[]>([])
const loading = ref(true)
const searchInput = ref('')

const compareAnchorVisitId = ref<string | null>(null)

onMounted(async () => {
  try {
    const [patientData, visitData] = await Promise.all([
      patientApi.getById(patientId),
      visitApi.getByPatient(patientId)
    ])
    patient.value = patientData
    // Sort visits by date descending
    visits.value = visitData.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())
  } catch (error) {
    console.error('Failed to fetch patient history:', error)
  } finally {
    loading.value = false
  }
})

const filteredVisits = computed(() => {
  if (!searchInput.value) return visits.value
  const lowerSearch = searchInput.value.toLowerCase()
  return visits.value.filter(v => v.doctorName.toLowerCase().includes(lowerSearch) || v.visitDate.includes(lowerSearch))
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

const openChart = (visitId: string) => {
  router.push({
    name: 'chart',
    query: { patientId, visitId }
  })
}

const handleCompare = (visitId: string) => {
  if (!compareAnchorVisitId.value) {
    // First time: set anchor visit
    compareAnchorVisitId.value = visitId
  } else {
    // Second time: navigate to compare
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

const getVisitNumber = (id: string | null) => {
  if (!id) return ''
  const index = visits.value.findIndex(v => v.id === id)
  if (index === -1) return ''
  return visits.value.length - index
}

const createNewVisit = async () => {
  const today = new Date().toISOString().split('T')[0]
  const visit = await visitStore.createVisit(patientId, today, 'before_hygienic')
  router.push({ name: 'chart', query: { patientId, visitId: visit.id } })
}

</script>

<template>
  <div class="min-h-screen bg-[#f3f4f6] font-sans">
    <Navbar />

    <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Breadcrumb / Header Area -->
      <div class="mb-6">
        <div class="text-sm text-gray-500 mb-2 flex items-center gap-2">
          <router-link to="/patients" class="hover:text-blue-600 transition-colors">My Patients</router-link>
          <ChevronRight class="w-4 h-4" />
          <span class="text-gray-700">Patient History</span>
        </div>
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Patient</h1>
            <p class="text-gray-600 mt-1" v-if="patient">
              Patient: {{ patient.firstName }} {{ patient.lastName }} ({{ visits.length }} visits)
            </p>
          </div>
          
          <!-- Search -->
          <div class="relative w-full sm:w-80">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search class="h-5 w-5 text-gray-400" />
            </div>
            <input
              v-model="searchInput"
              type="text"
              class="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-full leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-shadow"
              placeholder="Search . . ."
            />
          </div>
        </div>
      </div>

      <!-- Compare Mode Banner -->
      <div v-if="compareAnchorVisitId" class="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between shadow-sm transition-all duration-300">
        <div class="flex items-center gap-3 text-blue-800">
          <Info class="w-5 h-5 text-blue-600" />
          <span class="font-medium">Selecting Visit #{{ getVisitNumber(compareAnchorVisitId) }} for Comparison — Select a 2nd Visit</span>
        </div>
        <button @click="cancelCompare" class="p-1.5 rounded-full hover:bg-blue-100 text-blue-600 transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Main Content Card -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative">
        <div class="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
          <h2 class="text-lg font-semibold text-gray-800">Visit Timeline</h2>
          <button @click="createNewVisit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors">
            + New Visit
          </button>
        </div>

        <div v-if="loading" class="py-12 text-center text-gray-500">
          Loading visit history...
        </div>
        
        <div v-else-if="filteredVisits.length === 0" class="py-12 text-center text-gray-500">
          No visits found.
        </div>

        <div v-else class="space-y-4">
          <div 
            v-for="(visit, index) in filteredVisits" 
            :key="visit.id"
            class="p-5 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200"
            :class="[
              compareAnchorVisitId === visit.id 
                ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-500 ring-opacity-20' 
                : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
            ]"
          >
            <!-- Left Info -->
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                {{ visits.length - index }}
              </div>
              <div>
                <h3 class="font-bold text-gray-900 text-lg">Visit #{{ visits.length - index }}</h3>
                <div class="flex items-center gap-2 text-sm text-gray-500 mt-1">
                  <Calendar class="w-4 h-4" />
                  <span>{{ formatDate(visit.visitDate) }}</span>
                  <span class="text-gray-300">•</span>
                  <span>by {{ visit.doctorName || 'Dr. Somchai' }}</span>
                </div>
              </div>
            </div>
            
            <!-- Actions -->
            <div class="flex items-center gap-3">
              <button 
                @click="openChart(visit.id)"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                Chart
              </button>
              
              <div class="relative group">
                <button 
                  @click="handleCompare(visit.id)"
                  :disabled="!visit.hasChart"
                  class="px-4 py-2 border border-blue-200 text-blue-600 rounded-lg text-sm font-medium transition-colors"
                  :class="[
                    !visit.hasChart 
                      ? 'opacity-50 cursor-not-allowed bg-gray-50 text-gray-400 border-gray-200' 
                      : 'hover:bg-blue-50 bg-white'
                  ]"
                >
                  {{ compareAnchorVisitId === visit.id ? 'Selected' : 'Compare' }}
                </button>
                <div v-if="!visit.hasChart" class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  No chart available
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Pagination Mockup for aesthetics -->
        <div v-if="filteredVisits.length > 0" class="mt-8 flex justify-center items-center gap-2">
          <button class="px-3 py-1.5 border border-gray-200 rounded-md text-sm text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-1">
            <ChevronLeft class="w-4 h-4"/> Prev
          </button>
          <button class="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium">1</button>
          <button class="px-3 py-1.5 border border-gray-200 rounded-md text-sm text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-1">
            Next <ChevronRight class="w-4 h-4"/>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>
