<script setup lang="ts">
import { AlertCircle, ChevronDown, History, Loader2, RefreshCw, Search } from 'lucide-vue-next'
import AdminNavbar from '@/components/admin/AdminNavbar.vue'
import AdminAuditTable from '@/components/admin/AdminAuditTable.vue'
import AdminPagination from '@/components/admin/AdminPagination.vue'
import { useAdminAuditLog } from '@/composables/admin/useAdminAuditLog'
import { AUDIT_ACTION_LABELS, type AuditAction } from '@/domain/admin/admin-audit.types'

const { query, searchInput, logs, total, totalPages, loading, error, setQuery, reload } = useAdminAuditLog()

const ACTIONS = Object.entries(AUDIT_ACTION_LABELS) as [AuditAction, string][]
const CONTROL = 'py-2.5 text-[13px] rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:border-[#0052ff]'
</script>

<template>
  <div class="min-h-screen bg-[#f1f5f9] text-[#1e293b]">
    <AdminNavbar />
    <main class="max-w-350 mx-auto px-6 py-6 flex flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-xl font-bold">Activity Log</h1>
          <p class="text-[13px] text-slate-500">History of user management actions by admins</p>
        </div>
        <div class="flex items-center gap-2 mr-6">
          <label class="relative w-85">
            <span class="sr-only">Search activity</span>
            <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input v-model="searchInput" type="search" placeholder="Search name or email" :class="[CONTROL, 'w-full pl-9 pr-3']" />
          </label>
          <label class="relative">
            <span class="sr-only">Filter by action</span>
            <select :value="query.action" :class="[CONTROL, 'appearance-none pl-3 pr-10 cursor-pointer']" @change="setQuery({ action: ($event.target as HTMLSelectElement).value as AuditAction | 'all' })">
              <option value="all">All actions</option>
              <option v-for="[value, label] in ACTIONS" :key="value" :value="value">{{ label }}</option>
            </select>
            <ChevronDown class="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </label>
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
        <div v-else-if="loading && !logs.length" class="py-12 flex justify-center text-slate-400" aria-live="polite">
          <Loader2 class="w-6 h-6 animate-spin" /><span class="sr-only">Loading activity</span>
        </div>
        <div v-else-if="!logs.length" class="py-12 text-center text-[13px] text-slate-400">
          <History class="w-8 h-8 mx-auto mb-2" />
          No activity found
        </div>
        <template v-else>
          <AdminAuditTable :logs="logs" :loading="loading" />
          <AdminPagination :page="query.page" :total-pages="totalPages" :total="total" :page-size="query.pageSize" @change="setQuery({ page: $event })" />
        </template>
      </section>
    </main>
  </div>
</template>
