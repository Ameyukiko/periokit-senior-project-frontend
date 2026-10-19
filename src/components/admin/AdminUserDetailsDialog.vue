<script setup lang="ts">
import { computed } from 'vue'
import { Pencil, RotateCcw, Trash2, UserCheck, UserMinus, X } from 'lucide-vue-next'
import AdminDialog from './AdminDialog.vue'
import AdminAvatar from './AdminAvatar.vue'
import AdminRoleBadge from './AdminRoleBadge.vue'
import AdminUserStatus from './AdminUserStatus.vue'
import { OFF, TONES, formatDate, formatDateTime, fullName } from './admin-format'
import { permissionsFor, type Actor } from '@/domain/admin/admin-users.policy'
import type { AdminUser, LifecycleAction } from '@/domain/admin/admin-users.types'

const props = defineProps<{ user: AdminUser | null; actor: Actor; busy: boolean }>()
const emit = defineEmits<{ close: []; edit: [user: AdminUser]; lifecycle: [user: AdminUser, action: LifecycleAction] }>()

const perms = computed(() => (props.user ? permissionsFor(props.actor, props.user) : null))
const rows = computed(() => {
  const u = props.user
  if (!u) return []
  return [
    ['Student ID', u.studentId || '—'],
    ['Created', formatDate(u.createdAt)],
    ['Last sign-in', formatDateTime(u.lastSignInAt)],
    ...(u.status === 'deleted' ? [['Deleted on', formatDate(u.deletedAt)]] : []),
  ]
})
const BTN = 'flex-1 flex items-center justify-center gap-2 py-2 text-[13px] font-bold rounded-xl border'
</script>

<template>
  <AdminDialog v-slot="{ titleId, close }" :show="!!user" width="w-150 max-w-[95vw]" @close="emit('close')">
    <template v-if="user && perms">
      <div class="flex items-center justify-between p-5 border-b border-slate-100">
        <h2 :id="titleId" class="font-bold">User details</h2>
        <button type="button" aria-label="Close" @click="close"><X class="w-5 h-5 text-slate-400" /></button>
      </div>
      <div class="p-5 flex-1 overflow-y-auto">
        <div class="flex items-center gap-3 mb-5">
          <AdminAvatar :user="user" size="w-14 h-14 text-lg" />
          <div>
            <p class="font-bold text-base">{{ fullName(user) }}</p>
            <p class="text-[12px] text-slate-500">{{ user.email }}</p>
            <div class="flex gap-2 mt-1"><AdminRoleBadge :role="user.role" /><AdminUserStatus :user="user" /></div>
          </div>
        </div>
        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Account</p>
        <div v-for="[k, v] in rows" :key="k" class="flex justify-between py-2 border-b border-slate-100 text-[13px]">
          <span class="text-slate-500">{{ k }}</span><span class="font-medium">{{ v }}</span>
        </div>
        <p v-if="!perms.canChangeLifecycle && perms.lifecycleReason" class="mt-3 text-[12px] text-slate-400">{{ perms.lifecycleReason }}</p>
      </div>
      <div class="p-5 border-t border-slate-100 flex gap-2">
        <button
          v-if="user.status === 'deleted'"
          type="button"
          class="flex-1 flex items-center justify-center gap-2 py-2 text-[13px] font-bold rounded-xl text-white"
          :class="perms.canChangeLifecycle ? TONES.blue.solid : 'bg-slate-200 cursor-not-allowed'"
          :disabled="!perms.canChangeLifecycle || busy"
          @click="emit('lifecycle', user, 'restore')"
        >
          <RotateCcw class="w-4 h-4" />Restore account
        </button>
        <template v-else>
          <button type="button" :class="[BTN, perms.canEditProfile ? TONES.blue.outline : OFF]" :disabled="!perms.canEditProfile || busy" @click="emit('edit', user)">
            <Pencil class="w-4 h-4" />Edit
          </button>
          <button
            type="button"
            :class="[BTN, !perms.canChangeLifecycle ? OFF : user.status === 'active' ? TONES.amber.outline : TONES.emerald.outline]"
            :disabled="!perms.canChangeLifecycle || busy"
            :title="perms.lifecycleReason ?? undefined"
            @click="emit('lifecycle', user, user.status === 'active' ? 'deactivate' : 'reactivate')"
          >
            <UserMinus v-if="user.status === 'active'" class="w-4 h-4" /><UserCheck v-else class="w-4 h-4" />
            {{ user.status === 'active' ? 'Deactivate' : 'Reactivate' }}
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-xl border"
            :class="perms.canChangeLifecycle ? TONES.red.outline : OFF"
            :disabled="!perms.canChangeLifecycle || busy"
            :title="perms.lifecycleReason ?? 'Delete'"
            :aria-label="`Delete ${fullName(user)}`"
            @click="emit('lifecycle', user, 'delete')"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </template>
      </div>
    </template>
  </AdminDialog>
</template>
