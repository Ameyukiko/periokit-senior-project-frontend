<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Eye, Minus, Plus } from 'lucide-vue-next'
import { useExportReport } from '@/composables/useExportReport'
import { useNotificationStore } from '@/stores/notification'
import { useXrayBoardStore, xrayBoardKey } from '@/stores/xray-board'
import { pagePx } from '@/domain/export/export.constants'
import ExportSettings from './ExportSettings.vue'
import ExportPdfPreview from './ExportPdfPreview.vue'
import ExportPngPreview from './ExportPngPreview.vue'
import ExportXlsxPreview from './ExportXlsxPreview.vue'

const props = defineProps<{ patientId: string | null; visitId: string | null }>()
const emit = defineEmits<{ 'switch-visit': [id: string] }>()

const { state, visit, isDraft, visitDate, fileName: defaultName, pages, qualityHint } = useExportReport()


const board = useXrayBoardStore()
watch(
  () => xrayBoardKey(props.patientId, props.visitId),
  (key) => board.loadBoard(key, props.visitId),
  { immediate: true },
)
const filePrefix = computed(() => defaultName.value.replace(/_perio-.*$/, ''))


const fileName = ref(defaultName.value)
watch(defaultName, (n) => (fileName.value = n))

const scroller = ref<HTMLElement | null>(null)
const zoom = ref<number | null>(null)

const fitZoom = computed(() => {
  const avail = (scroller.value?.clientWidth ?? 900) - 48
  const widest = Math.max(...pages.value.map((p) => pagePx(state.paper, p.landscape ? 'landscape' : 'portrait')[0]), 1)
  return Math.max(0.1, Math.min(1, Math.floor((avail / widest) * 20) / 20))
})
const effectiveZoom = computed(() => zoom.value ?? fitZoom.value)
watch(() => [state.paper, { ...state.orient }], () => (zoom.value = null))

const countLabel = computed(() => {
  const n = pages.value.length
  if (state.format === 'xlsx') return '3 sheets'
  if (state.format === 'png') return `${n} image${n === 1 ? '' : 's'} · ${state.paper}`
  return `${n} page${n === 1 ? '' : 's'} · ${state.paper}`
})


const notify = useNotificationStore()
function download() {
  const name = fileName.value
  notify.info(`Preparing ${name}…`, undefined, 1200)
  setTimeout(() => notify.success(`${name} downloaded!`), 1200)
}
</script>

<template>
  <main class="max-w-400 mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-4 items-start">
    <ExportSettings
      v-model:file-name="fileName"
      :state="state"
      :visit="visit"
      :is-draft="isDraft"
      :quality-hint="qualityHint"
      @download="download"
      @switch-visit="emit('switch-visit', $event)"
    />

    <section class="min-w-0 bg-slate-200/70 rounded-3xl border border-slate-200 min-h-[calc(100vh-130px)] flex flex-col">
      <div class="flex items-center justify-between px-4 py-2.5 border-b border-slate-300/60">
        <p class="text-[12px] font-bold text-slate-600 flex items-center gap-1.5"><Eye class="w-4 h-4" />Preview · {{ countLabel }}</p>
        <div v-if="state.format === 'pdf'" class="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5">
          <button class="p-1 rounded hover:bg-slate-100" @click="zoom = Math.max(0.3, effectiveZoom - 0.1)"><Minus class="w-3.5 h-3.5" /></button>
          <span class="text-[11px] font-bold w-10 text-center">{{ Math.round(effectiveZoom * 100) }}%</span>
          <button class="p-1 rounded hover:bg-slate-100" @click="zoom = Math.min(1.5, effectiveZoom + 0.1)"><Plus class="w-3.5 h-3.5" /></button>
          <button class="px-2 py-1 rounded hover:bg-slate-100 text-[11px] font-bold" @click="zoom = null">Fit</button>
        </div>
      </div>
      <div ref="scroller" class="flex-1 overflow-auto p-6">
        <p v-if="!pages.length && state.format !== 'xlsx'" class="text-center text-[12px] text-slate-500 py-20">
          Nothing to export. Tick a section under Include.
        </p>
        <div v-else-if="state.format === 'pdf'" :style="{ zoom: effectiveZoom }">
          <ExportPdfPreview :pages="pages" :paper="state.paper" :gray="state.gray" :draft="isDraft" />
        </div>
        <div v-else-if="state.format === 'png'" class="flex justify-center">
          <ExportPngPreview :pages="pages" :paper="state.paper" :dpi="state.pngScale" :gray="state.gray" :file-prefix="filePrefix" />
        </div>
        <ExportXlsxPreview
          v-else
          :file-name="fileName"
          :phase="visit?.phase ?? ''"
          :visit-number="visit?.visitNumber"
          :visit-date="visitDate"
        />
      </div>
    </section>
  </main>
</template>
