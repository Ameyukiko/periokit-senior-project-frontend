<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ChevronDown, LogOut, Shield } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { isPrivileged } from '@/domain/admin/admin-users.types'
import ConfirmModal from '../common/ConfirmModal.vue'

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const open = ref(false)
const showLogoutConfirm = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)

const canSeeAdmin = computed(() => isPrivileged(user.value?.role))

function close(returnFocus = false) {
  open.value = false
  if (returnFocus) trigger.value?.focus()
}
const onClick = (e: MouseEvent) => {
  if (!root.value?.contains(e.target as Node)) close()
}
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && open.value) close(true)
}
onMounted(() => {
  window.addEventListener('click', onClick)
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  window.removeEventListener('click', onClick)
  window.removeEventListener('keydown', onKey)
})

function handleLogout() {
  close()
  showLogoutConfirm.value = true
}
async function confirmLogout() {
  showLogoutConfirm.value = false
  await authStore.logout()
  window.location.href = '/login?logout=true'
}

const ITEM = 'w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold transition-colors'
</script>

<template>
  <div ref="root" class="relative">
    <button
      ref="trigger"
      type="button"
      class="flex items-center gap-3 cursor-pointer group select-none"
      aria-haspopup="menu"
      :aria-expanded="open"
      aria-label="Account menu"
      @click="open = !open"
    >
      <div class="w-10 h-10 rounded-full bg-[#0052ff]/10 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm group-hover:border-[#0052ff]/30 transition-all shrink-0">
        <img v-if="user?.profile_image_url" :src="user.profile_image_url" class="w-full h-full object-cover" alt="" />
        <span v-else class="text-[#0052ff] font-bold text-base leading-none">{{ user?.first_name?.charAt(0)?.toUpperCase() ?? '?' }}</span>
      </div>
      <div class="text-left hidden xl:block">
        <p class="text-sm font-bold text-[#1f2937] leading-none mb-0.5 group-hover:text-[#0052ff] transition-colors">
          {{ user?.first_name }} {{ user?.last_name }}
        </p>
        <p class="text-[11px] text-gray-400 leading-none truncate max-w-35">{{ user?.email }}</p>
      </div>
      <ChevronDown class="w-4 h-4 text-gray-400 transition-transform duration-200" :class="{ 'rotate-180 text-[#0052ff]': open }" />
    </button>

    <div v-if="open" role="menu" class="absolute top-full right-0 mt-3 w-60 bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] py-2 z-50">
      <div class="px-4 py-3 border-b border-[#e2e8f0] mb-1 xl:hidden">
        <p class="text-sm font-bold text-[#1f2937] truncate">{{ user?.first_name }} {{ user?.last_name }}</p>
        <p class="text-xs text-gray-400 truncate">{{ user?.email }}</p>
      </div>
      <router-link v-if="canSeeAdmin" to="/admin" role="menuitem" :class="ITEM" class="text-[#1f2937] hover:bg-slate-50" @click="close()">
        <div class="p-1.5 bg-violet-100 text-violet-600 rounded-lg"><Shield class="w-4 h-4" /></div>
        Admin Dashboard
      </router-link>
      <button type="button" role="menuitem" :class="ITEM" class="text-red-500 hover:bg-red-50" @click="handleLogout">
        <div class="p-1.5 bg-red-100 rounded-lg"><LogOut class="w-4 h-4" /></div>
        Sign Out
      </button>
    </div>
  </div>

  <ConfirmModal
    :show="showLogoutConfirm"
    title="Sign Out"
    message="<span class='text-slate-800 font-bold text-lg block mb-1'>Are you sure you want to sign out of PerioKit?</span><span class='text-slate-500 font-normal'>You will need to login again to access your charts.</span>"
    confirmText="Sign Out"
    type="danger"
    @confirm="confirmLogout"
    @cancel="showLogoutConfirm = false"
  />
</template>
