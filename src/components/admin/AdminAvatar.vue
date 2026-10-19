<script setup lang="ts">
import type { AdminUser } from '@/domain/admin/admin-users.types'

defineProps<{ user: Pick<AdminUser, 'firstName' | 'lastName' | 'status'>; size?: string }>()
</script>

<template>
  <div
    aria-hidden="true"
    class="rounded-full font-bold flex items-center justify-center shrink-0"
    :class="[size ?? 'w-8 h-8 text-[12px]', user.status === 'active' ? 'bg-blue-100 text-[#0052ff]' : 'bg-slate-100 text-slate-400']"
  >
    {{ (user.firstName[0] ?? '').toUpperCase() }}{{ (user.lastName[0] ?? '').toUpperCase() }}
  </div>
</template>
