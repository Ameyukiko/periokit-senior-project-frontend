<script setup lang="ts">
import type { StatusTab } from '@/domain/admin/admin-users.types'

defineProps<{ active: StatusTab; totals: Record<StatusTab, number> }>()
const emit = defineEmits<{ select: [tab: StatusTab] }>()

const TABS: { id: StatusTab; label: string }[] = [
  { id: 'all', label: 'All users' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
  { id: 'deleted', label: 'Deleted' },
]
</script>

<template>
  <div role="tablist" aria-label="Account status" class="grid grid-cols-2 md:grid-cols-4 gap-3">
    <button
      v-for="tab in TABS"
      :key="tab.id"
      role="tab"
      :aria-selected="active === tab.id"
      class="text-left bg-white rounded-2xl border p-4 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
      :class="active === tab.id ? 'border-[#0052ff] ring-1 ring-[#0052ff]' : 'border-slate-200 hover:border-slate-300'"
      @click="emit('select', tab.id)"
    >
      <p class="text-xs font-semibold text-slate-500">{{ tab.label }}</p>
      <p class="mt-1 text-2xl font-bold" :class="active === tab.id ? 'text-[#0052ff]' : 'text-slate-800'">
        {{ totals[tab.id] }}
      </p>
    </button>
  </div>
</template>
