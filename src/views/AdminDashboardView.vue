<script setup lang="ts">
import { ref } from "vue";
import { ShieldCheck, BarChart3, Users, Settings } from "lucide-vue-next";

import Navbar from "../components/layout/Navbar.vue";
import PatientDrawer from "../components/patients/VisitListPanel.vue";

const drawerOpen = ref(false);
</script>

<template>
  <div class="min-h-screen bg-slate-900 font-sans flex text-white">
    <!-- Sidebar -->
    <aside
      class="w-64 bg-slate-800 border-r border-slate-700 flex flex-col sticky top-0 h-screen"
    >
      <div class="p-6 flex items-center gap-3">
        <ShieldCheck class="h-8 w-8 text-blue-400" />
        <span class="text-xl font-bold tracking-tight">Admin Portal</span>
      </div>

      <nav class="flex-1 px-4 space-y-1 mt-4">
        <a
          href="#"
          class="flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold"
        >
          <BarChart3 class="w-5 h-5" />
          Overview
        </a>
        <a
          href="#"
          class="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-700 rounded-xl transition-colors"
        >
          <Users class="w-5 h-5" />
          User Management
        </a>
        <a
          href="#"
          class="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-700 rounded-xl transition-colors"
        >
          <Settings class="w-5 h-5" />
          System Settings
        </a>
      </nav>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col">
      <Navbar @toggle-drawer="drawerOpen = !drawerOpen" />
      <PatientDrawer v-model:open="drawerOpen" />

      <main class="p-8">
        <header class="mb-10">
          <h1 class="text-3xl font-bold">Admin Dashboard</h1>
          <p class="text-slate-400 mt-1">
            System status and administrative controls.
          </p>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <!-- Admin Stats -->
          <div class="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <p class="text-slate-400 text-sm font-medium">Active Users</p>
            <h3 class="text-3xl font-bold mt-2">1,248</h3>
            <p class="text-green-400 text-xs mt-2">+12% from last week</p>
          </div>
          <div class="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <p class="text-slate-400 text-sm font-medium">System Health</p>
            <h3 class="text-3xl font-bold mt-2">99.9%</h3>
            <p class="text-blue-400 text-xs mt-2">All systems operational</p>
          </div>
          <div class="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <p class="text-slate-400 text-sm font-medium">New Registrations</p>
            <h3 class="text-3xl font-bold mt-2">45</h3>
            <p class="text-slate-500 text-xs mt-2">Past 24 hours</p>
          </div>
          <div class="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <p class="text-slate-400 text-sm font-medium">Server Load</p>
            <h3 class="text-3xl font-bold mt-2">24%</h3>
            <p class="text-green-400 text-xs mt-2">Normal</p>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
