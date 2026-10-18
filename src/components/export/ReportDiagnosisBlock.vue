<script setup lang="ts">
import { computed } from 'vue'
import StageCriteriaTable from '@/components/diagnosis/StageCriteriaTable.vue'
import GradeCriteriaTable from '@/components/diagnosis/GradeCriteriaTable.vue'
import { useDiagnosisStore } from '@/stores/diagnosis'
import {
  DIABETES_LABEL, DIRECT_EVIDENCE_LABEL, EXTENT_LABEL, FURCATION_CLASS, GRADE_MEANING, PHENOTYPE_LABEL,
  SMOKING_LABEL, STAGE_MEANING, type ExtentId,
} from '@/domain/diagnosis/diagnosis.types'


const d = useDiagnosisStore()
const inputs = d.inputs
const f = computed(() => d.findings)

const mm = (v: number | null) => (v === null ? '—' : `${v} mm`)
const stageFields = computed(() => [
  ['Interdental CAL', mm(d.interdentalCal)],
  ['Max probing depth', mm(d.probingDepth)],
  ['Furcation / mobility', [f.value.furcation && FURCATION_CLASS[f.value.furcation.grade], f.value.mobility && `Mob ${f.value.mobility.grade}`].filter(Boolean).join(' · ') || 'None recorded'],
  ['Radiographic bone loss', d.boneLoss === null ? 'Not entered' : `${d.boneLoss} %`],
  ['Tooth loss cause', inputs.teethLostToPerio ?? 'Not entered'],
])
const gradeFields = computed(() => [
  ['Direct evidence', inputs.directEvidence ? DIRECT_EVIDENCE_LABEL[inputs.directEvidence] : 'Not available'],
  ['Bone loss, worst site', d.boneLoss === null ? '—' : `${d.boneLoss} %`],
  ['Patient age', d.age === null ? '—' : `${d.age} years`],
  ['Case phenotype', d.phenotype ? PHENOTYPE_LABEL[d.phenotype] : 'Not assessed'],
  ['Smoking', inputs.smoking ? SMOKING_LABEL[inputs.smoking] : 'Not recorded'],
  ['Diabetes', inputs.diabetes ? DIABETES_LABEL[inputs.diabetes] : 'Not recorded'],
])
const EXTENTS: ExtentId[] = ['localized', 'generalized', 'molar-incisor']
</script>

<template>
  <div class="flex flex-col gap-4">
    <div>
      <p class="text-[13px] font-bold text-slate-500">Periodontal diagnosis · AAP / EFP 2017</p>
      <p class="text-[22px] font-extrabold text-[#0052ff] leading-tight">Result : {{ d.diagnosisTitle }}</p>
    </div>

    <section class="rounded-3xl border border-slate-200 p-5 flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <span class="w-5 h-5 rounded-full bg-[#0052ff] text-white text-[10px] font-bold grid place-items-center">1</span>
        <h2 class="text-[15px] font-bold text-slate-800">Periodontitis Stage</h2>
      </div>
      <div class="grid grid-cols-5 gap-x-6 divide-x divide-slate-100">
        <div v-for="[label, value] in stageFields" :key="label" class="pl-6 first:pl-0">
          <p class="text-[11px] text-slate-400">{{ label }}</p>
          <p class="text-[13px] font-bold text-slate-800">{{ value }}</p>
        </div>
      </div>
      <StageCriteriaTable
        :stage="d.finalStage"
        :marks="inputs.stageMarks"
        :resolved="d.stage.resolved"
        :cal="d.interdentalCal"
        :bone-loss-percent="d.boneLoss"
        :teeth-lost="d.teethLost"
        :complexity="d.complexity"
        readonly
      />
      <div class="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200">
        <div>
          <p class="text-[12px] font-bold text-slate-700">Extent and distribution</p>
          <p class="text-[11px] text-slate-400">
            Counted from chart: {{ f.affectedTeeth }} of {{ f.remainingTeeth }} teeth affected ({{ f.affectedPercentage }}%)
          </p>
        </div>
        <div class="flex items-center gap-1 p-0.5 rounded-lg border bg-slate-100 border-slate-200">
          <span
            v-for="e in EXTENTS"
            :key="e"
            class="px-3 py-1.5 rounded-md text-[11px] font-bold"
            :class="d.extent === e ? 'bg-[#0052ff] text-white' : 'text-slate-400'"
          >
            {{ EXTENT_LABEL[e] }}
          </span>
        </div>
      </div>
      <div class="rounded-2xl border border-slate-200 p-5">
        <div class="flex items-center gap-3">
          <span class="text-[13px] text-slate-500">System result</span>
          <span class="text-[18px] font-extrabold" :class="d.stage.stage ? 'text-amber-500' : 'text-red-600'">
            {{ d.stage.stage ? `Stage ${d.stage.stage}` : 'Not enough data' }}
          </span>
          <span
            class="px-3 py-0.5 rounded-full text-[12px] font-semibold"
            :class="d.stage.missing.length ? 'bg-[#FECE44] text-slate-900' : 'bg-emerald-100 text-emerald-800'"
          >
            {{ d.stage.missing.length ? `${d.stage.missing.length} still missing` : 'All criteria recorded' }}
          </span>
        </div>
        <p v-if="d.finalStage" class="mt-3 text-[13px] text-slate-600 leading-relaxed">{{ STAGE_MEANING[d.finalStage] }}</p>
      </div>
    </section>

    <section class="rounded-3xl border border-slate-200 p-5 flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <span class="w-5 h-5 rounded-full bg-[#0052ff] text-white text-[10px] font-bold grid place-items-center">2</span>
        <h2 class="text-[15px] font-bold text-slate-800">Periodontitis Grade</h2>
      </div>
      <div class="grid grid-cols-3 gap-x-8 gap-y-2 rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
        <div v-for="[label, value] in gradeFields" :key="label" class="flex justify-between border-b border-slate-100 pb-2">
          <span class="text-[11px] text-slate-500">{{ label }}</span>
          <span class="text-[13px] font-bold text-slate-800">{{ value }}</span>
        </div>
      </div>
      <GradeCriteriaTable
        :grade="d.finalGrade"
        :direct-evidence="inputs.directEvidence"
        :bone-loss-percent="d.boneLoss"
        :age-years="d.age"
        :ratio="d.grade.ratio"
        :ratio-grade="d.grade.ratioGrade"
        :phenotype="d.phenotype"
        :phenotype-from-chart="d.phenotypeFromChart"
        :smoking="inputs.smoking"
        :diabetes="inputs.diabetes"
        readonly
      />
      <div class="rounded-2xl border border-slate-200 p-5">
        <div class="flex items-center gap-3">
          <span class="text-[13px] text-slate-500">System result</span>
          <span class="text-[18px] font-extrabold text-amber-500">Grade {{ d.grade.grade }}</span>
          <span
            class="px-3 py-0.5 rounded-full text-[12px] font-semibold"
            :class="d.grade.missing.length ? 'bg-[#FECE44] text-slate-900' : 'bg-emerald-100 text-emerald-800'"
          >
            {{ d.grade.missing.length ? `Still needs ${d.grade.missing.join(', ')}` : 'All required input provided' }}
          </span>
        </div>
        <p class="mt-3 text-[13px] text-slate-600 leading-relaxed">{{ GRADE_MEANING[d.finalGrade] }}</p>
      </div>
    </section>
  </div>
</template>
