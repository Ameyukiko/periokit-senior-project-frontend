<script setup lang="ts">
import { Shield } from 'lucide-vue-next'
import AdminNavbar from '@/components/admin/AdminNavbar.vue'
</script>

<template>
  <div class="min-h-screen bg-[#f1f5f9] text-[#1e293b]">
    <AdminNavbar />
    <main class="max-w-350 mx-auto px-6 py-6">
      <h1 class="text-xl font-bold">User Management</h1>
      <section class="mt-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
        <Shield class="w-10 h-10 mx-auto text-slate-400" />
        <h2 class="mt-4 text-lg font-semibold">User management is not available yet</h2>
        <p class="mt-2 text-sm text-slate-500">
          This page will show real accounts when the admin API is connected.
        </p>
      </section>
    </main>
  </div>
</template>
