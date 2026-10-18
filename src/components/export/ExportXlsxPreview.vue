<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Sheet } from 'lucide-vue-next'
import { usePeriodontalChartStore } from '@/stores/periodontal-chart'
import { useDiagnosisStore } from '@/stores/diagnosis'
import { EXTENT_LABEL, SMOKING_LABEL, DIABETES_LABEL } from '@/domain/diagnosis/diagnosis.types'
import { buildChartSheet, buildSitesRows, colName, sheetCode, SITES_HEAD, type SheetRow } from '@/domain/export/export.sheet'

const props = defineProps<{ fileName: string; phase: string; visitNumber?: number; visitDate: string }>()

const { teethData, patientInfo, summary } = storeToRefs(usePeriodontalChartStore())
const d = useDiagnosisStore()

const code = computed(() => sheetCode(props.phase, props.visitNumber))
const sheets = computed(() => [code.value, 'Sites', 'Diagnosis'])
const active = ref<string | null>(null)
const current = computed(() => (active.value && sheets.value.includes(active.value) ? active.value : code.value))


const asGrid = (head: string[], rows: (string | number)[][]) => {
  const H = 'font-bold bg-emerald-50'
  const grid: SheetRow[] = [Object.fromEntries(head.map((h, i) => [i, { v: h, cls: H }]))]
  for (const r of rows) grid.push(Object.fromEntries(r.map((v, i) => [i, { v, cls: typeof v === 'number' ? 'text-right' : '' }])))
  return { rows: grid, columns: head.length }
}

const sheet = computed(() => {
  if (current.value === 'Sites') return asGrid(SITES_HEAD, buildSitesRows(teethData.value))
  if (current.value === 'Diagnosis') {
    const p = patientInfo.value
    return asGrid(['field', 'value'], [
      ['Patient', p.patientName], ['HN', p.hn], ['Visit date', props.visitDate], ['Phase', props.phase],
      ['Diagnosis', d.diagnosisTitle], ['Stage', d.finalStage ?? '—'], ['Grade', d.finalGrade],
      ['Extent', d.extent ? EXTENT_LABEL[d.extent] : '—'],
      ['BI %', summary.value.bopPercentage], ['PI %', summary.value.piPercentage],
      ['Max interdental CAL (mm)', d.interdentalCal ?? '—'], ['Bone loss (%)', d.boneLoss ?? '—'],
      ['Smoking', d.inputs.smoking ? SMOKING_LABEL[d.inputs.smoking] : '—'],
      ['Diabetes', d.inputs.diabetes ? DIABETES_LABEL[d.inputs.diabetes] : '—'],
    ])
  }
  return buildChartSheet(teethData.value, code.value)
})
const isChart = computed(() => current.value === code.value)


const cellsOf = (r: SheetRow, columns: number) => {
  const out: { c: number; v: string | number; cls: string; span: number }[] = []
  for (let c = 0; c < columns; ) {
    const cell = r[c]
    const span = cell?.span ?? 1
    out.push({ c, v: cell?.v ?? '', cls: cell?.cls ?? '', span })
    c += span
  }
  return out
}
const width = (c: number) => (!isChart.value ? 0 : c === 1 ? 150 : c === 2 ? 34 : c >= 3 && c < 51 ? 24 : c >= 52 ? 56 : 14)
</script>

<template>
  <div class="bg-white rounded-xl shadow-lg w-full overflow-hidden">
    <div class="px-4 py-2.5 border-b border-slate-200 flex items-center gap-2 text-[12px] font-bold">
      <Sheet class="w-4 h-4 text-emerald-600" />{{ fileName }}
    </div>
    <div class="overflow-auto max-h-[calc(100vh-260px)]">
      <table class="text-[10px] border-collapse" :class="{ 'table-fixed': isChart }">
        <thead>
          <tr class="bg-slate-100 text-slate-400">
            <th class="w-8 border border-slate-200 sticky left-0 bg-slate-100"></th>
            <th
              v-for="c in sheet.columns"
              :key="c"
              class="border border-slate-200 font-medium py-0.5"
              :style="width(c - 1) ? { width: `${width(c - 1)}px`, minWidth: `${width(c - 1)}px` } : {}"
            >
              {{ colName(c - 1) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, ri) in sheet.rows" :key="ri">
            <td class="border border-slate-200 bg-slate-100 text-slate-400 text-center sticky left-0">{{ ri + 1 }}</td>
            <td
              v-for="cell in cellsOf(r, sheet.columns)"
              :key="cell.c"
              :colspan="cell.span"
              class="border border-slate-200 px-1 py-0.5 whitespace-nowrap"
              :class="[isChart ? 'text-center' : 'px-2 py-1', cell.cls, isChart && cell.v === '' && cell.c >= 3 && cell.c < 51 && Math.floor((cell.c - 3) / 3) % 2 ? 'bg-slate-50/60' : '']"
            >
              {{ cell.v }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex border-t border-slate-200 bg-slate-50 text-[11px]">
      <button
        v-for="n in sheets"
        :key="n"
        class="px-4 py-1.5 border-r border-slate-200"
        :class="n === current ? 'bg-white font-bold text-emerald-700 border-b-2 border-b-emerald-600' : 'text-slate-500 hover:bg-white'"
        @click="active = n"
      >
        {{ n }}
      </button>
    </div>
  </div>
</template>
