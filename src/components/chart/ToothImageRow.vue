<script setup lang="ts">
import { getFurImage, getFurMarkerStyle, getToothColumnWidth, getToothImage, getToothImageTopOffset, getKtwWarningStyle, shouldShowKtwWarning } from '@/domain/chart/chart.image'
import PdLineChartLayer from './PdLineChartLayer.vue'
import type { ChartData, Surface, ToothId } from '@/domain/chart/chart.types'

const getToothColumnStyle = (id: ToothId) => {
  const width = `${getToothColumnWidth(id)}px`

  return {
    width,
    flexBasis: width
  }
}

const getToothImageStyle = (id: ToothId, surface: Surface) => {
  const top = getToothImageTopOffset(id, surface)

  return {
    top: `${top}px`
  }
}

defineProps<{
  label: string
  arch: number[][]
  chartData: ChartData
  surface: Surface
  selectedToothId: ToothId | null
  gridClass: string
  groupGapClass: string
  imageClass?: string
  labelPosition: 'top' | 'bottom'
  baselineY?: number  // Custom baseline position for PD graph
  showNumbers?: boolean  // Render a tooth-number row at the arch edge
}>()

const emit = defineEmits<{
  selectTooth: [id: ToothId]
  toggleFur: [id: ToothId, surface: Surface, index: number]
}>()

</script>

<template>
  <div class="flex">
    <div class="w-20 flex flex-col items-center justify-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] space-y-1 py-4">
      <span v-for="letter in label.split('')" :key="letter">{{ letter }}</span>
    </div>
    <div class="flex-1 flex relative">
      <!-- PD Line Chart Overlay (spans entire arch) -->
      <PdLineChartLayer :arch="arch" :chart-data="chartData" :surface="surface" :group-gap-class="groupGapClass" :baseline-y="baselineY" />

      <template v-for="(group, gIdx) in arch" :key="gIdx">
        <div class="flex h-38.75 relative">
          <div class="absolute inset-0 z-30 pointer-events-none" :class="gridClass"></div>
          <div
            v-for="id in group"
            :key="id"
            class="h-full flex shrink-0 justify-center group relative cursor-pointer transition-all duration-200 rounded-xl hover:bg-blue-50/30"
            :class="selectedToothId === id ? 'bg-blue-50/20' : ''"
            :style="getToothColumnStyle(id)"
            @click="emit('selectTooth', id)"
          >
            <img
              :src="getToothImage(id, surface, chartData[id])"
              :alt="`Tooth ${id} ${label}`"
              class="absolute h-35.25 w-auto max-w-none object-contain transition-all duration-300 z-10"
              :class="imageClass"
              :style="getToothImageStyle(id, surface)"
            />
            <!-- Selection Ring Overlay (renders on top of the graph and grid lines) -->
            <div
              v-if="selectedToothId === id"
              class="absolute inset-0 ring-2 ring-[#0052ff] ring-inset rounded-xl pointer-events-none z-35"
            ></div>
            <div
              v-for="(grade, fIdx) in chartData[id].fur[surface]"
              :key="fIdx"
              class="absolute z-40 -translate-x-1/2 cursor-pointer flex items-center justify-center"
              :style="getFurMarkerStyle(id, surface, fIdx, chartData[id].fur[surface].length)"
              @click.stop="!chartData[id].extracted && !chartData[id].implant && emit('toggleFur', id, surface, fIdx)"
            >
              <img v-if="grade > 0" :src="getFurImage(grade)" class="w-3.5 h-3.5 object-contain hover:scale-110 transition-transform" />
              <div v-else-if="!chartData[id].extracted && !chartData[id].implant" class="w-3 h-3 border border-dashed border-slate-400/50 rounded-full bg-white/70 opacity-0 hover:opacity-100 transition-opacity" title="Add Furcation"></div>
            </div>
            <!-- KTW Warning Symbol (displayed when KTW < 2mm) -->
            <div
              v-if="!chartData[id].extracted && shouldShowKtwWarning(chartData[id][surface].ktw)"
              class="absolute z-40 pointer-events-none -translate-x-1/2 -translate-y-1/2"
              :style="getKtwWarningStyle(id, surface)"
            >
              <div class="relative w-4 h-4">
                <svg viewBox="0 0 24 24" class="w-full h-full text-amber-500 drop-shadow-sm">
                  <path fill="currentColor" d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16v2h2v-2h-2zm0-6v4h2v-4h-2z"/>
                </svg>
                <span class="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-amber-900">K</span>
              </div>
            </div>
          </div>
        </div>
        <div v-if="gIdx !== arch.length - 1" :class="groupGapClass"></div>
      </template>
    </div>
  </div>
</template>
