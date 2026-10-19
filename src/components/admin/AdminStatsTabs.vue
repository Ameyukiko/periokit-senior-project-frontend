<script setup lang="ts">
import type { StatusTab } from '@/domain/admin/admin-users.types'

defineProps<{ active: StatusTab; totals: Record<StatusTab, number> }>()
const emit = defineEmits<{ select: [tab: StatusTab] }>()

const TABS: { id: StatusTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Deactivated' },
  { id: 'deleted', label: 'Deleted' },
]
</script>

<template>
  <div role="tablist" aria-label="Account status" class="flex items-center gap-1 p-1 bg-white rounded-2xl border border-slate-200 shadow-sm">
    <button
      v-for="tab in TABS"
      :key="tab.id"
      role="tab"
      :aria-selected="active === tab.id"
      class="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
      :class="active === tab.id ? 'bg-[#0052ff] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'"
      @click="emit('select', tab.id)"
    >
      {{ tab.label }}
      <span class="text-[11px] px-2 py-0.5 rounded-full" :class="active === tab.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'">
        {{ totals[tab.id] }}
      </span>
    </button>
  </div>
</template>
