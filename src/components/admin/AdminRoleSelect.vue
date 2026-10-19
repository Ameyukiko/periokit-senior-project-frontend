<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import { ROLE_LABELS, type UserRole } from '@/domain/admin/admin-users.types'

defineProps<{ role: UserRole; label: string; disabled?: boolean }>()
const emit = defineEmits<{ change: [role: UserRole] }>()

const STYLES: Record<UserRole, string> = {
  dentist: 'bg-blue-50 text-[#0052ff]',
  admin: 'bg-violet-50 text-violet-600',
  super_admin: 'bg-amber-50 text-amber-700',
}
</script>

<template>
  <!-- Badge-styled select; the parent confirms before anything is saved. -->
  <span class="relative inline-block">
    <select
      :value="role"
      :disabled="disabled"
      :aria-label="label"
      class="appearance-none text-[11px] font-bold pl-2 pr-6 py-0.5 rounded-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-200 disabled:cursor-default"
      :class="STYLES[role]"
      @change="emit('change', ($event.target as HTMLSelectElement).value as UserRole); ($event.target as HTMLSelectElement).value = role"
    >
      <option v-for="(text, value) in ROLE_LABELS" :key="value" :value="value">{{ text }}</option>
    </select>
    <ChevronDown class="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3" :class="STYLES[role]" />
  </span>
</template>
