<script setup lang="ts">
import { computed, ref } from 'vue'
import { X } from 'lucide-vue-next'
import {
  getSafePDValues,
  getSafeCALValues,
  calculateToothBopPercentage,
  calculateToothPiPercentage,
  calculatePrognosisMN,
  calculatePrognosisKC,
} from '@/utils/calculations'
import { isUpperTooth } from '@/domain/chart/chart.rules'
import type { ToothData, ToothId } from '@/domain/chart/chart.types'

const props = defineProps<{
  open: boolean
  toothId: ToothId | null
  toothDataA: ToothData | null
  toothDataB: ToothData | null
  visitLabelA: string
  visitLabelB: string
}>()

const emit = defineEmits<{ close: [] }>()

const innerSurfaceLabel = computed(() =>
  props.toothId && isUpperTooth(props.toothId) ? 'Palatal' : 'Lingual'
)

function buildAnalysis(data: ToothData | null) {
  if (!data) return null
  const allFur = [...(data.fur?.buccal || []), ...(data.fur?.lingual || [])].map(v => parseInt(String(v)) || 0)
  const maxFur = allFur.length > 0 ? Math.max(0, ...allFur) : 0
  const furLabel = maxFur === 0 ? '-' : `Grade ${['I', 'II', 'III'][maxFur - 1] ?? maxFur}`
  return {
    buccalPD: getSafePDValues(data.buccal?.pd),
    innerPD: getSafePDValues(data.lingual?.pd),
    buccalCAL: getSafeCALValues(data.buccal?.cal),
    innerCAL: getSafeCALValues(data.lingual?.cal),
    bop: calculateToothBopPercentage(data),
    pi: calculateToothPiPercentage(data),
    mobility: data.mo || '0',
    ktwBuccal: data.buccal?.ktw || '0',
    ktwInner: data.lingual?.ktw || '0',
    furcation: furLabel,
    prognosisMN: calculatePrognosisMN(data),
    prognosisKC: calculatePrognosisKC(data),
    note: data.note || '',
    extracted: data.extracted,
    implant: data.implant,
  }
}

const analysisA = computed(() => buildAnalysis(props.toothDataA))
const analysisB = computed(() => buildAnalysis(props.toothDataB))

const prognosisModalType = ref<'MN' | 'KC' | null>(null)

const pdColorClass = (val: string) => parseInt(val) > 4 ? 'text-red-500' : 'text-[#0052ff]'

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
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="translate-x-full opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="translate-x-full opacity-0"
  >
    <aside
      v-if="open && toothId"
      class="w-[480px] sticky top-6 shrink-0 self-start"
      style="height: calc(100vh / 0.9 - 160px);"
    >
      <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col h-full">

        <!-- Header -->
        <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <div class="flex items-center gap-3">
              <h2 class="text-3xl font-black text-slate-800 tracking-tight">#{{ toothId }}</h2>
            </div>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Compare Tooth Details</p>
          </div>
          <button
            @click="emit('close')"
            class="p-2 hover:bg-slate-50 rounded-full transition-all text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-100"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Visit label headers -->
        <div class="grid grid-cols-2 divide-x divide-slate-100 bg-slate-50 border-b border-slate-100 shrink-0">
          <div class="px-4 py-3 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visit A</p>
            <p class="text-sm font-bold text-[#0052ff] truncate mt-0.5">{{ visitLabelA }}</p>
            <div v-if="toothDataA?.extracted" class="mt-1.5 inline-flex px-2 py-0.5 bg-red-50 text-red-500 border border-red-100 rounded text-[9px] font-black uppercase tracking-wider">Extracted</div>
            <div v-else-if="toothDataA?.implant" class="mt-1.5 inline-flex px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded text-[9px] font-black uppercase tracking-wider">Implant</div>
          </div>
          <div class="px-4 py-3 text-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visit B</p>
            <p class="text-sm font-bold text-[#0052ff] truncate mt-0.5">{{ visitLabelB }}</p>
            <div v-if="toothDataB?.extracted" class="mt-1.5 inline-flex px-2 py-0.5 bg-red-50 text-red-500 border border-red-100 rounded text-[9px] font-black uppercase tracking-wider">Extracted</div>
            <div v-else-if="toothDataB?.implant" class="mt-1.5 inline-flex px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded text-[9px] font-black uppercase tracking-wider">Implant</div>
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 min-h-0 overflow-y-auto p-6 space-y-8 scrollbar-hide">

          <!-- PD Section -->
          <section>
            <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4 text-center">Probing Depth (mm)</h3>
            <div class="grid grid-cols-2 gap-4">
              <!-- A -->
              <div class="space-y-3" :class="{ 'opacity-50 pointer-events-none': toothDataA?.extracted }">
                <div class="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm text-center">
                  <div v-if="analysisA" class="text-xl font-black mb-1 flex items-center justify-center gap-0.5">
                    <span v-for="(val, i) in analysisA.buccalPD" :key="i" :class="pdColorClass(val)">{{ val }}{{ i < 2 ? '-' : '' }}</span>
                  </div>
                  <div v-else class="text-xl font-black mb-1 text-slate-300">—</div>
                  <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Buccal</p>
                </div>
                <div class="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm text-center">
                  <div v-if="analysisA" class="text-xl font-black mb-1 flex items-center justify-center gap-0.5">
                    <span v-for="(val, i) in analysisA.innerPD" :key="i" :class="pdColorClass(val)">{{ val }}{{ i < 2 ? '-' : '' }}</span>
                  </div>
                  <div v-else class="text-xl font-black mb-1 text-slate-300">—</div>
                  <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{{ innerSurfaceLabel }}</p>
                </div>
              </div>
              <!-- B -->
              <div class="space-y-3" :class="{ 'opacity-50 pointer-events-none': toothDataB?.extracted }">
                <div class="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm text-center">
                  <div v-if="analysisB" class="text-xl font-black mb-1 flex items-center justify-center gap-0.5">
                    <span v-for="(val, i) in analysisB.buccalPD" :key="i" :class="pdColorClass(val)">{{ val }}{{ i < 2 ? '-' : '' }}</span>
                  </div>
                  <div v-else class="text-xl font-black mb-1 text-slate-300">—</div>
                  <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Buccal</p>
                </div>
                <div class="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm text-center">
                  <div v-if="analysisB" class="text-xl font-black mb-1 flex items-center justify-center gap-0.5">
                    <span v-for="(val, i) in analysisB.innerPD" :key="i" :class="pdColorClass(val)">{{ val }}{{ i < 2 ? '-' : '' }}</span>
                  </div>
                  <div v-else class="text-xl font-black mb-1 text-slate-300">—</div>
                  <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{{ innerSurfaceLabel }}</p>
                </div>
              </div>
            </div>
          </section>

          <!-- CAL Section -->
          <section>
            <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4 text-center">Clinical Attachment Level (mm)</h3>
            <div class="grid grid-cols-2 gap-4">
              <!-- A -->
              <div class="space-y-3" :class="{ 'opacity-50 pointer-events-none': toothDataA?.extracted }">
                <div class="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm text-center">
                  <div v-if="analysisA" class="text-xl font-black mb-1 flex items-center justify-center gap-0.5 text-[#0052ff]">
                    <span v-for="(val, i) in analysisA.buccalCAL" :key="i">{{ val }}{{ i < 2 ? '-' : '' }}</span>
                  </div>
                  <div v-else class="text-xl font-black mb-1 text-slate-300">—</div>
                  <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Buccal</p>
                </div>
                <div class="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm text-center">
                  <div v-if="analysisA" class="text-xl font-black mb-1 flex items-center justify-center gap-0.5 text-[#0052ff]">
                    <span v-for="(val, i) in analysisA.innerCAL" :key="i">{{ val }}{{ i < 2 ? '-' : '' }}</span>
                  </div>
                  <div v-else class="text-xl font-black mb-1 text-slate-300">—</div>
                  <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{{ innerSurfaceLabel }}</p>
                </div>
              </div>
              <!-- B -->
              <div class="space-y-3" :class="{ 'opacity-50 pointer-events-none': toothDataB?.extracted }">
                <div class="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm text-center">
                  <div v-if="analysisB" class="text-xl font-black mb-1 flex items-center justify-center gap-0.5 text-[#0052ff]">
                    <span v-for="(val, i) in analysisB.buccalCAL" :key="i">{{ val }}{{ i < 2 ? '-' : '' }}</span>
                  </div>
                  <div v-else class="text-xl font-black mb-1 text-slate-300">—</div>
                  <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Buccal</p>
                </div>
                <div class="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm text-center">
                  <div v-if="analysisB" class="text-xl font-black mb-1 flex items-center justify-center gap-0.5 text-[#0052ff]">
                    <span v-for="(val, i) in analysisB.innerCAL" :key="i">{{ val }}{{ i < 2 ? '-' : '' }}</span>
                  </div>
                  <div v-else class="text-xl font-black mb-1 text-slate-300">—</div>
                  <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{{ innerSurfaceLabel }}</p>
                </div>
              </div>
            </div>
          </section>

          <!-- Visual Indicators Section (Standard 6-Site Hexagonal Diagrams) -->
          <section>
            <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4 text-center">BOP (6 Sites)</h3>
            <div class="grid grid-cols-2 gap-4">
              <!-- A -->
              <div class="relative bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center" :class="{ 'opacity-50 pointer-events-none': toothDataA?.extracted }">
                <div v-if="analysisA?.bop !== '0%' && analysisA" class="absolute top-2 right-2 px-1.5 py-0.5 bg-red-50 text-red-500 text-[8px] font-black rounded border border-red-100 shadow-sm">{{ analysisA.bop }}</div>
                <div class="relative w-16 h-16 mb-2">
                  <svg v-if="toothDataA" viewBox="0 0 100 100" class="w-full h-full">
                    <defs>
                      <clipPath :id="`squircle-clip-bopA-${toothId}`">
                        <rect x="4" y="4" width="92" height="92" rx="26" />
                      </clipPath>
                    </defs>
                    <g :clip-path="`url(#squircle-clip-bopA-${toothId})`">
                      <rect x="4" y="4" width="92" height="92" rx="26" fill="white" />
                      <template v-if="isUpperTooth(toothId!)">
                        <path v-if="toothDataA.buccal.bop[0]" d="M50 50 L0 50 L0 0 Z" fill="#ef4444" />
                        <path v-if="toothDataA.buccal.bop[1]" d="M50 50 L0 0 L100 0 Z" fill="#ef4444" />
                        <path v-if="toothDataA.buccal.bop[2]" d="M50 50 L100 0 L100 50 Z" fill="#ef4444" />
                        <path v-if="toothDataA.lingual.bop[0]" d="M50 50 L0 50 L0 100 Z" fill="#ef4444" />
                        <path v-if="toothDataA.lingual.bop[1]" d="M50 50 L0 100 L100 100 Z" fill="#ef4444" />
                        <path v-if="toothDataA.lingual.bop[2]" d="M50 50 L100 100 L100 50 Z" fill="#ef4444" />
                      </template>
                      <template v-else>
                        <path v-if="toothDataA.lingual.bop[0]" d="M50 50 L0 50 L0 0 Z" fill="#ef4444" />
                        <path v-if="toothDataA.lingual.bop[1]" d="M50 50 L0 0 L100 0 Z" fill="#ef4444" />
                        <path v-if="toothDataA.lingual.bop[2]" d="M50 50 L100 0 L100 50 Z" fill="#ef4444" />
                        <path v-if="toothDataA.buccal.bop[0]" d="M50 50 L0 50 L0 100 Z" fill="#ef4444" />
                        <path v-if="toothDataA.buccal.bop[1]" d="M50 50 L0 100 L100 100 Z" fill="#ef4444" />
                        <path v-if="toothDataA.buccal.bop[2]" d="M50 50 L100 100 L100 50 Z" fill="#ef4444" />
                      </template>
                      <line x1="0" y1="0" x2="100" y2="100" stroke="#e2e8f0" stroke-width="1.5" />
                      <line x1="100" y1="0" x2="0" y2="100" stroke="#e2e8f0" stroke-width="1.5" />
                      <line x1="0" y1="50" x2="100" y2="50" stroke="#e2e8f0" stroke-width="1.5" />
                    </g>
                    <rect x="4" y="4" width="92" height="92" rx="26" fill="none" stroke="#e2e8f0" stroke-width="2" />
                  </svg>
                </div>
              </div>
              <!-- B -->
              <div class="relative bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center" :class="{ 'opacity-50 pointer-events-none': toothDataB?.extracted }">
                <div v-if="analysisB?.bop !== '0%' && analysisB" class="absolute top-2 right-2 px-1.5 py-0.5 bg-red-50 text-red-500 text-[8px] font-black rounded border border-red-100 shadow-sm">{{ analysisB.bop }}</div>
                <div class="relative w-16 h-16 mb-2">
                  <svg v-if="toothDataB" viewBox="0 0 100 100" class="w-full h-full">
                    <defs>
                      <clipPath :id="`squircle-clip-bopB-${toothId}`">
                        <rect x="4" y="4" width="92" height="92" rx="26" />
                      </clipPath>
                    </defs>
                    <g :clip-path="`url(#squircle-clip-bopB-${toothId})`">
                      <rect x="4" y="4" width="92" height="92" rx="26" fill="white" />
                      <template v-if="isUpperTooth(toothId!)">
                        <path v-if="toothDataB.buccal.bop[0]" d="M50 50 L0 50 L0 0 Z" fill="#ef4444" />
                        <path v-if="toothDataB.buccal.bop[1]" d="M50 50 L0 0 L100 0 Z" fill="#ef4444" />
                        <path v-if="toothDataB.buccal.bop[2]" d="M50 50 L100 0 L100 50 Z" fill="#ef4444" />
                        <path v-if="toothDataB.lingual.bop[0]" d="M50 50 L0 50 L0 100 Z" fill="#ef4444" />
                        <path v-if="toothDataB.lingual.bop[1]" d="M50 50 L0 100 L100 100 Z" fill="#ef4444" />
                        <path v-if="toothDataB.lingual.bop[2]" d="M50 50 L100 100 L100 50 Z" fill="#ef4444" />
                      </template>
                      <template v-else>
                        <path v-if="toothDataB.lingual.bop[0]" d="M50 50 L0 50 L0 0 Z" fill="#ef4444" />
                        <path v-if="toothDataB.lingual.bop[1]" d="M50 50 L0 0 L100 0 Z" fill="#ef4444" />
                        <path v-if="toothDataB.lingual.bop[2]" d="M50 50 L100 0 L100 50 Z" fill="#ef4444" />
                        <path v-if="toothDataB.buccal.bop[0]" d="M50 50 L0 50 L0 100 Z" fill="#ef4444" />
                        <path v-if="toothDataB.buccal.bop[1]" d="M50 50 L0 100 L100 100 Z" fill="#ef4444" />
                        <path v-if="toothDataB.buccal.bop[2]" d="M50 50 L100 100 L100 50 Z" fill="#ef4444" />
                      </template>
                      <line x1="0" y1="0" x2="100" y2="100" stroke="#e2e8f0" stroke-width="1.5" />
                      <line x1="100" y1="0" x2="0" y2="100" stroke="#e2e8f0" stroke-width="1.5" />
                      <line x1="0" y1="50" x2="100" y2="50" stroke="#e2e8f0" stroke-width="1.5" />
                    </g>
                    <rect x="4" y="4" width="92" height="92" rx="26" fill="none" stroke="#e2e8f0" stroke-width="2" />
                  </svg>
                </div>
              </div>
            </div>

            <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4 mt-6 text-center">PI (6 Sites)</h3>
            <div class="grid grid-cols-2 gap-4">
              <!-- A -->
              <div class="relative bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center" :class="{ 'opacity-50 pointer-events-none': toothDataA?.extracted }">
                <div v-if="analysisA?.pi !== '0%' && analysisA" class="absolute top-2 right-2 px-1.5 py-0.5 bg-blue-50 text-blue-500 text-[8px] font-black rounded border border-blue-100 shadow-sm">{{ analysisA.pi }}</div>
                <div class="relative w-16 h-16 mb-2">
                  <svg v-if="toothDataA" viewBox="0 0 100 100" class="w-full h-full">
                    <defs>
                      <clipPath :id="`squircle-clip-piA-${toothId}`">
                        <rect x="4" y="4" width="92" height="92" rx="26" />
                      </clipPath>
                    </defs>
                    <g :clip-path="`url(#squircle-clip-piA-${toothId})`">
                      <rect x="4" y="4" width="92" height="92" rx="26" fill="white" />
                      <template v-if="isUpperTooth(toothId!)">
                        <path v-if="toothDataA.buccal.pi[0]" d="M50 50 L0 50 L0 0 Z" fill="#3b82f6" />
                        <path v-if="toothDataA.buccal.pi[1]" d="M50 50 L0 0 L100 0 Z" fill="#3b82f6" />
                        <path v-if="toothDataA.buccal.pi[2]" d="M50 50 L100 0 L100 50 Z" fill="#3b82f6" />
                        <path v-if="toothDataA.lingual.pi[0]" d="M50 50 L0 50 L0 100 Z" fill="#3b82f6" />
                        <path v-if="toothDataA.lingual.pi[1]" d="M50 50 L0 100 L100 100 Z" fill="#3b82f6" />
                        <path v-if="toothDataA.lingual.pi[2]" d="M50 50 L100 100 L100 50 Z" fill="#3b82f6" />
                      </template>
                      <template v-else>
                        <path v-if="toothDataA.lingual.pi[0]" d="M50 50 L0 50 L0 0 Z" fill="#3b82f6" />
                        <path v-if="toothDataA.lingual.pi[1]" d="M50 50 L0 0 L100 0 Z" fill="#3b82f6" />
                        <path v-if="toothDataA.lingual.pi[2]" d="M50 50 L100 0 L100 50 Z" fill="#3b82f6" />
                        <path v-if="toothDataA.buccal.pi[0]" d="M50 50 L0 50 L0 100 Z" fill="#3b82f6" />
                        <path v-if="toothDataA.buccal.pi[1]" d="M50 50 L0 100 L100 100 Z" fill="#3b82f6" />
                        <path v-if="toothDataA.buccal.pi[2]" d="M50 50 L100 100 L100 50 Z" fill="#3b82f6" />
                      </template>
                      <line x1="0" y1="0" x2="100" y2="100" stroke="#e2e8f0" stroke-width="1.5" />
                      <line x1="100" y1="0" x2="0" y2="100" stroke="#e2e8f0" stroke-width="1.5" />
                      <line x1="0" y1="50" x2="100" y2="50" stroke="#e2e8f0" stroke-width="1.5" />
                    </g>
                    <rect x="4" y="4" width="92" height="92" rx="26" fill="none" stroke="#e2e8f0" stroke-width="2" />
                  </svg>
                </div>
              </div>
              <!-- B -->
              <div class="relative bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center" :class="{ 'opacity-50 pointer-events-none': toothDataB?.extracted }">
                <div v-if="analysisB?.pi !== '0%' && analysisB" class="absolute top-2 right-2 px-1.5 py-0.5 bg-blue-50 text-blue-500 text-[8px] font-black rounded border border-blue-100 shadow-sm">{{ analysisB.pi }}</div>
                <div class="relative w-16 h-16 mb-2">
                  <svg v-if="toothDataB" viewBox="0 0 100 100" class="w-full h-full">
                    <defs>
                      <clipPath :id="`squircle-clip-piB-${toothId}`">
                        <rect x="4" y="4" width="92" height="92" rx="26" />
                      </clipPath>
                    </defs>
                    <g :clip-path="`url(#squircle-clip-piB-${toothId})`">
                      <rect x="4" y="4" width="92" height="92" rx="26" fill="white" />
                      <template v-if="isUpperTooth(toothId!)">
                        <path v-if="toothDataB.buccal.pi[0]" d="M50 50 L0 50 L0 0 Z" fill="#3b82f6" />
                        <path v-if="toothDataB.buccal.pi[1]" d="M50 50 L0 0 L100 0 Z" fill="#3b82f6" />
                        <path v-if="toothDataB.buccal.pi[2]" d="M50 50 L100 0 L100 50 Z" fill="#3b82f6" />
                        <path v-if="toothDataB.lingual.pi[0]" d="M50 50 L0 50 L0 100 Z" fill="#3b82f6" />
                        <path v-if="toothDataB.lingual.pi[1]" d="M50 50 L0 100 L100 100 Z" fill="#3b82f6" />
                        <path v-if="toothDataB.lingual.pi[2]" d="M50 50 L100 100 L100 50 Z" fill="#3b82f6" />
                      </template>
                      <template v-else>
                        <path v-if="toothDataB.lingual.pi[0]" d="M50 50 L0 50 L0 0 Z" fill="#3b82f6" />
                        <path v-if="toothDataB.lingual.pi[1]" d="M50 50 L0 0 L100 0 Z" fill="#3b82f6" />
                        <path v-if="toothDataB.lingual.pi[2]" d="M50 50 L100 0 L100 50 Z" fill="#3b82f6" />
                        <path v-if="toothDataB.buccal.pi[0]" d="M50 50 L0 50 L0 100 Z" fill="#3b82f6" />
                        <path v-if="toothDataB.buccal.pi[1]" d="M50 50 L0 100 L100 100 Z" fill="#3b82f6" />
                        <path v-if="toothDataB.buccal.pi[2]" d="M50 50 L100 100 L100 50 Z" fill="#3b82f6" />
                      </template>
                      <line x1="0" y1="0" x2="100" y2="100" stroke="#e2e8f0" stroke-width="1.5" />
                      <line x1="100" y1="0" x2="0" y2="100" stroke="#e2e8f0" stroke-width="1.5" />
                      <line x1="0" y1="50" x2="100" y2="50" stroke="#e2e8f0" stroke-width="1.5" />
                    </g>
                    <rect x="4" y="4" width="92" height="92" rx="26" fill="none" stroke="#e2e8f0" stroke-width="2" />
                  </svg>
                </div>
              </div>
            </div>
          </section>

          <!-- Analysis Summary -->
          <section>
            <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4 text-center">Analysis Summary</h3>
            <div class="grid grid-cols-2 gap-4">
              <!-- A -->
              <div class="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm" :class="{ 'opacity-50 pointer-events-none': toothDataA?.extracted }">
                <div class="space-y-4">
                  <div @click="prognosisModalType = 'KC'" class="flex justify-between items-center gap-2 cursor-pointer group">
                    <div class="flex items-center gap-1.5">
                      <span class="text-[10px] font-bold text-slate-400 border-b border-dotted border-slate-300 group-hover:text-[#0052ff] group-hover:border-[#0052ff] transition-all">Prognosis K&C</span>
                      <svg class="text-slate-200 group-hover:text-[#0052ff] transition-colors shrink-0" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    </div>
                    <span class="text-[9px] font-black px-2 py-1 rounded-lg transition-all" :class="getPrognosisColorKC(analysisA?.prognosisKC)">{{ analysisA?.prognosisKC || 'N/A' }}</span>
                  </div>
                  <div @click="prognosisModalType = 'MN'" class="flex justify-between items-center gap-2 cursor-pointer group">
                    <div class="flex items-center gap-1.5">
                      <span class="text-[10px] font-bold text-slate-400 border-b border-dotted border-slate-300 group-hover:text-[#0052ff] group-hover:border-[#0052ff] transition-all">Prognosis M&N</span>
                      <svg class="text-slate-200 group-hover:text-[#0052ff] transition-colors shrink-0" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    </div>
                    <span class="text-[9px] font-black px-2 py-1 rounded-lg transition-all" :class="getPrognosisColorMN(analysisA?.prognosisMN)">{{ analysisA?.prognosisMN || 'N/A' }}</span>
                  </div>
                  <div class="flex justify-between items-center pt-1 border-t border-slate-50">
                    <span class="text-[10px] font-bold text-slate-400">Buccal KTW</span>
                    <span class="text-[10px] font-black text-slate-700">{{ analysisA?.ktwBuccal }} mm</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-[10px] font-bold text-slate-400">{{ innerSurfaceLabel }} KTW</span>
                    <span class="text-[10px] font-black text-slate-700">{{ analysisA?.ktwInner }} mm</span>
                  </div>
                  <div class="flex justify-between items-center pt-1 border-t border-slate-50">
                    <span class="text-[10px] font-bold text-slate-400">Mobility</span>
                    <span class="text-[10px] font-black text-slate-700">{{ toothDataA?.implant ? 'Fixed (0)' : 'Grade ' + (analysisA?.mobility || '0') }}</span>
                  </div>
                  <div v-if="!toothDataA?.implant" class="flex justify-between items-center">
                    <span class="text-[10px] font-bold text-slate-400">Furcation</span>
                    <span class="text-[10px] font-black text-slate-700">{{ analysisA?.furcation ?? '-' }}</span>
                  </div>
                </div>
              </div>

              <!-- B -->
              <div class="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm" :class="{ 'opacity-50 pointer-events-none': toothDataB?.extracted }">
                <div class="space-y-4">
                  <div @click="prognosisModalType = 'KC'" class="flex justify-between items-center gap-2 cursor-pointer group">
                    <div class="flex items-center gap-1.5">
                      <span class="text-[10px] font-bold text-slate-400 border-b border-dotted border-slate-300 group-hover:text-[#0052ff] group-hover:border-[#0052ff] transition-all">Prognosis K&C</span>
                      <svg class="text-slate-200 group-hover:text-[#0052ff] transition-colors shrink-0" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    </div>
                    <span class="text-[9px] font-black px-2 py-1 rounded-lg transition-all" :class="getPrognosisColorKC(analysisB?.prognosisKC)">{{ analysisB?.prognosisKC || 'N/A' }}</span>
                  </div>
                  <div @click="prognosisModalType = 'MN'" class="flex justify-between items-center gap-2 cursor-pointer group">
                    <div class="flex items-center gap-1.5">
                      <span class="text-[10px] font-bold text-slate-400 border-b border-dotted border-slate-300 group-hover:text-[#0052ff] group-hover:border-[#0052ff] transition-all">Prognosis M&N</span>
                      <svg class="text-slate-200 group-hover:text-[#0052ff] transition-colors shrink-0" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    </div>
                    <span class="text-[9px] font-black px-2 py-1 rounded-lg transition-all" :class="getPrognosisColorMN(analysisB?.prognosisMN)">{{ analysisB?.prognosisMN || 'N/A' }}</span>
                  </div>
                  <div class="flex justify-between items-center pt-1 border-t border-slate-50">
                    <span class="text-[10px] font-bold text-slate-400">Buccal KTW</span>
                    <span class="text-[10px] font-black text-slate-700">{{ analysisB?.ktwBuccal }} mm</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-[10px] font-bold text-slate-400">{{ innerSurfaceLabel }} KTW</span>
                    <span class="text-[10px] font-black text-slate-700">{{ analysisB?.ktwInner }} mm</span>
                  </div>
                  <div class="flex justify-between items-center pt-1 border-t border-slate-50">
                    <span class="text-[10px] font-bold text-slate-400">Mobility</span>
                    <span class="text-[10px] font-black text-slate-700">{{ toothDataB?.implant ? 'Fixed (0)' : 'Grade ' + (analysisB?.mobility || '0') }}</span>
                  </div>
                  <div v-if="!toothDataB?.implant" class="flex justify-between items-center">
                    <span class="text-[10px] font-bold text-slate-400">Furcation</span>
                    <span class="text-[10px] font-black text-slate-700">{{ analysisB?.furcation ?? '-' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Notes Section -->
          <section v-if="analysisA?.note || analysisB?.note">
             <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4 text-center">Clinical Notes</h3>
             <div class="grid grid-cols-2 gap-4">
                <!-- A -->
                <div v-if="analysisA?.note" class="bg-yellow-50/50 border border-yellow-100 rounded-2xl p-4 shadow-sm group relative">
                  <p class="text-xs font-bold text-slate-600 leading-relaxed whitespace-pre-wrap">{{ analysisA.note }}</p>
                </div>
                <div v-else class="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-300 italic text-center">No note</div>
                
                <!-- B -->
                <div v-if="analysisB?.note" class="bg-yellow-50/50 border border-yellow-100 rounded-2xl p-4 shadow-sm group relative">
                  <p class="text-xs font-bold text-slate-600 leading-relaxed whitespace-pre-wrap">{{ analysisB.note }}</p>
                </div>
                <div v-else class="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-300 italic text-center">No note</div>
             </div>
          </section>

        </div>
      </div>
    </aside>
  </Transition>

  <!-- Prognosis Reference Modal -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="prognosisModalType" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" @click="prognosisModalType = null">
        <div
          class="bg-white w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-4xl shadow-2xl"
          @click.stop
        >
          <div class="sticky top-0 bg-white/80 backdrop-blur-md px-8 py-6 border-b border-slate-50 flex items-center justify-between z-10">
            <h2 class="text-lg font-black text-slate-800 tracking-tight">
              {{ prognosisModalType === 'MN' ? 'McGuire and Nunn (M&N)' : 'Kwok and Caton (K&C)' }}
            </h2>
            <button @click="prognosisModalType = null" class="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="p-8 space-y-10">
            <!-- Table 1: McGuire and Nunn -->
            <div v-if="prognosisModalType === 'MN'">
              <div class="flex items-center gap-3 mb-5">
                <span class="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">Classification</span>
                <h3 class="text-sm font-black text-slate-800 uppercase tracking-wide">Prognosis Criteria</h3>
              </div>
              <div class="overflow-hidden border border-slate-100 rounded-2xl shadow-sm">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-slate-50">
                      <th class="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 w-32">Prognosis</th>
                      <th class="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Criteria</th>
                    </tr>
                  </thead>
                  <tbody class="text-[11px] font-medium text-slate-600">
                    <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td class="px-4 py-4 font-black text-green-600 bg-green-50/30">Good</td>
                      <td class="px-4 py-4 leading-relaxed">Control of etiologic factors and enough support to enable the tooth to be maintained by the patient and clinician.</td>
                    </tr>
                    <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td class="px-4 py-4 font-black text-blue-600 bg-blue-50/30">Fair</td>
                      <td class="px-4 py-4 leading-relaxed">~25% attachment loss, Class I furcation. Adequate maintenance possible.</td>
                    </tr>
                    <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td class="px-4 py-4 font-black text-yellow-600 bg-yellow-50/30">Poor</td>
                      <td class="px-4 py-4 leading-relaxed">50% attachment loss, Class II furcation. Maintenance difficult.</td>
                    </tr>
                    <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td class="px-4 py-4 font-black text-orange-600 bg-orange-50/30">Questionable</td>
                      <td class="px-4 py-4 leading-relaxed">> 50% attachment loss, Class II/III furcation, Class II mobility, poor crown/root ratio.</td>
                    </tr>
                    <tr class="hover:bg-slate-50/50 transition-colors">
                      <td class="px-4 py-4 font-black text-red-600 bg-red-50/30">Hopeless</td>
                      <td class="px-4 py-4 leading-relaxed">Severe attachment loss; extraction suggested.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Table 2: Kwok and Caton -->
            <div v-if="prognosisModalType === 'KC'">
              <div class="flex items-center gap-3 mb-5">
                <span class="bg-blue-500 text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">Classification</span>
                <h3 class="text-sm font-black text-slate-800 uppercase tracking-wide">Prognosis Criteria</h3>
              </div>
              <div class="overflow-hidden border border-slate-100 rounded-2xl shadow-sm">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-slate-50">
                      <th class="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 w-32">Prognosis</th>
                      <th class="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Classification</th>
                    </tr>
                  </thead>
                  <tbody class="text-[11px] font-medium text-slate-600">
                    <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td class="px-4 py-4 font-black text-green-600 bg-green-50/30">Favorable</td>
                      <td class="px-4 py-4 leading-relaxed">Can be stabilized with treatment/maintenance; less chance of breakdown.</td>
                    </tr>
                    <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td class="px-4 py-4 font-black text-orange-600 bg-orange-50/30">Questionable</td>
                      <td class="px-4 py-4 leading-relaxed">Influenced by local/systemic factors that may or may not be controlled.</td>
                    </tr>
                    <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td class="px-4 py-4 font-black text-red-600 bg-red-50/30">Unfavorable</td>
                      <td class="px-4 py-4 leading-relaxed">Influenced by factors that cannot be controlled; maintenance unlikely.</td>
                    </tr>
                    <tr class="hover:bg-slate-50/50 transition-colors">
                      <td class="px-4 py-4 font-black text-black bg-slate-50/30">Hopeless</td>
                      <td class="px-4 py-4 leading-relaxed">Must be extracted.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="p-8 bg-slate-50/50 border-t border-slate-50 text-center rounded-b-4xl">
            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Reference: Clinical Periodontology Standards</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
