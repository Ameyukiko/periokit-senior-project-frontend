<script setup lang="ts">
import { Image as ImageIcon, Download } from 'lucide-vue-next'
import type { ReportPageSpec } from '@/composables/useExportReport'
import { PAPER_MM, mmToPx } from '@/domain/export/export.constants'
import FitToBox from './FitToBox.vue'
import ReportSection from './ReportSection.vue'


const props = defineProps<{ pages: ReportPageSpec[]; paper: string; dpi: number; gray: boolean; filePrefix: string }>()

const sheet = (p: ReportPageSpec) => {
  const [mw, mh] = PAPER_MM[props.paper]!
  return { w: mmToPx(p.landscape ? mh : mw, props.dpi), h: mmToPx(p.landscape ? mw : mh, props.dpi) }
}
</script>

<template>
  <div class="grid grid-cols-2 gap-5 w-full max-w-275 items-start">
    <div v-for="p in pages" :key="p.section" class="bg-white rounded-xl shadow-lg overflow-hidden">
      <div class="px-3 py-2 border-b border-slate-200 flex items-center gap-2 text-[11px] font-bold">
        <ImageIcon class="w-4 h-4 text-[#0052ff]" />
        <span class="truncate">{{ filePrefix }}_{{ p.name }}.png</span>
        <span class="ml-auto shrink-0 text-[10px] font-medium text-slate-500">
          {{ paper }} {{ p.landscape ? 'landscape' : 'portrait' }} · {{ sheet(p).w }} × {{ sheet(p).h }} px
        </span>
        <button class="p-1 rounded hover:bg-slate-100" title="Download this image"><Download class="w-3.5 h-3.5" /></button>
      </div>
      <div class="p-3 bg-slate-100 flex justify-center">
        <div
          class="bg-white shadow border border-slate-200 p-[4%] flex"
          :class="{ grayscale: gray }"
          :style="{ aspectRatio: `${sheet(p).w} / ${sheet(p).h}`, width: p.landscape ? '100%' : '72%' }"
        >
          <FitToBox grow class="flex-1 min-h-0">
            <ReportSection :page="p" />
          </FitToBox>
        </div>
      </div>
    </div>
  </div>
</template>
