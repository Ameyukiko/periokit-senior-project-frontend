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
const phenotypeChip = computed(() =>
  props.phenotype ? `Your assessment: ${PHENOTYPE_LABEL[props.phenotype]}` : '',
)
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

const cellClass = (answered: GradeId | null, grade: GradeId) => [
  'px-3 py-2.5 align-top border-t border-slate-100 cursor-pointer transition-colors',
  answered === grade
    ? 'bg-amber-50 text-slate-800 ring-1 ring-inset ring-amber-300'
    : 'text-slate-600 hover:bg-slate-50',
]

// % bone loss ÷ age comes out of two numbers, so its row is read-only.
const ratioCellClass = (grade: GradeId) => [
  'px-3 py-2.5 align-top border-t border-slate-100',
  props.ratioGrade === grade ? 'bg-amber-50/60 text-slate-800' : 'text-slate-600',
]

const rowHeaderClass =
  'px-3 py-2.5 align-top border-t border-slate-100 text-[11px] font-bold text-slate-700'
</script>

<template>
  <div class="overflow-x-auto rounded-2xl border border-slate-200">
    <table class="w-full min-w-[900px] border-collapse text-left text-[11px]">
      <thead>
        <tr class="bg-purple-500 text-white">
          <th colspan="3" class="px-3 py-2.5 align-top w-72">
            <span class="block text-[12px] font-bold">Periodontitis Grade</span>
            <span class="block text-[10px] font-normal text-white/70">
              AAP / EFP 2017 — rate of progression
            </span>
          </th>
          <th
            v-for="column in COLUMNS"
            :key="column.id"
            class="px-3 py-2.5 align-top font-bold"
            :class="selected === column.id ? 'bg-amber-400 text-slate-900' : ''"
          >
            <button
              type="button"
              class="text-left w-full"
              :aria-pressed="selected === column.id"
              :title="`Set the diagnosis to Grade ${column.id}`"
              @click="emit('select', column.id)"
            >
              <span class="flex items-center gap-1.5 flex-wrap">
                <span class="text-[12px]">{{ column.title }}</span>
                <span
                  v-if="selected === column.id"
                  class="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-900 text-white text-[9px] font-bold"
                >
                  <Check class="w-2.5 h-2.5" /> Selected
                </span>
                <span
                  v-else-if="result === column.id"
                  class="px-1.5 py-0.5 rounded-md bg-white/20 text-white text-[9px] font-bold"
                >
                  System result
                </span>
              </span>
              <span
                class="block mt-1 text-[10px] font-normal"
                :class="selected === column.id ? 'text-slate-800' : 'text-white/80'"
              >
                {{ column.subtitle }}
              </span>
            </button>
          </th>
        </tr>
      </thead>

      <tbody class="bg-white">
        <tr>
          <th
            rowspan="3"
            class="px-3 py-2.5 align-top w-24 bg-slate-50/60 border-t border-slate-100 text-[11px] font-bold text-slate-700"
          >
            Primary criteria
          </th>
          <th
            class="px-3 py-2.5 align-top w-28 border-t border-slate-100 text-[11px] font-bold text-slate-700"
          >
            Direct evidence of progression
          </th>
          <th :class="rowHeaderClass" class="w-32">
            Longitudinal data
            <span class="block text-[10px] font-normal text-slate-400">
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
              class="block mt-1 text-[10px] font-bold text-slate-800"
            >
              {{ directChip }}
            </span>
          </td>
        </tr>

        <tr>
          <th
            rowspan="2"
            class="px-3 py-2.5 align-top border-t border-slate-100 text-[11px] font-bold text-slate-700"
          >
            Indirect evidence of progression
          </th>
          <th :class="rowHeaderClass">
            % bone loss ÷ age
            <span v-if="ratio === null" class="block mt-1 text-[10px] font-bold text-amber-600">
              Needs bone loss and age
            </span>
          </th>
          <td v-for="column in COLUMNS" :key="column.id" :class="ratioCellClass(column.id)">
            {{ RATIO_BANDS[column.id] }}
            <span
              v-if="ratioGrade === column.id"
              class="block mt-1 text-[10px] font-bold text-slate-800"
            >
              {{ ratioChip }}
            </span>
          </td>
        </tr>

        <tr>
          <th :class="rowHeaderClass">
            Case phenotype
            <span v-if="!phenotype" class="block mt-1 text-[10px] font-bold text-amber-600">
              Needs your input
            </span>
          </th>
          <td
            v-for="column in COLUMNS"
            :key="column.id"
            :class="cellClass(phenotypeGrade, column.id)"
            @click="choosePhenotype(column.id)"
          >
            {{ PHENOTYPE_BANDS[column.id] }}
            <span
              v-if="phenotypeGrade === column.id"
              class="block mt-1 text-[10px] font-bold text-slate-800"
            >
              {{ phenotypeChip }}
            </span>
          </td>
        </tr>

        <tr>
          <th
            rowspan="2"
            class="px-3 py-2.5 align-top bg-slate-50/60 border-t border-slate-100 text-[11px] font-bold text-slate-700"
          >
            Grade modifiers
          </th>
          <th
            rowspan="2"
            class="px-3 py-2.5 align-top border-t border-slate-100 text-[11px] font-bold text-slate-700"
          >
            Risk factors
          </th>
          <th :class="rowHeaderClass">
            Smoking
            <span v-if="!smoking" class="block mt-1 text-[10px] font-bold text-amber-600">
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
              class="block mt-1 text-[10px] font-bold text-slate-800"
            >
              {{ smokingChip }}
            </span>
          </td>
        </tr>

        <tr>
          <th :class="rowHeaderClass">
            Diabetes
            <span v-if="!diabetes" class="block mt-1 text-[10px] font-bold text-amber-600">
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
              class="block mt-1 text-[10px] font-bold text-slate-800"
            >
              {{ diabetesChip }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
