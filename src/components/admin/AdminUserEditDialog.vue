<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { ChevronDown, Loader2, Lock, X } from 'lucide-vue-next'
import AdminDialog from './AdminDialog.vue'
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
  studentId: !form.studentId.trim() || /^\d+$/.test(form.studentId.trim()) ? '' : 'Digits only',
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

const LABEL = 'text-[12px] font-bold text-slate-500'
const INPUT = 'mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 font-normal text-[13px] text-slate-800 outline-none focus:border-[#0052ff] disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed'
</script>

<template>
  <AdminDialog v-slot="{ titleId, close }" :show="!!user" :busy="busy" width="w-115 max-w-[95vw]" @close="emit('close')">
    <form v-if="user && perms" class="p-6 flex flex-col gap-4" novalidate @submit.prevent="submit">
      <div class="flex items-center justify-between">
        <h2 :id="titleId" class="font-bold text-base">Edit user</h2>
        <button type="button" aria-label="Close" :disabled="busy" @click="close"><X class="w-5 h-5 text-slate-400" /></button>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <label :class="LABEL">First name
          <input v-model="form.firstName" autofocus :class="INPUT" :aria-invalid="!!errors.firstName" />
          <span v-if="errors.firstName" class="font-normal text-[11px] text-red-500">{{ errors.firstName }}</span>
        </label>
        <label :class="LABEL">Last name
          <input v-model="form.lastName" :class="INPUT" :aria-invalid="!!errors.lastName" />
          <span v-if="errors.lastName" class="font-normal text-[11px] text-red-500">{{ errors.lastName }}</span>
        </label>
      </div>
      <label :class="LABEL">Email
        <input :value="user.email" type="email" readonly :class="INPUT" class="read-only:bg-slate-50 read-only:text-slate-400 read-only:cursor-not-allowed" />
        <span class="mt-1 flex items-center gap-1 font-normal text-[11px] text-slate-400"><Lock class="w-3 h-3" />Email is the sign-in ID and can't be changed</span>
      </label>
      <div class="grid grid-cols-2 gap-3">
        <label :class="LABEL">Student ID
          <input v-model="form.studentId" inputmode="numeric" :class="INPUT" :aria-invalid="!!errors.studentId" />
          <span v-if="errors.studentId" class="font-normal text-[11px] text-red-500">{{ errors.studentId }}</span>
        </label>
        <label :class="LABEL">Role
          <span class="relative block">
            <select v-model="form.role" :disabled="!perms.canChangeRole" :class="INPUT" class="appearance-none pr-9" aria-describedby="role-help">
              <option v-for="(label, value) in ROLE_LABELS" :key="value" :value="value">{{ label }}</option>
            </select>
            <ChevronDown class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 w-4 h-4 text-slate-400" />
          </span>
          <span v-if="perms.roleReason" id="role-help" class="mt-1 block font-normal text-[11px] text-slate-400">{{ perms.roleReason }}</span>
        </label>
      </div>
      <div class="flex justify-end gap-2 pt-1">
        <button type="button" class="px-4 py-2 text-[13px] font-bold rounded-xl border border-slate-200 hover:bg-slate-50" :disabled="busy" @click="close">Cancel</button>
        <button type="submit" class="flex items-center gap-2 px-4 py-2 text-[13px] font-bold rounded-xl bg-[#0052ff] text-white disabled:opacity-60" :disabled="busy || !valid">
          <Loader2 v-if="busy" class="w-4 h-4 animate-spin" />Save
        </button>
      </div>
    </form>
  </AdminDialog>
</template>
