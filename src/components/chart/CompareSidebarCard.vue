<script setup lang="ts">
import { computed } from 'vue'
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

const pdColorClass = (val: string) => parseInt(val) > 4 ? 'text-red-500' : 'text-[#0052ff]'

const prognosisMNColor = (val: string) => {
  if (!val || val === 'N/A') return 'text-slate-400'
  if (val.includes('Good')) return 'text-green-600'
  if (val === 'Fair') return 'text-blue-600'
  if (val === 'Poor') return 'text-amber-600'
  if (val === 'Questionable') return 'text-orange-600'
  if (val === 'Hopeless') return 'text-red-600'
  return 'text-slate-600'
}

const prognosisKCColor = (val: string) => {
  if (!val || val === 'N/A') return 'text-slate-400'
  if (val === 'Favorable') return 'text-green-600'
  if (val === 'Questionable') return 'text-amber-600'
  if (val === 'Unfavorable') return 'text-red-600'
  if (val === 'Hopeless') return 'text-slate-900'
  return 'text-slate-600'
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
      class="w-[420px] sticky top-6 shrink-0 self-start"
      style="height: calc(100vh / 0.9 - 160px);"
    >
      <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col h-full">

        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 class="text-3xl font-black text-slate-800 tracking-tight">#{{ toothId }}</h2>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Compare Tooth Details</p>
          </div>
          <button
            @click="emit('close')"
            class="p-2 hover:bg-slate-50 rounded-full transition-all text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-100"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 min-h-0 overflow-y-auto">

          <!-- Visit label headers -->
          <div class="grid grid-cols-2 divide-x divide-slate-100 bg-slate-50 border-b border-slate-100">
            <div class="px-4 py-3 text-center">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visit A</p>
              <p class="text-xs font-bold text-slate-700 truncate">{{ visitLabelA }}</p>
              <div v-if="toothDataA?.extracted" class="mt-1 inline-flex px-2 py-0.5 bg-red-50 text-red-500 rounded text-[9px] font-black uppercase">Extracted</div>
              <div v-else-if="toothDataA?.implant" class="mt-1 inline-flex px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase">Implant</div>
            </div>
            <div class="px-4 py-3 text-center">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visit B</p>
              <p class="text-xs font-bold text-slate-700 truncate">{{ visitLabelB }}</p>
              <div v-if="toothDataB?.extracted" class="mt-1 inline-flex px-2 py-0.5 bg-red-50 text-red-500 rounded text-[9px] font-black uppercase">Extracted</div>
              <div v-else-if="toothDataB?.implant" class="mt-1 inline-flex px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase">Implant</div>
            </div>
          </div>

          <div class="divide-y divide-slate-100">

            <!-- PD Section -->
            <div class="px-4 py-4">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">Probing Depth</p>
              <div class="grid grid-cols-2 divide-x divide-slate-100 gap-y-2">
                <!-- Buccal row -->
                <div class="pr-4 space-y-1">
                  <p class="text-[9px] font-bold text-slate-400 uppercase">Buccal</p>
                  <div v-if="analysisA" class="flex items-center gap-0.5 text-lg font-black">
                    <span v-for="(val, i) in analysisA.buccalPD" :key="i" :class="pdColorClass(val)">
                      {{ val }}{{ i < 2 ? '-' : '' }}
                    </span>
                  </div>
                  <p v-else class="text-slate-300 text-sm">—</p>
                </div>
                <div class="pl-4 space-y-1">
                  <p class="text-[9px] font-bold text-slate-400 uppercase">Buccal</p>
                  <div v-if="analysisB" class="flex items-center gap-0.5 text-lg font-black">
                    <span v-for="(val, i) in analysisB.buccalPD" :key="i" :class="pdColorClass(val)">
                      {{ val }}{{ i < 2 ? '-' : '' }}
                    </span>
                  </div>
                  <p v-else class="text-slate-300 text-sm">—</p>
                </div>
                <!-- Inner surface row -->
                <div class="pr-4 space-y-1 pt-2">
                  <p class="text-[9px] font-bold text-slate-400 uppercase">{{ innerSurfaceLabel }}</p>
                  <div v-if="analysisA" class="flex items-center gap-0.5 text-lg font-black">
                    <span v-for="(val, i) in analysisA.innerPD" :key="i" :class="pdColorClass(val)">
                      {{ val }}{{ i < 2 ? '-' : '' }}
                    </span>
                  </div>
                  <p v-else class="text-slate-300 text-sm">—</p>
                </div>
                <div class="pl-4 space-y-1 pt-2">
                  <p class="text-[9px] font-bold text-slate-400 uppercase">{{ innerSurfaceLabel }}</p>
                  <div v-if="analysisB" class="flex items-center gap-0.5 text-lg font-black">
                    <span v-for="(val, i) in analysisB.innerPD" :key="i" :class="pdColorClass(val)">
                      {{ val }}{{ i < 2 ? '-' : '' }}
                    </span>
                  </div>
                  <p v-else class="text-slate-300 text-sm">—</p>
                </div>
              </div>
            </div>

            <!-- CAL Section -->
            <div class="px-4 py-4">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">CAL</p>
              <div class="grid grid-cols-2 divide-x divide-slate-100 gap-y-2">
                <div class="pr-4 space-y-1">
                  <p class="text-[9px] font-bold text-slate-400 uppercase">Buccal</p>
                  <div v-if="analysisA" class="flex items-center gap-0.5 text-lg font-black text-[#0052ff]">
                    <span v-for="(val, i) in analysisA.buccalCAL" :key="i">{{ val }}{{ i < 2 ? '-' : '' }}</span>
                  </div>
                  <p v-else class="text-slate-300 text-sm">—</p>
                </div>
                <div class="pl-4 space-y-1">
                  <p class="text-[9px] font-bold text-slate-400 uppercase">Buccal</p>
                  <div v-if="analysisB" class="flex items-center gap-0.5 text-lg font-black text-[#0052ff]">
                    <span v-for="(val, i) in analysisB.buccalCAL" :key="i">{{ val }}{{ i < 2 ? '-' : '' }}</span>
                  </div>
                  <p v-else class="text-slate-300 text-sm">—</p>
                </div>
                <div class="pr-4 space-y-1 pt-2">
                  <p class="text-[9px] font-bold text-slate-400 uppercase">{{ innerSurfaceLabel }}</p>
                  <div v-if="analysisA" class="flex items-center gap-0.5 text-lg font-black text-[#0052ff]">
                    <span v-for="(val, i) in analysisA.innerCAL" :key="i">{{ val }}{{ i < 2 ? '-' : '' }}</span>
                  </div>
                  <p v-else class="text-slate-300 text-sm">—</p>
                </div>
                <div class="pl-4 space-y-1 pt-2">
                  <p class="text-[9px] font-bold text-slate-400 uppercase">{{ innerSurfaceLabel }}</p>
                  <div v-if="analysisB" class="flex items-center gap-0.5 text-lg font-black text-[#0052ff]">
                    <span v-for="(val, i) in analysisB.innerCAL" :key="i">{{ val }}{{ i < 2 ? '-' : '' }}</span>
                  </div>
                  <p v-else class="text-slate-300 text-sm">—</p>
                </div>
              </div>
            </div>

            <!-- BOP / PI indicators -->
            <div class="px-4 py-4">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">Indicators</p>
              <div class="grid grid-cols-2 divide-x divide-slate-100">
                <div class="pr-4 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-slate-500 uppercase">BOP</span>
                    <span class="text-sm font-black text-red-500">{{ analysisA?.bop ?? '—' }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-slate-500 uppercase">PI</span>
                    <span class="text-sm font-black text-[#0052ff]">{{ analysisA?.pi ?? '—' }}</span>
                  </div>
                </div>
                <div class="pl-4 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-slate-500 uppercase">BOP</span>
                    <span class="text-sm font-black text-red-500">{{ analysisB?.bop ?? '—' }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-slate-500 uppercase">PI</span>
                    <span class="text-sm font-black text-[#0052ff]">{{ analysisB?.pi ?? '—' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Analysis -->
            <div class="px-4 py-4">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">Analysis</p>
              <div class="grid grid-cols-2 divide-x divide-slate-100">
                <div class="pr-4 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-slate-500 uppercase">Mobility</span>
                    <span class="text-sm font-black text-slate-700">{{ analysisA?.mobility ?? '—' }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-slate-500 uppercase">KTW Buccal</span>
                    <span class="text-sm font-black text-slate-700">{{ analysisA ? `${analysisA.ktwBuccal} mm` : '—' }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-slate-500 uppercase">KTW {{ innerSurfaceLabel }}</span>
                    <span class="text-sm font-black text-slate-700">{{ analysisA ? `${analysisA.ktwInner} mm` : '—' }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-slate-500 uppercase">Furcation</span>
                    <span class="text-sm font-black text-slate-700">{{ analysisA?.furcation ?? '—' }}</span>
                  </div>
                </div>
                <div class="pl-4 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-slate-500 uppercase">Mobility</span>
                    <span class="text-sm font-black text-slate-700">{{ analysisB?.mobility ?? '—' }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-slate-500 uppercase">KTW Buccal</span>
                    <span class="text-sm font-black text-slate-700">{{ analysisB ? `${analysisB.ktwBuccal} mm` : '—' }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-slate-500 uppercase">KTW {{ innerSurfaceLabel }}</span>
                    <span class="text-sm font-black text-slate-700">{{ analysisB ? `${analysisB.ktwInner} mm` : '—' }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-slate-500 uppercase">Furcation</span>
                    <span class="text-sm font-black text-slate-700">{{ analysisB?.furcation ?? '—' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Prognosis -->
            <div class="px-4 py-4">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">Prognosis</p>
              <div class="grid grid-cols-2 divide-x divide-slate-100">
                <div class="pr-4 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-slate-500 uppercase">M&N</span>
                    <span class="text-xs font-black" :class="prognosisMNColor(analysisA?.prognosisMN ?? '')">{{ analysisA?.prognosisMN || '—' }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-slate-500 uppercase">K&C</span>
                    <span class="text-xs font-black" :class="prognosisKCColor(analysisA?.prognosisKC ?? '')">{{ analysisA?.prognosisKC || '—' }}</span>
                  </div>
                </div>
                <div class="pl-4 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-slate-500 uppercase">M&N</span>
                    <span class="text-xs font-black" :class="prognosisMNColor(analysisB?.prognosisMN ?? '')">{{ analysisB?.prognosisMN || '—' }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-slate-500 uppercase">K&C</span>
                    <span class="text-xs font-black" :class="prognosisKCColor(analysisB?.prognosisKC ?? '')">{{ analysisB?.prognosisKC || '—' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div v-if="analysisA?.note || analysisB?.note" class="px-4 py-4">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">Notes</p>
              <div class="grid grid-cols-2 gap-3">
                <div v-if="analysisA?.note" class="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
                  <p class="text-[9px] font-black text-amber-400 uppercase mb-1">Visit A</p>
                  {{ analysisA.note }}
                </div>
                <div v-else class="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-300 italic">No note</div>
                <div v-if="analysisB?.note" class="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
                  <p class="text-[9px] font-black text-amber-400 uppercase mb-1">Visit B</p>
                  {{ analysisB.note }}
                </div>
                <div v-else class="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-300 italic">No note</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </aside>
  </Transition>
</template>
