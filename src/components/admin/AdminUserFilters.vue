<script setup lang="ts">
import { Search, X, ArrowUpDown } from 'lucide-vue-next'
import type { AdminUserQuery, LastSignInFilter, SortField, UserRole } from '@/domain/admin/admin-users.types'

defineProps<{ query: AdminUserQuery }>()
const search = defineModel<string>('search', { required: true })
const emit = defineEmits<{ change: [patch: Partial<AdminUserQuery>] }>()

const ROLE_OPTIONS: { value: UserRole | 'all'; label: string }[] = [
  { value: 'all', label: 'All roles' },
  { value: 'dentist', label: 'Dentist' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
]
const SIGN_IN_OPTIONS: { value: LastSignInFilter; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'never', label: 'Never signed in' },
]
const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'createdAt', label: 'Created date' },
  { value: 'lastSignInAt', label: 'Last sign-in' },
  { value: 'studentId', label: 'Student ID' },
]
const SELECT = 'bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100'
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <label class="relative flex-1 min-w-60">
      <span class="sr-only">Search users</span>
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        v-model="search"
        type="search"
        placeholder="Search name, email or student ID"
        class="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-9 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
      />
      <button
        v-if="search"
        type="button"
        aria-label="Clear search"
        class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
        @click="search = ''"
      >
        <X class="w-4 h-4" />
      </button>
    </label>
    <label>
      <span class="sr-only">Role</span>
      <select :class="SELECT" :value="query.role" @change="emit('change', { role: ($event.target as HTMLSelectElement).value as UserRole | 'all' })">
        <option v-for="o in ROLE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
    </label>
    <label>
      <span class="sr-only">Last sign-in</span>
      <select :class="SELECT" :value="query.lastSignIn" @change="emit('change', { lastSignIn: ($event.target as HTMLSelectElement).value as LastSignInFilter })">
        <option v-for="o in SIGN_IN_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
    </label>
    <label class="flex items-center gap-1">
      <span class="sr-only">Sort by</span>
      <select :class="SELECT" :value="query.sort" @change="emit('change', { sort: ($event.target as HTMLSelectElement).value as SortField })">
        <option v-for="o in SORT_OPTIONS" :key="o.value" :value="o.value">Sort: {{ o.label }}</option>
      </select>
      <button
        type="button"
        class="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
        :aria-label="query.dir === 'asc' ? 'Sort ascending, switch to descending' : 'Sort descending, switch to ascending'"
        @click="emit('change', { dir: query.dir === 'asc' ? 'desc' : 'asc' })"
      >
        <ArrowUpDown class="w-4 h-4" :class="query.dir === 'asc' ? 'text-[#0052ff]' : 'text-slate-500'" />
      </button>
    </label>
  </div>
</template>
