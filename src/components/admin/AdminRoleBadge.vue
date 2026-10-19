<script setup lang="ts">
import { ROLE_LABELS, type UserRole } from '@/domain/admin/admin-users.types'

defineProps<{ role: UserRole }>()

const STYLES: Record<UserRole, string> = {
  dentist: 'bg-blue-50 text-[#0052ff]',
  admin: 'bg-violet-50 text-violet-600',
  super_admin: 'bg-amber-50 text-amber-700',
}
</script>

<template>
  <span class="text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" :class="STYLES[role]">{{ ROLE_LABELS[role] }}</span>
</template>
