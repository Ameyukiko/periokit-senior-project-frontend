<script setup lang="ts">
import type { PrognosisKC, PrognosisMN } from '@/domain/chart/tooth.analysis'

type PrognosisType = 'MN' | 'KC'

defineProps<{
  extracted: boolean
  implant: boolean
  innerSurfaceLabel: string
  prognosisKC?: PrognosisKC
  prognosisMN?: PrognosisMN
  buccalKTW?: string
  innerSurfaceKTW?: string
  mobility?: string
  furcation?: number
}>()

const emit = defineEmits<{
  'show-prognosis': [type: PrognosisType]
}>()

const getFurLabel = (grade?: number) => {
  if (grade === undefined) return '-'
  const labels = ['-', 'Grade I', 'Grade II', 'Grade III']
  return labels[grade] || '-'
}

const getPrognosisColorMN = (val?: string) => {
  if (!val || val === 'N/A') return 'text-slate-400 bg-slate-50'
  if (val.includes('Good')) return 'text-green-600 bg-green-50'
  if (val === 'Fair') return 'text-blue-600 bg-blue-50'
  if (val === 'Poor') return 'text-amber-600 bg-amber-50'
  if (val === 'Questionable') return 'text-orange-600 bg-orange-50'
  if (val === 'Hopeless') return 'text-red-600 bg-red-50'
  return 'text-slate-600 bg-slate-50'
}

const getPrognosisColorKC = (val?: string) => {
  if (!val || val === 'N/A') return 'text-slate-400 bg-slate-50'
  if (val === 'Favorable') return 'text-green-600 bg-green-50'
  if (val === 'Questionable') return 'text-amber-600 bg-amber-50'
  if (val === 'Unfavorable') return 'text-red-600 bg-red-50'
  if (val === 'Hopeless') return 'text-slate-900 bg-slate-100'
  return 'text-slate-600 bg-slate-50'
}
</script>

<template>
  <section
    class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm"
    :class="{ 'bg-slate-900/5 opacity-60 pointer-events-none': extracted }"
  >
    <h3 class="text-[13px] font-black text-slate-800 mb-6">
      Analysis Summary
    </h3>
    <div class="space-y-5">
      <div
        class="flex justify-between gap-4 cursor-pointer group"
        @click="emit('show-prognosis', 'KC')"
      >
        <div class="flex items-center gap-1.5">
          <span class="text-[11px] font-bold text-slate-400 border-b border-dotted border-slate-300 group-hover:text-[#0052ff] group-hover:border-[#0052ff] transition-all">
            Prognosis K&C
          </span>
          <svg class="text-slate-200 group-hover:text-[#0052ff] transition-colors" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </div>
        <span
          class="text-[10px] font-black px-2.5 py-1 rounded-lg transition-all"
          :class="getPrognosisColorKC(prognosisKC)"
        >
          {{ prognosisKC || 'N/A' }}
        </span>
      </div>

      <div
        class="flex justify-between gap-4 cursor-pointer group"
        @click="emit('show-prognosis', 'MN')"
      >
        <div class="flex items-center gap-1.5">
          <span class="text-[11px] font-bold text-slate-400 border-b border-dotted border-slate-300 group-hover:text-[#0052ff] group-hover:border-[#0052ff] transition-all">
            Prognosis M&N
          </span>
          <svg class="text-slate-200 group-hover:text-[#0052ff] transition-colors" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </div>
        <span
          class="text-[10px] font-black px-2.5 py-1 rounded-lg transition-all"
          :class="getPrognosisColorMN(prognosisMN)"
        >
          {{ prognosisMN || 'N/A' }}
        </span>
      </div>

      <div class="flex justify-between items-center pt-2">
        <span class="text-[11px] font-bold text-slate-400">Buccal-Keratinized</span>
        <span class="text-[11px] font-black text-slate-700">{{ buccalKTW }} mm</span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-[11px] font-bold text-slate-400">{{ innerSurfaceLabel }}-Keratinized</span>
        <span class="text-[11px] font-black text-slate-700">{{ innerSurfaceKTW }} mm</span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-[11px] font-bold text-slate-400">Mobility</span>
        <span class="text-[11px] font-black text-slate-700">{{ implant ? 'Fixed (0)' : 'Grade ' + (mobility || '0') }}</span>
      </div>
      <div v-if="!implant" class="flex justify-between items-center">
        <span class="text-[11px] font-bold text-slate-400">Furcation</span>
        <span class="text-[11px] font-black text-slate-700">{{ getFurLabel(furcation) }}</span>
      </div>
    </div>
  </section>
</template>
