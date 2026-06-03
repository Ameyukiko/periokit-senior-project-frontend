<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { patientApi, type Patient } from '../services/api/patient.api'
import Navbar from '../components/layout/Navbar.vue'
import { Search, User, ChevronLeft, ChevronRight, Plus, ListFilter, Calendar, Users, Type, X } from 'lucide-vue-next'

const router = useRouter()

const patients = ref<Patient[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const totalPages = ref(0)
const isLoading = ref(false)

const searchInput = ref('')

// Advanced Filter States
const sorts = ref<{
  date: 'date_desc' | 'date_asc' | null;
  age: 'age_desc' | 'age_asc' | null;
  name: 'name_desc' | 'name_asc' | null;
}>({
  date: null,
  age: null,
  name: null
})
const filterGender = ref('')

// Unified Popover State
const activePopover = ref<'main' | 'date' | 'gender' | 'age' | 'name' | null>(null)

// Temporary values for sub-menus
const tempSorts = ref({ ...sorts.value })
const tempGender = ref(filterGender.value)

const fetchPatients = async () => {
  isLoading.value = true
  try {
    // Use getPatients which supports client-side sorting and filtering
    const res = await patientApi.getPatients(
      page.value,
      pageSize.value,
      searchInput.value,
      JSON.stringify(sorts.value),
      '', // startDate
      '', // endDate
      filterGender.value,
      null, // minAge
      null  // maxAge
    )
    patients.value = res.items
    total.value = res.total
    page.value = res.page
    totalPages.value = res.totalPages
  } catch (error) {
    console.error('Failed to fetch patients', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchPatients()
})

let searchTimeout: ReturnType<typeof setTimeout> | null = null
const handleSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1
    fetchPatients()
  }, 400)
}

// UI Helpers for Tags
const hasDateFilter = computed(() => sorts.value.date !== null)
const hasGenderFilter = computed(() => !!filterGender.value)
const hasAgeFilter = computed(() => sorts.value.age !== null)
const hasNameFilter = computed(() => sorts.value.name !== null)

const removeFilter = (type: string) => {
  if (type === 'date') sorts.value.date = null
  if (type === 'gender') filterGender.value = ''
  if (type === 'age') sorts.value.age = null
  if (type === 'name') sorts.value.name = null
  activePopover.value = null
  page.value = 1
  fetchPatients()
}

const openMain = () => {
  if (activePopover.value) {
    activePopover.value = null
  } else {
    activePopover.value = 'main'
    tempSorts.value = { ...sorts.value }
    tempGender.value = filterGender.value
  }
}

const openSub = (type: 'date' | 'gender' | 'age' | 'name') => {
  activePopover.value = type
  tempSorts.value = { ...sorts.value }
  tempGender.value = filterGender.value
}

const applyFilter = () => {
  filterGender.value = tempGender.value
  sorts.value.date = tempSorts.value.date as any
  sorts.value.age = tempSorts.value.age as any
  sorts.value.name = tempSorts.value.name as any
  
  page.value = 1
  fetchPatients()
  activePopover.value = null
}

const dateChipText = computed(() => {
  if (sorts.value.date === 'date_asc') return 'Oldest First'
  if (sorts.value.date === 'date_desc') return 'Newest Visit'
  return 'Date'
})

const ageChipText = computed(() => {
  if (sorts.value.age === 'age_asc') return 'Youngest First'
  if (sorts.value.age === 'age_desc') return 'Oldest First'
  return 'Age'
})

const nameChipText = computed(() => {
  if (sorts.value.name === 'name_asc') return 'Name (A-Z)'
  if (sorts.value.name === 'name_desc') return 'Name (Z-A)'
  return 'Name'
})

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-'
  return new Date(dateString).toISOString().split('T')[0]
}

const goToHistory = (patientId: string) => {
  router.push({ name: 'patient-visits', params: { patientId } })
}

const handleNewPatient = () => {
  router.push({ name: 'chart' })
}
</script>

<template>
  <div class="min-h-screen bg-[#f1f5f9] font-sans" @click="activePopover = null">
    <Navbar />

    <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8" @click.stop>
      <!-- Header Area -->
      <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 class="text-3xl font-bold text-slate-900">Patient</h1>

        <div class="flex flex-wrap items-center gap-3">
          <!-- Search -->
          <div class="relative w-full md:w-80">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search class="h-5 w-5 text-slate-400" />
            </div>
            <input
              v-model="searchInput"
              @input="handleSearch"
              type="text"
              class="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-full bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052ff] focus:border-transparent text-sm shadow-sm transition-all"
              placeholder="Search . . ."
            />
          </div>

          <!-- Filter Button & Unified Popover -->
          <div class="relative">
            <button 
              @click.stop="openMain"
              class="px-4 py-2.5 border border-slate-200 rounded-full text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-2 transition-colors shadow-sm"
              :class="{ 'ring-2 ring-[#0052ff] border-transparent': activePopover || hasDateFilter || hasGenderFilter || hasAgeFilter || hasNameFilter }"
            >
              <ListFilter class="w-4 h-4" />
              <span>Filter</span>
              <Plus class="w-4 h-4" v-if="!hasDateFilter && !hasGenderFilter && !hasAgeFilter && !hasNameFilter" />
              <div v-else class="w-2 h-2 bg-[#0052ff] rounded-full"></div>
            </button>
            
            <!-- Unified Filter Menu -->
            <div v-if="activePopover" class="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden flex flex-col">
              
              <!-- Main Menu -->
              <div v-if="activePopover === 'main'" class="py-2 flex-1">
                <div class="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Add Filter</div>
                <button @click.stop="activePopover = 'date'" class="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center justify-between transition-colors" :class="tempSorts.date ? 'text-blue-600 font-medium' : 'text-slate-700'">
                  <span class="flex items-center gap-2"><Calendar class="w-4 h-4"/> Date</span>
                  <ChevronRight class="w-4 h-4 text-slate-400" />
                </button>
                <button @click.stop="activePopover = 'gender'" class="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center justify-between transition-colors" :class="tempGender ? 'text-rose-600 font-medium' : 'text-slate-700'">
                  <span class="flex items-center gap-2"><Users class="w-4 h-4"/> Gender</span>
                  <ChevronRight class="w-4 h-4 text-slate-400" />
                </button>
                <button @click.stop="activePopover = 'age'" class="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center justify-between transition-colors" :class="tempSorts.age ? 'text-emerald-600 font-medium' : 'text-slate-700'">
                  <span class="flex items-center gap-2"><User class="w-4 h-4"/> Age</span>
                  <ChevronRight class="w-4 h-4 text-slate-400" />
                </button>
                <button @click.stop="activePopover = 'name'" class="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center justify-between transition-colors" :class="tempSorts.name ? 'text-purple-600 font-medium' : 'text-slate-700'">
                  <span class="flex items-center gap-2"><Type class="w-4 h-4"/> Name</span>
                  <ChevronRight class="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <!-- Sub Menus -->
              <div v-else class="flex flex-col flex-1">
                <!-- Header -->
                <div class="flex items-center px-2 py-2 border-b border-slate-100 bg-slate-50">
                  <button @click.stop="activePopover = 'main'" class="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors">
                    <ChevronLeft class="w-4 h-4"/>
                  </button>
                  <span class="flex-1 text-center text-sm font-semibold text-slate-700 pr-6 capitalize">{{ activePopover }}</span>
                </div>
                
                <!-- Content Options -->
                <div class="p-2 space-y-1">
                  <!-- Date Options -->
                  <template v-if="activePopover === 'date'">
                    <button @click.stop="tempSorts.date = tempSorts.date === 'date_desc' ? null : 'date_desc'" class="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 rounded flex items-center justify-between transition-colors" :class="tempSorts.date === 'date_desc' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-slate-700'">
                      Newest Visit <div v-if="tempSorts.date === 'date_desc'" class="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                    </button>
                    <button @click.stop="tempSorts.date = tempSorts.date === 'date_asc' ? null : 'date_asc'" class="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 rounded flex items-center justify-between transition-colors" :class="tempSorts.date === 'date_asc' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-slate-700'">
                      Oldest Visit <div v-if="tempSorts.date === 'date_asc'" class="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                    </button>
                  </template>

                  <!-- Gender Options -->
                  <template v-if="activePopover === 'gender'">
                    <button @click.stop="tempGender = tempGender === 'Male' ? '' : 'Male'" class="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 rounded flex items-center justify-between transition-colors" :class="tempGender === 'Male' ? 'text-rose-600 bg-rose-50 font-medium' : 'text-slate-700'">
                      Male <div v-if="tempGender === 'Male'" class="w-1.5 h-1.5 rounded-full bg-rose-600"></div>
                    </button>
                    <button @click.stop="tempGender = tempGender === 'Female' ? '' : 'Female'" class="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 rounded flex items-center justify-between transition-colors" :class="tempGender === 'Female' ? 'text-rose-600 bg-rose-50 font-medium' : 'text-slate-700'">
                      Female <div v-if="tempGender === 'Female'" class="w-1.5 h-1.5 rounded-full bg-rose-600"></div>
                    </button>
                    <button @click.stop="tempGender = tempGender === 'Other' ? '' : 'Other'" class="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 rounded flex items-center justify-between transition-colors" :class="tempGender === 'Other' ? 'text-rose-600 bg-rose-50 font-medium' : 'text-slate-700'">
                      Other <div v-if="tempGender === 'Other'" class="w-1.5 h-1.5 rounded-full bg-rose-600"></div>
                    </button>
                  </template>

                  <!-- Age Options -->
                  <template v-if="activePopover === 'age'">
                    <button @click.stop="tempSorts.age = tempSorts.age === 'age_asc' ? null : 'age_asc'" class="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 rounded flex items-center justify-between transition-colors" :class="tempSorts.age === 'age_asc' ? 'text-emerald-600 bg-emerald-50 font-medium' : 'text-slate-700'">
                      Youngest First <div v-if="tempSorts.age === 'age_asc'" class="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
                    </button>
                    <button @click.stop="tempSorts.age = tempSorts.age === 'age_desc' ? null : 'age_desc'" class="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 rounded flex items-center justify-between transition-colors" :class="tempSorts.age === 'age_desc' ? 'text-emerald-600 bg-emerald-50 font-medium' : 'text-slate-700'">
                      Oldest First <div v-if="tempSorts.age === 'age_desc'" class="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
                    </button>
                  </template>

                  <!-- Name Options -->
                  <template v-if="activePopover === 'name'">
                    <button @click.stop="tempSorts.name = tempSorts.name === 'name_asc' ? null : 'name_asc'" class="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 rounded flex items-center justify-between transition-colors" :class="tempSorts.name === 'name_asc' ? 'text-purple-600 bg-purple-50 font-medium' : 'text-slate-700'">
                      Name (A-Z) <div v-if="tempSorts.name === 'name_asc'" class="w-1.5 h-1.5 rounded-full bg-purple-600"></div>
                    </button>
                    <button @click.stop="tempSorts.name = tempSorts.name === 'name_desc' ? null : 'name_desc'" class="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 rounded flex items-center justify-between transition-colors" :class="tempSorts.name === 'name_desc' ? 'text-purple-600 bg-purple-50 font-medium' : 'text-slate-700'">
                      Name (Z-A) <div v-if="tempSorts.name === 'name_desc'" class="w-1.5 h-1.5 rounded-full bg-purple-600"></div>
                    </button>
                  </template>
                </div>
              </div>

              <!-- Global Apply Button -->
              <div class="p-2 border-t border-slate-100 bg-white">
                <button @click.stop="applyFilter" class="w-full py-1.5 text-sm font-medium text-white bg-[#0052ff] hover:bg-blue-700 rounded-md transition-colors shadow-sm">
                  Apply Filters
                </button>
              </div>
            </div>
          </div>

          <!-- New Patient Button -->
          <button
            @click="handleNewPatient"
            class="px-4 py-2.5 bg-[#0052ff] text-white rounded-full text-sm font-medium shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2 shrink-0"
          >
            <Plus class="w-4 h-4" />
            New Patient
          </button>
        </div>
      </div>

      <!-- Advanced Filter Chips Bar -->
      <div v-if="hasDateFilter || hasGenderFilter || hasAgeFilter || hasNameFilter" class="flex flex-wrap items-center gap-2 mb-6">
        <!-- Active Chips -->
        <div v-if="hasDateFilter" class="relative">
          <div class="flex items-center bg-blue-50 border border-blue-100 rounded-full pl-3 pr-1 py-1 shadow-sm">
            <span class="text-xs font-medium text-blue-700 cursor-pointer" @click.stop="openSub('date')">Date: <span class="text-blue-900">{{ dateChipText }}</span></span>
            <button @click.stop="removeFilter('date')" class="ml-1.5 p-1 rounded-full text-blue-400 hover:text-blue-600 hover:bg-blue-100 transition-colors"><X class="w-3 h-3"/></button>
          </div>
        </div>

        <div v-if="hasGenderFilter" class="relative">
          <div class="flex items-center bg-rose-50 border border-rose-100 rounded-full pl-3 pr-1 py-1 shadow-sm">
            <span class="text-xs font-medium text-rose-700 cursor-pointer" @click.stop="openSub('gender')">Gender: <span class="text-rose-900">{{ filterGender }}</span></span>
            <button @click.stop="removeFilter('gender')" class="ml-1.5 p-1 rounded-full text-rose-400 hover:text-rose-600 hover:bg-rose-100 transition-colors"><X class="w-3 h-3"/></button>
          </div>
        </div>

        <div v-if="hasAgeFilter" class="relative">
          <div class="flex items-center bg-emerald-50 border border-emerald-100 rounded-full pl-3 pr-1 py-1 shadow-sm">
            <span class="text-xs font-medium text-emerald-700 cursor-pointer" @click.stop="openSub('age')">Age: <span class="text-emerald-900">{{ ageChipText }}</span></span>
            <button @click.stop="removeFilter('age')" class="ml-1.5 p-1 rounded-full text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 transition-colors"><X class="w-3 h-3"/></button>
          </div>
        </div>

        <div v-if="hasNameFilter" class="relative">
          <div class="flex items-center bg-purple-50 border border-purple-100 rounded-full pl-3 pr-1 py-1 shadow-sm">
            <span class="text-xs font-medium text-purple-700 cursor-pointer" @click.stop="openSub('name')">Sort: <span class="text-purple-900">{{ nameChipText }}</span></span>
            <button @click.stop="removeFilter('name')" class="ml-1.5 p-1 rounded-full text-purple-400 hover:text-purple-600 hover:bg-purple-100 transition-colors"><X class="w-3 h-3"/></button>
          </div>
        </div>

      </div>

      <!-- Table Card -->
      <div class="bg-white shadow-sm rounded-2xl overflow-hidden border border-slate-100">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-[#eef4ff]">
              <tr>
                <th scope="col" class="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider w-32">HN</th>
                <th scope="col" class="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">NAME</th>
                <th scope="col" class="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider w-24">AGE</th>
                <th scope="col" class="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider w-32">GENDER</th>
                <th scope="col" class="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider w-40">DATE</th>
                <th scope="col" class="px-6 py-4 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider w-32"></th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-slate-100">
              <tr v-if="isLoading">
                <td colspan="6" class="px-6 py-12 text-center text-slate-500">Loading patients...</td>
              </tr>
              <tr v-else-if="patients.length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-slate-500">
                  <div class="flex flex-col items-center justify-center">
                    <User class="w-12 h-12 text-slate-300 mb-3" />
                    <p class="text-base font-medium text-slate-600">No patients found</p>
                    <p class="text-sm text-slate-400 mt-1">Try adjusting your search or filters</p>
                  </div>
                </td>
              </tr>
              <tr 
                v-for="patient in patients" 
                :key="patient.id"
                @click="goToHistory(patient.id)"
                class="hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                  {{ patient.hn.replace('HN', '') }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <User class="w-4 h-4 text-[#0052ff]" />
                    </div>
                    <span class="text-sm font-medium text-slate-800 group-hover:text-[#0052ff] transition-colors">{{ patient.firstName }} {{ patient.lastName }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {{ patient.age ?? '-' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {{ patient.gender || '-' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {{ formatDate(patient.lastVisitDate) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    @click.stop="goToHistory(patient.id)"
                    class="inline-flex items-center justify-center px-4 py-1.5 border border-blue-200 text-[#0052ff] rounded-full text-xs font-bold hover:bg-blue-50 transition-colors bg-white shadow-sm"
                  >
                    History
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="bg-white px-6 py-4 flex items-center justify-between border-t border-slate-100">
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-slate-500">
                Showing
                <span class="font-medium">{{ total > 0 ? (page - 1) * pageSize + 1 : 0 }}</span>
                to
                <span class="font-medium">{{ Math.min(page * pageSize, total) }}</span>
                of
                <span class="font-medium">{{ total }}</span>
                entries
              </p>
            </div>
            <div v-if="totalPages > 0">
              <nav class="relative z-0 inline-flex items-center gap-2" aria-label="Pagination">
                <button
                  @click="page > 1 && (page--, fetchPatients())"
                  :disabled="page === 1"
                  class="relative inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm gap-1"
                >
                  <ChevronLeft class="h-4 w-4" /> Previous
                </button>
                
                <div class="flex items-center gap-1 mx-2">
                  <button
                    v-for="p in totalPages"
                    :key="p"
                    @click="page !== p && (page = p, fetchPatients())"
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
                  @click="page < totalPages && (page++, fetchPatients())"
                  :disabled="page === totalPages"
                  class="relative inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm gap-1"
                >
                  Next <ChevronRight class="h-4 w-4" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
