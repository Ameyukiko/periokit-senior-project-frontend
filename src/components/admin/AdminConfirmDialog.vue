<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import AdminDialog from './AdminDialog.vue'
import { ACTION_ICONS, TONES } from './admin-format'
import type { PendingConfirm } from '@/domain/admin/admin-users.confirm'

defineProps<{ confirm: PendingConfirm | null; busy?: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <AdminDialog v-slot="{ titleId }" :show="!!confirm" :busy="busy" z="z-[60]" @close="emit('cancel')">
    <!-- Plain text only: title and message contain user-provided names. -->
    <div v-if="confirm" class="p-6">
      <div class="w-10 h-10 rounded-full flex items-center justify-center mb-3" :class="TONES[confirm.tone].soft">
        <component :is="ACTION_ICONS[confirm.icon]" class="w-5 h-5" />
      </div>
      <h3 :id="titleId" class="font-bold mb-1">{{ confirm.title }}</h3>
      <p class="text-[13px] text-slate-500 mb-5">{{ confirm.message }}</p>
      <div class="flex justify-end gap-2">
        <button type="button" autofocus class="px-4 py-2 text-[13px] font-bold rounded-xl border border-slate-200 hover:bg-slate-50" :disabled="busy" @click="emit('cancel')">
          Cancel
        </button>
        <button
          type="button"
          class="flex items-center gap-2 px-4 py-2 text-[13px] font-bold rounded-xl text-white disabled:opacity-60"
          :class="TONES[confirm.tone].solid"
          :disabled="busy"
          @click="emit('confirm')"
        >
          <Loader2 v-if="busy" class="w-4 h-4 animate-spin" />{{ confirm.confirmText }}
        </button>
      </div>
    </div>
  </AdminDialog>
</template>
