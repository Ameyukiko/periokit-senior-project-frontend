<script setup lang="ts">
import type { ReportPageSpec } from '@/composables/useExportReport'
import ReportChartBlock from './ReportChartBlock.vue'
import ReportDiagnosisBlock from './ReportDiagnosisBlock.vue'
import ReportBoardBlock from './ReportBoardBlock.vue'



const DESKTOP_W = 1040
defineProps<{ page: ReportPageSpec }>()
</script>

<template>
  <ReportBoardBlock v-if="page.board" v-bind="page.board" :width="page.width" :max-h="page.height - 40" />
  <div v-else :style="{ width: `${DESKTOP_W}px` }">
    <ReportChartBlock v-if="page.section === 'chart'" />
    <ReportDiagnosisBlock v-else />
  </div>
</template>
