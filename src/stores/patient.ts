import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { patientApi, type Patient } from "../services/api/patient.api";

export const usePatientStore = defineStore("patient", () => {
  const patients = ref<Patient[]>([]);
  const totalCount = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Pagination & Search state
  const currentPage = ref(1);
  const itemsPerPage = ref(10);
  const searchQuery = ref("");
  const sorts = ref<{
    date: 'date_desc' | 'date_asc' | null;
    age: 'age_desc' | 'age_asc' | null;
    name: 'name_desc' | 'name_asc' | null;
  }>({
    date: 'date_desc',
    age: null,
    name: null
  });
  const filterStartDate = ref("");
  const filterEndDate = ref("");
  const filterGender = ref("");
  const filterMinAge = ref<number | null>(null);
  const filterMaxAge = ref<number | null>(null);

  const totalPages = computed(() => Math.ceil(totalCount.value / itemsPerPage.value));

  async function fetchPatients() {
    loading.value = true;
    error.value = null;
    try {
      const response = await patientApi.getPatients(
        currentPage.value,
        itemsPerPage.value,
        searchQuery.value,
        JSON.stringify(sorts.value),
        filterStartDate.value,
        filterEndDate.value,
        filterGender.value,
        filterMinAge.value,
        filterMaxAge.value
      );
      patients.value = response.items;
      totalCount.value = response.total;
    } catch (err: any) {
      error.value = err.message || "Failed to fetch patients";
      console.error(err);
    } finally {
      loading.value = false;
    }
  }

  function setPage(page: number) {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page;
      fetchPatients();
    }
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query;
    currentPage.value = 1; // Reset to first page on new search
    fetchPatients();
  }

  function setSorts(category: 'date' | 'age' | 'name', value: string | null) {
    if (category === 'date') sorts.value.date = value as any;
    if (category === 'age') sorts.value.age = value as any;
    if (category === 'name') sorts.value.name = value as any;
    currentPage.value = 1;
    fetchPatients();
  }

  function setFilters(start: string, end: string) {
    filterStartDate.value = start;
    filterEndDate.value = end;
    currentPage.value = 1;
    fetchPatients();
  }

  function setAdvancedFilters(filters: {
    startDate?: string;
    endDate?: string;
    gender?: string;
    minAge?: number | null | string;
    maxAge?: number | null | string;
  }) {
    if ('startDate' in filters) filterStartDate.value = filters.startDate as string;
    if ('endDate' in filters) filterEndDate.value = filters.endDate as string;
    if ('gender' in filters) filterGender.value = filters.gender as string;
    if ('minAge' in filters) filterMinAge.value = (filters.minAge === '' || filters.minAge === null) ? null : Number(filters.minAge);
    if ('maxAge' in filters) filterMaxAge.value = (filters.maxAge === '' || filters.maxAge === null) ? null : Number(filters.maxAge);
    
    currentPage.value = 1;
    fetchPatients();
  }

  async function createPatient(data: Omit<Patient, "id" | "lastVisitDate">) {
    loading.value = true;
    error.value = null;
    try {
      const newPatient = await patientApi.createPatient(data);
      // Reload current page to see new data, or we could just inject it if on page 1
      if (currentPage.value === 1 && !searchQuery.value) {
         patients.value = [newPatient, ...patients.value];
         if (patients.value.length > itemsPerPage.value) {
           patients.value.pop(); // keep limit
         }
         totalCount.value++;
      } else {
         await fetchPatients();
      }
      return newPatient;
    } catch (err: any) {
      error.value = err.message || "Failed to create patient";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    patients,
    totalCount,
    loading,
    error,
    currentPage,
    itemsPerPage,
    searchQuery,
    sorts,
    filterStartDate,
    filterEndDate,
    filterGender,
    filterMinAge,
    filterMaxAge,
    totalPages,
    fetchPatients,
    setPage,
    setSearchQuery,
    setSorts,
    setFilters,
    setAdvancedFilters,
    createPatient
  };
});
