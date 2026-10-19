<script setup lang="ts">
import { computed } from 'vue'
import AdminDialog from './AdminDialog.vue'
import AdminRoleBadge from './AdminRoleBadge.vue'
import { STATUS_STYLES, formatDate, fullName } from './admin-format'
import { permissionsFor, type Actor } from '@/domain/admin/admin-users.policy'
import type { AdminUser } from '@/domain/admin/admin-users.types'

const props = defineProps<{ user: AdminUser | null; actor: Actor }>()
const emit = defineEmits<{ close: []; edit: [user: AdminUser] }>()

const perms = computed(() => (props.user ? permissionsFor(props.actor, props.user) : null))
</script>

<template>
  <AdminDialog :show="!!user" title="User details" @close="emit('close')">
    <template v-if="user && perms">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-full bg-blue-100 text-[#0052ff] font-bold flex items-center justify-center">
          {{ (user.firstName[0] ?? '').toUpperCase() }}{{ (user.lastName[0] ?? '').toUpperCase() }}
        </div>
        <div>
          <p class="font-bold text-slate-800">{{ fullName(user) }}</p>
          <p class="text-sm text-slate-500">{{ user.email }}</p>
        </div>
      </div>
      <dl class="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <dt class="text-slate-500">Role</dt>
        <dd><AdminRoleBadge :role="user.role" /></dd>
        <dt class="text-slate-500">Status</dt>
        <dd><span class="text-[11px] font-bold px-2 py-0.5 rounded-full border capitalize" :class="STATUS_STYLES[user.status]">{{ user.status }}</span></dd>
        <dt class="text-slate-500">Student ID</dt>
        <dd class="font-mono">{{ user.studentId ?? '—' }}</dd>
        <dt class="text-slate-500">Created</dt>
        <dd>{{ formatDate(user.createdAt) }}</dd>
        <dt class="text-slate-500">Last sign-in</dt>
        <dd>{{ formatDate(user.lastSignInAt) }}</dd>
      </dl>
      <p v-if="!perms.canEditProfile" class="mt-5 text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
        {{ perms.lifecycleReason }} This account is view only.
      </p>
      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold hover:bg-slate-50" @click="emit('close')">Close</button>
        <button
          v-if="perms.canEditProfile && user.status !== 'deleted'"
          type="button"
          class="px-4 py-2 rounded-lg bg-[#0052ff] text-white text-sm font-semibold hover:bg-[#0042cc]"
          @click="emit('edit', user)"
        >
          Edit user
        </button>
      </div>
    </template>
  </AdminDialog>
</template>
