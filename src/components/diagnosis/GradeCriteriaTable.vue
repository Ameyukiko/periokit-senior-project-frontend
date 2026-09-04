<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import {
  gradeForDiabetes,
  gradeForDirectEvidence,
  gradeForPhenotype,
  gradeForSmoking,
} from '@/domain/diagnosis/diagnosis.rules'
import {
  DIABETES_LABEL,
  DIRECT_EVIDENCE_LABEL,
  PHENOTYPE_LABEL,
  SMOKING_LABEL,
  type Diabetes,
  type DirectEvidence,
  type GradeChoice,
  type GradeId,
  type Phenotype,
  type Smoking,
} from '@/domain/diagnosis/diagnosis.types'

const props = defineProps<{
  // The grade in force — the doctor's override when there is one.
  selected: GradeId | null
  // What the criteria arrived at on their own.
  result: GradeId | null
  directEvidence: DirectEvidence | null
  boneLossPercent: number | null
  ageYears: number | null
  ratio: number | null
  ratioGrade: GradeId | null
  phenotype: Phenotype | null
  /** True when the phenotype came off the chart instead of being answered. */
  phenotypeFromChart: boolean
  plaquePercentage: number
  smoking: Smoking | null
  diabetes: Diabetes | null
}>()

const emit = defineEmits<{
  select: [grade: GradeId]
  choose: [choice: GradeChoice]
}>()

const COLUMNS: { id: GradeId; title: string; subtitle: string }[] = [
  { id: 'A', title: 'Grade A', subtitle: 'Slow rate of progression' },
  { id: 'B', title: 'Grade B', subtitle: 'Moderate rate of progression' },
  { id: 'C', title: 'Grade C', subtitle: 'Rapid rate of progression' },
]

const DIRECT_BANDS: Record<GradeId, string> = {
  A: 'Evidence of no loss over 5 years',
  B: '< 2 mm over 5 years',
  C: '≥ 2 mm over 5 years',
}

const RATIO_BANDS: Record<GradeId, string> = {
  A: '< 0.25',
  B: '0.25 – 1.00',
  C: '> 1.00',
}

const PHENOTYPE_BANDS: Record<GradeId, string> = {
  A: 'Heavy biofilm deposits with low levels of destruction',
  B: 'Destruction commensurate with biofilm deposits',
  C: 'Destruction exceeds expectation given biofilm deposits; clinical patterns suggesting rapid progression and/or early onset disease',
}

const SMOKING_BANDS: Record<GradeId, string> = {
  A: 'Non-smoker',
  B: 'Smoker < 10 cigarettes/day',
  C: 'Smoker ≥ 10 cigarettes/day',
}

const DIABETES_BANDS: Record<GradeId, string> = {
  A: 'Normoglycaemic / no diagnosis of diabetes',
  B: 'HbA1c < 7.0% in patients with diabetes',
  C: 'HbA1c ≥ 7.0% in patients with diabetes',
}

// Each clickable row is one of the grade inputs, so ticking a cell answers the
// question in the panel above rather than leaving a mark of its own.
const DIRECT_VALUES: Record<GradeId, DirectEvidence> = {
  A: 'no-loss',
  B: 'lt-2mm',
  C: 'gte-2mm',
}
const PHENOTYPE_VALUES: Record<GradeId, Phenotype> = {
  A: 'heavy-biofilm',
  B: 'commensurate',
  C: 'exceeds',
}
const SMOKING_VALUES: Record<GradeId, Smoking> = {
  A: 'non-smoker',
  B: 'lt-10',
  C: 'gte-10',
}
const DIABETES_VALUES: Record<GradeId, Diabetes> = {
  A: 'none',
  B: 'hba1c-lt-7',
  C: 'hba1c-gte-7',
}

const directGrade = computed(() => gradeForDirectEvidence(props.directEvidence))
const phenotypeGrade = computed(() => gradeForPhenotype(props.phenotype))
const smokingGrade = computed(() => gradeForSmoking(props.smoking))
const diabetesGrade = computed(() => gradeForDiabetes(props.diabetes))

const directChip = computed(() =>
  props.directEvidence ? `Patient: ${DIRECT_EVIDENCE_LABEL[props.directEvidence]}` : '',
)
const ratioChip = computed(() =>
  props.ratio === null
    ? ''
    : `Patient: ${props.boneLossPercent}% ÷ ${props.ageYears} = ${props.ratio}`,
)
const phenotypeChip = computed(() => {
  if (!props.phenotype) return ''
  if (!props.phenotypeFromChart) return `Your assessment: ${PHENOTYPE_LABEL[props.phenotype]}`
  return `From chart: ${PHENOTYPE_LABEL[props.phenotype]} (plaque ${props.plaquePercentage}%)`
})
const smokingChip = computed(() => (props.smoking ? `Patient: ${SMOKING_LABEL[props.smoking]}` : ''))
const diabetesChip = computed(() =>
  props.diabetes ? `Patient: ${DIABETES_LABEL[props.diabetes]}` : '',
)

// Clicking the cell that is already ticked clears the answer again.
const chooseDirect = (grade: GradeId) =>
  emit('choose', {
    field: 'directEvidence',
    value: directGrade.value === grade ? null : DIRECT_VALUES[grade],
  })
const choosePhenotype = (grade: GradeId) =>
  emit('choose', {
    field: 'phenotype',
    value: phenotypeGrade.value === grade ? null : PHENOTYPE_VALUES[grade],
  })
const chooseSmoking = (grade: GradeId) =>
  emit('choose', {
    field: 'smoking',
    value: smokingGrade.value === grade ? null : SMOKING_VALUES[grade],
  })
const chooseDiabetes = (grade: GradeId) =>
  emit('choose', {
    field: 'diabetes',
    value: diabetesGrade.value === grade ? null : DIABETES_VALUES[grade],
  })

// `soft` is for an answer the chart worked out rather than one the doctor gave,
// which reads lighter — the same split the staging table makes. A cell holding
// no answer is dashed, which is what tells these rows apart from the calculated
// % bone loss ÷ age row below: dashed cells are the ones to fill in.
const cellClass = (answered: GradeId | null, grade: GradeId, soft = false) => [
  'px-3 py-2.5 align-top border border-slate-300 cursor-pointer transition-all duration-150',
  answered !== grade && 'border-dashed hover:border-solid hover:border-blue-300',
  answered === grade
    ? soft
      ? 'bg-[#FECE44]/55 text-slate-900 font-bold border-b-2 border-b-amber-400 hover:bg-[#FECE44]/75'
      : 'bg-[#FECE44] text-slate-900 font-bold border-t-2 border-t-white/80 border-b-[3px] border-b-amber-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_3px_5px_rgba(217,119,6,0.3)] ring-1 ring-amber-500'
    : props.selected === grade
      ? 'bg-[#FECE44]/30 text-slate-900 border-x-2 border-x-[#FECE44] hover:bg-[#FECE44]/45'
      : 'text-black hover:bg-blue-100/70',
]

// % bone loss ÷ age comes out of two numbers, so its row is read-only — and it
// takes the lighter shade for the same reason the phenotype does when the chart
// answered it: nobody ticked this, the app worked it out.
const ratioCellClass = (grade: GradeId) => [
  'px-3 py-2.5 align-top border border-slate-300 text-black transition-all duration-150',
  props.ratioGrade === grade
    ? 'bg-[#FECE44]/55 text-slate-900 font-bold border-b-2 border-b-amber-400'
    : props.selected === grade
      ? 'bg-[#FECE44]/30 text-slate-900 border-x-2 border-x-[#FECE44]'
      : '',
]

const rowHeaderClass =
  'px-3 py-2.5 align-top bg-blue-50/50 border border-slate-300 text-[11px] font-bold text-black'
</script>

<template>
  <div class="overflow-x-auto rounded-2xl border border-slate-400 bg-blue-50/40">
    <table class="w-full min-w-[900px] border-collapse text-left text-[11px] text-black">
      <thead>
        <tr class="bg-blue-100 text-black border-b border-slate-400">
          <th colspan="3" class="p-3 align-top w-72 border border-slate-300 bg-gradient-to-b from-blue-50 to-blue-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <span class="block text-[12px] font-bold text-black">Periodontitis Grade</span>
            <span class="block text-[10px] font-normal text-slate-700">
              AAP / EFP 2017 — rate of progression
            </span>
            <span class="block mt-1.5 text-[10px] font-normal text-slate-600 leading-tight">
              Dashed cells are open — click one to answer that row. % bone loss ÷ age is
              calculated, so it has none.
            </span>
          </th>
          <th
            v-for="column in COLUMNS"
            :key="column.id"
            class="p-0 font-bold border border-slate-300 align-top transition-all duration-150"
            :class="
              selected === column.id
                ? 'relative z-10 bg-gradient-to-b from-[#ffdf6d] via-[#FECE44] to-[#f4b827] text-slate-900 border-t-2 border-t-white border-b-4 border-b-amber-600 border-x-2 border-x-amber-500 shadow-[0_4px_8px_-1px_rgba(202,138,4,0.45),inset_0_2px_0_rgba(255,255,255,0.9)]'
                : 'bg-gradient-to-b from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200/90 text-black border-b-2 border-b-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]'
            "
          >
            <button
              type="button"
              class="text-left w-full h-full p-3 transition-all duration-150 flex flex-col justify-between cursor-pointer focus:outline-none active:translate-y-0.5"
              :aria-pressed="selected === column.id"
              :title="`Set the diagnosis to Grade ${column.id}`"
              @click="emit('select', column.id)"
            >
              <div class="flex items-center justify-between gap-1.5 flex-wrap w-full">
                <span class="text-[12px] font-bold text-slate-900">
                  {{ column.title }}
                </span>
                <span
                  v-if="selected === column.id"
                  class="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-red-600 text-white border border-red-500 text-[9px] font-bold shadow-sm"
                >
                  <Check class="w-2.5 h-2.5" /> Selected
                </span>
                <span
                  v-else-if="result === column.id"
                  class="px-1.5 py-0.5 rounded-md bg-blue-200 text-blue-900 text-[9px] font-bold shadow-xs"
                >
                  System result
                </span>
              </div>
              <span
                class="block mt-2 text-[10px] font-normal leading-tight"
                :class="selected === column.id ? 'text-slate-800 font-medium' : 'text-slate-700'"
              >
                {{ column.subtitle }}
              </span>
            </button>
          </th>
        </tr>
      </thead>

      <tbody class="bg-blue-50/20">
        <tr>
          <th
            rowspan="3"
            class="px-3 py-2.5 align-top w-24 bg-blue-100/60 border border-slate-300 text-[11px] font-bold text-black"
          >
            Primary criteria
          </th>
          <th
            class="px-3 py-2.5 align-top w-28 bg-blue-50/50 border border-slate-300 text-[11px] font-bold text-black"
          >
            Direct evidence of progression
          </th>
          <th :class="rowHeaderClass" class="w-32">
            Longitudinal data
            <span class="block text-[10px] font-normal text-slate-700">
              radiographic bone loss or CAL, ≥ 5 years apart
            </span>
          </th>
          <td
            v-for="column in COLUMNS"
            :key="column.id"
            :class="cellClass(directGrade, column.id)"
            @click="chooseDirect(column.id)"
          >
            {{ DIRECT_BANDS[column.id] }}
            <span
              v-if="directGrade === column.id"
              class="block mt-1 text-[10px] font-bold text-slate-900"
            >
              {{ directChip }}
            </span>
          </td>
        </tr>

        <tr>
          <th
            rowspan="2"
            class="px-3 py-2.5 align-top bg-blue-50/50 border border-slate-300 text-[11px] font-bold text-black"
          >
            Indirect evidence of progression
          </th>
          <th :class="rowHeaderClass">
            % bone loss ÷ age
            <span v-if="ratio === null" class="block mt-1 text-[10px] font-bold text-amber-700">
              Needs bone loss and age
            </span>
          </th>
          <td v-for="column in COLUMNS" :key="column.id" :class="ratioCellClass(column.id)">
            {{ RATIO_BANDS[column.id] }}
            <span
              v-if="ratioGrade === column.id"
              class="block mt-1 text-[10px] font-bold text-slate-900"
            >
              {{ ratioChip }}
            </span>
          </td>
        </tr>

        <tr>
          <th :class="rowHeaderClass">
            Case phenotype
            <span v-if="!phenotype" class="block mt-1 text-[10px] font-bold text-amber-700">
              Needs your input
            </span>
          </th>
          <td
            v-for="column in COLUMNS"
            :key="column.id"
            :class="cellClass(phenotypeGrade, column.id, phenotypeFromChart)"
            @click="choosePhenotype(column.id)"
          >
            {{ PHENOTYPE_BANDS[column.id] }}
            <span
              v-if="phenotypeGrade === column.id"
              class="block mt-1 text-[10px] font-bold text-slate-900"
            >
              {{ phenotypeChip }}
            </span>
          </td>
        </tr>

        <tr>
          <th
            rowspan="2"
            class="px-3 py-2.5 align-top bg-blue-100/60 border border-slate-300 text-[11px] font-bold text-black"
          >
            Grade modifiers
          </th>
          <th
            rowspan="2"
            class="px-3 py-2.5 align-top bg-blue-50/50 border border-slate-300 text-[11px] font-bold text-black"
          >
            Risk factors
          </th>
          <th :class="rowHeaderClass">
            Smoking
            <span v-if="!smoking" class="block mt-1 text-[10px] font-bold text-amber-700">
              Needs your input
            </span>
          </th>
          <td
            v-for="column in COLUMNS"
            :key="column.id"
            :class="cellClass(smokingGrade, column.id)"
            @click="chooseSmoking(column.id)"
          >
            {{ SMOKING_BANDS[column.id] }}
            <span
              v-if="smokingGrade === column.id"
              class="block mt-1 text-[10px] font-bold text-slate-900"
            >
              {{ smokingChip }}
            </span>
          </td>
        </tr>

        <tr>
          <th :class="rowHeaderClass">
            Diabetes
            <span v-if="!diabetes" class="block mt-1 text-[10px] font-bold text-amber-700">
              Needs your input
            </span>
          </th>
          <td
            v-for="column in COLUMNS"
            :key="column.id"
            :class="cellClass(diabetesGrade, column.id)"
            @click="chooseDiabetes(column.id)"
          >
            {{ DIABETES_BANDS[column.id] }}
            <span
              v-if="diabetesGrade === column.id"
              class="block mt-1 text-[10px] font-bold text-slate-900"
            >
              {{ diabetesChip }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
