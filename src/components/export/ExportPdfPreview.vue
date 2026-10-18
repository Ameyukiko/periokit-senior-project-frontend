<script setup lang="ts">
import type { ReportPageSpec } from '@/composables/useExportReport'
import { pagePx } from '@/domain/export/export.constants'
import FitToBox from './FitToBox.vue'
import ReportSection from './ReportSection.vue'

defineProps<{ pages: ReportPageSpec[]; paper: string; gray: boolean; draft: boolean }>()

const size = (paper: string, p: ReportPageSpec) => {
  const [w, h] = pagePx(paper, p.landscape ? 'landscape' : 'portrait')
  return { width: `${w}px`, height: `${h}px` }
}
</script>

<template>
  <div class="flex flex-col items-center gap-6" :class="{ grayscale: gray }">
    <div
      v-for="(p, i) in pages"
      :key="p.section"
      :style="size(paper, p)"
      class="bg-white shadow-lg relative flex flex-col px-10 py-8 overflow-hidden shrink-0"
    >
      <div v-if="draft" class="watermark">DRAFT</div>
      <FitToBox class="flex-1 min-h-0">
        <ReportSection :page="p" />
      </FitToBox>
      <footer class="absolute bottom-3 right-4 text-[8px] text-slate-400">{{ i + 1 }} / {{ pages.length }}</footer>
    </div>
  </div>
</template>

<style scoped>
.watermark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  font-size: 120px;
  font-weight: 800;
  color: rgba(245, 158, 11, 0.08);
  transform: rotate(-30deg);
  letter-spacing: 0.1em;
}
</style>
