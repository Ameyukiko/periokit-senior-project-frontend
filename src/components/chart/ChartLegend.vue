<script setup lang="ts">
	import { Info, X } from 'lucide-vue-next'
	import { CHART_LEGEND_ITEMS } from '@/domain/chart/chart.constants'
	import { ref } from 'vue'

	defineProps<{
		isSidebarOpen: boolean
	}>()

	const isExpanded = ref(false)
</script>

<template>
  <aside :class="[
    'flex flex-col gap-3 sticky top-24 transition-all duration-500',
    isSidebarOpen ? 'w-14 z-150' : 'w-60 z-0'
  ]">
    <!-- Collapsed Icon Mode with Toggle -->
    <div v-if="isSidebarOpen" class="flex flex-col items-center relative">
      <!-- Toggle Button -->
      <button
        @click="isExpanded = !isExpanded"
        :class="[
          'w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200',
          isExpanded ? 'bg-[#0052ff]' : 'bg-slate-50'
        ]"
      >
        <Info
          :class="[
            'transition-all duration-200',
            isExpanded ? 'text-white' : 'text-[#0052ff]'
          ]"
          class="w-3.5 h-3.5"
        />
      </button>

      <!-- Expanded Panel -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
      >
        <div
          v-if="isExpanded"
          class="absolute left-full top-0 ml-3 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 min-w-44 z-200"
        >
          <!-- Close Button -->
          <button
            @click="isExpanded = false"
            class="absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X class="w-2.5 h-2.5" />
          </button>

          <h3 class="text-[9px] font-black text-slate-800 uppercase tracking-widest mb-2 pb-1.5 border-b border-slate-100 flex items-center gap-1.5 pr-5">
            <Info class="w-2.5 h-2.5 text-[#0052ff]" /> KEY
          </h3>
          <ul class="space-y-1.5">
            <li v-for="(desc, key) in CHART_LEGEND_ITEMS" :key="key" class="flex items-baseline gap-1.5">
              <span class="text-[9px] font-black text-slate-800 min-w-9">{{ key }}</span>
              <span class="text-[9px] font-medium text-slate-400">= {{ desc }}</span>
            </li>
          </ul>

          <div class="mt-2 pt-2 border-t border-slate-100">
            <h4 class="text-[8px] font-black text-slate-800 uppercase tracking-wider mb-1.5">Furcation</h4>
            <div class="space-y-1">
              <div class="flex items-center gap-1.5">
                <svg class="w-3 h-3 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9" /></svg>
                <span class="text-[8px] font-bold text-slate-500">Grade I</span>
              </div>
              <div class="flex items-center gap-1.5">
                <svg class="w-3 h-3 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none" /></svg>
                <span class="text-[8px] font-bold text-slate-500">Grade II</span>
              </div>
              <div class="flex items-center gap-1.5">
                <svg class="w-3 h-3 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9" fill="currentColor" /></svg>
                <span class="text-[8px] font-bold text-slate-500">Grade III</span>
              </div>
            </div>
          </div>

          <div class="mt-2 pt-2 border-t border-slate-100">
            <h4 class="text-[8px] font-black text-slate-800 uppercase tracking-wider mb-1.5">KTW Warning</h4>
            <div class="flex items-center gap-1.5">
              <div class="relative w-3 h-3">
                <svg viewBox="0 0 24 24" class="w-full h-full text-amber-500">
                  <path fill="currentColor" d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16v2h2v-2h-2zm0-6v4h2v-4h-2z"/>
                </svg>
              </div>
              <span class="text-[8px] font-bold text-slate-500">&lt; 2mm (inadequate)</span>
            </div>
          </div>

          <div class="mt-1.5 pt-1.5 border-t border-slate-100">
            <div class="flex items-center gap-1">
              <span class="text-[11px] font-bold text-red-600">Red numbers</span>
              <span class="text-[11px] font-medium text-slate-400">= Abnormal (warning only)</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Expanded Mode (when sidebar is closed) -->
    <template v-else>
      <div class="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm">
        <h3 class="text-[9px] font-black text-slate-800 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
          <Info class="w-2.5 h-2.5 text-[#0052ff]" /> KEY
        </h3>
        <ul class="space-y-1.5">
          <li v-for="(desc, key) in CHART_LEGEND_ITEMS" :key="key" class="flex items-baseline gap-1.5">
            <span class="text-[9px] font-black text-slate-800 min-w-10">{{ key }}</span>
            <span class="text-[9px] font-medium text-slate-400">= {{ desc }}</span>
          </li>
        </ul>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm">
        <h3 class="text-[9px] font-black text-slate-800 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1.5">Furcation involvement</h3>
        <div class="space-y-1.5">
          <div class="flex items-center gap-2">
            <div class="w-5 flex justify-center">
              <svg class="w-3.5 h-3.5 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9" /></svg>
            </div>
            <span class="text-[9px] font-bold text-slate-500">: Grade I</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-5 flex justify-center">
              <svg class="w-3.5 h-3.5 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none" /></svg>
            </div>
            <span class="text-[9px] font-bold text-slate-500">: Grade II</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-5 flex justify-center">
              <svg class="w-3.5 h-3.5 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9" fill="currentColor" /></svg>
            </div>
            <span class="text-[9px] font-bold text-slate-500">: Grade III</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-amber-100 p-2.5 shadow-sm">
        <div class="flex items-center gap-1.5">
          <div class="relative w-3.5 h-3.5">
            <svg viewBox="0 0 24 24" class="w-full h-full text-amber-500">
              <path fill="currentColor" d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16v2h2v-2h-2zm0-6v4h2v-4h-2z"/>
            </svg>
            <span class="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-amber-900">K</span>
          </div>
          <span class="text-[9px] font-bold text-slate-600">KTW &lt; 2mm (inadequate)</span>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-red-100 p-2.5 shadow-sm">
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-bold text-red-600">Red numbers</span>
          <span class="text-[10px] font-medium text-slate-400">= Abnormal (warning only)</span>
        </div>
      </div>
    </template>
  </aside>
</template>
