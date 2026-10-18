<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Menu, Shield } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const { user } = storeToRefs(useAuthStore())
const initials = computed(
  () => `${user.value?.first_name?.[0] ?? ''}${user.value?.last_name?.[0] ?? ''}`.toUpperCase() || '?',
)
</script>

<template>
  <nav class="bg-white border-b border-[#e2e8f0] h-16 flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm">
    <div class="flex items-center gap-6">
      <Menu class="w-6 h-6 text-[#1f2937]" />
      <router-link to="/admin" class="flex items-center">
        <img src="@/assets/logo_perio.png" alt="PERIOKIT" class="h-12 w-auto" />
      </router-link>
      <span class="flex items-center gap-2 text-[#0052ff] font-bold text-sm"><Shield class="w-5 h-5" />Admin Dashboard</span>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200">ADMIN</span>
      <div class="w-9 h-9 rounded-full bg-blue-100 text-[#0052ff] font-bold text-sm flex items-center justify-center">{{ initials }}</div>
    </div>
  </nav>
</template>
