<script setup lang="ts">
import { storeToRefs } from 'pinia'
import PatientChartHeader from '@/components/chart/PatientChartHeader.vue'
import PeriodontalChartGrid from '@/components/chart/PeriodontalChartGrid.vue'
import { usePeriodontalChartStore } from '@/stores/periodontal-chart'


const { patientInfo, summary, teethData } = storeToRefs(usePeriodontalChartStore())
</script>

<template>
  <fieldset disabled class="report-chart border-0 p-0 m-0 flex flex-col gap-4">
    <PatientChartHeader :patient-info="patientInfo" :summary="summary" patient-fields-disabled visit-fields-disabled />
    <PeriodontalChartGrid :chart-data="teethData" :selected-tooth-id="null" readonly />
  </fieldset>
</template>

<style scoped>

.report-chart :deep(section) {
  box-shadow: none !important;
}
.report-chart :deep(.opacity-60) {
  opacity: 1 !important;
}
</style>
