<script setup lang="ts">
import { Activity } from 'lucide-vue-next'
import { computed } from 'vue'
import type { PatientInfo, ChartSummary, PdBreakdown } from '@/domain/chart/chart.types'

const props = defineProps<{
  patientInfo: PatientInfo
  summary: ChartSummary
}>()

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
          <span class="text-sm font-black text-slate-800">HN-</span>
          <input v-model="props.patientInfo.hn" type="text" placeholder="YY-XXX" class="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-sm font-bold w-40" />
        </div>
        <h1 class="text-3xl font-black text-slate-800 tracking-tight text-center">Periodontal Chart</h1>
        <div class="w-40"></div>
      </div>

      <div class="grid grid-cols-12 gap-y-3 gap-x-5 items-center">
        <div class="col-span-2 flex items-center gap-2">
          <span class="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap shrink-0">Date:</span>
          <input v-model="props.patientInfo.date" type="date" class="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-xs font-bold w-full outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>
        <div class="col-span-5 flex items-center gap-2 ml-5">
          <span class="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap shrink-0">Doctor:</span>
          <input v-model="props.patientInfo.doctor" type="text" class="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold w-full outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>
        <div class="col-span-4 flex items-center gap-2 ml-2">
          <span class="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap shrink-0">Doctor ID:</span>
          <input v-model="props.patientInfo.studentId" type="text" class="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold w-full outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>
        <div class="col-span-4 flex items-center gap-2">
          <span class="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap shrink-0">Patient:</span>
          <input v-model="props.patientInfo.patientName" type="text" placeholder="Full Name" class="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold w-full outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>
        <div class="col-span-2 flex items-center gap-2">
          <span class="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap shrink-0">Age:</span>
          <input v-model="props.patientInfo.age" type="number" placeholder="0" class="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold w-full outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>
        <div class="col-span-3 flex items-center gap-2">
          <span class="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap shrink-0">Nationality:</span>
          <input v-model="props.patientInfo.nationality" type="text" placeholder="e.g. Thai" class="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold w-full outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>
        <div class="col-span-3 flex items-center gap-3 pl-2">
          <span class="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap shrink-0">Gender:</span>
          <div class="flex gap-3">
            <label v-for="gender in ['Male', 'Female']" :key="gender" class="flex items-center gap-1.5 cursor-pointer group">
              <input v-model="props.patientInfo.gender" type="radio" :value="gender" class="w-3.5 h-3.5 text-[#0052ff] border-slate-300 focus:ring-blue-100" />
              <span class="text-[11px] font-bold text-slate-600 group-hover:text-[#0052ff] transition-colors">{{ gender }}</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Mini Summary Bar -->
    <div class="px-6 py-3 bg-linear-to-r from-slate-50 to-white border-t border-slate-100 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <!-- Full-mouth Summary Label -->
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100">
          <Activity class="w-3.5 h-3.5 text-blue-500" />
          <span class="text-[11px] font-bold text-blue-600 uppercase">Summary</span>
        </div>

        <!-- Teeth Badge -->
        <div class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-50 border border-slate-200">
          <span class="text-[10px] font-bold uppercase text-slate-400">Teeth</span>
          <span class="text-[11px] font-black text-slate-600">
            {{ props.summary.totalTeeth - props.summary.missingTeeth }}/{{ props.summary.totalTeeth }}
          </span>
        </div>

        <!-- Implants Badge -->
        <div class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-violet-50 border border-violet-200">
          <span class="text-[10px] font-bold uppercase text-violet-400">Implants</span>
          <span class="text-[11px] font-black text-violet-600">
            {{ props.summary.implantTeeth }}
          </span>
        </div>

        <!-- BoP Badge -->
        <div class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-50 border border-rose-200">
          <span class="text-[10px] font-bold uppercase text-rose-400">BoP</span>
          <span class="text-[11px] font-black text-rose-600">
            {{ props.summary.bopPercentage }}%
          </span>
        </div>

        <!-- PI Badge -->
        <div class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-100">
          <span class="text-[10px] font-bold uppercase text-blue-400">PI</span>
          <span class="text-[11px] font-black text-blue-600">
            {{ props.summary.piPercentage }}%
          </span>
        </div>

        <!-- Mobility Badge -->
        <div v-if="props.summary.mobilityCount > 0" class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200">
          <span class="text-[10px] font-bold uppercase text-amber-400">Mobility</span>
          <span class="text-[11px] font-black text-amber-600">
            {{ props.summary.mobilityCount }} teeth
          </span>
        </div>

        <!-- Furcation Badge -->
        <div v-if="props.summary.furcationCount > 0" class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-50 border border-purple-200">
          <span class="text-[10px] font-bold uppercase text-purple-400">Furcation</span>
          <span class="text-[11px] font-black text-purple-600">
            {{ props.summary.furcationCount }} teeth
          </span>
        </div>

        <!-- Keratinized Badge -->
        <div v-if="props.summary.keratinizedLowCount > 0" class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-teal-50 border border-teal-200">
          <span class="text-[10px] font-bold uppercase text-teal-400">KTW &lt;2</span>
          <span class="text-[11px] font-black text-teal-600">
            {{ props.summary.keratinizedLowCount }} teeth
          </span>
        </div>

        <!-- PD Breakdown -->
        <template v-for="item in sortedPdBreakdown" :key="item.depth">
          <div class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-50 border border-rose-200">
            <span class="text-[10px] font-bold uppercase text-rose-400">PD {{ item.depth }}mm</span>
            <span class="text-[11px] font-black text-rose-600">
              {{ item.count }} teeth
            </span>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>
