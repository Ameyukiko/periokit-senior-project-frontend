<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import type { ChartSummary } from '@/domain/chart/chart.types'

const props = defineProps<{
  summary: ChartSummary
  label?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const presentTeeth = computed(() => props.summary.totalTeeth - props.summary.missingTeeth)

const tiles = computed(() => [
  { key: 'teeth', label: 'Teeth', value: `${presentTeeth.value}/${props.summary.totalTeeth}`, tone: 'slate' },
  { key: 'implants', label: 'Implants', value: String(props.summary.implantTeeth), tone: 'violet' },
  { key: 'bop', label: 'BoP', value: `${props.summary.bopPercentage}%`, tone: 'rose' },
  { key: 'pi', label: 'PI', value: `${props.summary.piPercentage}%`, tone: 'blue' },
  { key: 'mobility', label: 'Mobility', value: String(props.summary.mobilityCount), tone: 'amber' },
  { key: 'furcation', label: 'Furcation', value: String(props.summary.furcationCount), tone: 'purple' },
  { key: 'ktw', label: 'KTW <2', value: String(props.summary.keratinizedLowCount), tone: 'teal' },
])

const toneClass: Record<string, string> = {
  slate: 'bg-slate-50 border-slate-200 text-slate-600',
  violet: 'bg-violet-50 border-violet-200 text-violet-600',
  rose: 'bg-rose-50 border-rose-200 text-rose-600',
  blue: 'bg-blue-50 border-blue-100 text-blue-600',
  amber: 'bg-amber-50 border-amber-200 text-amber-600',
  purple: 'bg-purple-50 border-purple-200 text-purple-600',
  teal: 'bg-teal-50 border-teal-200 text-teal-600',
}
</script>

<template>
  <div class="w-[400px] xl:w-[480px] bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 xl:p-8 space-y-6 mx-auto xl:mx-0">
    <!-- Title -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <p class="text-sm font-black uppercase tracking-widest text-slate-700">Summary</p>
        <span v-if="label" class="text-xs font-bold text-[#0052ff] bg-blue-50 px-2 py-1 rounded-md">{{ label }}</span>
      </div>
      <button @click="emit('close')" class="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-xl hover:bg-slate-100">
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Pocket health distribution -->
    <div class="space-y-2">
      <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Pocket Health</p>
      <div class="flex h-3 rounded-full overflow-hidden bg-slate-100">
        <div class="bg-emerald-500 transition-all" :style="{ width: summary.healthDistribution.healthy + '%' }"></div>
        <div class="bg-amber-400 transition-all" :style="{ width: summary.healthDistribution.moderate + '%' }"></div>
        <div class="bg-rose-500 transition-all" :style="{ width: summary.healthDistribution.severe + '%' }"></div>
      </div>
      <div class="flex justify-between text-[11px] font-black pt-1">
        <span class="text-emerald-600">Healthy {{ summary.healthDistribution.healthy }}%</span>
        <span class="text-amber-600">Mod {{ summary.healthDistribution.moderate }}%</span>
        <span class="text-rose-600">Severe {{ summary.healthDistribution.severe }}%</span>
      </div>
    </div>

    <!-- Metric tiles -->
    <div class="grid grid-cols-3 gap-3">
      <div
        v-for="tile in tiles"
        :key="tile.key"
        class="rounded-2xl border px-3 py-3 xl:py-4 text-center transition-all hover:scale-[1.02]"
        :class="toneClass[tile.tone]"
      >
        <p class="text-[10px] xl:text-xs font-bold uppercase tracking-wide xl:tracking-wider opacity-70 truncate">{{ tile.label }}</p>
        <p class="text-xl xl:text-2xl font-black leading-tight mt-1">{{ tile.value }}</p>
      </div>
    </div>
  </div>
</template>
