<script setup lang="ts">
import { formatDate } from './admin-format'
import type { AdminUser } from '@/domain/admin/admin-users.types'

defineProps<{ user: Pick<AdminUser, 'status' | 'deletedAt'> }>()
</script>

<template>
  <span v-if="user.status === 'deleted'" class="inline-flex items-center gap-1 text-[11px] font-bold text-red-500 whitespace-nowrap">
    <span class="w-1.5 h-1.5 rounded-full bg-red-400" />Deleted {{ user.deletedAt ? formatDate(user.deletedAt) : '' }}
  </span>
  <span v-else-if="user.status === 'active'" class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />Active
  </span>
  <span v-else class="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
    <span class="w-1.5 h-1.5 rounded-full bg-slate-300" />Deactivated
  </span>
</template>
