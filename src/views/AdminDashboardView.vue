<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { AlertCircle, Loader2, RefreshCw } from 'lucide-vue-next'
import AdminNavbar from '@/components/admin/AdminNavbar.vue'
import AdminStatsTabs from '@/components/admin/AdminStatsTabs.vue'
import AdminUserFilters from '@/components/admin/AdminUserFilters.vue'
import AdminUserTable from '@/components/admin/AdminUserTable.vue'
import AdminPagination from '@/components/admin/AdminPagination.vue'
import AdminUserDetailsDialog from '@/components/admin/AdminUserDetailsDialog.vue'
import AdminUserEditDialog from '@/components/admin/AdminUserEditDialog.vue'
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog.vue'
import { fullName } from '@/components/admin/admin-format'
import { useAuthStore } from '@/stores/auth'
import { useAdminUsers } from '@/composables/admin/useAdminUsers'
import { confirmationFor, type PendingConfirm } from '@/domain/admin/admin-users.confirm'
import type { Actor } from '@/domain/admin/admin-users.policy'
import { isPrivileged, type AdminUser, type AdminUserProfileInput, type LifecycleAction, type UserRole } from '@/domain/admin/admin-users.types'

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
  if (ok && c.change.kind === 'role') editing.value = null
}
</script>

<template>
  <div class="min-h-screen bg-[#f1f5f9] text-[#1e293b]">
    <AdminNavbar />
    <main class="max-w-350 mx-auto px-6 py-6 space-y-5">
      <div>
        <h1 class="text-xl font-bold">User Management</h1>
        <p class="text-sm text-slate-500">
          Signed in as {{ user ? fullName({ firstName: user.first_name, lastName: user.last_name }) : '' }} · {{ user?.email }}
        </p>
      </div>

      <AdminStatsTabs :active="query.status" :totals="totals" @select="setQuery({ status: $event })" />

      <section class="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div class="p-4 border-b border-slate-200">
          <AdminUserFilters v-model:search="searchInput" :query="query" @change="setQuery" />
        </div>

        <div v-if="error" role="alert" class="p-10 text-center">
          <AlertCircle class="w-8 h-8 mx-auto text-red-400" />
          <p class="mt-2 font-semibold">{{ error }}</p>
          <button type="button" class="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold hover:bg-slate-50" @click="reload">
            <RefreshCw class="w-4 h-4" /> Try again
          </button>
        </div>
        <template v-else>
          <div v-if="loading && !users.length" class="p-10 flex justify-center text-slate-400" aria-live="polite">
            <Loader2 class="w-6 h-6 animate-spin" /><span class="sr-only">Loading users</span>
          </div>
          <AdminUserTable
            v-else
            :users="users"
            :actor="actor"
            :pending-id="pendingId"
            :loading="loading"
            @view="viewing = $event"
            @edit="openEdit"
            @lifecycle="requestLifecycle"
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

    <AdminUserDetailsDialog :user="viewing" :actor="actor" @close="viewing = null" @edit="openEdit" />
    <AdminUserEditDialog :user="editing" :actor="actor" :busy="busy" @close="editing = null" @save="save" />
    <AdminConfirmDialog
      :show="!!confirming"
      :title="confirming?.title ?? ''"
      :message="confirming?.message ?? ''"
      :confirm-text="confirming?.confirmText ?? ''"
      :danger="confirming?.danger"
      :busy="busy"
      @confirm="confirm"
      @cancel="confirming = null"
    />
  </div>
</template>
