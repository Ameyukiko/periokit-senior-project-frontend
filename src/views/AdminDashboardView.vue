<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { AlertCircle, Loader2, RefreshCw, Search } from 'lucide-vue-next'
import AdminNavbar from '@/components/admin/AdminNavbar.vue'
import AdminStatsTabs from '@/components/admin/AdminStatsTabs.vue'
import AdminFilterPopover from '@/components/admin/AdminFilterPopover.vue'
import AdminKeyPopover from '@/components/admin/AdminKeyPopover.vue'
import AdminUserTable from '@/components/admin/AdminUserTable.vue'
import AdminPagination from '@/components/admin/AdminPagination.vue'
import AdminUserDetailsDialog from '@/components/admin/AdminUserDetailsDialog.vue'
import AdminUserEditDialog from '@/components/admin/AdminUserEditDialog.vue'
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { useAdminUsers } from '@/composables/admin/useAdminUsers'
import { nextSort } from '@/domain/admin/admin-users.query'
import { confirmationFor, type PendingConfirm } from '@/domain/admin/admin-users.confirm'
import type { Actor } from '@/domain/admin/admin-users.policy'
import { isPrivileged, type AdminUser, type AdminUserProfileInput, type LifecycleAction, type SortField, type UserRole } from '@/domain/admin/admin-users.types'

const { user } = storeToRefs(useAuthStore())
// The route guard guarantees a privileged role; the API still enforces it.
const actor = computed<Actor>(() => ({
  id: user.value?.id ?? '',
  role: isPrivileged(user.value?.role) ? user.value!.role as Actor['role'] : 'admin',
}))

const {
  query, searchInput, users, total, totals, totalPages, loading, error, pendingId,
  setQuery, reload, saveUser, changeLifecycle,
} = useAdminUsers()

const viewing = ref<AdminUser | null>(null)
const editing = ref<AdminUser | null>(null)
const confirming = ref<PendingConfirm | null>(null)
const busy = computed(() => !!pendingId.value)

function openEdit(u: AdminUser) {
  viewing.value = null
  editing.value = u
}

async function save(input: AdminUserProfileInput & { role?: UserRole }) {
  const target = editing.value
  if (!target) return
  if (input.role) {
    confirming.value = confirmationFor(target, { kind: 'role', role: input.role, input })
    return
  }
  if (await saveUser(target, input)) editing.value = null
}

const sortBy = (field: SortField) => setQuery(nextSort(query.value, field))

function requestRole(u: AdminUser, role: UserRole) {
  const input = { firstName: u.firstName, lastName: u.lastName, studentId: u.studentId, role }
  confirming.value = confirmationFor(u, { kind: 'role', role, input })
}

function requestLifecycle(u: AdminUser, action: LifecycleAction) {
  confirming.value = confirmationFor(u, { kind: 'lifecycle', action })
}

async function confirm() {
  const c = confirming.value
  if (!c) return
  const ok = c.change.kind === 'role'
    ? await saveUser(c.user, c.change.input)
    : await changeLifecycle(c.user, c.change.action)
  confirming.value = null
  if (!ok) return
  if (c.change.kind === 'role') editing.value = null
  viewing.value = null
}
</script>

<template>
  <div class="min-h-screen bg-[#f1f5f9] text-[#1e293b]">
    <AdminNavbar />
    <main class="max-w-350 mx-auto px-6 py-6 flex flex-col gap-5">
      <div class="flex items-end justify-between">
        <div>
          <h1 class="text-xl font-bold">User Management</h1>
          <p class="text-[13px] text-slate-500">Manage accounts and monitor system usage</p>
        </div>
        <AdminKeyPopover />
      </div>

      <div class="flex flex-wrap items-center justify-between gap-4">
        <AdminStatsTabs :active="query.status" :totals="totals" @select="setQuery({ status: $event })" />
        <div class="flex items-center gap-2">
          <label class="relative w-85">
            <span class="sr-only">Search users</span>
            <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              v-model="searchInput"
              type="search"
              placeholder="Search name, email or student ID"
              class="w-full pl-9 pr-3 py-2.5 text-[13px] rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:border-[#0052ff]"
            />
          </label>
          <AdminFilterPopover :query="query" @change="setQuery" />
        </div>
      </div>

      <section class="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div v-if="error" role="alert" class="py-12 text-center text-[13px]">
          <AlertCircle class="w-8 h-8 mx-auto text-red-400 mb-2" />
          <p class="font-bold">{{ error }}</p>
          <button type="button" class="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-[13px] font-bold hover:bg-slate-50" @click="reload">
            <RefreshCw class="w-4 h-4" />Try again
          </button>
        </div>
        <template v-else>
          <div v-if="loading && !users.length" class="py-12 flex justify-center text-slate-400" aria-live="polite">
            <Loader2 class="w-6 h-6 animate-spin" /><span class="sr-only">Loading users</span>
          </div>
          <AdminUserTable
            v-else
            :users="users"
            :actor="actor"
            :query="query"
            :pending-id="pendingId"
            :loading="loading"
            @view="viewing = $event"
            @edit="openEdit"
            @lifecycle="requestLifecycle"
            @sort="sortBy"
            @role="requestRole"
          />
          <AdminPagination
            :page="query.page"
            :total-pages="totalPages"
            :total="total"
            :page-size="query.pageSize"
            @change="setQuery({ page: $event })"
          />
        </template>
      </section>
    </main>

    <AdminUserDetailsDialog
      :user="viewing"
      :actor="actor"
      :busy="busy"
      @close="viewing = null"
      @edit="openEdit"
      @lifecycle="requestLifecycle"
    />
    <AdminUserEditDialog :user="editing" :actor="actor" :busy="busy" @close="editing = null" @save="save" />
    <AdminConfirmDialog :confirm="confirming" :busy="busy" @confirm="confirm" @cancel="confirming = null" />
  </div>
</template>
