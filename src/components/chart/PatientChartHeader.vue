<script setup lang="ts">
import { Activity } from 'lucide-vue-next'
import type { PatientInfo, ChartSummary } from '@/domain/chart/chart.types'

defineProps<{
  patientInfo: PatientInfo
  summary: ChartSummary
}>()
</script>

<template>
  <section class="bg-white rounded-r-3xl rounded-bl-3xl shadow-xl border border-slate-200 overflow-hidden relative z-0">
    <div class="p-6 border-b border-slate-100 bg-white">
      <div class="flex items-center justify-between mb-5">
        <div class="flex items-center gap-2">
          <span class="text-sm font-black text-slate-800">HN-</span>
          <input v-model="patientInfo.hn" type="text" placeholder="YY-XXX" class="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-sm font-bold w-40" />
        </div>
        <h1 class="text-3xl font-black text-slate-800 tracking-tight text-center">Periodontal Chart</h1>
        <div class="w-40"></div>
      </div>

      <div class="grid grid-cols-12 gap-y-3 gap-x-5 items-center">
        <div class="col-span-2 flex items-center gap-2">
          <span class="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap shrink-0">Date:</span>
          <input v-model="patientInfo.date" type="date" class="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-xs font-bold w-full outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>
        <div class="col-span-5 flex items-center gap-2 ml-5">
          <span class="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap shrink-0">Doctor:</span>
          <input v-model="patientInfo.doctor" type="text" class="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold w-full outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>
        <div class="col-span-4 flex items-center gap-2 ml-2">
          <span class="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap shrink-0">Doctor ID:</span>
          <input v-model="patientInfo.studentId" type="text" class="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold w-full outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>
        <div class="col-span-4 flex items-center gap-2">
          <span class="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap shrink-0">Patient:</span>
          <input v-model="patientInfo.patientName" type="text" placeholder="Full Name" class="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold w-full outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>
        <div class="col-span-2 flex items-center gap-2">
          <span class="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap shrink-0">Age:</span>
          <input v-model="patientInfo.age" type="number" placeholder="0" class="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold w-full outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>
        <div class="col-span-3 flex items-center gap-2">
          <span class="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap shrink-0">Nationality:</span>
          <input v-model="patientInfo.nationality" type="text" placeholder="e.g. Thai" class="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-bold w-full outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>
        <div class="col-span-3 flex items-center gap-3 pl-2">
          <span class="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap shrink-0">Gender:</span>
          <div class="flex gap-3">
            <label v-for="gender in ['Male', 'Female']" :key="gender" class="flex items-center gap-1.5 cursor-pointer group">
              <input v-model="patientInfo.gender" type="radio" :value="gender" class="w-3.5 h-3.5 text-[#0052ff] border-slate-300 focus:ring-blue-100" />
              <span class="text-[11px] font-bold text-slate-600 group-hover:text-[#0052ff] transition-colors">{{ gender }}</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Mini Summary Bar -->
    <div class="px-6 py-2.5 bg-linear-to-r from-slate-50 to-white border-t border-slate-100 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <!-- Full-mouth Summary Label -->
        <div class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 border border-blue-100">
          <Activity class="w-3 h-3 text-blue-500" />
          <span class="text-[9px] font-bold text-blue-600 uppercase">Summary</span>
        </div>

        <!-- Teeth Badge -->
        <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200">
          <span class="text-[8px] font-bold uppercase text-slate-400">Teeth</span>
          <span class="text-[9px] font-black text-slate-600">
            {{ summary.totalTeeth - summary.missingTeeth }}/{{ summary.totalTeeth }}
          </span>
        </div>

        <!-- Implants Badge -->
        <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-violet-50 border border-violet-200">
          <span class="text-[8px] font-bold uppercase text-violet-400">Implants</span>
          <span class="text-[9px] font-black text-violet-600">
            {{ summary.implantTeeth }}
          </span>
        </div>

        <!-- BoP Badge -->
        <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200">
          <span class="text-[8px] font-bold uppercase text-rose-400">BoP</span>
          <span class="text-[9px] font-black text-rose-600">
            {{ summary.bopPercentage }}%
          </span>
        </div>

        <!-- PI Badge -->
        <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100">
          <span class="text-[8px] font-bold uppercase text-blue-400">PI</span>
          <span class="text-[9px] font-black text-blue-600">
            {{ summary.piPercentage }}%
          </span>
        </div>

        <!-- PD 4-5 Badge -->
        <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-md" :class="summary.pdCategories.warning > 5 ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200'">
          <span class="text-[8px] font-bold uppercase" :class="summary.pdCategories.warning > 5 ? 'text-amber-500' : 'text-slate-400'">PD 4-5</span>
          <span class="text-[9px] font-black" :class="summary.pdCategories.warning > 5 ? 'text-amber-600' : 'text-slate-600'">
            {{ summary.pdCategories.warning }}
          </span>
        </div>

        <!-- PD 6+ Badge -->
        <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-md" :class="summary.pdCategories.deep > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-slate-50 border border-slate-200'">
          <span class="text-[8px] font-bold uppercase" :class="summary.pdCategories.deep > 0 ? 'text-rose-400' : 'text-slate-400'">PD 6+</span>
          <span class="text-[9px] font-black" :class="summary.pdCategories.deep > 0 ? 'text-rose-600' : 'text-slate-600'">
            {{ summary.pdCategories.deep }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
