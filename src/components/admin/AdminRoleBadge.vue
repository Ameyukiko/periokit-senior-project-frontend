<script setup lang="ts">
import { ROLE_LABELS, type UserRole } from '@/domain/admin/admin-users.types'

defineProps<{ role: UserRole }>()

const STYLES: Record<UserRole, string> = {
  dentist: 'bg-blue-50 text-[#0052ff] border-blue-200',
  admin: 'bg-violet-50 text-violet-600 border-violet-200',
  super_admin: 'bg-amber-50 text-amber-700 border-amber-200',
}
</script>

<template>
  <span class="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap" :class="STYLES[role]">
    {{ ROLE_LABELS[role] }}
  </span>
</template>
