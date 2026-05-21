<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import type { ChartData, Surface } from '@/domain/chart/chart.types'
import { calculateBopPercentage, calculatePiPercentage } from '@/domain/chart/chart.calculations'
import { UPPER_TEETH, LOWER_TEETH } from '@/domain/chart/chart.constants'
import {
  getTeethByPdRange,
  getTeethByCalRange,
  getTeethByMobility,
  getTeethByFurcation
} from '@/domain/chart/chart.summary'

const props = defineProps<{
  show: boolean
  chartData: ChartData
}>()

const emit = defineEmits<{
  close: []
}>()

const bopPercentage = computed(() => calculateBopPercentage(props.chartData))
const piPercentage = computed(() => calculatePiPercentage(props.chartData))

// Detailed summary computed properties
const pdModerateTeeth = computed(() => getTeethByPdRange(props.chartData, 4, 5))
const pdSevereTeeth = computed(() => getTeethByPdRange(props.chartData, 6))
const calModerateTeeth = computed(() => getTeethByCalRange(props.chartData, 4, 5))
const calSevereTeeth = computed(() => getTeethByCalRange(props.chartData, 6))
const mobility1Teeth = computed(() => getTeethByMobility(props.chartData, 1))
const mobility2Teeth = computed(() => getTeethByMobility(props.chartData, 2))
const mobility3Teeth = computed(() => getTeethByMobility(props.chartData, 3))
const furcation1Teeth = computed(() => getTeethByFurcation(props.chartData, 1))
const furcation2Teeth = computed(() => getTeethByFurcation(props.chartData, 2))
const furcation3Teeth = computed(() => getTeethByFurcation(props.chartData, 3))

// Group teeth by actual PD values
const pdByValue = computed<Record<number, number[]>>(() => {
  const result: Record<number, number[]> = {}
  const surfaces: Surface[] = ['buccal', 'lingual']

  Object.entries(props.chartData).forEach(([toothId, tooth]) => {
    if (tooth.extracted) return

    surfaces.forEach((surface) => {
      tooth[surface].pd.forEach((value) => {
        const pd = parseInt(value, 10)
        if (pd >= 4) { // Only show PD >= 4mm
          if (!result[pd]) result[pd] = []
          if (!result[pd].includes(Number.parseInt(toothId, 10))) {
            result[pd].push(Number.parseInt(toothId, 10))
          }
        }
      })
    })
  })

  // Sort teeth within each PD value
  Object.keys(result).forEach(pd => {
    result[Number(pd)].sort((a, b) => a - b)
  })

  return result
})

// Group teeth by actual CAL values
const calByValue = computed<Record<number, number[]>>(() => {
  const result: Record<number, number[]> = {}
  const surfaces: Surface[] = ['buccal', 'lingual']

  Object.entries(props.chartData).forEach(([toothId, tooth]) => {
    if (tooth.extracted) return

    surfaces.forEach((surface) => {
      tooth[surface].cal.forEach((value) => {
        const cal = parseInt(value, 10)
        if (cal >= 4) { // Only show CAL >= 4mm
          if (!result[cal]) result[cal] = []
          if (!result[cal].includes(Number.parseInt(toothId, 10))) {
            result[cal].push(Number.parseInt(toothId, 10))
          }
        }
      })
    })
  })

  // Sort teeth within each CAL value
  Object.keys(result).forEach(cal => {
    result[Number(cal)].sort((a, b) => a - b)
  })

  return result
})

// Sorted computed properties for cleaner template
const sortedPdValues = computed(() =>
  Object.entries(pdByValue.value).sort((a, b) => Number(a[0]) - Number(b[0]))
)
const sortedCalValues = computed(() =>
  Object.entries(calByValue.value).sort((a, b) => Number(a[0]) - Number(b[0]))
)

// Helper to format tooth numbers for display
const formatToothNumbers = (teeth: number[]): string => {
  if (teeth.length === 0) return '-'
  return teeth.map(t => `#${t}`).join(', ')
}

// Color helpers: gray for normal/mild, pastel red for abnormal
const getPdTextClass = (value: number) => {
  if (value >= 6) return 'bg-rose-200 text-rose-700'  // severe = pastel red
  if (value === 5) return 'bg-rose-100 text-rose-600'  // moderate = light pastel
  return 'bg-slate-100 text-slate-600'  // mild/normal = gray
}

const getPdBgClass = (value: number) => {
  if (value >= 6) return 'bg-rose-50/80'
  if (value === 5) return 'bg-rose-50/40'
  return 'bg-slate-50/50'
}

const getPdCountClass = (value: number) => {
  if (value >= 6) return 'text-rose-600'
  if (value === 5) return 'text-rose-500'
  return 'text-slate-500'
}

// Highly detailed anatomical tooth configurations (matching mockup's organic outlines)
const TOOTH_TYPES = {
  molar: {
    paths: {
      top: 'M 50 50 L 20 20 C 32 10, 42 18, 50 14 C 58 18, 68 10, 80 20 Z',
      right: 'M 50 50 L 80 20 C 90 32, 90 68, 80 80 Z',
      bottom: 'M 50 50 L 80 80 C 68 90, 58 82, 50 86 C 42 82, 32 90, 20 80 Z',
      left: 'M 50 50 L 20 80 C 10 68, 10 32, 20 20 Z'
    }
  },
  premolar: {
    paths: {
      top: 'M 50 50 L 24 24 C 34 16, 44 20, 50 18 C 56 20, 66 16, 76 24 Z',
      right: 'M 50 50 L 76 24 C 84 34, 84 66, 76 76 Z',
      bottom: 'M 50 50 L 76 76 C 66 84, 56 80, 50 82 C 44 80, 34 84, 24 76 Z',
      left: 'M 50 50 L 24 76 C 16 66, 16 34, 24 24 Z'
    }
  },
  canine: {
    paths: {
      top: 'M 50 50 L 26 26 C 36 16, 44 14, 50 12 C 56 14, 64 16, 74 26 Z',
      right: 'M 50 50 L 74 26 C 82 36, 80 64, 72 74 Z',
      bottom: 'M 50 50 L 72 74 C 64 80, 56 78, 50 80 C 44 78, 36 80, 28 74 Z',
      left: 'M 50 50 L 28 74 C 20 64, 18 36, 26 26 Z'
    }
  },
  incisor: {
    paths: {
      top: 'M 50 50 L 30 25 C 40 18, 60 18, 70 25 Z',
      right: 'M 50 50 L 70 25 C 76 34, 76 66, 70 75 Z',
      bottom: 'M 50 50 L 70 75 C 60 82, 40 82, 30 75 Z',
      left: 'M 50 50 L 30 75 C 24 66, 24 34, 30 25 Z'
    }
  }
}

// Proportional widths matching clinical charts scaled for layout
const TOOTH_WIDTHS: Record<number, number> = {
  18: 41, 17: 43, 16: 48, 15: 33, 14: 34, 13: 36, 12: 31, 11: 41,
  21: 41, 22: 31, 23: 36, 24: 34, 25: 33, 26: 48, 27: 43, 28: 41,
  48: 48, 47: 50, 46: 53, 45: 34, 44: 34, 43: 34, 42: 29, 41: 26,
  31: 26, 32: 29, 33: 34, 34: 34, 35: 34, 36: 53, 37: 50, 38: 48
}

const getToothType = (id: number): 'molar' | 'premolar' | 'canine' | 'incisor' => {
  if ([18, 17, 16, 26, 27, 28, 48, 47, 46, 36, 37, 38].includes(id)) return 'molar'
  if ([15, 14, 24, 25, 45, 44, 34, 35].includes(id)) return 'premolar'
  if ([13, 23, 43, 33].includes(id)) return 'canine'
  return 'incisor'
}

const getToothWidth = (id: number): number => {
  return TOOTH_WIDTHS[id] ?? 25
}

const TOOTH_GEOMETRY = {
  molar: { viewBox: '12.5 12.5 75 75', aspect: 75 / 75 },
  premolar: { viewBox: '18 18 64 64', aspect: 64 / 64 },
  canine: { viewBox: '21 12 58 68', aspect: 68 / 58 },
  incisor: { viewBox: '25.5 18 49 64', aspect: 64 / 49 }
}

const getToothViewBox = (id: number): string => {
  const type = getToothType(id)
  return TOOTH_GEOMETRY[type].viewBox
}

const getToothHeight = (id: number): number => {
  const type = getToothType(id)
  const width = getToothWidth(id)
  return width * TOOTH_GEOMETRY[type].aspect
}

const getToothPath = (id: number, direction: 'top' | 'right' | 'bottom' | 'left'): string => {
  const type = getToothType(id)
  return TOOTH_TYPES[type].paths[direction]
}

// Quadrant active states based on 6-site data
const getToothPiActiveQuadrants = (id: number) => {
  const tooth = props.chartData[id]
  if (!tooth) return { top: false, right: false, bottom: false, left: false }

  return {
    top: !!tooth.buccal?.pi?.[1],
    bottom: !!tooth.lingual?.pi?.[1],
    left: !!(tooth.buccal?.pi?.[0] || tooth.lingual?.pi?.[0]),
    right: !!(tooth.buccal?.pi?.[2] || tooth.lingual?.pi?.[2]),
  }
}

const getToothBopActiveQuadrants = (id: number) => {
  const tooth = props.chartData[id]
  if (!tooth) return { top: false, right: false, bottom: false, left: false }

  return {
    top: !!tooth.buccal?.bop?.[1],
    bottom: !!tooth.lingual?.bop?.[1],
    left: !!(tooth.buccal?.bop?.[0] || tooth.lingual?.bop?.[0]),
    right: !!(tooth.buccal?.bop?.[2] || tooth.lingual?.bop?.[2]),
  }
}

// Smile-line arch curve styling
const getToothRowStyle = (id: number, arch: 'upper' | 'lower') => {
  const indexInRow = (id: number) => {
    const upperOrder = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
    const lowerOrder = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
    const arr = arch === 'upper' ? upperOrder : lowerOrder
    return arr.indexOf(id)
  }

  const idx = indexInRow(id)
  if (idx === -1) return {}

  const offsets = [0, 1.5, 3, 5, 7, 9, 11, 12.5, 12.5, 11, 9, 7, 5, 3, 1.5, 0]
  const offset = offsets[idx] ?? 0
  
  return {
    transform: `translateY(${offset}px)`
  }
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="fixed inset-0 z-9999 flex items-center justify-center p-4"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        @click="emit('close')"
      ></div>

      <!-- Modal Content -->
      <Transition name="scale">
        <div
          v-if="show"
          class="relative bg-white rounded-2xl shadow-xl shadow-slate-200/50 w-full max-w-180 max-h-[92vh] overflow-hidden flex flex-col border border-slate-200/60"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 bg-linear-to-r from-slate-50 to-white border-b border-slate-200/60">
            <div class="flex items-center gap-3">
              <div class="w-1 h-6 bg-blue-500 rounded-full"></div>
              <h2 class="text-xl font-semibold text-slate-900">
                Overview
              </h2>
            </div>
            <button
              @click="emit('close')"
              class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">

            <!-- Clinical Data Summary -->
            <div v-if="pdModerateTeeth.length || pdSevereTeeth.length || calModerateTeeth.length || calSevereTeeth.length || mobility1Teeth.length || mobility2Teeth.length || mobility3Teeth.length || furcation1Teeth.length || furcation2Teeth.length || furcation3Teeth.length" class="space-y-3">
              <h3 class="text-sm font-semibold text-slate-900">Clinical Data Summary</h3>

              <div class="grid grid-cols-2 gap-3">
                <!-- PD Card -->
                <div v-if="sortedPdValues.length" class="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                  <h4 class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">PD (mm)</h4>
                  <div class="space-y-2">
                    <div v-for="pd in sortedPdValues" :key="pd[0]" class="rounded-lg p-2 border border-slate-100" :class="getPdBgClass(Number(pd[0]))">
                      <div class="flex items-center justify-between mb-1">
                        <span class="px-2 py-0.5 rounded text-xs font-bold" :class="getPdTextClass(Number(pd[0]))">{{ pd[0] }}</span>
                        <span class="text-lg font-bold" :class="getPdCountClass(Number(pd[0]))">{{ pd[1].length }}</span>
                      </div>
                      <div class="text-xs text-slate-500">{{ formatToothNumbers(pd[1]) }}</div>
                    </div>
                  </div>
                </div>

                <!-- CAL Card -->
                <div v-if="sortedCalValues.length" class="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                  <h4 class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">CAL (mm)</h4>
                  <div class="space-y-2">
                    <div v-for="cal in sortedCalValues" :key="cal[0]" class="rounded-lg p-2 border border-slate-100" :class="getPdBgClass(Number(cal[0]))">
                      <div class="flex items-center justify-between mb-1">
                        <span class="px-2 py-0.5 rounded text-xs font-bold" :class="getPdTextClass(Number(cal[0]))">{{ cal[0] }}</span>
                        <span class="text-lg font-bold" :class="getPdCountClass(Number(cal[0]))">{{ cal[1].length }}</span>
                      </div>
                      <div class="text-xs text-slate-500">{{ formatToothNumbers(cal[1]) }}</div>
                    </div>
                  </div>
                </div>

                <!-- Mobility Card -->
                <div v-if="mobility1Teeth.length || mobility2Teeth.length || mobility3Teeth.length" class="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                  <h4 class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Mobility</h4>
                  <div class="space-y-2">
                    <div v-if="mobility1Teeth.length" class="rounded-lg p-2 border border-slate-100 bg-slate-50/50">
                      <div class="flex items-center justify-between mb-1">
                        <span class="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-600">Grade I</span>
                        <span class="text-lg font-bold text-slate-500">{{ mobility1Teeth.length }}</span>
                      </div>
                      <div class="text-xs text-slate-500">{{ formatToothNumbers(mobility1Teeth) }}</div>
                    </div>
                    <div v-if="mobility2Teeth.length" class="rounded-lg p-2 border border-slate-100 bg-rose-50/50">
                      <div class="flex items-center justify-between mb-1">
                        <span class="px-2 py-0.5 rounded text-xs font-bold bg-rose-200 text-rose-700">Grade II</span>
                        <span class="text-lg font-bold text-rose-600">{{ mobility2Teeth.length }}</span>
                      </div>
                      <div class="text-xs text-slate-500">{{ formatToothNumbers(mobility2Teeth) }}</div>
                    </div>
                    <div v-if="mobility3Teeth.length" class="rounded-lg p-2 border border-slate-100 bg-rose-50/80">
                      <div class="flex items-center justify-between mb-1">
                        <span class="px-2 py-0.5 rounded text-xs font-bold bg-rose-300 text-rose-800">Grade III</span>
                        <span class="text-lg font-bold text-rose-700">{{ mobility3Teeth.length }}</span>
                      </div>
                      <div class="text-xs text-slate-500">{{ formatToothNumbers(mobility3Teeth) }}</div>
                    </div>
                  </div>
                </div>

                <!-- Furcation Card -->
                <div v-if="furcation1Teeth.length || furcation2Teeth.length || furcation3Teeth.length" class="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                  <h4 class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Furcation</h4>
                  <div class="space-y-2">
                    <div v-if="furcation1Teeth.length" class="rounded-lg p-2 border border-slate-100 bg-slate-50/50">
                      <div class="flex items-center justify-between mb-1">
                        <span class="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-600">Grade I</span>
                        <span class="text-lg font-bold text-slate-500">{{ furcation1Teeth.length }}</span>
                      </div>
                      <div class="text-xs text-slate-500">{{ formatToothNumbers(furcation1Teeth) }}</div>
                    </div>
                    <div v-if="furcation2Teeth.length" class="rounded-lg p-2 border border-slate-100 bg-rose-50/50">
                      <div class="flex items-center justify-between mb-1">
                        <span class="px-2 py-0.5 rounded text-xs font-bold bg-rose-200 text-rose-700">Grade II</span>
                        <span class="text-lg font-bold text-rose-600">{{ furcation2Teeth.length }}</span>
                      </div>
                      <div class="text-xs text-slate-500">{{ formatToothNumbers(furcation2Teeth) }}</div>
                    </div>
                    <div v-if="furcation3Teeth.length" class="rounded-lg p-2 border border-slate-100 bg-rose-50/80">
                      <div class="flex items-center justify-between mb-1">
                        <span class="px-2 py-0.5 rounded text-xs font-bold bg-rose-300 text-rose-800">Grade III</span>
                        <span class="text-lg font-bold text-rose-700">{{ furcation3Teeth.length }}</span>
                      </div>
                      <div class="text-xs text-slate-500">{{ formatToothNumbers(furcation3Teeth) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- PI (%) Section -->
            <div class="bg-slate-50/50 rounded-xl p-3 border border-slate-100/80">
              <div class="flex justify-between items-end mb-2">
                <h3 class="text-sm font-semibold text-slate-900 tracking-tight">PI (%)</h3>
                <span class="text-xl font-bold text-blue-600 tracking-tight">{{ piPercentage }}%</span>
              </div>
              <div class="flex flex-col gap-2 py-3 bg-white rounded-lg border border-slate-200/60 justify-center">
                <!-- Upper Arch Teeth -->
                <div class="flex justify-center items-center gap-0 h-16 w-full">
                  <div
                    v-for="id in UPPER_TEETH"
                    :key="id"
                    :style="getToothRowStyle(id, 'upper')"
                    class="relative transition-all duration-250 hover:scale-105 hover:-translate-y-0.5 group flex justify-center items-center"
                  >
                    <!-- Tooltip -->
                    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-slate-800 text-white text-[9px] font-black rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                      #{{ id }}
                    </div>
                    
                    <svg
                      :viewBox="getToothViewBox(id)"
                      :width="getToothWidth(id)"
                      :height="getToothHeight(id)"
                      class="select-none transition-opacity duration-200"
                      :class="chartData[id]?.extracted ? 'opacity-20' : ''"
                    >
                      <g v-if="!chartData[id]?.extracted">
                        <!-- Top (Buccal) Quadrant -->
                        <path
                          :d="getToothPath(id, 'top')"
                          :fill="getToothPiActiveQuadrants(id).top ? '#3b82f6' : '#ffffff'"
                          stroke="#cbd5e1"
                          stroke-width="2"
                          stroke-linejoin="round"
                          class="transition-all duration-200"
                        />
                        <!-- Right Quadrant -->
                        <path
                          :d="getToothPath(id, 'right')"
                          :fill="getToothPiActiveQuadrants(id).right ? '#3b82f6' : '#ffffff'"
                          stroke="#cbd5e1"
                          stroke-width="2"
                          stroke-linejoin="round"
                          class="transition-all duration-200"
                        />
                        <!-- Bottom (Lingual) Quadrant -->
                        <path
                          :d="getToothPath(id, 'bottom')"
                          :fill="getToothPiActiveQuadrants(id).bottom ? '#3b82f6' : '#ffffff'"
                          stroke="#cbd5e1"
                          stroke-width="2"
                          stroke-linejoin="round"
                          class="transition-all duration-200"
                        />
                        <!-- Left Quadrant -->
                        <path
                          :d="getToothPath(id, 'left')"
                          :fill="getToothPiActiveQuadrants(id).left ? '#3b82f6' : '#ffffff'"
                          stroke="#cbd5e1"
                          stroke-width="2"
                          stroke-linejoin="round"
                          class="transition-all duration-200"
                        />
                      </g>
                      <g v-else>
                        <!-- Extracted representation -->
                        <line x1="20" y1="20" x2="80" y2="80" stroke="#94a3b8" stroke-width="4.5" stroke-linecap="round" />
                        <line x1="80" y1="20" x2="20" y2="80" stroke="#94a3b8" stroke-width="4.5" stroke-linecap="round" />
                      </g>
                    </svg>
                  </div>
                </div>
                <!-- Lower Arch Teeth -->
                <div class="flex justify-center items-center gap-0 h-16 w-full mt-1">
                  <div
                    v-for="id in LOWER_TEETH"
                    :key="id"
                    :style="getToothRowStyle(id, 'lower')"
                    class="relative transition-all duration-250 hover:scale-105 hover:-translate-y-0.5 group flex justify-center items-center"
                  >
                    <!-- Tooltip -->
                    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-slate-800 text-white text-[9px] font-black rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                      #{{ id }}
                    </div>
                    
                    <svg
                      :viewBox="getToothViewBox(id)"
                      :width="getToothWidth(id)"
                      :height="getToothHeight(id)"
                      class="select-none transition-opacity duration-200"
                      :class="chartData[id]?.extracted ? 'opacity-20' : ''"
                    >
                      <g v-if="!chartData[id]?.extracted">
                        <!-- Top (Buccal) Quadrant -->
                        <path
                          :d="getToothPath(id, 'top')"
                          :fill="getToothPiActiveQuadrants(id).top ? '#3b82f6' : '#ffffff'"
                          stroke="#cbd5e1"
                          stroke-width="2"
                          stroke-linejoin="round"
                          class="transition-all duration-200"
                        />
                        <!-- Right Quadrant -->
                        <path
                          :d="getToothPath(id, 'right')"
                          :fill="getToothPiActiveQuadrants(id).right ? '#3b82f6' : '#ffffff'"
                          stroke="#cbd5e1"
                          stroke-width="2"
                          stroke-linejoin="round"
                          class="transition-all duration-200"
                        />
                        <!-- Bottom (Lingual) Quadrant -->
                        <path
                          :d="getToothPath(id, 'bottom')"
                          :fill="getToothPiActiveQuadrants(id).bottom ? '#3b82f6' : '#ffffff'"
                          stroke="#cbd5e1"
                          stroke-width="2"
                          stroke-linejoin="round"
                          class="transition-all duration-200"
                        />
                        <!-- Left Quadrant -->
                        <path
                          :d="getToothPath(id, 'left')"
                          :fill="getToothPiActiveQuadrants(id).left ? '#3b82f6' : '#ffffff'"
                          stroke="#cbd5e1"
                          stroke-width="2"
                          stroke-linejoin="round"
                          class="transition-all duration-200"
                        />
                      </g>
                      <g v-else>
                        <!-- Extracted representation -->
                        <line x1="20" y1="20" x2="80" y2="80" stroke="#94a3b8" stroke-width="4.5" stroke-linecap="round" />
                        <line x1="80" y1="20" x2="20" y2="80" stroke="#94a3b8" stroke-width="4.5" stroke-linecap="round" />
                      </g>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- BOP (%) Section -->
            <div class="bg-slate-50/50 rounded-xl p-3 border border-slate-100/80">
              <div class="flex justify-between items-end mb-2">
                <h3 class="text-sm font-semibold text-slate-900 tracking-tight">BOP (%)</h3>
                <span class="text-xl font-bold text-red-600 tracking-tight">{{ bopPercentage }}%</span>
              </div>
              <div class="flex flex-col gap-2 py-3 bg-white rounded-lg border border-slate-200/60 justify-center">
                <!-- Upper Arch Teeth -->
                <div class="flex justify-center items-center gap-0 h-16 w-full">
                  <div
                    v-for="id in UPPER_TEETH"
                    :key="id"
                    :style="getToothRowStyle(id, 'upper')"
                    class="relative transition-all duration-250 hover:scale-105 hover:-translate-y-0.5 group flex justify-center items-center"
                  >
                    <!-- Tooltip -->
                    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-slate-800 text-white text-[9px] font-black rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                      #{{ id }}
                    </div>
                    
                    <svg
                      :viewBox="getToothViewBox(id)"
                      :width="getToothWidth(id)"
                      :height="getToothHeight(id)"
                      class="select-none transition-opacity duration-200"
                      :class="chartData[id]?.extracted ? 'opacity-20' : ''"
                    >
                      <g v-if="!chartData[id]?.extracted">
                        <!-- Top (Buccal) Quadrant -->
                        <path
                          :d="getToothPath(id, 'top')"
                          :fill="getToothBopActiveQuadrants(id).top ? '#ef4444' : '#ffffff'"
                          stroke="#cbd5e1"
                          stroke-width="2"
                          stroke-linejoin="round"
                          class="transition-all duration-200"
                        />
                        <!-- Right Quadrant -->
                        <path
                          :d="getToothPath(id, 'right')"
                          :fill="getToothBopActiveQuadrants(id).right ? '#ef4444' : '#ffffff'"
                          stroke="#cbd5e1"
                          stroke-width="2"
                          stroke-linejoin="round"
                          class="transition-all duration-200"
                        />
                        <!-- Bottom (Lingual) Quadrant -->
                        <path
                          :d="getToothPath(id, 'bottom')"
                          :fill="getToothBopActiveQuadrants(id).bottom ? '#ef4444' : '#ffffff'"
                          stroke="#cbd5e1"
                          stroke-width="2"
                          stroke-linejoin="round"
                          class="transition-all duration-200"
                        />
                        <!-- Left Quadrant -->
                        <path
                          :d="getToothPath(id, 'left')"
                          :fill="getToothBopActiveQuadrants(id).left ? '#ef4444' : '#ffffff'"
                          stroke="#cbd5e1"
                          stroke-width="2"
                          stroke-linejoin="round"
                          class="transition-all duration-200"
                        />
                      </g>
                      <g v-else>
                        <!-- Extracted representation -->
                        <line x1="20" y1="20" x2="80" y2="80" stroke="#94a3b8" stroke-width="4.5" stroke-linecap="round" />
                        <line x1="80" y1="20" x2="20" y2="80" stroke="#94a3b8" stroke-width="4.5" stroke-linecap="round" />
                      </g>
                    </svg>
                  </div>
                </div>
                <!-- Lower Arch Teeth -->
                <div class="flex justify-center items-center gap-0 h-16 w-full mt-1">
                  <div
                    v-for="id in LOWER_TEETH"
                    :key="id"
                    :style="getToothRowStyle(id, 'lower')"
                    class="relative transition-all duration-250 hover:scale-105 hover:-translate-y-0.5 group flex justify-center items-center"
                  >
                    <!-- Tooltip -->
                    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-slate-800 text-white text-[9px] font-black rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                      #{{ id }}
                    </div>
                    
                    <svg
                      :viewBox="getToothViewBox(id)"
                      :width="getToothWidth(id)"
                      :height="getToothHeight(id)"
                      class="select-none transition-opacity duration-200"
                      :class="chartData[id]?.extracted ? 'opacity-20' : ''"
                    >
                      <g v-if="!chartData[id]?.extracted">
                        <!-- Top (Buccal) Quadrant -->
                        <path
                          :d="getToothPath(id, 'top')"
                          :fill="getToothBopActiveQuadrants(id).top ? '#ef4444' : '#ffffff'"
                          stroke="#cbd5e1"
                          stroke-width="2"
                          stroke-linejoin="round"
                          class="transition-all duration-200"
                        />
                        <!-- Right Quadrant -->
                        <path
                          :d="getToothPath(id, 'right')"
                          :fill="getToothBopActiveQuadrants(id).right ? '#ef4444' : '#ffffff'"
                          stroke="#cbd5e1"
                          stroke-width="2"
                          stroke-linejoin="round"
                          class="transition-all duration-200"
                        />
                        <!-- Bottom (Lingual) Quadrant -->
                        <path
                          :d="getToothPath(id, 'bottom')"
                          :fill="getToothBopActiveQuadrants(id).bottom ? '#ef4444' : '#ffffff'"
                          stroke="#cbd5e1"
                          stroke-width="2"
                          stroke-linejoin="round"
                          class="transition-all duration-200"
                        />
                        <!-- Left Quadrant -->
                        <path
                          :d="getToothPath(id, 'left')"
                          :fill="getToothBopActiveQuadrants(id).left ? '#ef4444' : '#ffffff'"
                          stroke="#cbd5e1"
                          stroke-width="2"
                          stroke-linejoin="round"
                          class="transition-all duration-200"
                        />
                      </g>
                      <g v-else>
                        <!-- Extracted representation -->
                        <line x1="20" y1="20" x2="80" y2="80" stroke="#94a3b8" stroke-width="4.5" stroke-linecap="round" />
                        <line x1="80" y1="20" x2="20" y2="80" stroke="#94a3b8" stroke-width="4.5" stroke-linecap="round" />
                      </g>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-enter-active,
.scale-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

/* Hide scrollbar but allow scrolling */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

/* Smooth badge animation */
@keyframes badge-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.9; }
}

.inline-flex {
  animation: badge-pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
