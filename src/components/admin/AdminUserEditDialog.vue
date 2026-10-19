<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import AdminDialog from './AdminDialog.vue'
import { fullName } from './admin-format'
import { permissionsFor, type Actor } from '@/domain/admin/admin-users.policy'
import { ROLE_LABELS, type AdminUser, type AdminUserProfileInput, type UserRole } from '@/domain/admin/admin-users.types'

const props = defineProps<{ user: AdminUser | null; actor: Actor; busy: boolean }>()
const emit = defineEmits<{ close: []; save: [input: AdminUserProfileInput & { role?: UserRole }] }>()

const form = reactive({ firstName: '', lastName: '', studentId: '', role: 'dentist' as UserRole })
watch(
  () => props.user,
  (u) => {
    if (!u) return
    Object.assign(form, { firstName: u.firstName, lastName: u.lastName, studentId: u.studentId ?? '', role: u.role })
  },
  { immediate: true },
)

const perms = computed(() => (props.user ? permissionsFor(props.actor, props.user) : null))
const errors = computed(() => ({
  firstName: form.firstName.trim() ? '' : 'First name is required',
  lastName: form.lastName.trim() ? '' : 'Last name is required',
  studentId: !form.studentId.trim() || /^\d+$/.test(form.studentId.trim()) ? '' : 'Student ID must contain digits only',
}))
const valid = computed(() => !Object.values(errors.value).some(Boolean))

function submit() {
  if (!valid.value || props.busy || !props.user) return
  emit('save', {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    studentId: form.studentId.trim() || null,
    ...(perms.value?.canChangeRole && form.role !== props.user.role ? { role: form.role } : {}),
  })
}

const INPUT = 'w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500'
</script>

<template>
  <AdminDialog :show="!!user" :title="user ? `Edit ${fullName(user)}` : 'Edit user'" :busy="busy" @close="emit('close')">
    <form v-if="user && perms" class="space-y-4" novalidate @submit.prevent="submit">
      <div class="grid grid-cols-2 gap-3">
        <label class="block text-sm">
          <span class="font-semibold text-slate-700">First name</span>
          <input v-model="form.firstName" autofocus :class="INPUT" class="mt-1" :aria-invalid="!!errors.firstName" />
          <span v-if="errors.firstName" class="text-xs text-red-600">{{ errors.firstName }}</span>
        </label>
        <label class="block text-sm">
          <span class="font-semibold text-slate-700">Last name</span>
          <input v-model="form.lastName" :class="INPUT" class="mt-1" :aria-invalid="!!errors.lastName" />
          <span v-if="errors.lastName" class="text-xs text-red-600">{{ errors.lastName }}</span>
        </label>
      </div>
      <label class="block text-sm">
        <span class="font-semibold text-slate-700">Email</span>
        <input :value="user.email" disabled :class="INPUT" class="mt-1" />
      </label>
      <label class="block text-sm">
        <span class="font-semibold text-slate-700">Student ID</span>
        <input v-model="form.studentId" inputmode="numeric" :class="INPUT" class="mt-1" :aria-invalid="!!errors.studentId" />
        <span v-if="errors.studentId" class="text-xs text-red-600">{{ errors.studentId }}</span>
      </label>
      <label class="block text-sm">
        <span class="font-semibold text-slate-700">Role</span>
        <select v-model="form.role" :disabled="!perms.canChangeRole" :class="INPUT" class="mt-1" aria-describedby="role-help">
          <option v-for="(label, value) in ROLE_LABELS" :key="value" :value="value">{{ label }}</option>
        </select>
        <span v-if="perms.roleReason" id="role-help" class="text-xs text-slate-500">{{ perms.roleReason }}</span>
      </label>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" class="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold hover:bg-slate-50" :disabled="busy" @click="emit('close')">
          Cancel
        </button>
        <button type="submit" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0052ff] text-white text-sm font-semibold hover:bg-[#0042cc] disabled:opacity-60" :disabled="busy || !valid">
          <Loader2 v-if="busy" class="w-4 h-4 animate-spin" />
          Save changes
        </button>
      </div>
    </form>
  </AdminDialog>
</template>
