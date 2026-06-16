<script setup lang="ts">
import { computed } from 'vue'
import { X, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-vue-next'
import type { ChartSummary } from '@/domain/chart/chart.types'

const props = defineProps<{
  summary: ChartSummary
  label?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const presentTeeth = computed(() => props.summary.totalTeeth - props.summary.missingTeeth)

// Dynamic overall pocket status computation
const overallStatus = computed(() => {
  const healthy = props.summary.healthDistribution.healthy
  const severe = props.summary.healthDistribution.severe
  
  if (severe > 15) {
    return {
      label: 'Deep Pockets (≥6mm)',
      icon: AlertTriangle,
      bgClass: 'bg-rose-50 border-rose-200 text-rose-700'
    }
  } else if (severe > 5 || healthy < 75) {
    return {
      label: 'Moderate Depth (4-5mm)',
      icon: AlertCircle,
      bgClass: 'bg-amber-50 border-amber-200 text-amber-700'
    }
  } else {
    return {
      label: 'Stable & Healthy (1-3mm)',
      icon: CheckCircle2,
      bgClass: 'bg-emerald-50 border-emerald-200 text-emerald-700'
    }
  }
})

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
      <div class="flex items-center justify-between">
        <p class="text-xs font-black uppercase tracking-wider text-slate-500">Pocket Health</p>
        <!-- Dynamic Status Badge -->
        <div :class="['flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold shadow-xs transition-all', overallStatus.bgClass]">
          <component :is="overallStatus.icon" class="w-3.5 h-3.5" />
          {{ overallStatus.label }}
        </div>
      </div>
      
      <!-- Inline percentages bar -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-[10px] font-black text-slate-600 bg-slate-50/50 border border-slate-200/60 rounded-2xl px-4 py-3 mt-1">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
          <span class="text-emerald-700">Healthy (1-3mm): <span class="text-slate-800 text-xs font-black ml-0.5">{{ summary.healthDistribution.healthy }}%</span></span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
          <span class="text-amber-700">Moderate (4-5mm): <span class="text-slate-800 text-xs font-black ml-0.5">{{ summary.healthDistribution.moderate }}%</span></span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
          <span class="text-rose-700">Severe (≥6mm): <span class="text-slate-800 text-xs font-black ml-0.5">{{ summary.healthDistribution.severe }}%</span></span>
        </div>
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
