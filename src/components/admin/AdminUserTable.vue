<script setup lang="ts">
import { computed } from 'vue'
import { Eye, Pencil, Power, RotateCcw, Trash2, Users } from 'lucide-vue-next'
import AdminRoleBadge from './AdminRoleBadge.vue'
import { STATUS_STYLES, formatDate, fullName } from './admin-format'
import { permissionsFor, type Actor } from '@/domain/admin/admin-users.policy'
import type { AdminUser, LifecycleAction } from '@/domain/admin/admin-users.types'

const props = defineProps<{ users: AdminUser[]; actor: Actor; pendingId: string | null; loading: boolean }>()
const emit = defineEmits<{ view: [user: AdminUser]; edit: [user: AdminUser]; lifecycle: [user: AdminUser, action: LifecycleAction] }>()

const perms = computed(() => new Map(props.users.map((u) => [u.id, permissionsFor(props.actor, u)])))

const ICON_BTN = 'p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent'
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm" :aria-busy="loading">
      <thead class="bg-slate-50 text-xs text-slate-500 text-left">
        <tr>
          <th scope="col" class="px-4 py-3 font-semibold">User</th>
          <th scope="col" class="px-4 py-3 font-semibold">Student ID</th>
          <th scope="col" class="px-4 py-3 font-semibold">Role</th>
          <th scope="col" class="px-4 py-3 font-semibold">Status</th>
          <th scope="col" class="px-4 py-3 font-semibold">Created</th>
          <th scope="col" class="px-4 py-3 font-semibold">Last sign-in</th>
          <th scope="col" class="px-4 py-3 font-semibold text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!users.length && !loading">
          <td colspan="7" class="px-4 py-12 text-center text-slate-500">
            <Users class="w-8 h-8 mx-auto text-slate-300" />
            <p class="mt-2 font-semibold">No users found</p>
            <p class="text-xs">Try a different search or filter.</p>
          </td>
        </tr>
        <tr
          v-for="user in users"
          :key="user.id"
          class="border-t border-slate-100 hover:bg-slate-50/60"
          :class="{ 'opacity-60': loading || pendingId === user.id }"
        >
          <td class="px-4 py-3">
            <p class="font-semibold text-slate-800">
              {{ fullName(user) }}
              <span v-if="user.id === actor.id" class="ml-1 text-[10px] font-bold text-slate-400">(you)</span>
            </p>
            <p class="text-xs text-slate-500">{{ user.email }}</p>
          </td>
          <td class="px-4 py-3 font-mono text-xs">{{ user.studentId ?? '—' }}</td>
          <td class="px-4 py-3"><AdminRoleBadge :role="user.role" /></td>
          <td class="px-4 py-3">
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-full border capitalize" :class="STATUS_STYLES[user.status]">{{ user.status }}</span>
          </td>
          <td class="px-4 py-3 text-xs text-slate-600">{{ formatDate(user.createdAt) }}</td>
          <td class="px-4 py-3 text-xs text-slate-600">{{ formatDate(user.lastSignInAt) }}</td>
          <td class="px-4 py-3">
            <div class="flex justify-end gap-1">
              <button :class="ICON_BTN" :aria-label="`View ${fullName(user)}`" title="View" @click="emit('view', user)">
                <Eye class="w-4 h-4" />
              </button>
              <template v-if="perms.get(user.id)">
                <button
                  v-if="perms.get(user.id)!.canEditProfile && user.status !== 'deleted'"
                  :class="ICON_BTN"
                  :disabled="!!pendingId"
                  :aria-label="`Edit ${fullName(user)}`"
                  title="Edit"
                  @click="emit('edit', user)"
                >
                  <Pencil class="w-4 h-4" />
                </button>
                <template v-if="perms.get(user.id)!.canChangeLifecycle">
                  <button
                    v-if="user.status !== 'deleted'"
                    :class="ICON_BTN"
                    :disabled="!!pendingId"
                    :title="user.status === 'active' ? 'Deactivate' : 'Reactivate'"
                    :aria-label="`${user.status === 'active' ? 'Deactivate' : 'Reactivate'} ${fullName(user)}`"
                    @click="emit('lifecycle', user, user.status === 'active' ? 'deactivate' : 'reactivate')"
                  >
                    <Power class="w-4 h-4" />
                  </button>
                  <button
                    v-if="user.status !== 'deleted'"
                    :class="ICON_BTN"
                    class="hover:text-red-600"
                    :disabled="!!pendingId"
                    title="Delete"
                    :aria-label="`Delete ${fullName(user)}`"
                    @click="emit('lifecycle', user, 'delete')"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                  <button
                    v-else
                    :class="ICON_BTN"
                    :disabled="!!pendingId"
                    title="Restore"
                    :aria-label="`Restore ${fullName(user)}`"
                    @click="emit('lifecycle', user, 'restore')"
                  >
                    <RotateCcw class="w-4 h-4" />
                  </button>
                </template>
              </template>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
