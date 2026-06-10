<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { usePeriodontalChartStore } from '@/stores/periodontal-chart'
import { useVisitStore } from '@/stores/visit'
import { patientApi, type Patient } from '@/services/api/patient.api'
import { X, Users, Plus, Search, User, ArrowUpDown, Activity } from 'lucide-vue-next'
import type { Visit } from '@/services/api/visit.api'


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
const { patientVisits } = storeToRefs(visitStore)

const fetchedPatientName = ref('')

const patientDisplayName = computed(
  () => patientInfo.value?.patientName || fetchedPatientName.value || 'Unknown'
)

const sortOrder = ref<'desc' | 'asc'>('desc')

const sortedVisits = computed(() => {
  const sorted = [...patientVisits.value].sort(
    (a, b) => (a.visitNumber ?? 0) - (b.visitNumber ?? 0)
  )
  return sortOrder.value === 'desc' ? sorted.reverse() : sorted
})

const viewAllPatients = () => {
  emit('update:open', false)
  router.push('/patients')
}

const newPatient = () => {
  emit('update:open', false)
  router.push('/chart')
}

const navigateTo = (path: string) => {
  emit('update:open', false)
  router.push(path)
}

// Search
const searchQuery = ref('')
const searchResults = ref<Patient[]>([])
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const fetchRecentPatients = async () => {
  try {
    const res = await patientApi.getMyPatients(1, 10, '')
    searchResults.value = res.items
  } catch (e) {
    console.error(e)
  }
}

const onSearchInput = () => {
  isSearchOpen.value = true
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    if (!searchQuery.value.trim()) {
      fetchRecentPatients()
      return
    }
    try {
      const res = await patientApi.getMyPatients(1, 10, searchQuery.value)
      searchResults.value = res.items
    } catch (e) {
      console.error(e)
    }
  }, 400)
}

const isSearchOpen = ref(false)
const searchContainerRef = ref<HTMLElement | null>(null)

const isInlineSearch = computed(() => {
  return route.name === 'my-patients'
})

const showSearchDropdown = computed(() => {
  return !isInlineSearch.value && isSearchOpen.value && searchQuery.value.trim() !== ''
})

const onSearchFocus = () => {
  isSearchOpen.value = true
  if (searchQuery.value.trim() !== '' && searchResults.value.length === 0) {
    onSearchInput()
  }
}

const handleClickOutside = (e: MouseEvent) => {
  if (searchContainerRef.value && !searchContainerRef.value.contains(e.target as Node)) {
    isSearchOpen.value = false
  }
}

// Compare features state
const compareFirstVisitId = ref<string | null>(null)
const compareSecondVisitId = ref<string | null>(null)

const openVisitId = computed(() => {
  if (route.name === 'chart' && route.query.visitId) {
    return route.query.visitId as string
  }
  return visitStore.activeVisitId
})

const openVisit = computed(() => {
  if (!openVisitId.value) return null
  const visit = patientVisits.value.find(v => v.id === openVisitId.value)
  return (visit && visit.hasChart) ? visit : null
})

watch(() => props.open, async (newVal) => {
  if (newVal) {
    searchQuery.value = ''
    fetchRecentPatients()
    document.addEventListener('mousedown', handleClickOutside)
    if (!patientInfo.value?.patientName) {
      const routePatientId = route.query.patientId as string
      if (routePatientId) {
        try {
          const patient = await patientApi.getById(routePatientId)
          if (patient) fetchedPatientName.value = `${patient.firstName} ${patient.lastName}`.trim()
        } catch { /* silent */ }
      }
    }
  } else {
    searchQuery.value = ''
    searchResults.value = []
    isSearchOpen.value = false
    compareFirstVisitId.value = null
    compareSecondVisitId.value = null
    document.removeEventListener('mousedown', handleClickOutside)
  }
})

const switchPatient = (patient: Patient) => {
  emit('update:open', false)
  router.push({ name: 'patient-visits', params: { patientId: patient.id } })
}

const viewChart = async (visitId: string) => {
  emit('update:open', false)

  // Update query params; the chart page's watcher on `visitId` handles
  // setActiveVisit + loadFromBackend, so we don't load here (avoids double-load).
  const patientId = route.query.patientId || patientVisits.value.find(v => v.id === visitId)?.patientId
  await router.replace({
    query: patientId
      ? { ...route.query, visitId, patientId }
      : { ...route.query, visitId },
  })
}

const handleCompareClick = (visit: Visit) => {
  if (openVisit.value && openVisit.value.id !== visit.id) {
    compareFirstVisitId.value = openVisit.value.id
    compareSecondVisitId.value = visit.id
  } else {
    compareFirstVisitId.value = visit.id
  }
}

const toggleVisitSelection = (visitId: string) => {
  if (compareFirstVisitId.value === visitId) {
    // Deselect first visit, shift second visit to first if present
    compareFirstVisitId.value = compareSecondVisitId.value
    compareSecondVisitId.value = null
  } else if (compareSecondVisitId.value === visitId) {
    // Deselect second visit
    compareSecondVisitId.value = null
  } else if (!compareFirstVisitId.value) {
    // Set as first selection
    compareFirstVisitId.value = visitId
  } else {
    // Set as second selection
    compareSecondVisitId.value = visitId
  }
}

const executeCompare = () => {
  if (!compareFirstVisitId.value || !compareSecondVisitId.value) return
  emit('update:open', false)

  const currentPatientId = route.query.patientId as string || patientVisits.value[0]?.patientId
  const idA = compareFirstVisitId.value
  const idB = compareSecondVisitId.value

  compareFirstVisitId.value = null
  compareSecondVisitId.value = null

  router.push({
    name: 'compare-charts',
    query: {
      patientId: currentPatientId,
      visitA: idA,
      visitB: idB
    }
  })
}

const cancelCompareSelection = () => {
  compareFirstVisitId.value = null
  compareSecondVisitId.value = null
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
      class="fixed inset-0 z-50 flex"
      :class="open ? '' : 'pointer-events-none'"
    >
      <div
        class="fixed inset-0 bg-black/30 transition-opacity duration-300"
        :class="open ? 'opacity-100' : 'opacity-0'"
        @click="emit('update:open', false)"
      ></div>

      <!-- Drawer -->
      <div
        class="relative w-full sm:w-[340px] max-w-sm bg-white h-full shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out"
        :class="open ? 'translate-x-0' : '-translate-x-full'"
      >
      <!-- Header -->
      <div class="px-4 py-4 flex items-center justify-between border-b border-slate-200 shrink-0">
        <h2 class="text-base font-bold text-slate-800 flex items-center gap-2 max-w-[250px] truncate">
          Patient - {{ patientDisplayName }}
        </h2>
        <button @click="emit('update:open', false)" class="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors shrink-0">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Navigation (Mobile Only) -->
      <div class="md:hidden p-4 border-b border-slate-200 shrink-0 space-y-2 bg-slate-50">
        <button @click="navigateTo('/chart')" class="w-full py-2 flex items-center gap-3 text-slate-700 font-bold hover:text-[#0052ff] transition-colors">
          <Activity class="w-5 h-5" /> Periodontal Chart
        </button>
        <button @click="navigateTo('/patients')" class="w-full py-2 flex items-center gap-3 text-slate-700 font-bold hover:text-[#0052ff] transition-colors">
          <Users class="w-5 h-5" /> My Patient
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
      <div class="p-4 border-b border-slate-200 shrink-0 relative" ref="searchContainerRef">
        <div class="relative z-20">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search class="w-4 h-4 text-slate-400" />
          </div>
          <input 
            v-model="searchQuery" 
            @input="onSearchInput"
            @focus="onSearchFocus"
            type="text" 
            class="w-full pl-9 pr-3 py-2 bg-slate-100 border border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#0052ff] focus:border-transparent transition-all outline-none placeholder:text-slate-400" 
            placeholder="Search patients..."
          />
        </div>

        <!-- Search Results Dropdown -->
        <div 
          v-if="showSearchDropdown" 
          class="absolute left-4 right-4 top-[calc(100%-8px)] bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto"
        >
          <div v-if="searchQuery.trim() !== '' && searchResults.length === 0" class="p-4 text-center text-sm text-slate-500">
            No patients found
          </div>
          <div v-else class="p-2 space-y-1">
            <div 
              v-for="patient in searchResults" 
              :key="patient.id"
              class="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group"
              @click="switchPatient(patient)"
            >
               <div class="flex items-center gap-3 min-w-0">
                 <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                   <User class="w-4 h-4 text-[#0052ff]" />
                 </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-bold text-slate-500 text-[11px] truncate">HN-{{ patient.hn.replace('HN', '').replace('-', '').trim() }}</div>
                    <div class="text-slate-800 text-[13px] font-bold mt-0.5 truncate">{{ patient.firstName }} {{ patient.lastName }}</div>
                    <div class="text-[11px] text-slate-500 mt-0.5">Age: {{ patient.age ?? '-' }} | {{ patient.gender?.charAt(0) || '-' }}</div>
                  </div>
               </div>
               
               <button 
                 @click.stop="switchPatient(patient)"
                 class="px-2 py-1 bg-white border border-slate-200 text-slate-600 rounded-md text-[10px] font-bold hover:border-[#0052ff] hover:text-[#0052ff] transition-colors shrink-0 shadow-sm opacity-0 group-hover:opacity-100"
               >
                 History
               </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto bg-slate-50 p-4">
        <!-- Inline Search / Recent Patients (Only for MyPatients view) -->
        <div v-if="isInlineSearch || sortedVisits.length === 0" class="space-y-3">
          <div v-if="searchResults.length === 0" class="text-center py-8">
            <p class="text-slate-500 text-sm">No patients found</p>
          </div>
          <div
            v-else
            v-for="patient in searchResults"
            :key="patient.id"
            @click="switchPatient(patient)"
            class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3 cursor-pointer"
          >
            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <User class="w-5 h-5 text-[#0052ff]" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-slate-500 text-[10px] truncate">HN-{{ patient.hn.replace('HN', '').replace('-', '').trim() }}</div>
              <div class="text-slate-800 text-[14px] font-bold mt-0.5 truncate">{{ patient.firstName }} {{ patient.lastName }}</div>
              <div class="text-xs text-slate-500 mt-0.5">Age: {{ patient.age ?? '-' }} | {{ patient.gender?.charAt(0) || '-' }}</div>
              <div class="text-xs text-slate-500 mt-0.5">Latest date : {{ formatDate(patient.lastVisitDate) }}</div>
            </div>
            <button 
              @click="switchPatient(patient)"
              class="px-4 py-1.5 border border-[#0052ff] text-[#0052ff] rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors shrink-0 bg-white shadow-sm"
            >
              History
            </button>
          </div>
        </div>

        <!-- Visits List (For Chart and History views) -->
        <div v-else>
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <div class="w-1 h-4 bg-[#0052ff] rounded-full"></div>
              <h3 class="font-bold text-slate-700">Visits</h3>
            </div>
            <button
              @click="sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'"
              class="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-200 transition-colors"
              :title="sortOrder === 'desc' ? 'Newest first' : 'Oldest first'"
            >
              <ArrowUpDown class="w-3 h-3" />
              {{ sortOrder === 'desc' ? 'Newest' : 'Oldest' }}
            </button>
          </div>

          <!-- Compare Mode Banner in Drawer -->
          <div v-if="compareFirstVisitId" class="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 flex flex-col gap-2 shadow-xs animate-in fade-in slide-in-from-top-4 duration-300">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-blue-700">
                <template v-if="compareSecondVisitId">
                  Comparing Visit #{{ patientVisits.find(v => v.id === compareFirstVisitId)?.visitNumber }} & #{{ patientVisits.find(v => v.id === compareSecondVisitId)?.visitNumber }}
                </template>
                <template v-else>
                  Comparing Visit #{{ patientVisits.find(v => v.id === compareFirstVisitId)?.visitNumber }}
                </template>
              </span>
              <div class="flex items-center gap-2 shrink-0">
                <button 
                  v-if="compareSecondVisitId"
                  @click="executeCompare"
                  class="text-[10px] font-bold bg-[#0052ff] hover:bg-blue-700 text-white px-2.5 py-1 rounded-md transition-colors shadow-xs"
                >
                  Start Compare
                </button>
                <button 
                  @click="cancelCompareSelection"
                  class="p-1 hover:bg-blue-100 rounded-full text-blue-500 hover:text-blue-700 transition-colors"
                  title="Cancel compare mode"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
            </div>
            <p class="text-[11px] text-slate-500">
              <template v-if="compareSecondVisitId">
                Ready to compare. Click 'Start Compare' to proceed.
              </template>
              <template v-else>
                Select another visit below to start comparison.
              </template>
            </p>
          </div>

          <div class="space-y-3">
            <div
              v-for="visit in sortedVisits"
              :key="visit.id"
              class="bg-white border rounded-xl p-3.5 shadow-sm transition-all group"
              :class="[
                (compareFirstVisitId === visit.id || compareSecondVisitId === visit.id)
                  ? 'border-blue-500 bg-blue-50/20 shadow-md scale-[0.99]'
                  : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
              ]"
            >
              <div class="flex items-start gap-3 mb-4">
                <div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                  <User class="w-5 h-5 text-[#0052ff]" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <div class="font-bold text-slate-800 text-sm shrink-0">Visit #{{ visit.visitNumber }}</div>
                    <div class="flex items-center gap-1 shrink-0">
                      <span v-if="visit.phase" class="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                        :class="visit.phase.toLowerCase().includes('after') ? 'bg-blue-50 text-[#0052ff] border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'"
                      >
                        {{ visit.phase.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) }}
                      </span>
                    </div>
                  </div>
                  <div class="text-xs text-slate-500 mt-1">created date : {{ formatDate(visit.visitDate) }}</div>
                </div>
              </div>
              <div class="flex gap-2">
                <!-- If in compare select mode -->
                <div v-if="compareFirstVisitId" class="w-full">
                  <!-- Selected first visit -->
                  <button 
                    v-if="visit.id === compareFirstVisitId" 
                    @click="toggleVisitSelection(visit.id)"
                    class="w-full py-2 bg-blue-50 border border-blue-200 text-[#0052ff] font-bold text-xs rounded-xl shadow-xs hover:bg-blue-100 hover:border-blue-300 transition-colors text-center block"
                    title="Click to deselect"
                  >
                    Selected (Visit #{{ visit.visitNumber }})
                  </button>
                  <!-- Selected second visit -->
                  <button 
                    v-else-if="visit.id === compareSecondVisitId" 
                    @click="toggleVisitSelection(visit.id)"
                    class="w-full py-2 bg-blue-50 border border-blue-200 text-[#0052ff] font-bold text-xs rounded-xl shadow-xs hover:bg-blue-100 hover:border-blue-300 transition-colors text-center block"
                    title="Click to deselect"
                  >
                    Selected (Visit #{{ visit.visitNumber }})
                  </button>
                  <!-- Other visits -->
                  <button 
                    v-else
                    @click="toggleVisitSelection(visit.id)"
                    class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors shadow-sm text-center border border-slate-200 block"
                  >
                    Select to Compare
                  </button>
                </div>
                <!-- Normal mode -->
                <div v-else class="flex gap-2 w-full">
                  <button 
                    @click="viewChart(visit.id)"
                    class="flex-1 py-1.5 bg-[#0052ff] text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors text-center shadow-sm"
                  >
                    view chart
                  </button>
                  <button 
                    @click="handleCompareClick(visit)"
                    class="flex-1 py-1.5 border border-[#0052ff] text-[#0052ff] rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors text-center shadow-sm"
                  >
                    compare
                  </button>
                </div>
              </div>
            </div>

            
            <div v-if="!sortedVisits.length" class="text-center py-8">
               <User class="w-10 h-10 text-slate-300 mx-auto mb-2" />
               <p class="text-slate-500 font-medium text-sm">No visits found</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
    </Teleport>
  </template>
