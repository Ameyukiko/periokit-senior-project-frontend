<script setup lang="ts">
import { X, Trash2 } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

import {
  calculatePrognosisKC,
  calculatePrognosisMN,
  getSafePDValues,
  getSafeCALValues,
  calculateToothBopPercentage,
  calculateToothPiPercentage
} from '../../utils/calculations'
import { isUpperTooth } from '@/domain/chart/chart.rules'


const prognosisModalType = ref<'MN' | 'KC' | null>(null)
const isEditingNote = ref(false)
const noteInput = ref('')

const props = defineProps<{
  toothId: number | string | null
  toothData: any
  readonly?: boolean
}>()

const emit = defineEmits(['close', 'update-note'])

// Reset editing state when switching teeth
watch(() => props.toothId, () => {
  isEditingNote.value = false
  noteInput.value = ''
})

// Initialize note input when tooth changes or editing starts
const startEditing = () => {
  noteInput.value = props.toothData.note || ''
  isEditingNote.value = true
}

const saveNote = () => {
  emit('update-note', { id: props.toothId, note: noteInput.value })
  isEditingNote.value = false
}

const deleteNote = () => {
  emit('update-note', { id: props.toothId, note: '' })
  isEditingNote.value = false
  noteInput.value = ''
}

const cancelEditing = () => {
  isEditingNote.value = false
  noteInput.value = ''
}

const getFurLabel = (grade?: number) => {
  if (grade === undefined) return '-'
  const labels = ['-', 'Grade I', 'Grade II', 'Grade III']
  return labels[grade] || '-'
}

const innerSurfaceLabel = computed(() => {
  if (!props.toothId) return 'Palatal'
  return isUpperTooth(props.toothId) ? 'Palatal' : 'Lingual'
})

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

const analysisData = computed(() => {
  if (!props.toothData) return null

  const allFur = [
    ...(props.toothData.fur?.buccal || []),
    ...(props.toothData.fur?.lingual || [])
  ].map(v => parseInt(v) || 0)

  const maxFur = allFur.length > 0 ? Math.max(0, ...allFur) : 0

  return {
    prognosisKC: calculatePrognosisKC(props.toothData),
    prognosisMN: calculatePrognosisMN(props.toothData),
    buccalKTW: props.toothData.buccal?.ktw || "0",
    innerSurfaceKTW: props.toothData.lingual?.ktw || "0",
    mobility: props.toothData.mo || "0",
    furcation: maxFur,
    buccalPD: getSafePDValues(props.toothData.buccal?.pd),
    innerSurfacePD: getSafePDValues(props.toothData.lingual?.pd),
    buccalCAL: getSafeCALValues(props.toothData.buccal?.cal),
    innerSurfaceCAL: getSafeCALValues(props.toothData.lingual?.cal),
    bopPercentage: calculateToothBopPercentage(props.toothData),
    piPercentage: calculateToothPiPercentage(props.toothData)
  }
})


</script>

<template>
  <div v-if="toothId && toothData" class="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col h-full">
    <!-- Header -->
    <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
      <div>
        <div class="flex items-center gap-3">
          <h2 class="text-3xl font-black text-slate-800 tracking-tight">#{{ toothId }}</h2>
          <span v-if="toothData.extracted" class="px-2 py-1 bg-red-50 text-red-500 rounded border border-red-100 text-[9px] font-black uppercase tracking-wider">Extracted</span>
          <span v-if="toothData.implant" class="px-2 py-1 bg-slate-100 text-slate-500 rounded border border-slate-200 text-[9px] font-black uppercase tracking-wider">Implant</span>
        </div>
        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Tooth Details</p>
      </div>
      <button @click="emit('close')" class="p-2 hover:bg-slate-50 rounded-full transition-all text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-100">
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">

      <!-- PD Section -->
      <section :class="{ 'bg-slate-800/30 opacity-70 pointer-events-none': toothData.extracted }">
        <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4">PD</h3>
        <div class="grid grid-cols-2 gap-4">
          <!-- Buccal Card -->
          <div class="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-center group hover:border-[#0052ff]/20 transition-all">
            <div class="text-2xl font-black mb-1 flex items-center justify-center gap-0.5">
              <span v-for="(val, i) in analysisData?.buccalPD" :key="i"
                :class="parseInt(val) > 4 ? 'text-red-500' : 'text-[#0052ff]'">
                {{ val }}{{ Number(i) < 2 ? '-' : '' }}
              </span>
            </div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Buccal (mm)</p>
          </div>
          <!-- Inner surface card -->
          <div class="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-center group hover:border-[#0052ff]/20 transition-all">
            <div class="text-2xl font-black mb-1 flex items-center justify-center gap-0.5">
              <span v-for="(val, i) in analysisData?.innerSurfacePD" :key="i"
                :class="parseInt(val) > 4 ? 'text-red-500' : 'text-[#0052ff]'">
                {{ val }}{{ Number(i) < 2 ? '-' : '' }}
              </span>
            </div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{{ innerSurfaceLabel }} (mm)</p>
          </div>
        </div>

      </section>

      <!-- CAL Section -->
      <section :class="{ 'bg-slate-800/30 opacity-70 pointer-events-none': toothData.extracted }">
        <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4">CAL</h3>
        <div class="grid grid-cols-2 gap-4">
          <!-- Buccal Card -->
          <div class="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-center group hover:border-[#0052ff]/20 transition-all">
            <div class="text-2xl font-black mb-1 flex items-center justify-center gap-0.5">
              <span v-for="(val, i) in analysisData?.buccalCAL" :key="i" class="text-[#0052ff]">
                {{ val }}{{ Number(i) < 2 ? '-' : '' }}
              </span>
            </div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Buccal (mm)</p>
          </div>
          <!-- Inner surface card -->
          <div class="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-center group hover:border-[#0052ff]/20 transition-all">
            <div class="text-2xl font-black mb-1 flex items-center justify-center gap-0.5">
              <span v-for="(val, i) in analysisData?.innerSurfaceCAL" :key="i" class="text-[#0052ff]">
                {{ val }}{{ Number(i) < 2 ? '-' : '' }}
              </span>
            </div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{{ innerSurfaceLabel }} (mm)</p>
          </div>
        </div>

      </section>

      <!-- Visual Indicators Section (Standard 6-Site Hexagonal Diagrams) -->
      <section class="grid grid-cols-2 gap-4" :class="{ 'bg-slate-900/5 opacity-60 pointer-events-none': toothData.extracted }">
        <!-- BoP Diagram -->
        <div class="relative bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex flex-col items-center group/bop">
          <!-- Percentage Badge -->
          <div
            v-if="analysisData?.bopPercentage !== '0%'"
            class="absolute top-2.5 right-2.5 px-2 py-0.5 bg-red-50 text-red-500 text-[9px] font-black rounded-lg border border-red-100 shadow-sm animate-in fade-in zoom-in duration-300"
          >
            {{ analysisData?.bopPercentage }}
          </div>


          <div class="relative w-20 h-20 mb-2">
            <svg viewBox="0 0 100 100" class="w-full h-full transform rotate-90">
              <!-- Outer Hexagon Frame -->
              <polygon points="50,0 93.3,25 93.3,75 50,100 6.7,75 6.7,25" fill="white" stroke="#e2e8f0" stroke-width="2" />

              <!-- Left Side: Buccal for Upper, Lingual for Lower -->
              <template v-if="isUpperTooth(toothId)">
                <!-- Upper: Buccal on Left -->
                <path v-if="toothData.buccal.bop[2]" d="M50 50 L6.7 25 L50 0 Z" fill="#ef4444" />
                <path v-if="toothData.buccal.bop[1]" d="M50 50 L6.7 75 L6.7 25 Z" fill="#ef4444" />
                <path v-if="toothData.buccal.bop[0]" d="M50 50 L50 100 L6.7 75 Z" fill="#ef4444" />
              </template>
              <template v-else>
                <!-- Lower: Lingual on Left -->
                <path v-if="toothData.lingual.bop[2]" d="M50 50 L6.7 25 L50 0 Z" fill="#ef4444" />
                <path v-if="toothData.lingual.bop[1]" d="M50 50 L6.7 75 L6.7 25 Z" fill="#ef4444" />
                <path v-if="toothData.lingual.bop[0]" d="M50 50 L50 100 L6.7 75 Z" fill="#ef4444" />
              </template>

              <!-- Right Side: Lingual/Palatal for Upper, Buccal for Lower -->
              <template v-if="isUpperTooth(toothId)">
                <!-- Upper: Palatal on Right -->
                <path v-if="toothData.lingual.bop[2]" d="M50 50 L50 0 L93.3 25 Z" fill="#ef4444" />
                <path v-if="toothData.lingual.bop[1]" d="M50 50 L93.3 25 L93.3 75 Z" fill="#ef4444" />
                <path v-if="toothData.lingual.bop[0]" d="M50 50 L93.3 75 L50 100 Z" fill="#ef4444" />
              </template>
              <template v-else>
                <!-- Lower: Buccal on Right -->
                <path v-if="toothData.buccal.bop[2]" d="M50 50 L50 0 L93.3 25 Z" fill="#ef4444" />
                <path v-if="toothData.buccal.bop[1]" d="M50 50 L93.3 25 L93.3 75 Z" fill="#ef4444" />
                <path v-if="toothData.buccal.bop[0]" d="M50 50 L93.3 75 L50 100 Z" fill="#ef4444" />
              </template>

              <!-- Divider Lines -->
              <line x1="50" y1="50" x2="50" y2="0" stroke="#e2e8f0" stroke-width="1" />
              <line x1="50" y1="50" x2="93.3" y2="25" stroke="#e2e8f0" stroke-width="1" />
              <line x1="50" y1="50" x2="93.3" y2="75" stroke="#e2e8f0" stroke-width="1" />
              <line x1="50" y1="50" x2="50" y2="100" stroke="#e2e8f0" stroke-width="1" />
              <line x1="50" y1="50" x2="6.7" y2="75" stroke="#e2e8f0" stroke-width="1" />
              <line x1="50" y1="50" x2="6.7" y2="25" stroke="#e2e8f0" stroke-width="1" />
            </svg>
          </div>
          <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">BOP (6 Sites)</p>
        </div>

        <!-- Plaque Diagram -->
        <div class="relative bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex flex-col items-center group/pi">
          <!-- Percentage Badge -->
          <div
            v-if="analysisData?.piPercentage !== '0%'"
            class="absolute top-2.5 right-2.5 px-2 py-0.5 bg-blue-50 text-blue-500 text-[9px] font-black rounded-lg border border-blue-100 shadow-sm animate-in fade-in zoom-in duration-300"
          >
            {{ analysisData?.piPercentage }}
          </div>


          <div class="relative w-20 h-20 mb-2">
            <svg viewBox="0 0 100 100" class="w-full h-full transform rotate-90">
              <!-- Outer Hexagon Frame -->
              <polygon points="50,0 93.3,25 93.3,75 50,100 6.7,75 6.7,25" fill="white" stroke="#e2e8f0" stroke-width="2" />

              <!-- Left Side: Buccal for Upper, Lingual for Lower -->
              <template v-if="isUpperTooth(toothId)">
                <!-- Upper: Buccal on Left -->
                <path v-if="toothData.buccal.pi[2]" d="M50 50 L6.7 25 L50 0 Z" fill="#3b82f6" />
                <path v-if="toothData.buccal.pi[1]" d="M50 50 L6.7 75 L6.7 25 Z" fill="#3b82f6" />
                <path v-if="toothData.buccal.pi[0]" d="M50 50 L50 100 L6.7 75 Z" fill="#3b82f6" />
              </template>
              <template v-else>
                <!-- Lower: Lingual on Left -->
                <path v-if="toothData.lingual.pi[2]" d="M50 50 L6.7 25 L50 0 Z" fill="#3b82f6" />
                <path v-if="toothData.lingual.pi[1]" d="M50 50 L6.7 75 L6.7 25 Z" fill="#3b82f6" />
                <path v-if="toothData.lingual.pi[0]" d="M50 50 L50 100 L6.7 75 Z" fill="#3b82f6" />
              </template>

              <!-- Right Side: Lingual/Palatal for Upper, Buccal for Lower -->
              <template v-if="isUpperTooth(toothId)">
                <!-- Upper: Palatal on Right -->
                <path v-if="toothData.lingual.pi[2]" d="M50 50 L50 0 L93.3 25 Z" fill="#3b82f6" />
                <path v-if="toothData.lingual.pi[1]" d="M50 50 L93.3 25 L93.3 75 Z" fill="#3b82f6" />
                <path v-if="toothData.lingual.pi[0]" d="M50 50 L93.3 75 L50 100 Z" fill="#3b82f6" />
              </template>
              <template v-else>
                <!-- Lower: Buccal on Right -->
                <path v-if="toothData.buccal.pi[2]" d="M50 50 L50 0 L93.3 25 Z" fill="#3b82f6" />
                <path v-if="toothData.buccal.pi[1]" d="M50 50 L93.3 25 L93.3 75 Z" fill="#3b82f6" />
                <path v-if="toothData.buccal.pi[0]" d="M50 50 L93.3 75 L50 100 Z" fill="#3b82f6" />
              </template>

              <!-- Divider Lines -->
              <line x1="50" y1="50" x2="50" y2="0" stroke="#e2e8f0" stroke-width="1" />
              <line x1="50" y1="50" x2="93.3" y2="25" stroke="#e2e8f0" stroke-width="1" />
              <line x1="50" y1="50" x2="93.3" y2="75" stroke="#e2e8f0" stroke-width="1" />
              <line x1="50" y1="50" x2="50" y2="100" stroke="#e2e8f0" stroke-width="1" />
              <line x1="50" y1="50" x2="6.7" y2="75" stroke="#e2e8f0" stroke-width="1" />
              <line x1="50" y1="50" x2="6.7" y2="25" stroke="#e2e8f0" stroke-width="1" />
            </svg>
          </div>
          <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">PI (6 Sites)</p>
        </div>


      </section>

      <!-- Analysis Summary -->
      <section class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm" :class="{ 'bg-slate-900/5 opacity-60 pointer-events-none': toothData.extracted }">
        <h3 class="text-[13px] font-black text-slate-800 mb-6">
          Analysis Summary
        </h3>
        <div class="space-y-5">
          <!-- Prognosis K&C Row -->
          <div
            @click="prognosisModalType = 'KC'"
            class="flex justify-between gap-4 cursor-pointer group"
          >
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] font-bold text-slate-400 border-b border-dotted border-slate-300 group-hover:text-[#0052ff] group-hover:border-[#0052ff] transition-all">
                Prognosis K&C
              </span>
              <svg class="text-slate-200 group-hover:text-[#0052ff] transition-colors" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </div>
            <span
              class="text-[10px] font-black px-2.5 py-1 rounded-lg transition-all"
              :class="getPrognosisColorKC(analysisData?.prognosisKC)"
            >
              {{ analysisData?.prognosisKC || 'N/A' }}
            </span>
          </div>

          <!-- Prognosis M&N Row -->
          <div
            @click="prognosisModalType = 'MN'"
            class="flex justify-between gap-4 cursor-pointer group"
          >
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] font-bold text-slate-400 border-b border-dotted border-slate-300 group-hover:text-[#0052ff] group-hover:border-[#0052ff] transition-all">
                Prognosis M&N
              </span>
              <svg class="text-slate-200 group-hover:text-[#0052ff] transition-colors" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </div>
            <span
              class="text-[10px] font-black px-2.5 py-1 rounded-lg transition-all"
              :class="getPrognosisColorMN(analysisData?.prognosisMN)"
            >
              {{ analysisData?.prognosisMN || 'N/A' }}
            </span>
          </div>
          <div class="flex justify-between items-center pt-2">
            <span class="text-[11px] font-bold text-slate-400">Buccal-Keratinized</span>
            <span class="text-[11px] font-black text-slate-700">{{ analysisData?.buccalKTW }} mm</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-[11px] font-bold text-slate-400">{{ innerSurfaceLabel }}-Keratinized</span>
            <span class="text-[11px] font-black text-slate-700">{{ analysisData?.innerSurfaceKTW }} mm</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-[11px] font-bold text-slate-400">Mobility</span>
            <span class="text-[11px] font-black text-slate-700">{{ toothData.implant ? 'Fixed (0)' : 'Grade ' + (analysisData?.mobility || '0') }}</span>
          </div>
          <div v-if="!toothData.implant" class="flex justify-between items-center">
            <span class="text-[11px] font-bold text-slate-400">Furcation</span>
            <span class="text-[11px] font-black text-slate-700">{{ getFurLabel(analysisData?.furcation) }}</span>
          </div>
        </div>
      </section>

      <!-- Note / Remark -->
      <section v-if="toothData.note && !isEditingNote" class="bg-yellow-50/50 border border-yellow-100 rounded-3xl p-6 shadow-sm group relative">
        <div class="flex justify-between items-start mb-3">
          <h3 class="text-[11px] font-black text-yellow-600 uppercase tracking-[0.15em]">Note</h3>
          <div v-if="!props.readonly" class="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <button @click="startEditing" class="p-1 hover:bg-yellow-100 rounded text-yellow-600 transition-all" title="Edit note">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            </button>
            <button @click="deleteNote" class="p-1 hover:bg-red-100 rounded text-red-500 transition-all" title="Delete note">
              <Trash2 :size="12" />
            </button>
          </div>
        </div>
        <p class="text-xs font-bold text-slate-600 leading-relaxed whitespace-pre-wrap">{{ toothData.note }}</p>
      </section>

      <!-- Edit Note Form -->
      <section v-if="isEditingNote" class="bg-white border border-[#0052ff]/20 rounded-3xl p-6 shadow-xl ring-4 ring-[#0052ff]/5">
        <h3 class="text-[11px] font-black text-[#0052ff] uppercase tracking-[0.15em] mb-4">Clinical Note</h3>
        <textarea
          v-model="noteInput"
          placeholder="Enter clinical observations, findings, or remarks for this tooth..."
          class="w-full min-h-30 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052ff]/10 focus:border-[#0052ff]/30 transition-all resize-none mb-4"
          autofocus
        ></textarea>
        <div class="flex gap-3">
          <button
            @click="saveNote"
            class="flex-1 py-3 bg-[#0052ff] hover:bg-[#0041cc] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-200"
          >
            Save Note
          </button>
          <button
            v-if="toothData.note"
            @click="deleteNote"
            class="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5"
            title="Delete note"
          >
            <Trash2 :size="12" />
          </button>
          <button
            @click="cancelEditing"
            class="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            Cancel
          </button>
        </div>
      </section>

    </div>

    <!-- Footer Action -->
    <div class="p-6 bg-white border-t border-slate-50 mt-auto">
      <button
        v-if="!isEditingNote && !props.readonly"
        @click="startEditing"
        class="w-full py-4 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-2xl text-[11px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        {{ toothData.note ? 'Edit Clinical Note' : 'Add Clinical Note' }}
      </button>
    </div>
  </div>


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
      <div v-if="prognosisModalType" class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" @click="prognosisModalType = null">
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

