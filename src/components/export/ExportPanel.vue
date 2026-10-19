<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { Eye, Minus, Plus, LoaderCircle, TriangleAlert } from 'lucide-vue-next'
import { useExportReport } from '@/composables/useExportReport'
import { useXrayBoardStore, xrayBoardKey } from '@/stores/xray-board'
import { mmToPx } from '@/domain/export/export.constants'
import ExportSettings from './ExportSettings.vue'

const props = defineProps<{
  patientId: string | null
  visitId: string | null
  save: () => Promise<boolean>
}>()
const emit = defineEmits<{ 'switch-visit': [id: string] }>()

const {
  state, visit, isNewVisit, hasUnsavedChanges, fileName, availability, qualityHint,
  preview, previewLoading, previewError, exportStatus, cancelExport, exportSaved, saveAndExport,
} = useExportReport(toRef(props, 'visitId'))

// The board must be loaded so its unsaved changes count towards "Save & Export".
const board = useXrayBoardStore()
watch(
  () => xrayBoardKey(props.patientId, props.visitId),
  (key) => board.loadBoard(key, props.visitId),
  { immediate: true },
)

const pages = computed(() => preview.value?.pages ?? [])
const scroller = ref<HTMLElement | null>(null)
const zoom = ref<number | null>(null)
const fitZoom = computed(() => {
  const avail = (scroller.value?.clientWidth ?? 900) - 48
  const widest = Math.max(...pages.value.map((p) => mmToPx(p.widthMm)), 1)
  return Math.max(0.1, Math.min(1, Math.floor((avail / widest) * 20) / 20))
})
const effectiveZoom = computed(() => zoom.value ?? fitZoom.value)
watch(() => [state.paper, { ...state.orient }], () => (zoom.value = null))

const countLabel = computed(() => {
  const n = preview.value?.pageCount ?? 0
  const unit = state.format === 'excel' ? 'sheet section' : state.format === 'png' ? 'image' : 'page'
  return `${n} ${unit}${n === 1 ? '' : 's'}`
})
</script>

<template>
  <main class="max-w-400 mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-4 items-start">
    <ExportSettings
      v-model:file-name="fileName"
      :state="state"
      :visit="visit"
      :is-new-visit="isNewVisit"
      :has-unsaved-changes="hasUnsavedChanges"
      :availability="availability"
      :quality-hint="qualityHint"
      :can-export="!!preview && !previewLoading"
      :status="exportStatus"
      @export-saved="exportSaved"
      @save-and-export="saveAndExport(save)"
      @cancel="cancelExport"
      @switch-visit="emit('switch-visit', $event)"
    />

    <section class="min-w-0 bg-slate-200/70 rounded-3xl border border-slate-200 min-h-[calc(100vh-130px)] flex flex-col">
      <div class="flex items-center justify-between px-4 py-2.5 border-b border-slate-300/60">
        <p class="text-[12px] font-bold text-slate-600 flex items-center gap-1.5">
          <Eye class="w-4 h-4" />Preview · {{ countLabel }}
          <LoaderCircle v-if="previewLoading" class="w-3.5 h-3.5 animate-spin text-slate-400" />
        </p>
        <div class="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5">
          <button class="p-1 rounded hover:bg-slate-100" title="Zoom out" @click="zoom = Math.max(0.3, effectiveZoom - 0.1)"><Minus class="w-3.5 h-3.5" /></button>
          <span class="text-[11px] font-bold w-10 text-center">{{ Math.round(effectiveZoom * 100) }}%</span>
          <button class="p-1 rounded hover:bg-slate-100" title="Zoom in" @click="zoom = Math.min(1.5, effectiveZoom + 0.1)"><Plus class="w-3.5 h-3.5" /></button>
          <button class="px-2 py-1 rounded hover:bg-slate-100 text-[11px] font-bold" @click="zoom = null">Fit</button>
        </div>
      </div>
      <div ref="scroller" class="flex-1 overflow-auto p-6">
        <p v-if="isNewVisit" class="text-center text-[12px] text-slate-500 py-20">
          Save this visit to preview the report.
        </p>
        <div v-else-if="previewError" class="flex flex-col items-center gap-2 py-20 text-[12px] text-red-600">
          <TriangleAlert class="w-5 h-5" />{{ previewError }}
        </div>
        <p v-else-if="!pages.length && !previewLoading" class="text-center text-[12px] text-slate-500 py-20">
          Nothing to export. Tick a section under Include.
        </p>
        <div v-else class="flex flex-col items-center gap-6" :class="{ 'opacity-60': previewLoading }" :style="{ zoom: effectiveZoom }">
          <div v-for="w in preview?.warnings ?? []" :key="w.code + w.section" class="text-[12px] text-amber-700">{{ w.message }}</div>
          <iframe
            v-for="page in pages"
            :key="page.id"
            :title="page.title"
            :srcdoc="page.html"
            sandbox=""
            class="bg-white shadow-md border-0"
            :style="{ width: `${page.widthMm}mm`, height: `${page.heightMm}mm` }"
          />
        </div>
      </div>
    </section>
  </main>
</template>
