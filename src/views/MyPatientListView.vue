<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { patientApi, type Patient } from '../services/api/patient.api'
import Navbar from '../components/layout/Navbar.vue'
import { Search, User, ChevronLeft, ChevronRight, Plus, ListFilter, Calendar } from 'lucide-vue-next'

const router = useRouter()

const patients = ref<Patient[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const totalPages = ref(0)
const isLoading = ref(false)

const searchInput = ref('')
const dateFrom = ref('')
const dateTo = ref('')


const showFilter = ref(false)

const fetchPatients = async () => {
  isLoading.value = true
  try {
    const res = await patientApi.getMyPatients(
      page.value,
      pageSize.value,
      searchInput.value,
      dateFrom.value,
      dateTo.value
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

const applyFilter = () => {
  page.value = 1
  fetchPatients()
  showFilter.value = false
}

const clearFilter = () => {
  dateFrom.value = ''
  dateTo.value = ''
  page.value = 1
  fetchPatients()
  showFilter.value = false
}

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
  <div class="min-h-screen bg-[#f1f5f9] font-sans" @click="showFilter = false">
    <Navbar />

    <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8" @click.stop>
      <!-- Header Area -->
      <div class="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
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

          <!-- Filter Button -->
          <div class="relative">
            <button
              @click.stop="showFilter = !showFilter"
              class="px-4 py-2.5 border border-slate-200 rounded-full text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-2 transition-colors shadow-sm"
              :class="{ 'ring-2 ring-[#0052ff] border-transparent': showFilter || dateFrom || dateTo }"
            >
              <ListFilter class="w-4 h-4" />
              <span>Filter</span>
              <Plus class="w-4 h-4" v-if="!dateFrom && !dateTo" />
              <div v-else class="w-2 h-2 bg-[#0052ff] rounded-full"></div>
            </button>

            <!-- Filter Dropdown -->
            <div
              v-if="showFilter"
              class="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 z-20 p-4"
              @click.stop
            >
              <h3 class="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Calendar class="w-4 h-4 text-[#0052ff]" />
                Date Range
              </h3>
              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-medium text-slate-500 mb-1">From</label>
                  <input type="date" v-model="dateFrom" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0052ff] focus:outline-none">
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-500 mb-1">To</label>
                  <input type="date" v-model="dateTo" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0052ff] focus:outline-none">
                </div>
              </div>
              <div class="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                <button @click="clearFilter" class="flex-1 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Clear</button>
                <button @click="applyFilter" class="flex-1 px-3 py-2 text-sm font-medium text-white bg-[#0052ff] rounded-lg hover:bg-blue-700 transition-colors">Apply</button>
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
                    <p class="text-sm text-slate-400 mt-1">Try adjusting your search or filter</p>
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
