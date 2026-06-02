<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { usePeriodontalChartStore } from '@/stores/periodontal-chart'
import { useVisitStore } from '@/stores/visit'
import { patientApi, type Patient } from '@/services/api/patient.api'
import { X, Users, Plus, Search, ChevronRight, User } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const router = useRouter()
const route = useRoute()
const chartStore = usePeriodontalChartStore()
const visitStore = useVisitStore()

const { patientInfo } = storeToRefs(chartStore)
const { visits } = storeToRefs(visitStore)

const reversedVisits = computed(() => {
  return [...visits.value].reverse()
})

const viewAllPatients = () => {
  emit('update:open', false)
  router.push('/patients')
}

const newPatient = () => {
  emit('update:open', false)
  router.push('/chart')
}

// Search
const searchQuery = ref('')
const searchResults = ref<Patient[]>([])
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const onSearchInput = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    if (!searchQuery.value.trim()) {
      searchResults.value = []
      return
    }
    try {
      const res = await patientApi.getMyPatients(1, 5, searchQuery.value)
      searchResults.value = res.items
    } catch (e) {
      console.error(e)
    }
  }, 400)
}

// Clear search when drawer closes
watch(() => props.open, (newVal) => {
  if (!newVal) {
    searchQuery.value = ''
    searchResults.value = []
  }
})

const switchPatient = (patient: Patient) => {
  emit('update:open', false)
  router.push({ name: 'patient-visits', params: { patientId: patient.id } })
}

const viewChart = async (visitId: string) => {
  emit('update:open', false)
  visitStore.setActiveVisit(visitId)
  
  // Also update query params so page refresh works correctly
  const patientId = route.query.patientId || visits.value.find(v => v.id === visitId)?.patientId
  if (patientId) {
    router.replace({ query: { ...route.query, visitId, patientId } })
  } else {
    router.replace({ query: { ...route.query, visitId } })
  }
  
  try {
    await chartStore.loadFromBackend(visitId)
  } catch (error) {
    console.error('Failed to load chart:', error)
  }
}

const startCompare = (_visitId: string) => {
  emit('update:open', false)
  // Go to visit history page for the current patient
  const currentPatientId = route.query.patientId as string || visits.value[0]?.patientId
  if (currentPatientId) {
    router.push({ name: 'patient-visits', params: { patientId: currentPatientId } })
  }
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-'
  return new Date(dateString).toISOString().split('T')[0]
}
</script>

<template>
  <!-- Overlay -->
  <Teleport to="body">
    <div
      v-show="open"
      class="fixed inset-0 z-50 flex"
    >
      <div
        class="fixed inset-0 bg-black/30 transition-opacity duration-300"
        :class="open ? 'opacity-100' : 'opacity-0'"
        @click="emit('update:open', false)"
      ></div>

      <!-- Drawer -->
      <div
        class="relative w-[340px] max-w-sm bg-white h-full shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out"
        :class="open ? 'translate-x-0' : '-translate-x-full'"
      >
      <!-- Header -->
      <div class="px-4 py-4 flex items-center justify-between border-b border-slate-200 shrink-0">
        <h2 class="text-base font-bold text-slate-800 flex items-center gap-2 max-w-[250px] truncate">
          Patient - {{ patientInfo?.patientName || 'Unknown' }}
        </h2>
        <button @click="emit('update:open', false)" class="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors shrink-0">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Actions -->
      <div class="p-4 space-y-3 border-b border-slate-200 shrink-0">
        <button @click="viewAllPatients" class="w-full py-2 flex justify-center items-center gap-2 border border-[#0052ff] text-[#0052ff] rounded-xl font-medium hover:bg-blue-50 transition-colors shadow-sm">
          <Users class="w-4 h-4" /> View All Patients
        </button>
        <button @click="newPatient" class="w-full py-2 flex justify-center items-center gap-2 bg-[#0052ff] text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm">
          <Plus class="w-4 h-4" /> New Patient
        </button>
      </div>

      <!-- Search -->
      <div class="p-4 border-b border-slate-200 shrink-0 relative">
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search class="w-4 h-4 text-slate-400" />
          </div>
          <input 
            v-model="searchQuery" 
            @input="onSearchInput"
            type="text" 
            class="w-full pl-9 pr-3 py-2 bg-slate-100 border border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#0052ff] focus:border-transparent transition-all outline-none placeholder:text-slate-400" 
            placeholder="Search patient..."
          />
        </div>
        
        <!-- Search Results Dropdown -->
        <div v-if="searchResults.length > 0" class="absolute left-4 right-4 top-16 z-10 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          <div 
            v-for="patient in searchResults" 
            :key="patient.id"
            @click="switchPatient(patient)"
            class="px-3 py-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between group border-b border-slate-100 last:border-0"
          >
            <span class="text-sm text-slate-700 font-medium group-hover:text-[#0052ff] transition-colors">{{ patient.firstName }} {{ patient.lastName }}</span>
            <ChevronRight class="w-4 h-4 text-slate-300 group-hover:text-[#0052ff] transition-colors" />
          </div>
        </div>
      </div>

      <!-- Visits List -->
      <div class="flex-1 overflow-y-auto bg-slate-50 p-4">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-1 h-4 bg-[#0052ff] rounded-full"></div>
          <h3 class="font-bold text-slate-700">Visits</h3>
        </div>

        <div class="space-y-3">
          <div 
            v-for="(visit, index) in reversedVisits" 
            :key="visit.id"
            class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div class="flex items-start gap-3 mb-4">
              <div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                <User class="w-5 h-5 text-[#0052ff]" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-bold text-slate-800 text-sm">Visit #{{ reversedVisits.length - index }}</div>
                <div class="text-xs text-slate-500 mt-1">created date : {{ formatDate(visit.visitDate) }}</div>
              </div>
            </div>
            <div class="flex gap-2">
              <button 
                @click="viewChart(visit.id)"
                class="flex-1 py-1.5 bg-[#0052ff] text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors text-center shadow-sm"
              >
                Chart
              </button>
              <button 
                @click="startCompare(visit.id)"
                class="flex-1 py-1.5 border border-[#0052ff] text-[#0052ff] rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors text-center shadow-sm"
              >
                compare
              </button>
            </div>
          </div>
          
          <div v-if="!reversedVisits.length" class="text-center py-8">
             <User class="w-10 h-10 text-slate-300 mx-auto mb-2" />
             <p class="text-slate-500 font-medium text-sm">No visits found</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  </Teleport>
</template>
