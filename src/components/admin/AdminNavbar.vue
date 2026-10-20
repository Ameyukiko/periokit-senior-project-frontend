<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { History, Shield } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { ROLE_LABELS, isPrivileged } from '@/domain/admin/admin-users.types'
import ProfileMenu from '../layout/ProfileMenu.vue'

const { user } = storeToRefs(useAuthStore())
const tabs = computed(() => [
  { to: '/admin', label: 'Admin Dashboard', icon: Shield },
  ...(user.value?.role === 'super_admin' ? [{ to: '/admin/activity-log', label: 'Activity Log', icon: History }] : []),
])
</script>

<template>
  <nav class="bg-white border-b border-[#e2e8f0] h-16 flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm">
    <div class="flex items-center gap-6 self-stretch">
      <router-link to="/admin" class="flex items-center">
        <img src="@/assets/logo_perio.png" alt="PERIOKIT" class="h-12 w-auto" />
      </router-link>
      <div class="flex items-stretch self-stretch gap-2">
        <router-link
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="flex items-center gap-2 px-3 text-sm font-bold text-slate-500 hover:text-slate-800"
          exact-active-class="!text-[#0052ff]"
        >
          <component :is="tab.icon" class="w-4 h-4" />{{ tab.label }}
        </router-link>
      </div>
    </div>
    <div class="flex items-center gap-4">
      <span
        v-if="isPrivileged(user?.role)"
        class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200 uppercase"
      >
        {{ ROLE_LABELS[user!.role as 'admin' | 'super_admin'] }}
      </span>
      <ProfileMenu />
    </div>
  </nav>
</template>
