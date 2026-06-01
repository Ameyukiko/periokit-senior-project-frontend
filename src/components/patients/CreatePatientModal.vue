<script setup lang="ts">
import { ref } from 'vue';
import { usePatientStore } from '../../stores/patient';
import { X } from 'lucide-vue-next';

const emit = defineEmits(['close', 'created']);
const patientStore = usePatientStore();

const loading = ref(false);
const error = ref('');

const formData = ref({
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: 'Male' as 'Male' | 'Female' | 'Other',
  hn: ''
});

const handleSubmit = async () => {
  error.value = '';
  loading.value = true;
  
  try {
    const newPatient = await patientStore.createPatient({
      firstName: formData.value.firstName,
      lastName: formData.value.lastName,
      dateOfBirth: formData.value.dateOfBirth,
      gender: formData.value.gender,
      hn: formData.value.hn || `HN${Math.floor(Math.random() * 10000)}`
    });
    
    emit('created', newPatient);
  } catch (err: any) {
    error.value = err.message || 'Failed to create patient';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 p-4">
    <div class="relative w-full max-w-md rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
        <h3 class="text-lg font-bold text-gray-900">New Patient</h3>
        <button
          @click="emit('close')"
          class="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Body -->
      <div class="px-6 py-6 overflow-y-auto">
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div v-if="error" class="p-3 bg-red-50 text-red-600 text-sm rounded-lg mb-4">
            {{ error }}
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">HN (Optional)</label>
            <input
              v-model="formData.hn"
              type="text"
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
              placeholder="e.g. HN0001"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">First Name <span class="text-red-500">*</span></label>
              <input
                v-model="formData.firstName"
                type="text"
                required
                class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="John"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Last Name <span class="text-red-500">*</span></label>
              <input
                v-model="formData.lastName"
                type="text"
                required
                class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Date of Birth <span class="text-red-500">*</span></label>
            <input
              v-model="formData.dateOfBirth"
              type="date"
              required
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Gender <span class="text-red-500">*</span></label>
            <select
              v-model="formData.gender"
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm bg-white"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </form>
      </div>

      <!-- Footer -->
      <div class="border-t border-gray-100 px-6 py-4 flex justify-end gap-3 shrink-0">
        <button
          type="button"
          @click="emit('close')"
          class="px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          @click="handleSubmit"
          :disabled="loading"
          class="px-5 py-2 text-sm font-medium text-white bg-[#0052ff] hover:bg-blue-600 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px]"
        >
          <span v-if="loading" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          <span v-else>Create</span>
        </button>
      </div>
    </div>
  </div>
</template>
