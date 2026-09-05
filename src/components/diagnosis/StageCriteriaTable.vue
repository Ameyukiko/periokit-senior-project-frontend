<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import {
  stagesForBoneLoss,
  stagesForCal,
  stagesForToothLoss,
} from '@/domain/diagnosis/diagnosis.rules'
import type { StageId, StageRow } from '@/domain/diagnosis/diagnosis.types'
import {
  CELL_ANSWERED,
  CELL_BASE,
  CELL_IDLE,
  CELL_IN_COLUMN,
  CELL_OPEN,
  CELL_TICKED,
} from './criteria-cell'

const props = defineProps<{
  selected: StageId | null
  marks: Record<StageRow, StageId | null>
  /** The band each row settled on — the doctor's tick, or the one the numbers fall in. */
  resolved: Record<StageRow, StageId | null>
  cal: number | null
  boneLossPercent: number | null
  teethLost: number | null
  complexity: Record<StageId, string[]>
}>()

const emit = defineEmits<{
  select: [stage: StageId]
  mark: [row: StageRow, stage: StageId]
}>()

const COLUMNS: { id: StageId; title: string; subtitle: string }[] = [
  { id: 'I', title: 'Stage I', subtitle: 'Initial periodontitis' },
  { id: 'II', title: 'Stage II', subtitle: 'Moderate periodontitis' },
  {
    id: 'III',
    title: 'Stage III',
    subtitle: 'Severe periodontitis with potential for additional tooth loss',
  },
  {
    id: 'IV',
    title: 'Stage IV',
    subtitle: 'Severe periodontitis with potential for loss of the dentition',
  },
]

const CAL_BANDS: Record<StageId, string> = {
  I: '1 – 2 mm',
  II: '3 – 4 mm',
  III: '≥ 5 mm',
  IV: '≥ 5 mm',
}

const BONE_BANDS: Record<StageId, string> = {
  I: 'Coronal third (< 15%)',
  II: 'Coronal third (15 – 33%)',
  III: 'Extending to middle third of root and beyond',
  IV: 'Extending to middle third of root and beyond',
}

const LOSS_BANDS: Record<StageId, string> = {
  I: 'No tooth loss',
  II: 'No tooth loss',
  III: '≤ 4 teeth',
  IV: '≥ 5 teeth',
}

const COMPLEXITY_BANDS: Record<StageId, { lead?: string; items: string[] }> = {
  I: { items: ['Max probing depth ≤ 4 mm', 'Mostly horizontal bone loss'] },
  II: { items: ['Max probing depth ≤ 5 mm', 'Mostly horizontal bone loss'] },
  III: {
    lead: 'In addition to Stage II complexity:',
    items: [
      'Probing depth ≥ 6 mm',
      'Vertical bone loss ≥ 3 mm',
      'Furcation involvement Class II or III',
      'Moderate ridge defect',
    ],
  },
  IV: {
    lead: 'In addition to Stage III complexity, need for complex rehabilitation due to:',
    items: [
      'Masticatory dysfunction',
      'Secondary occlusal trauma (mobility ≥ 2)',
      'Severe ridge defect',
      'Bite collapse, drifting, flaring',
      'Fewer than 20 remaining teeth (10 opposing pairs)',
    ],
  },
}

const calStages = computed(() => stagesForCal(props.cal))
const boneStages = computed(() => stagesForBoneLoss(props.boneLossPercent))
const lossStages = computed(() => stagesForToothLoss(props.teethLost))

const calChip = computed(() => (props.cal === null ? '' : `Patient: ${props.cal} mm`))
const boneChip = computed(() =>
  props.boneLossPercent === null ? '' : `Patient: ${props.boneLossPercent}% bone loss`,
)
const lossChip = computed(() => {
  if (props.teethLost === null) return ''
  if (props.teethLost === 0) return 'Patient: no tooth loss'
  return `Patient: ${props.teethLost} ${props.teethLost === 1 ? 'tooth' : 'teeth'}`
})

// One cell at a time, row by row — the way the printed table is ticked. The band
// a row settled on reads as a pressed button whichever way it got there, and a
// cell holding no answer is drawn dashed to say it is open to be ticked. The
// column as a whole is never highlighted: the stage is a separate decision,
// taken in the header or in the dropdown below the table.
const cellClass = (row: StageRow, stage: StageId) => [
  CELL_BASE,
  'cursor-pointer',
  props.marks[row] !== stage && props.resolved[row] !== stage && CELL_OPEN,
  props.marks[row] === stage
    ? CELL_TICKED
    : props.resolved[row] === stage
      ? CELL_ANSWERED
      : props.selected === stage
        ? `${CELL_IN_COLUMN} hover:bg-[#FECE44]/45`
        : CELL_IDLE,
]
</script>

<template>
  <div class="overflow-x-auto rounded-2xl border border-slate-400 bg-blue-50/40">
    <table class="w-full min-w-[900px] border-collapse text-left text-[11px] text-black">
      <thead>
        <tr class="bg-blue-100 text-black border-b border-slate-400">
          <th colspan="2" class="p-3 align-top w-56 border border-slate-300 bg-gradient-to-b from-blue-50 to-blue-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <span class="block text-[12px] font-bold text-black">Periodontitis Stage</span>
            <span class="block text-[10px] font-normal text-slate-700">AAP / EFP 2017</span>
            <span class="block mt-1.5 text-[10px] font-normal text-slate-600 leading-tight">
              Shaded cells are where your numbers fall. Dashed cells are open — click one to tick
              that band yourself.
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
              :title="`Set the diagnosis to Stage ${column.id}`"
              @click="emit('select', column.id)"
            >
              <div class="flex items-center justify-between gap-1.5 w-full">
                <span class="text-[12px] font-bold text-slate-900">
                  {{ column.title }}
                </span>
                <span
                  v-if="selected === column.id"
                  class="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-red-600 text-white border border-red-500 text-[9px] font-bold shadow-sm"
                >
                  <Check class="w-2.5 h-2.5" /> Selected
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
            Severity
          </th>
          <th
            class="px-3 py-2.5 align-top w-32 bg-blue-50/50 border border-slate-300 text-[11px] font-bold text-black"
          >
            Interdental CAL
            <span class="block text-[10px] font-normal text-slate-700">at site of greatest loss</span>
            <span v-if="cal === null && !marks.cal" class="block mt-1 text-[10px] font-bold text-amber-700">
              Needs your input
            </span>
          </th>
          <td
            v-for="column in COLUMNS"
            :key="column.id"
            :class="cellClass('cal', column.id)"
            @click="emit('mark', 'cal', column.id)"
          >
            {{ CAL_BANDS[column.id] }}
            <span
              v-if="calStages.includes(column.id)"
              class="block mt-1 text-[10px] font-bold text-slate-900"
            >
              {{ calChip }}
            </span>
          </td>
        </tr>

        <tr>
          <th
            class="px-3 py-2.5 align-top bg-blue-50/50 border border-slate-300 text-[11px] font-bold text-black"
          >
            Radiographic bone loss
            <span v-if="boneLossPercent === null && !marks.boneLoss" class="block mt-1 text-[10px] font-bold text-amber-700">
              Needs your input
            </span>
          </th>
          <td
            v-for="column in COLUMNS"
            :key="column.id"
            :class="cellClass('boneLoss', column.id)"
            @click="emit('mark', 'boneLoss', column.id)"
          >
            {{ BONE_BANDS[column.id] }}
            <span
              v-if="boneStages.includes(column.id)"
              class="block mt-1 text-[10px] font-bold text-slate-900"
            >
              {{ boneChip }}
            </span>
          </td>
        </tr>

        <tr>
          <th
            class="px-3 py-2.5 align-top bg-blue-50/50 border border-slate-300 text-[11px] font-bold text-black"
          >
            Tooth loss due to periodontitis
            <span v-if="teethLost === null && !marks.toothLoss" class="block mt-1 text-[10px] font-bold text-amber-700">
              Needs your input
            </span>
          </th>
          <td
            v-for="column in COLUMNS"
            :key="column.id"
            :class="cellClass('toothLoss', column.id)"
            @click="emit('mark', 'toothLoss', column.id)"
          >
            {{ LOSS_BANDS[column.id] }}
            <span
              v-if="lossStages.includes(column.id)"
              class="block mt-1 text-[10px] font-bold text-slate-900"
            >
              {{ lossChip }}
            </span>
          </td>
        </tr>

        <tr>
          <th
            class="px-3 py-2.5 align-top bg-blue-100/60 border border-slate-300 text-[11px] font-bold text-black"
          >
            Complexity
          </th>
          <th
            class="px-3 py-2.5 align-top bg-blue-50/50 border border-slate-300 text-[11px] font-bold text-black"
          >
            Local
            <span class="block text-[10px] font-normal text-slate-700">can raise the stage only</span>
            <!-- Four of the ten features listed across this row are in the
                 chart; the rest are read off the patient and the radiograph, so
                 the band suggested here is a floor, not a verdict. -->
            <span class="block mt-1 text-[10px] font-normal text-slate-500 leading-tight">
              Suggested from probing depth, furcation, mobility and teeth remaining. Check the rest
              yourself and tick a band if one fits.
            </span>
          </th>
          <td
            v-for="column in COLUMNS"
            :key="column.id"
            :class="cellClass('complexity', column.id)"
            @click="emit('mark', 'complexity', column.id)"
          >
            <span v-if="COMPLEXITY_BANDS[column.id].lead" class="block mb-1 font-medium">
              {{ COMPLEXITY_BANDS[column.id].lead }}
            </span>
            <span v-for="item in COMPLEXITY_BANDS[column.id].items" :key="item" class="block">
              · {{ item }}
            </span>
            <span
              v-if="complexity[column.id].length"
              class="block mt-1 text-[10px] font-bold text-slate-900"
            >
              Patient: {{ complexity[column.id].join(' · ') }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
