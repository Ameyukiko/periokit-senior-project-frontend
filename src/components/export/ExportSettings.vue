<script setup lang="ts">
import { computed } from 'vue'
import { User, ChevronDown, TriangleAlert, FileText, Image as ImageIcon, Sheet, Lock, ChevronsUpDown, Download, Save, X, LoaderCircle } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { usePeriodontalChartStore } from '@/stores/periodontal-chart'
import { useVisitStore } from '@/stores/visit'
import type { Visit } from '@/services/api/visit.api'
import { SECTIONS, PAPER_SIZES, type ExportState, type ExportFormat, type SectionId } from '@/domain/export/export.constants'
import { isSectionAvailable, type SectionAvailability } from '@/domain/export/export.mapping'
import type { ExportStatus } from '@/composables/useExportDownload'

const props = defineProps<{
  state: ExportState
  visit: Visit | null
  isNewVisit: boolean
  hasUnsavedChanges: boolean
  availability: SectionAvailability
  qualityHint: string
  canExport: boolean
  status: ExportStatus
}>()
const fileName = defineModel<string>('fileName', { required: true })
const emit = defineEmits<{ 'export-saved': []; 'save-and-export': []; cancel: []; 'switch-visit': [id: string] }>()

const { patientInfo } = storeToRefs(usePeriodontalChartStore())
const { visits } = storeToRefs(useVisitStore())
const formatVisitDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const visitLabel = (v: Visit, i: number) =>
  v.id === 'new'
    ? 'New visit · Draft'
    : `Visit #${v.visitNumber ?? i + 1} · ${formatVisitDate(v.visitDate)} · ${v.phase.replace(/ phase$/i, '')}`

const FORMATS: { id: ExportFormat; icon: typeof FileText; label: string; desc: string }[] = [
  { id: 'pdf', icon: FileText, label: 'PDF', desc: 'Combined report' },
  { id: 'png', icon: ImageIcon, label: 'PNG', desc: 'One image per section' },
  { id: 'excel', icon: Sheet, label: 'Excel', desc: 'Clinical data .xlsx' },
]
const QUALITY = [{ v: 96, label: 'Standard' }, { v: 150, label: 'High' }, { v: 300, label: 'Print' }] as const
const DOWNLOAD_LABEL = { pdf: 'Download PDF', png: 'Download PNG / ZIP', excel: 'Download Excel' }
const STATUS_LABEL: Partial<Record<ExportStatus, string>> = {
  queued: 'Queued…',
  preparing: 'Preparing file…',
  downloading: 'Downloading…',
}

const visibleSections = computed(() => SECTIONS.filter((s) => !s.parent || props.state.on[s.parent]))
const orientOf = (id: SectionId) => (props.state.format !== 'excel' ? props.state.orient[id] : undefined)
const reasonOf = (id: SectionId) => (isSectionAvailable(props.availability, id) ? null : props.availability[id]?.reason || 'No saved data')
const busy = computed(() => props.status in STATUS_LABEL)

function flipOrient(id: SectionId) {
  props.state.orient[id] = props.state.orient[id] === 'portrait' ? 'landscape' : 'portrait'
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
          :class="isNewVisit || hasUnsavedChanges ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'"
        >
          {{ isNewVisit ? 'Draft' : hasUnsavedChanges ? 'Unsaved changes' : 'Completed' }}
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
      <div v-if="isNewVisit || hasUnsavedChanges" class="mt-2 flex gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-700">
        <TriangleAlert class="w-4 h-4 shrink-0" />
        <span v-if="isNewVisit">This visit has not been saved yet. Use <b>Save &amp; Export</b> to save it first.</span>
        <span v-else>You have unsaved changes. The preview shows the last saved version.</span>
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
        <div class="flex items-start gap-2.5 p-2 rounded-lg cursor-default" title="Always in the report header">
          <input type="checkbox" checked disabled class="mt-0.5 w-4 h-4 accent-[#0052ff]" />
          <span class="flex-1">
            <span class="block text-[12px] font-bold text-slate-500">Patient &amp; visit details</span>
            <span class="block text-[10px] text-slate-500">Shown in the chart header, cannot be removed</span>
          </span>
          <span class="shrink-0 w-21 flex items-center justify-center gap-1 py-1 rounded-md bg-slate-100 text-[10px] font-bold text-slate-400">
            <Lock class="w-3 h-3" />Always on
          </span>
        </div>
        <label
          v-for="s in visibleSections"
          :key="s.id"
          class="flex items-start gap-2.5 p-2 rounded-lg"
          :class="[s.parent ? 'ml-6 -mt-1' : '', reasonOf(s.id) ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-50']"
          :title="reasonOf(s.id) ?? undefined"
        >
          <input
            :checked="state.on[s.id] && !reasonOf(s.id)"
            type="checkbox"
            :disabled="!!reasonOf(s.id)"
            class="mt-0.5 w-4 h-4 accent-[#0052ff]"
            @change="state.on[s.id] = ($event.target as HTMLInputElement).checked"
          />
          <span class="flex-1">
            <span class="block text-[12px] font-bold">{{ s.label }}</span>
            <span class="block text-[10px]" :class="reasonOf(s.id) ? 'text-amber-600' : 'text-slate-500'">{{ reasonOf(s.id) ?? s.desc }}</span>
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

    <section v-if="state.format !== 'excel'" :class="CARD" class="flex flex-col gap-3">
      <p :class="LABEL">Options</p>
      <div v-if="state.format === 'png'" class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <span class="text-[12px] font-medium">Image quality</span>
          <div class="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
            <button
              v-for="q in QUALITY"
              :key="q.v"
              class="px-2.5 py-1 rounded-md text-[11px] font-bold"
              :class="state.pngDpi === q.v ? 'bg-white text-[#0052ff] shadow-sm' : 'text-slate-500'"
              @click="state.pngDpi = q.v"
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
            <option v-for="p in PAPER_SIZES" :key="p.id" :value="p.id">{{ p.label }}</option>
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
      <div v-if="busy" class="mt-3 flex items-center gap-2">
        <span class="flex-1 flex items-center gap-1.5 text-[12px] font-bold text-[#0052ff]">
          <LoaderCircle class="w-4 h-4 animate-spin" />{{ STATUS_LABEL[status] }}
        </span>
        <button class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-[12px] font-bold text-slate-600 hover:bg-slate-50" @click="emit('cancel')">
          <X class="w-3.5 h-3.5" />Cancel
        </button>
      </div>
      <template v-else>
        <button
          v-if="isNewVisit || hasUnsavedChanges"
          class="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0052ff] text-white rounded-lg font-bold text-[12px] shadow-md hover:bg-blue-700"
          @click="emit('save-and-export')"
        >
          <Save class="w-4 h-4" />Save &amp; Export
        </button>
        <button
          v-if="!isNewVisit"
          :disabled="!canExport"
          class="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-bold text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
          :class="hasUnsavedChanges ? 'border border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-[#0052ff] text-white shadow-md hover:bg-blue-700'"
          @click="emit('export-saved')"
        >
          <Download class="w-4 h-4" />{{ hasUnsavedChanges ? 'Export saved version' : DOWNLOAD_LABEL[state.format] }}
        </button>
      </template>
    </section>
  </aside>
</template>
