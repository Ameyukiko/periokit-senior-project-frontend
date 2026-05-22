<script setup lang="ts">
import { computed } from 'vue'
import { getToothColumnWidth } from '@/domain/chart/chart.image'
import { isUpperTooth } from '@/domain/chart/chart.rules'
import type { ChartData, Surface, ToothId } from '@/domain/chart/chart.types'

const props = defineProps<{
  arch: number[][]
  chartData: ChartData
  surface: Surface
  groupGapClass: string
  baselineY?: number
}>()

const toNumber = (value: string) => Number.parseInt(value, 10) || 0

// Determine PD graph direction based on surface and arch
// Upper BUCCAL = points DOWN (+1)
// Upper PALATAL (lingual for upper) = points UP (-1)
// Lower LINGUAL = points DOWN (+1)
// Lower BUCCAL = points UP (-1)
const getPdDirection = (toothId: ToothId, surface: Surface): 1 | -1 => {
  const isUpper = isUpperTooth(toothId)
  // Upper BUCCAL and Lower LINGUAL have grids extending UP (baselineY = 99)
  // Upper PALATAL and Lower BUCCAL have grids extending DOWN (baselineY = 62)
  if ((isUpper && surface === 'buccal') || (!isUpper && surface === 'lingual')) {
    return -1 // Points UP (apical, towards the roots)
  }
  return 1 // Points DOWN (apical, towards the roots)
}

interface BaselinePoint {
  x: number
  y: number
}

// Get gap width in pixels based on Tailwind class
const getGapWidth = (gapClass: string): number => {
  if (gapClass === 'w-4') return 16
  if (gapClass === 'w-6') return 24
  return 16
}

// GM Points (Gingival Margin) - สำหรับสร้างเส้นสีแดง
// GM = CEJ + REC (REC+ = เหงือกร่น, REC- = เหงือกบวม)
const gmPoints = computed(() => {
  const points: BaselinePoint[] = []
  let currentX = 0
  const gapWidth = getGapWidth(props.groupGapClass)
  const cejY = props.baselineY ?? 60

  for (let gIdx = 0; gIdx < props.arch.length; gIdx++) {
    const group = props.arch[gIdx]
    for (const toothId of group) {
      const toothWidth = getToothColumnWidth(toothId)
      const tooth = props.chartData[toothId]
      if (!tooth || tooth.extracted) {
        currentX += toothWidth
        continue
      }
      const direction = getPdDirection(toothId, props.surface)

      // 3 measurement sites positioned proportionally across tooth width
      // Site 0 (mesial): 20%, Site 1 (middle): 50%, Site 2 (distal): 80%
      const sitePositions = [0.2, 0.5, 0.8]
      for (const site of [0, 1, 2] as const) {
        const recValue = toNumber(tooth[props.surface].rec[site])
        const y = cejY + (recValue * 6 * direction)
        points.push({ x: currentX + toothWidth * sitePositions[site], y })
      }
      
      currentX += toothWidth
    }
    if (gIdx < props.arch.length - 1) {
      currentX += gapWidth
    }
  }

  return points
})

// CAL Points (Clinical Attachment Level) - สำหรับสร้างเส้นสีน้ำเงิน (ระดับกระดูก)
// CAL = PD + REC, เป็นระยะจาก CEJ
const calPoints = computed(() => {
  const points: BaselinePoint[] = []
  let currentX = 0
  const gapWidth = getGapWidth(props.groupGapClass)
  const cejY = props.baselineY ?? 60

  for (let gIdx = 0; gIdx < props.arch.length; gIdx++) {
    const group = props.arch[gIdx]
    for (const toothId of group) {
      const toothWidth = getToothColumnWidth(toothId)
      const tooth = props.chartData[toothId]
      if (!tooth || tooth.extracted) {
        currentX += toothWidth
        continue
      }
      const direction = getPdDirection(toothId, props.surface)

      // 3 measurement sites positioned proportionally across tooth width
      // Site 0 (mesial): 20%, Site 1 (middle): 50%, Site 2 (distal): 80%
      const sitePositions = [0.2, 0.5, 0.8]
      for (const site of [0, 1, 2] as const) {
        const calValue = toNumber(tooth[props.surface].cal[site])
        const y = cejY + (calValue * 6 * direction)
        points.push({ x: currentX + toothWidth * sitePositions[site], y })
      }
      
      currentX += toothWidth
    }
    if (gIdx < props.arch.length - 1) {
      currentX += gapWidth
    }
  }

  return points
})

// Generate polyline strings for GM and CAL
const gmPolylinePoints = computed(() => gmPoints.value.map(p => `${p.x},${p.y}`).join(' '))
const calPolylinePoints = computed(() => calPoints.value.map(p => `${p.x},${p.y}`).join(' '))

// PD Area (Probing Depth) - พื้นที่สีม่วงฉากระหว่าง GM ถึง CAL
// สร้าง polygon โดยเชื่อม GM points → CAL points (ย้อนลำดับ)
const pdAreaPoints = computed(() => {
  if (gmPoints.value.length === 0 || calPoints.value.length === 0) return ''
  if (gmPoints.value.length !== calPoints.value.length) return ''

  // GM points (บน) → CAL points (ล่าง, ย้อนลำดับ)
  const forward = gmPoints.value.map(p => `${p.x},${p.y}`)
  const backward = [...calPoints.value].reverse().map(p => `${p.x},${p.y}`)
  return [...forward, ...backward].join(' ')
})

// Calculate total width for SVG viewBox
const svgWidth = computed(() => {
  let width = 0
  const gapWidth = getGapWidth(props.groupGapClass)

  for (let gIdx = 0; gIdx < props.arch.length; gIdx++) {
    const group = props.arch[gIdx]
    for (const toothId of group) {
      width += getToothColumnWidth(toothId)
    }
    if (gIdx < props.arch.length - 1) {
      width += gapWidth
    }
  }
  return width
})
</script>

<template>
  <div class="pd-line-chart-layer absolute inset-0 pointer-events-none z-20">
    <svg
      :viewBox="`0 0 ${svgWidth} 150`"
      class="w-full h-full"
      preserveAspectRatio="xMidYMin meet"
    >
      <!-- PD Area (Probing Depth) - สีม่วงฉาก - พื้นที่ระหว่าง GM ถึง CAL -->
      <polygon
        v-if="pdAreaPoints"
        :points="pdAreaPoints"
        fill="#a855f7"
        fill-opacity="0.3"
        stroke="none"
      />
      <!-- CAL Line (Bone Level) - สีน้ำเงิน - ระดับกระดูก -->
      <polyline
        v-if="calPoints.length > 1"
        :points="calPolylinePoints"
        fill="none"
        stroke="#3b82f6"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      <!-- GM Line (Gingival Margin) - สีแดง - ขอบเหงือก -->
      <polyline
        v-if="gmPoints.length > 1"
        :points="gmPolylinePoints"
        fill="none"
        stroke="#ef4444"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      <!-- CEJ Baseline - ซ่อนไว้ (ไม่แสดงตามมาตรฐาน periodontal chart) -->
      <!-- <polyline
        v-if="baselinePoints.length > 1"
        :points="baselinePolylinePoints"
        fill="none"
        stroke="#ef4444"
        stroke-width="1"
        stroke-dasharray="4 4"
        stroke-linejoin="round"
        stroke-linecap="round"
        opacity="0.3"
      /> -->
    </svg>
  </div>
</template>

<style scoped>
.pd-line-chart-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 20;
}
</style>
