<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, RotateCcw, Trash2, UserCheck, UserMinus, UserX } from 'lucide-vue-next'
import AdminAvatar from './AdminAvatar.vue'
import AdminRoleBadge from './AdminRoleBadge.vue'
import AdminRoleSelect from './AdminRoleSelect.vue'
import AdminUserStatus from './AdminUserStatus.vue'
import { OFF, formatDate, fullName } from './admin-format'
import { permissionsFor, type Actor } from '@/domain/admin/admin-users.policy'
import type { AdminUser, AdminUserQuery, LifecycleAction, SortField, UserRole } from '@/domain/admin/admin-users.types'

const props = defineProps<{ users: AdminUser[]; actor: Actor; query: AdminUserQuery; pendingId: string | null; loading: boolean }>()
const emit = defineEmits<{
  view: [user: AdminUser]
  edit: [user: AdminUser]
  lifecycle: [user: AdminUser, action: LifecycleAction]
  sort: [field: SortField]
  role: [user: AdminUser, role: UserRole]
}>()

const perms = computed(() => new Map(props.users.map((u) => [u.id, permissionsFor(props.actor, u)])))
const SORTABLE: { field: SortField; label: string }[] = [
  { field: 'studentId', label: 'Student ID' },
  { field: 'createdAt', label: 'Created' },
  { field: 'lastSignInAt', label: 'Last sign-in' },
]
const sortIcon = (f: SortField) => (props.query.sort !== f ? ArrowUpDown : props.query.dir === 'asc' ? ArrowUp : ArrowDown)
const ariaSort = (f: SortField) => (props.query.sort !== f ? 'none' : props.query.dir === 'asc' ? 'ascending' : 'descending')
const BTN = 'p-1.5 rounded-lg'
</script>

<template>
  <table class="w-full text-[13px]" :aria-busy="loading">
    <thead class="bg-slate-50 text-[12px] text-slate-500 text-left border-b border-slate-200">
      <tr>
        <th scope="col" class="px-4 py-3 font-semibold rounded-tl-2xl">User</th>
        <th scope="col" class="px-4 py-3 font-semibold" :aria-sort="ariaSort('studentId')">
          <button type="button" class="inline-flex items-center gap-1 hover:text-slate-800" @click="emit('sort', 'studentId')">
            Student ID<component :is="sortIcon('studentId')" class="w-3.5 h-3.5" :class="query.sort === 'studentId' ? 'text-[#0052ff]' : 'text-slate-300'" />
          </button>
        </th>
        <th scope="col" class="px-4 py-3 font-semibold">Role</th>
        <th scope="col" class="px-4 py-3 font-semibold">Status</th>
        <th v-for="s in SORTABLE.slice(1)" :key="s.field" scope="col" class="px-4 py-3 font-semibold" :aria-sort="ariaSort(s.field)">
          <button type="button" class="inline-flex items-center gap-1 hover:text-slate-800" @click="emit('sort', s.field)">
            {{ s.label }}<component :is="sortIcon(s.field)" class="w-3.5 h-3.5" :class="query.sort === s.field ? 'text-[#0052ff]' : 'text-slate-300'" />
          </button>
        </th>
        <th scope="col" class="px-4 py-3 font-semibold text-right rounded-tr-2xl">Actions</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-100">
      <tr
        v-for="user in users"
        :key="user.id"
        class="hover:bg-slate-50 cursor-pointer"
        :class="[{ 'text-slate-400': user.status !== 'active' }, { 'opacity-60': pendingId === user.id }]"
        @click="emit('view', user)"
      >
        <td class="px-4 py-3">
          <button type="button" class="flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 rounded-lg" @click.stop="emit('view', user)">
            <AdminAvatar :user="user" />
            <span>
              <span class="block font-bold">
                {{ fullName(user) }}<span v-if="user.id === actor.id" class="ml-1 text-[10px] text-slate-400">(you)</span>
              </span>
              <span class="block text-[12px] text-slate-400">{{ user.email }}</span>
            </span>
          </button>
        </td>
        <td class="px-4 py-3">{{ user.studentId || '—' }}</td>
        <td class="px-4 py-3" @click.stop>
          <AdminRoleSelect
            v-if="perms.get(user.id)!.canChangeRole && user.status !== 'deleted'"
            :role="user.role"
            :label="`Role for ${fullName(user)}`"
            :disabled="!!pendingId"
            @change="(role) => role !== user.role && emit('role', user, role)"
          />
          <AdminRoleBadge v-else :role="user.role" :title="perms.get(user.id)!.roleReason ?? undefined" />
        </td>
        <td class="px-4 py-3"><AdminUserStatus :user="user" /></td>
        <td class="px-4 py-3">{{ formatDate(user.createdAt) }}</td>
        <td class="px-4 py-3">{{ formatDate(user.lastSignInAt) }}</td>
        <td class="px-4 py-3" @click.stop>
          <div v-if="user.status === 'deleted'" class="flex justify-end">
            <button
              type="button"
              class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-bold"
              :class="perms.get(user.id)!.canChangeLifecycle ? 'text-[#0052ff] hover:bg-blue-50' : OFF"
              :disabled="!perms.get(user.id)!.canChangeLifecycle || !!pendingId"
              :title="perms.get(user.id)!.lifecycleReason ?? 'Restore'"
              @click="emit('lifecycle', user, 'restore')"
            >
              <RotateCcw class="w-4 h-4" />Restore
            </button>
          </div>
          <div v-else class="flex justify-end gap-1">
            <button
              type="button"
              :class="[BTN, perms.get(user.id)!.canEditProfile ? 'text-[#0052ff] hover:bg-blue-50' : OFF]"
              :disabled="!perms.get(user.id)!.canEditProfile || !!pendingId"
              :title="perms.get(user.id)!.canEditProfile ? 'Edit' : perms.get(user.id)!.lifecycleReason ?? 'Edit'"
              :aria-label="`Edit ${fullName(user)}`"
              @click="emit('edit', user)"
            >
              <Pencil class="w-4 h-4" />
            </button>
            <button
              type="button"
              :class="[BTN, !perms.get(user.id)!.canChangeLifecycle ? OFF : user.status === 'active' ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50']"
              :disabled="!perms.get(user.id)!.canChangeLifecycle || !!pendingId"
              :title="perms.get(user.id)!.lifecycleReason ?? (user.status === 'active' ? 'Deactivate' : 'Reactivate')"
              :aria-label="`${user.status === 'active' ? 'Deactivate' : 'Reactivate'} ${fullName(user)}`"
              @click="emit('lifecycle', user, user.status === 'active' ? 'deactivate' : 'reactivate')"
            >
              <UserMinus v-if="user.status === 'active'" class="w-4 h-4" />
              <UserCheck v-else class="w-4 h-4" />
            </button>
            <button
              type="button"
              :class="[BTN, perms.get(user.id)!.canChangeLifecycle ? 'text-red-500 hover:bg-red-50' : OFF]"
              :disabled="!perms.get(user.id)!.canChangeLifecycle || !!pendingId"
              :title="perms.get(user.id)!.lifecycleReason ?? 'Delete'"
              :aria-label="`Delete ${fullName(user)}`"
              @click="emit('lifecycle', user, 'delete')"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
  <div v-if="!users.length && !loading" class="py-12 text-center text-slate-400 text-[13px]">
    <UserX class="w-8 h-8 mx-auto mb-2" />No users match the filters
  </div>
</template>
