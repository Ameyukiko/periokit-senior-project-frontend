<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Filter } from 'lucide-vue-next'
import { activeFilterCount } from '@/domain/admin/admin-users.query'
import type { AdminUserQuery, CreatedFilter, UserRole } from '@/domain/admin/admin-users.types'

const props = defineProps<{ query: AdminUserQuery }>()
const emit = defineEmits<{ change: [patch: Partial<AdminUserQuery>] }>()

const GROUPS = [
  {
    key: 'role',
    label: 'Role',
    options: [
      { value: 'dentist', label: 'Dentist' },
      { value: 'admin', label: 'Admin' },
      { value: 'super_admin', label: 'Super Admin' },
    ],
  },
  {
    key: 'created',
    label: 'Created',
    options: [
      { value: 'week', label: 'Last 7 days' },
      { value: 'month', label: 'Last 30 days' },
      { value: 'older', label: 'Over 30 days ago' },
    ],
  },
] as const

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function toggle(key: 'role' | 'created', value: string) {
  if (key === 'role') emit('change', { role: props.query.role === value ? 'all' : (value as UserRole) })
  else emit('change', { created: props.query.created === value ? 'any' : (value as CreatedFilter) })
}

const onClick = (e: MouseEvent) => {
  if (!root.value?.contains(e.target as Node)) open.value = false
}
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') open.value = false
}
onMounted(() => {
  document.addEventListener('click', onClick)
  document.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  document.removeEventListener('click', onClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      :aria-expanded="open"
      aria-haspopup="dialog"
      class="flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold rounded-xl border border-slate-200 bg-white shadow-sm text-slate-600 hover:bg-slate-50"
      @click="open = !open"
    >
      <Filter class="w-4 h-4" />Filter
      <span v-if="activeFilterCount(query)" class="text-[11px] px-1.5 rounded-full bg-[#0052ff] text-white">{{ activeFilterCount(query) }}</span>
    </button>
    <div
      v-if="open"
      role="dialog"
      aria-label="Filters"
      class="absolute right-0 top-full mt-2 w-75 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-30 flex flex-col gap-4"
    >
      <div v-for="g in GROUPS" :key="g.key" role="group" :aria-label="g.label">
        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">{{ g.label }}</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="o in g.options"
            :key="o.value"
            type="button"
            :aria-pressed="query[g.key] === o.value"
            class="px-3 py-1 rounded-full text-[12px] font-bold border"
            :class="query[g.key] === o.value ? 'bg-[#0052ff] border-[#0052ff] text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'"
            @click="toggle(g.key, o.value)"
          >
            {{ o.label }}
          </button>
        </div>
      </div>
      <button type="button" class="self-start text-[12px] font-bold text-[#0052ff]" @click="emit('change', { role: 'all', created: 'any' })">
        Clear all
      </button>
    </div>
  </div>
</template>
