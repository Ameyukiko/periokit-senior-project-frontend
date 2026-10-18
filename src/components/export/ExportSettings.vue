<script setup lang="ts">
import { computed } from 'vue'
import { User, ChevronDown, TriangleAlert, FileText, Image as ImageIcon, Sheet, Lock, ChevronsUpDown, Download } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { usePeriodontalChartStore } from '@/stores/periodontal-chart'
import { useVisitStore } from '@/stores/visit'
import type { Visit } from '@/services/api/visit.api'
import { SECTIONS, PAPER_GROUPS, type ExportState, type ExportFormat, type PageSection } from '@/domain/export/export.constants'

const props = defineProps<{ state: ExportState; visit: Visit | null; isDraft: boolean; qualityHint: string }>()
const fileName = defineModel<string>('fileName', { required: true })
const emit = defineEmits<{ download: []; 'switch-visit': [id: string] }>()

const { patientInfo } = storeToRefs(usePeriodontalChartStore())
const { visits } = storeToRefs(useVisitStore())
const visitLabel = (v: Visit, i: number) =>
  v.id === 'new' ? 'New visit · Draft' : `Visit #${v.visitNumber ?? i + 1} · ${v.visitDate.slice(0, 10)} · ${v.phase}`

const FORMATS: { id: ExportFormat; icon: typeof FileText; label: string; desc: string }[] = [
  { id: 'pdf', icon: FileText, label: 'PDF', desc: 'Combined report' },
  { id: 'png', icon: ImageIcon, label: 'PNG', desc: 'One image per section' },
  { id: 'xlsx', icon: Sheet, label: 'Excel', desc: 'Clinical data .xlsx' },
]
const QUALITY = [{ v: 96, label: 'Standard' }, { v: 150, label: 'High' }, { v: 300, label: 'Print' }] as const
const DOWNLOAD_LABEL = { pdf: 'Download PDF', png: 'Download PNGs (.zip)', xlsx: 'Download Excel' }

const visibleSections = computed(() => SECTIONS.filter((s) => !s.parent || props.state.on[s.parent]))
const orientOf = (id: string) => (props.state.format !== 'xlsx' ? props.state.orient[id as PageSection] : undefined)

function flipOrient(id: string) {
  const k = id as PageSection
  props.state.orient[k] = props.state.orient[k] === 'portrait' ? 'landscape' : 'portrait'
}
const CARD = 'bg-white rounded-2xl border border-slate-200 shadow-sm p-4'
const LABEL = 'text-[11px] font-bold text-slate-400 uppercase tracking-wide'
</script>

<template>
  <aside class="flex flex-col gap-3 lg:sticky lg:top-29.5 lg:max-h-[calc(100vh-130px)] lg:overflow-y-auto pb-2">
    <section :class="CARD">
      <div class="flex items-center justify-between mb-2">
        <p :class="LABEL">Visit</p>
        <span
          class="px-2 py-0.5 rounded-full text-[10px] font-bold"
          :class="isDraft ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'"
        >
          {{ isDraft ? 'Draft' : 'Completed' }}
        </span>
      </div>
      <div class="flex items-center gap-3 mb-3">
        <div class="w-10 h-10 rounded-full bg-blue-50 text-[#0052ff] flex items-center justify-center"><User class="w-5 h-5" /></div>
        <div>
          <p class="text-[13px] font-bold">{{ patientInfo.patientName || 'Unnamed patient' }}</p>
          <p class="text-[11px] text-slate-500">
            HN-{{ patientInfo.hn || '—' }} · {{ patientInfo.age ?? '—' }} y{{ patientInfo.gender ? ` · ${patientInfo.gender}` : '' }}
          </p>
        </div>
      </div>
      <div class="relative">
        <select
          :value="visit?.id ?? ''"
          @change="emit('switch-visit', ($event.target as HTMLSelectElement).value)"
          class="w-full appearance-none bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-9 py-1.5 text-[12px] font-medium outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option v-for="(v, i) in visits" :key="v.id" :value="v.id">{{ visitLabel(v, i) }}</option>
        </select>
        <ChevronDown class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
      </div>
      <div v-if="isDraft" class="mt-2 flex gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-700">
        <TriangleAlert class="w-4 h-4 shrink-0" />
        <span>This visit is still a draft. The report is stamped <b>DRAFT</b>.</span>
      </div>
    </section>

    <section :class="CARD">
      <p :class="LABEL" class="mb-2">Format</p>
      <div class="flex flex-col gap-2">
        <button
          v-for="f in FORMATS"
          :key="f.id"
          class="flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-colors"
          :class="state.format === f.id ? 'border-[#0052ff] bg-blue-50 text-[#0052ff]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'"
          @click="state.format = f.id"
        >
          <component :is="f.icon" class="w-5 h-5" />
          <span><span class="block text-[12px] font-bold">{{ f.label }}</span><span class="block text-[10px] text-slate-500">{{ f.desc }}</span></span>
        </button>
      </div>
    </section>

    <section :class="CARD">
      <p :class="LABEL" class="mb-2">Include</p>
      <div class="flex flex-col gap-1">
        <label
          v-for="s in visibleSections"
          :key="s.id"
          class="flex items-start gap-2.5 p-2 rounded-lg"
          :class="[s.parent ? 'ml-6 -mt-1' : '', s.locked ? 'cursor-default' : 'hover:bg-slate-50']"
          :title="s.locked ? 'Always in the report: the patient details sit in the chart header' : undefined"
        >
          <input v-model="state.on[s.id]" type="checkbox" :disabled="s.locked" class="mt-0.5 w-4 h-4 accent-[#0052ff]" />
          <span class="flex-1">
            <span class="block text-[12px] font-bold" :class="{ 'text-slate-500': s.locked }">{{ s.label }}</span>
            <span class="block text-[10px] text-slate-500">{{ s.desc }}</span>
          </span>
          <span v-if="s.locked" class="shrink-0 w-21 flex items-center justify-center gap-1 py-1 rounded-md bg-slate-100 text-[10px] font-bold text-slate-400">
            <Lock class="w-3 h-3" />Always on
          </span>
          <button
            v-if="orientOf(s.id)"
            type="button"
            :title="`Switch to ${orientOf(s.id) === 'portrait' ? 'landscape' : 'portrait'}`"
            class="shrink-0 w-21 flex items-center justify-between gap-1 pl-2 pr-1.5 py-1 rounded-md border text-[10px] font-bold transition-colors"
            :class="state.on[s.id] ? 'border-blue-200 bg-blue-50 text-[#0052ff] hover:bg-blue-100 hover:border-[#0052ff]' : 'border-slate-200 bg-slate-50 text-slate-300'"
            @click.prevent="flipOrient(s.id)"
          >
            {{ orientOf(s.id) === 'portrait' ? 'Portrait' : 'Landscape' }}<ChevronsUpDown class="w-3 h-3 opacity-60" />
          </button>
        </label>
      </div>
    </section>

    <section v-if="state.format !== 'xlsx'" :class="CARD" class="flex flex-col gap-3">
      <p :class="LABEL">Options</p>
      <div v-if="state.format === 'png'" class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <span class="text-[12px] font-medium">Image quality</span>
          <div class="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
            <button
              v-for="q in QUALITY"
              :key="q.v"
              class="px-2.5 py-1 rounded-md text-[11px] font-bold"
              :class="state.pngScale === q.v ? 'bg-white text-[#0052ff] shadow-sm' : 'text-slate-500'"
              @click="state.pngScale = q.v"
            >
              {{ q.label }}
            </button>
          </div>
        </div>
        <p class="text-[10px] text-slate-500 text-right">{{ qualityHint }}</p>
      </div>
      <label class="flex items-center justify-between">
        <span class="text-[12px] font-medium">Paper size</span>
        <span class="relative">
          <select
            v-model="state.paper"
            class="appearance-none bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-9 py-1 text-[12px] font-medium outline-none focus:ring-2 focus:ring-blue-100"
          >
            <optgroup v-for="g in PAPER_GROUPS" :key="g.label" :label="g.label">
              <option v-for="p in g.sizes" :key="p.id" :value="p.id">{{ p.label }}</option>
            </optgroup>
          </select>
          <ChevronDown class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        </span>
      </label>
      <label class="flex items-center justify-between">
        <span class="text-[12px] font-medium">Grayscale (B&amp;W printer)</span>
        <input v-model="state.gray" type="checkbox" class="w-4 h-4 accent-[#0052ff]" />
      </label>
    </section>

    <section :class="CARD">
      <p :class="LABEL" class="mb-2">File name</p>
      <input
        v-model="fileName"
        class="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-[12px] font-mono outline-none focus:ring-2 focus:ring-blue-100"
      />
      <button
        class="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0052ff] text-white rounded-lg font-bold text-[12px] shadow-md hover:bg-blue-700"
        @click="emit('download')"
      >
        <Download class="w-4 h-4" />{{ DOWNLOAD_LABEL[state.format] }}
      </button>
    </section>
  </aside>
</template>
