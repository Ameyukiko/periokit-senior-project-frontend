<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { LayoutGrid, Shield } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { ROLE_LABELS, isPrivileged } from '@/domain/admin/admin-users.types'
import ProfileMenu from '../layout/ProfileMenu.vue'

const { user } = storeToRefs(useAuthStore())
</script>

<template>
  <nav class="bg-white border-b border-[#e2e8f0] h-16 flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm">
    <div class="flex items-center gap-6">
      <router-link to="/admin" class="flex items-center">
        <img src="@/assets/logo_perio.png" alt="PERIOKIT" class="h-12 w-auto" />
      </router-link>
      <span class="flex items-center gap-2 text-[#0052ff] font-bold text-sm"><Shield class="w-5 h-5" />Admin Dashboard</span>
      <router-link to="/patients" class="hidden md:flex items-center gap-2 text-[#4b5563] hover:text-[#0052ff] font-bold text-sm">
        <LayoutGrid class="w-5 h-5" />Dentist workspace
      </router-link>
    </div>
    <div class="flex items-center gap-4">
      <span
        v-if="isPrivileged(user?.role)"
        class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200 uppercase"
      >
        {{ ROLE_LABELS[user!.role as 'admin' | 'super_admin'] }}
      </span>
      <ProfileMenu context="admin" />
    </div>
  </nav>
</template>
