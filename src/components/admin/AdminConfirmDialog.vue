<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import AdminDialog from './AdminDialog.vue'

defineProps<{ show: boolean; title: string; message: string; confirmText: string; danger?: boolean; busy?: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <AdminDialog :show="show" :title="title" :busy="busy" @close="emit('cancel')">
    <!-- Plain text only: message may contain user-provided names. -->
    <p class="text-sm text-slate-600 whitespace-pre-line">{{ message }}</p>
    <div class="mt-6 flex justify-end gap-2">
      <button type="button" autofocus class="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold hover:bg-slate-50" :disabled="busy" @click="emit('cancel')">
        Cancel
      </button>
      <button
        type="button"
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
        :class="danger ? 'bg-red-500 hover:bg-red-600' : 'bg-[#0052ff] hover:bg-[#0042cc]'"
        :disabled="busy"
        @click="emit('confirm')"
      >
        <Loader2 v-if="busy" class="w-4 h-4 animate-spin" />
        {{ confirmText }}
      </button>
    </div>
  </AdminDialog>
</template>
