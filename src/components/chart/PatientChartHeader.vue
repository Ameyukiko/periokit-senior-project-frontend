<script setup lang="ts">
import { Activity } from 'lucide-vue-next'
import { computed, type WritableComputedRef } from 'vue'
import type { PatientInfo, ChartSummary, PdBreakdown } from '@/domain/chart/chart.types'

const props = defineProps<{
  patientInfo: PatientInfo
  summary: ChartSummary
  showValidation?: boolean
}>()

const emit = defineEmits<{
  'update:patientInfo': [value: PatientInfo]
}>()

// Create writable computed refs for each field that emit updates
const localPatientInfo = computed({
  get: () => props.patientInfo,
  set: (value: PatientInfo) => emit('update:patientInfo', value)
}) as WritableComputedRef<PatientInfo>

// Method to update visit phase (creates new object to avoid frozen object error)
const updateVisitPhase = (phase: string, checked: boolean) => {
	// For checkbox-style single selection: if checked, set the phase; if unchecked, clear it
	emit('update:patientInfo', {
		...props.patientInfo,
		visitPhase: checked ? phase : ''
	} as PatientInfo)
}

// Method to update gender (creates new object to avoid frozen object error)
const updateGender = (gender: string, checked: boolean) => {
	// For checkbox-style single selection: if checked, set the gender; if unchecked, clear it
	emit('update:patientInfo', {
		...props.patientInfo,
		gender: checked ? gender : ''
	} as PatientInfo)
}

// Sort PD breakdown by depth (5, 6, 7, ...)
const sortedPdBreakdown = computed(() => {
  const breakdown: PdBreakdown = props.summary.pdBreakdown || {}
  return Object.entries(breakdown)
    .filter(([_, count]) => count > 0)
    .map(([depth, count]) => ({ depth: parseInt(depth), count }))
    .sort((a, b) => a.depth - b.depth)
})
</script>

<template>
  <section class="bg-white rounded-r-3xl rounded-bl-3xl shadow-xl border border-slate-200 overflow-hidden relative z-0">
    <div class="p-6 border-b border-slate-100 bg-white">
      <div class="flex items-center justify-between mb-5">
        <div class="flex items-center gap-2">
          <span class="text-[16px] font-bold text-slate-800">HN-</span>
          <input
            v-model="localPatientInfo.hn"
            type="text"
            :class="[
              'bg-slate-50 rounded-md px-2 py-1 text-[14px] w-40 outline-none transition-all',
              props.showValidation && !localPatientInfo.hn
                ? 'border-2 border-red-400 bg-red-50 placeholder-red-300'
                : 'border border-slate-300 focus:ring-2 focus:ring-blue-100'
            ]"
          />
        </div>
        <h1 class="text-3xl font-bold text-slate-800 tracking-tight text-center">Periodontal Chart</h1>
        <div class="w-40"></div>
      </div>

      <div class="flex justify-center gap-8 mb-5">
        <label class="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            :checked="localPatientInfo.visitPhase === 'before_hygienic'"
            @change="updateVisitPhase('before_hygienic', ($event.target as HTMLInputElement).checked)"
            class="w-4 h-4 text-[#0052ff] border-slate-600 focus:ring-blue-100 rounded"
          />
          <span class="text-[14px] font-medium text-slate-800 group-hover:text-[#0052ff] transition-colors">Before hygienic phase</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            :checked="localPatientInfo.visitPhase === 'after_hygienic'"
            @change="updateVisitPhase('after_hygienic', ($event.target as HTMLInputElement).checked)"
            class="w-4 h-4 text-[#0052ff] border-slate-600 focus:ring-blue-100 rounded"
          />
          <span class="text-[14px] font-medium text-slate-800 group-hover:text-[#0052ff] transition-colors">After hygienic phase</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            :checked="localPatientInfo.visitPhase === 'after_corrective'"
            @change="updateVisitPhase('after_corrective', ($event.target as HTMLInputElement).checked)"
            class="w-4 h-4 text-[#0052ff] border-slate-600 focus:ring-blue-100 rounded"
          />
          <span class="text-[14px] font-medium text-slate-800 group-hover:text-[#0052ff] transition-colors">After corrective phase</span>
        </label>
      </div>

      <div class="grid grid-cols-12 gap-y-4 gap-x-5 items-center">
        <!-- Row 3 -->
        <div class="col-span-3 flex items-center gap-2">
          <span class="text-[14px] font-bold text-slate-800 whitespace-nowrap shrink-0">Date:</span>
          <input v-model="localPatientInfo.date" type="date" class="bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-[14px] w-full outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>
        <div class="col-span-6 flex items-center gap-2">
          <span class="text-[14px] font-bold text-slate-800 whitespace-nowrap shrink-0">Doctor:</span>
          <input v-model="localPatientInfo.doctor" type="text" class="bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-[14px] w-full outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>
        <div class="col-span-3 flex items-center gap-2">
          <span class="text-[14px] font-bold text-slate-800 whitespace-nowrap shrink-0">Doctor ID:</span>
          <input v-model="localPatientInfo.studentId" type="text" class="bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-[14px] w-full outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>

        <!-- Row 4 -->
        <div class="col-span-4 flex items-center gap-2">
          <span class="text-[14px] font-bold text-slate-800 whitespace-nowrap shrink-0">Patient:</span>
          <input
            v-model="localPatientInfo.patientName"
            type="text"
            :class="[
              'rounded-md px-2 py-1 text-[14px] w-full outline-none transition-all',
              props.showValidation && !localPatientInfo.patientName
                ? 'bg-red-50 border-2 border-red-400 placeholder-red-300'
                : 'bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-blue-100'
            ]"
          />
        </div>
        <div class="col-span-3 flex items-center gap-2">
          <span class="text-[14px] font-bold text-slate-800 whitespace-nowrap shrink-0">Age:</span>
          <input v-model="localPatientInfo.age" type="number" class="bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-[14px] w-16 outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
          <span class="text-[14px] text-slate-800 whitespace-nowrap shrink-0">years old</span>
        </div>
        <div class="col-span-2 flex items-center gap-2">
          <span class="text-[14px] font-bold text-slate-800 whitespace-nowrap shrink-0">Nationality:</span>
          <input v-model="localPatientInfo.nationality" type="text" class="bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-[14px] w-full outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>
        <div class="col-span-3 flex items-center gap-2 justify-end">
          <span class="text-[14px] font-bold text-slate-800 whitespace-nowrap shrink-0">Gender:</span>
          <div class="flex gap-3">
            <label class="flex items-center gap-1.5 cursor-pointer group">
              <input type="checkbox" :checked="localPatientInfo.gender === 'Male'" @change="updateGender('Male', ($event.target as HTMLInputElement).checked)" class="w-4 h-4 text-[#0052ff] border-slate-600 focus:ring-blue-100 rounded" />
              <span class="text-[14px] font-medium text-slate-800 group-hover:text-[#0052ff] transition-colors">Male</span>
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer group">
              <input type="checkbox" :checked="localPatientInfo.gender === 'Female'" @change="updateGender('Female', ($event.target as HTMLInputElement).checked)" class="w-4 h-4 text-[#0052ff] border-slate-600 focus:ring-blue-100 rounded" />
              <span class="text-[14px] font-medium text-slate-800 group-hover:text-[#0052ff] transition-colors">Female</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Mini Summary Bar -->
    <div class="px-6 py-3 bg-linear-to-r from-slate-50 to-white border-t border-slate-100">
      <div class="flex items-center gap-3 overflow-x-auto">
        <!-- Full-mouth Summary Label -->
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 whitespace-nowrap">
          <Activity class="w-3.5 h-3.5 text-blue-500" />
          <span class="text-[11px] font-bold text-blue-600 uppercase">Summary</span>
        </div>

        <!-- Teeth Badge -->
        <div class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 whitespace-nowrap">
          <span class="text-[10px] font-bold uppercase text-slate-400">Teeth</span>
          <span class="text-[11px] font-black text-slate-600">
            {{ props.summary.totalTeeth - props.summary.missingTeeth }}/{{ props.summary.totalTeeth }}
          </span>
        </div>

        <!-- Implants Badge -->
        <div class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-violet-50 border border-violet-200 whitespace-nowrap">
          <span class="text-[10px] font-bold uppercase text-violet-400">Implants</span>
          <span class="text-[11px] font-black text-violet-600">
            {{ props.summary.implantTeeth }}
          </span>
        </div>

        <!-- BoP Badge -->
        <div class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 whitespace-nowrap">
          <span class="text-[10px] font-bold uppercase text-rose-400">BoP</span>
          <span class="text-[11px] font-black text-rose-600">
            {{ props.summary.bopPercentage }}%
          </span>
        </div>

        <!-- PI Badge -->
        <div class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-100 whitespace-nowrap">
          <span class="text-[10px] font-bold uppercase text-blue-400">PI</span>
          <span class="text-[11px] font-black text-blue-600">
            {{ props.summary.piPercentage }}%
          </span>
        </div>

        <!-- Mobility Badge -->
        <div v-if="props.summary.mobilityCount > 0" class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 whitespace-nowrap">
          <span class="text-[10px] font-bold uppercase text-amber-400">Mobility</span>
          <span class="text-[11px] font-black text-amber-600">
            {{ props.summary.mobilityCount }}
          </span>
        </div>

        <!-- Furcation Badge -->
        <div v-if="props.summary.furcationCount > 0" class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-50 border border-purple-200 whitespace-nowrap">
          <span class="text-[10px] font-bold uppercase text-purple-400">Furcation</span>
          <span class="text-[11px] font-black text-purple-600">
            {{ props.summary.furcationCount }}
          </span>
        </div>

        <!-- Keratinized Badge -->
        <div v-if="props.summary.keratinizedLowCount > 0" class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-teal-50 border border-teal-200 whitespace-nowrap">
          <span class="text-[10px] font-bold uppercase text-teal-400">KTW &lt;2</span>
          <span class="text-[11px] font-black text-teal-600">
            {{ props.summary.keratinizedLowCount }}
          </span>
        </div>

        <!-- PD Breakdown -->
        <template v-for="item in sortedPdBreakdown" :key="item.depth">
          <div class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 whitespace-nowrap">
            <span class="text-[10px] font-bold uppercase text-rose-400">PD {{ item.depth }}mm</span>
            <span class="text-[11px] font-black text-rose-600">
              {{ item.count }}
            </span>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>
