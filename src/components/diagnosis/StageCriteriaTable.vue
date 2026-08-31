<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import {
  stagesForBoneLoss,
  stagesForCal,
  stagesForToothLoss,
} from '@/domain/diagnosis/diagnosis.rules'
import type { StageId, StageRow } from '@/domain/diagnosis/diagnosis.types'

const props = defineProps<{
  selected: StageId | null
  marks: Record<StageRow, StageId | null>
  cal: number | null
  calSite: string | null
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

const calChip = computed(() =>
  props.cal === null ? '' : `Patient: ${props.cal} mm${props.calSite ? ` (${props.calSite})` : ''}`,
)
const boneChip = computed(() =>
  props.boneLossPercent === null ? '' : `Patient: ${props.boneLossPercent}% bone loss`,
)
const lossChip = computed(() => {
  if (props.teethLost === null) return ''
  if (props.teethLost === 0) return 'Patient: no tooth loss'
  return `Patient: ${props.teethLost} ${props.teethLost === 1 ? 'tooth' : 'teeth'}`
})

// One cell at a time, row by row — the way the printed table is ticked. The
// column as a whole is never highlighted: the stage is a separate decision,
// taken in the header or in the dropdown below the table.
const cellClass = (row: StageRow, stage: StageId) => [
  'px-3 py-2.5 align-top border-t border-slate-100 cursor-pointer transition-colors',
  props.marks[row] === stage
    ? 'bg-amber-50 text-slate-800 ring-1 ring-inset ring-amber-300'
    : 'text-slate-600 hover:bg-slate-50',
]
</script>

<template>
  <div class="overflow-x-auto rounded-2xl border border-slate-200">
    <table class="w-full min-w-[900px] border-collapse text-left text-[11px]">
      <thead>
        <tr class="bg-[#0052ff] text-white">
          <th colspan="2" class="px-3 py-2.5 align-top w-56">
            <span class="block text-[12px] font-bold">Periodontitis Stage</span>
            <span class="block text-[10px] font-normal text-white/70">AAP / EFP 2017</span>
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
              :title="`Set the diagnosis to Stage ${column.id}`"
              @click="emit('select', column.id)"
            >
              <span class="flex items-center gap-1.5">
                <span class="text-[12px]">{{ column.title }}</span>
                <span
                  v-if="selected === column.id"
                  class="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-900 text-white text-[9px] font-bold"
                >
                  <Check class="w-2.5 h-2.5" /> Selected
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
            Severity
          </th>
          <th
            class="px-3 py-2.5 align-top w-32 border-t border-slate-100 text-[11px] font-bold text-slate-700"
          >
            Interdental CAL
            <span class="block text-[10px] font-normal text-slate-400">at site of greatest loss</span>
            <span v-if="cal === null" class="block mt-1 text-[10px] font-bold text-amber-600">
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
              class="block mt-1 text-[10px] font-bold text-slate-800"
            >
              {{ calChip }}
            </span>
          </td>
        </tr>

        <tr>
          <th
            class="px-3 py-2.5 align-top border-t border-slate-100 text-[11px] font-bold text-slate-700"
          >
            Radiographic bone loss
            <span v-if="boneLossPercent === null" class="block mt-1 text-[10px] font-bold text-amber-600">
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
              class="block mt-1 text-[10px] font-bold text-slate-800"
            >
              {{ boneChip }}
            </span>
          </td>
        </tr>

        <tr>
          <th
            class="px-3 py-2.5 align-top border-t border-slate-100 text-[11px] font-bold text-slate-700"
          >
            Tooth loss due to periodontitis
            <span v-if="teethLost === null" class="block mt-1 text-[10px] font-bold text-amber-600">
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
              class="block mt-1 text-[10px] font-bold text-slate-800"
            >
              {{ lossChip }}
            </span>
          </td>
        </tr>

        <tr>
          <th
            class="px-3 py-2.5 align-top bg-slate-50/60 border-t border-slate-100 text-[11px] font-bold text-slate-700"
          >
            Complexity
          </th>
          <th
            class="px-3 py-2.5 align-top border-t border-slate-100 text-[11px] font-bold text-slate-700"
          >
            Local
            <span class="block text-[10px] font-normal text-slate-400">can raise the stage only</span>
          </th>
          <td
            v-for="column in COLUMNS"
            :key="column.id"
            :class="cellClass('complexity', column.id)"
            @click="emit('mark', 'complexity', column.id)"
          >
            <span v-if="COMPLEXITY_BANDS[column.id].lead" class="block mb-1">
              {{ COMPLEXITY_BANDS[column.id].lead }}
            </span>
            <span v-for="item in COMPLEXITY_BANDS[column.id].items" :key="item" class="block">
              · {{ item }}
            </span>
            <span
              v-if="complexity[column.id].length"
              class="block mt-1 text-[10px] font-bold text-slate-800"
            >
              Patient: {{ complexity[column.id].join(' · ') }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
