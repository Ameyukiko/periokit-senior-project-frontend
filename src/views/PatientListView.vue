<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePatientStore } from '../stores/patient';
import Navbar from '../components/layout/Navbar.vue';
import CreatePatientModal from '../components/patients/CreatePatientModal.vue';
import { Search, User, ChevronLeft, ChevronRight, Plus, X, ListFilter, Calendar, Users, Type } from 'lucide-vue-next';

const router = useRouter();
const patientStore = usePatientStore();
const showCreateModal = ref(false);
const searchInput = ref('');

// Unified Popover State
const activePopover = ref<'main' | 'date' | 'gender' | 'age' | 'name' | null>(null);

// Temporary values for sub-menus
const tempSorts = ref({ ...patientStore.sorts });
const tempGender = ref(patientStore.filterGender);

onMounted(() => {
  patientStore.fetchPatients();
});

let searchTimeout: ReturnType<typeof setTimeout> | null = null;
const handleSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    patientStore.setSearchQuery(searchInput.value);
  }, 300); // 300ms debounce
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

const goToHistory = (patientId: string) => {
  router.push(`/patients/${patientId}/visits`);
};

const handlePatientCreated = (newPatient: any) => {
  showCreateModal.value = false;
  const mockVisitId = `v${Math.floor(Math.random() * 1000)}`;
  router.push(`/chart?patientId=${newPatient.id}&visitId=${mockVisitId}`);
};

// UI Helpers for Tags
// Chips should appear if the respective sort is active.
const hasDateFilter = computed(() => patientStore.sorts.date !== null); 
const hasGenderFilter = computed(() => !!patientStore.filterGender);
const hasAgeFilter = computed(() => patientStore.sorts.age !== null);
const hasNameFilter = computed(() => patientStore.sorts.name !== null);

const removeFilter = (type: string) => {
  if (type === 'date') patientStore.setSorts('date', null);
  if (type === 'gender') patientStore.setAdvancedFilters({ gender: '' });
  if (type === 'age') patientStore.setSorts('age', null);
  if (type === 'name') patientStore.setSorts('name', null);
  activePopover.value = null;
};

const openMain = () => {
  if (activePopover.value) {
    activePopover.value = null;
  } else {
    activePopover.value = 'main';
    tempSorts.value = { ...patientStore.sorts };
    tempGender.value = patientStore.filterGender;
  }
};

const openSub = (type: 'date' | 'gender' | 'age' | 'name') => {
  activePopover.value = type;
  tempSorts.value = { ...patientStore.sorts };
  tempGender.value = patientStore.filterGender;
};

const applyFilter = () => {
  // Apply everything together! Multi-filter power!
  patientStore.setAdvancedFilters({ gender: tempGender.value });
  // We need to apply sorts one by one to the store, but to avoid multiple fetches,
  // we could update the store state directly or add a setAllSorts method.
  // The simplest is to just call setSorts for each.
  // Wait, calling setSorts 3 times will trigger 3 fetches. Let's just modify the store's sort object.
  patientStore.sorts.date = tempSorts.value.date as any;
  patientStore.sorts.age = tempSorts.value.age as any;
  patientStore.sorts.name = tempSorts.value.name as any;
  patientStore.currentPage = 1;
  patientStore.fetchPatients();
  
  activePopover.value = null;
};

// Chip display texts
const dateChipText = computed(() => {
  if (patientStore.sorts.date === 'date_asc') return 'Oldest First';
  if (patientStore.sorts.date === 'date_desc') return 'Newest Visit';
  return 'Date';
});

const ageChipText = computed(() => {
  if (patientStore.sorts.age === 'age_asc') return 'Youngest First';
  if (patientStore.sorts.age === 'age_desc') return 'Oldest First';
  return 'Age';
});

const nameChipText = computed(() => {
  if (patientStore.sorts.name === 'name_asc') return 'Name (A-Z)';
  if (patientStore.sorts.name === 'name_desc') return 'Name (Z-A)';
  return 'Name';
});
</script>

<template>
  <div class="min-h-screen bg-[#f3f4f6] font-sans" @click="activePopover = null">
    <Navbar />

    <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8" @click.stop>
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
        <h1 class="text-3xl font-bold text-gray-900">Patient</h1>

        <!-- Search -->
        <div class="relative w-full sm:w-80">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search class="h-5 w-5 text-gray-400" />
          </div>
          <input
            v-model="searchInput"
            @input="handleSearch"
            type="text"
            class="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-full leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-shadow"
            placeholder="Search . . ."
          />
        </div>
      </div>

      <!-- Advanced Filter Chips Bar -->
      <div class="flex flex-wrap items-center gap-2 mb-6">
        <!-- Add Filter Button -->
        <div class="relative">
          <button 
            @click.stop="openMain"
            class="px-3 py-1.5 border border-gray-300 border-dashed rounded-full text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 transition-colors bg-white"
          >
            <ListFilter class="w-4 h-4" />
            <span>Filter</span>
            <Plus class="w-3 h-3 ml-1" />
          </button>
          
          <!-- Unified Filter Menu -->
          <div v-if="activePopover" class="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden flex flex-col">
            
            <!-- Main Menu -->
            <div v-if="activePopover === 'main'" class="py-2 flex-1">
              <div class="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Add Filter</div>
              <button @click.stop="activePopover = 'date'" class="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between transition-colors" :class="tempSorts.date ? 'text-blue-600 font-medium' : 'text-gray-700'">
                <span class="flex items-center gap-2"><Calendar class="w-4 h-4"/> Date</span>
                <ChevronRight class="w-4 h-4 text-gray-400" />
              </button>
              <button @click.stop="activePopover = 'gender'" class="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between transition-colors" :class="tempGender ? 'text-rose-600 font-medium' : 'text-gray-700'">
                <span class="flex items-center gap-2"><Users class="w-4 h-4"/> Gender</span>
                <ChevronRight class="w-4 h-4 text-gray-400" />
              </button>
              <button @click.stop="activePopover = 'age'" class="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between transition-colors" :class="tempSorts.age ? 'text-emerald-600 font-medium' : 'text-gray-700'">
                <span class="flex items-center gap-2"><User class="w-4 h-4"/> Age</span>
                <ChevronRight class="w-4 h-4 text-gray-400" />
              </button>
              <button @click.stop="activePopover = 'name'" class="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between transition-colors" :class="tempSorts.name ? 'text-purple-600 font-medium' : 'text-gray-700'">
                <span class="flex items-center gap-2"><Type class="w-4 h-4"/> Name</span>
                <ChevronRight class="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <!-- Sub Menus -->
            <div v-else class="flex flex-col flex-1">
              <!-- Header -->
              <div class="flex items-center px-2 py-2 border-b border-gray-100 bg-gray-50">
                <button @click.stop="activePopover = 'main'" class="p-1 rounded hover:bg-gray-200 text-gray-500 transition-colors">
                  <ChevronLeft class="w-4 h-4"/>
                </button>
                <span class="flex-1 text-center text-sm font-semibold text-gray-700 pr-6 capitalize">{{ activePopover }}</span>
              </div>
              
              <!-- Content Options -->
              <div class="p-2 space-y-1">
                <!-- Date Options -->
                <template v-if="activePopover === 'date'">
                  <button @click.stop="tempSorts.date = tempSorts.date === 'date_desc' ? null : 'date_desc'" class="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 rounded flex items-center justify-between transition-colors" :class="tempSorts.date === 'date_desc' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700'">
                    Newest Visit <div v-if="tempSorts.date === 'date_desc'" class="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                  </button>
                  <button @click.stop="tempSorts.date = tempSorts.date === 'date_asc' ? null : 'date_asc'" class="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 rounded flex items-center justify-between transition-colors" :class="tempSorts.date === 'date_asc' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700'">
                    Oldest Visit <div v-if="tempSorts.date === 'date_asc'" class="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                  </button>
                </template>

                <!-- Gender Options -->
                <template v-if="activePopover === 'gender'">
                  <button @click.stop="tempGender = tempGender === 'Male' ? '' : 'Male'" class="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 rounded flex items-center justify-between transition-colors" :class="tempGender === 'Male' ? 'text-rose-600 bg-rose-50 font-medium' : 'text-gray-700'">
                    Male <div v-if="tempGender === 'Male'" class="w-1.5 h-1.5 rounded-full bg-rose-600"></div>
                  </button>
                  <button @click.stop="tempGender = tempGender === 'Female' ? '' : 'Female'" class="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 rounded flex items-center justify-between transition-colors" :class="tempGender === 'Female' ? 'text-rose-600 bg-rose-50 font-medium' : 'text-gray-700'">
                    Female <div v-if="tempGender === 'Female'" class="w-1.5 h-1.5 rounded-full bg-rose-600"></div>
                  </button>
                  <button @click.stop="tempGender = tempGender === 'Other' ? '' : 'Other'" class="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 rounded flex items-center justify-between transition-colors" :class="tempGender === 'Other' ? 'text-rose-600 bg-rose-50 font-medium' : 'text-gray-700'">
                    Other <div v-if="tempGender === 'Other'" class="w-1.5 h-1.5 rounded-full bg-rose-600"></div>
                  </button>
                </template>

                <!-- Age Options -->
                <template v-if="activePopover === 'age'">
                  <button @click.stop="tempSorts.age = tempSorts.age === 'age_asc' ? null : 'age_asc'" class="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 rounded flex items-center justify-between transition-colors" :class="tempSorts.age === 'age_asc' ? 'text-emerald-600 bg-emerald-50 font-medium' : 'text-gray-700'">
                    Youngest First <div v-if="tempSorts.age === 'age_asc'" class="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
                  </button>
                  <button @click.stop="tempSorts.age = tempSorts.age === 'age_desc' ? null : 'age_desc'" class="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 rounded flex items-center justify-between transition-colors" :class="tempSorts.age === 'age_desc' ? 'text-emerald-600 bg-emerald-50 font-medium' : 'text-gray-700'">
                    Oldest First <div v-if="tempSorts.age === 'age_desc'" class="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
                  </button>
                </template>

                <!-- Name Options -->
                <template v-if="activePopover === 'name'">
                  <button @click.stop="tempSorts.name = tempSorts.name === 'name_asc' ? null : 'name_asc'" class="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 rounded flex items-center justify-between transition-colors" :class="tempSorts.name === 'name_asc' ? 'text-purple-600 bg-purple-50 font-medium' : 'text-gray-700'">
                    Name (A-Z) <div v-if="tempSorts.name === 'name_asc'" class="w-1.5 h-1.5 rounded-full bg-purple-600"></div>
                  </button>
                  <button @click.stop="tempSorts.name = tempSorts.name === 'name_desc' ? null : 'name_desc'" class="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 rounded flex items-center justify-between transition-colors" :class="tempSorts.name === 'name_desc' ? 'text-purple-600 bg-purple-50 font-medium' : 'text-gray-700'">
                    Name (Z-A) <div v-if="tempSorts.name === 'name_desc'" class="w-1.5 h-1.5 rounded-full bg-purple-600"></div>
                  </button>
                </template>
              </div>
            </div>

            <!-- Global Apply Button (Always visible at the bottom) -->
            <div class="p-2 border-t border-gray-100 bg-white">
              <button @click.stop="applyFilter" class="w-full py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm">
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        <!-- Active Chips -->
        <div v-if="hasDateFilter" class="relative">
          <div class="flex items-center bg-blue-50 border border-blue-100 rounded-full pl-3 pr-1 py-1 shadow-sm">
            <span class="text-xs font-medium text-blue-700 cursor-pointer" @click.stop="openSub('date')">Date: <span class="text-blue-900">{{ dateChipText }}</span></span>
            <button @click.stop="removeFilter('date')" class="ml-1.5 p-1 rounded-full text-blue-400 hover:text-blue-600 hover:bg-blue-100 transition-colors"><X class="w-3 h-3"/></button>
          </div>
        </div>

        <div v-if="hasGenderFilter" class="relative">
          <div class="flex items-center bg-rose-50 border border-rose-100 rounded-full pl-3 pr-1 py-1 shadow-sm">
            <span class="text-xs font-medium text-rose-700 cursor-pointer" @click.stop="openSub('gender')">Gender: <span class="text-rose-900">{{ patientStore.filterGender }}</span></span>
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
      <div class="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-[#eff6ff]">
              <tr>
                <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">ID</th>
                <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">NAME</th>
                <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">AGE</th>
                <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-32">GENDER</th>
                <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-40">DATE</th>
                <th scope="col" class="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-32"></th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
              <tr v-if="patientStore.loading && patientStore.patients.length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">Loading patients...</td>
              </tr>
              <tr v-else-if="patientStore.patients.length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                  No patients found matching the criteria. (Click X to remove filters and view all)
                </td>
              </tr>
              <tr 
                v-for="patient in patientStore.patients" 
                :key="patient.id"
                @click="goToHistory(patient.id)"
                class="hover:bg-gray-50 transition-colors cursor-pointer group"
              >
                <td class="px-6 py-5 whitespace-nowrap text-sm text-gray-500 font-medium">
                  {{ patient.hn.replace('HN', '') }}
                </td>
                <td class="px-6 py-5 whitespace-nowrap">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <User class="w-4 h-4 text-blue-500" />
                    </div>
                    <span class="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">{{ patient.firstName }} {{ patient.lastName }}</span>
                  </div>
                </td>
                <td class="px-6 py-5 whitespace-nowrap text-sm text-gray-600">
                  {{ new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() }}
                </td>
                <td class="px-6 py-5 whitespace-nowrap text-sm text-gray-600">
                  {{ patient.gender }}
                </td>
                <td class="px-6 py-5 whitespace-nowrap text-sm text-gray-600">
                  {{ formatDate(patient.lastVisitDate) }}
                </td>
                <td class="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    @click.stop="goToHistory(patient.id)"
                    class="inline-flex items-center justify-center px-4 py-1.5 border border-blue-200 text-blue-500 rounded-full text-xs font-medium hover:bg-blue-50 transition-colors"
                  >
                    History
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="bg-white px-6 py-4 flex items-center justify-between border-t border-gray-100">
          <div class="flex-1 flex justify-between sm:hidden">
            <button @click="patientStore.setPage(patientStore.currentPage - 1)" :disabled="patientStore.currentPage === 1" class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Previous</button>
            <button @click="patientStore.setPage(patientStore.currentPage + 1)" :disabled="patientStore.currentPage === patientStore.totalPages || patientStore.totalPages === 0" class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Next</button>
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-gray-500">
                Showing
                <span class="font-medium">{{ patientStore.totalCount > 0 ? (patientStore.currentPage - 1) * patientStore.itemsPerPage + 1 : 0 }}</span>
                to
                <span class="font-medium">{{ Math.min(patientStore.currentPage * patientStore.itemsPerPage, patientStore.totalCount) }}</span>
                of
                <span class="font-medium">{{ patientStore.totalCount }}</span>
                entries
              </p>
            </div>
            <div v-if="patientStore.totalPages > 0">
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  @click="patientStore.setPage(patientStore.currentPage - 1)"
                  :disabled="patientStore.currentPage === 1"
                  class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-200 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft class="h-4 w-4" aria-hidden="true" />
                </button>
                
                <button
                  v-for="page in patientStore.totalPages"
                  :key="page"
                  @click="patientStore.setPage(page)"
                  :class="[
                    page === patientStore.currentPage 
                      ? 'z-10 bg-blue-600 border-blue-600 text-white' 
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50',
                    'relative inline-flex items-center px-4 py-2 border text-sm font-medium'
                  ]"
                >
                  {{ page }}
                </button>

                <button
                  @click="patientStore.setPage(patientStore.currentPage + 1)"
                  :disabled="patientStore.currentPage === patientStore.totalPages"
                  class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-200 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight class="h-4 w-4" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- FAB -->
    <button
      @click="showCreateModal = true"
      class="fixed bottom-8 right-8 w-14 h-14 bg-[#0052ff] text-white rounded-full shadow-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center transition-transform hover:scale-105 z-40"
    >
      <Plus class="w-6 h-6" />
    </button>

    <CreatePatientModal 
      v-if="showCreateModal" 
      @close="showCreateModal = false" 
      @created="handlePatientCreated"
    />
  </div>
</template>
