<script setup lang="ts">
import { computed, ref } from 'vue'
import { X } from 'lucide-vue-next'
import type { ChartData } from '@/domain/chart/chart.types'
import type { SiteRegion } from '@/domain/chart/chart.mapper'
import { calculateBopPercentage, calculatePiPercentage } from '@/domain/chart/chart.calculations'
import { UPPER_TEETH, LOWER_TEETH } from '@/domain/chart/chart.constants'
import {
  getTeethByMobility,
  getPdByValueWithSites,
  getKtwByValueWithSites,
  getFurcationWithSites,
  type ToothSiteEntry,
} from '@/domain/chart/chart.summary'

const props = defineProps<{
  show: boolean
  chartData: ChartData
}>()

const emit = defineEmits<{
  close: []
}>()

// Tab state
type Tab = 'clinical' | 'bop-pi'
const activeTab = ref<Tab>('clinical')

const bopPercentage = computed(() => calculateBopPercentage(props.chartData))
const piPercentage = computed(() => calculatePiPercentage(props.chartData))

// Detailed summary computed properties
const mobility1Teeth = computed(() => getTeethByMobility(props.chartData, 1))
const mobility2Teeth = computed(() => getTeethByMobility(props.chartData, 2))
const mobility3Teeth = computed(() => getTeethByMobility(props.chartData, 3))
const furcation1Teeth = computed(() => getFurcationWithSites(props.chartData, 1))
const furcation2Teeth = computed(() => getFurcationWithSites(props.chartData, 2))
const furcation3Teeth = computed(() => getFurcationWithSites(props.chartData, 3))

// Group teeth by actual PD values (only abnormal values > 4mm), keeping sites
const pdByValue = computed(() => getPdByValueWithSites(props.chartData))

// Sorted computed properties for PD
const sortedPdValues = computed(() =>
  Object.entries(pdByValue.value).sort((a, b) => Number(a[0]) - Number(b[0]))
)

// Group teeth by actual KTW values (values > 0 and < 2mm), keeping surface
const ktwByValue = computed(() => getKtwByValueWithSites(props.chartData))

// Sorted computed properties for KTW
const sortedKtwValues = computed(() =>
  Object.entries(ktwByValue.value).sort((a, b) => Number(a[0]) - Number(b[0]))
)

// Map a whole-tooth finding (e.g. mobility) to site-less entries
const toToothEntries = (teeth: number[]): ToothSiteEntry[] =>
  teeth.map(toothId => ({ toothId, sites: [] }))

// Pill color per surface region + arch superscript (u = upper buccal, l = lower buccal)
const SITE_PILL_CLASS: Record<SiteRegion, string> = {
  'buccal-upper': 'bg-sky-50 text-sky-700 ring-sky-100',
  'palatal': 'bg-violet-50 text-violet-700 ring-violet-100',
  'lingual': 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  'buccal-lower': 'bg-amber-50 text-amber-700 ring-amber-100',
}

const siteArch = (region: SiteRegion): string =>
  region === 'buccal-upper' ? 'u' : region === 'buccal-lower' ? 'l' : ''

// Styling helper functions for tables
const getRowTextColorClass = (sectionTitle: string, label: string) => {
  if (sectionTitle.includes('PD')) {
    const val = parseInt(label, 10)
    if (val >= 8) return 'text-rose-800 font-bold'
    if (val === 7) return 'text-rose-700 font-bold'
    if (val === 6) return 'text-rose-600 font-bold'
    return 'text-rose-500 font-semibold' // val === 5
  }
  
  if (sectionTitle.includes('KTW')) {
    return 'text-teal-600 font-bold'
  }
  
  // Mobility or Furcation
  if (label.endsWith('III')) return 'text-rose-800 font-bold'
  if (label.endsWith('II')) return 'text-rose-600 font-bold'
  return 'text-rose-400 font-semibold' // Grade I
}

const getRowBorderClass = (sectionTitle: string, label: string) => {
  if (sectionTitle.includes('PD')) {
    return ''
  }
  
  if (sectionTitle.includes('KTW')) {
    return 'border-l-[3px] border-l-teal-500 pl-3'
  }
  
  // Mobility or Furcation has left border
  if (label.endsWith('III')) return 'border-l-[3px] border-l-rose-800 pl-3'
  if (label.endsWith('II')) return 'border-l-[3px] border-l-rose-500 pl-3'
  return 'border-l-[3px] border-l-rose-300 pl-3' // Grade I
}

// Clinical data section type
interface SeverityItem {
  label: string
  count: number
  teeth: ToothSiteEntry[]
  badgeClass: string
  countClass: string
}

interface ClinicalSection {
  title: string
  items: SeverityItem[]
}

// PD sections grouped by category
const pdSection = computed<ClinicalSection>(() => {
  const items: SeverityItem[] = sortedPdValues.value.map(([pd, teeth]) => {
    return {
      label: `${pd}`,
      count: teeth.length,
      teeth,
      badgeClass: '',
      countClass: ''
    }
  })
  return { title: 'PD (mm)', items }
})

// Mobility section
const mobilitySection = computed<ClinicalSection>(() => {
  const items: SeverityItem[] = []
  if (mobility1Teeth.value.length) {
    items.push({
      label: 'Grade I',
      count: mobility1Teeth.value.length,
      teeth: toToothEntries(mobility1Teeth.value),
      badgeClass: '',
      countClass: ''
    })
  }
  if (mobility2Teeth.value.length) {
    items.push({
      label: 'Grade II',
      count: mobility2Teeth.value.length,
      teeth: toToothEntries(mobility2Teeth.value),
      badgeClass: '',
      countClass: ''
    })
  }
  if (mobility3Teeth.value.length) {
    items.push({
      label: 'Grade III',
      count: mobility3Teeth.value.length,
      teeth: toToothEntries(mobility3Teeth.value),
      badgeClass: '',
      countClass: ''
    })
  }
  return { title: 'Mobility', items }
})

// Furcation section
const furcationSection = computed<ClinicalSection>(() => {
  const items: SeverityItem[] = []
  if (furcation1Teeth.value.length) {
    items.push({
      label: 'Grade I',
      count: furcation1Teeth.value.length,
      teeth: furcation1Teeth.value,
      badgeClass: '',
      countClass: ''
    })
  }
  if (furcation2Teeth.value.length) {
    items.push({
      label: 'Grade II',
      count: furcation2Teeth.value.length,
      teeth: furcation2Teeth.value,
      badgeClass: '',
      countClass: ''
    })
  }
  if (furcation3Teeth.value.length) {
    items.push({
      label: 'Grade III',
      count: furcation3Teeth.value.length,
      teeth: furcation3Teeth.value,
      badgeClass: '',
      countClass: ''
    })
  }
  return { title: 'Furcation', items }
})

// KTW section
const ktwSection = computed<ClinicalSection>(() => {
  const items: SeverityItem[] = sortedKtwValues.value.map(([ktw, teeth]) => {
    return {
      label: `${ktw} mm`,
      count: teeth.length,
      teeth,
      badgeClass: '',
      countClass: ''
    }
  })
  return { title: 'KTW (mm)', items }
})

// All clinical sections
const clinicalSections = computed<ClinicalSection[]>(() => {
  const sections: ClinicalSection[] = []
  if (pdSection.value.items.length > 0) sections.push(pdSection.value)
  if (mobilitySection.value.items.length > 0) sections.push(mobilitySection.value)
  if (furcationSection.value.items.length > 0) sections.push(furcationSection.value)
  if (ktwSection.value.items.length > 0) sections.push(ktwSection.value)
  return sections
})

// Proportional widths matching clinical charts scaled for layout
const TOOTH_WIDTHS: Record<number, number> = {
  18: 41, 17: 43, 16: 48, 15: 33, 14: 34, 13: 36, 12: 31, 11: 41,
  21: 41, 22: 31, 23: 36, 24: 34, 25: 33, 26: 48, 27: 43, 28: 41,
  48: 48, 47: 50, 46: 53, 45: 34, 44: 34, 43: 34, 42: 29, 41: 26,
  31: 26, 32: 29, 33: 34, 34: 34, 35: 34, 36: 53, 37: 50, 38: 48
}

const getToothWidth = (id: number): number => {
  return TOOTH_WIDTHS[id] ?? 25
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
          class="relative bg-white rounded-2xl shadow-xl shadow-slate-200/50 w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200/60"
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
          <div class="flex flex-col flex-1 overflow-hidden">
            <!-- Tab Bar -->
            <div class="flex border-b border-slate-200/60 px-6">
              <button
                @click="activeTab = 'clinical'"
                :class="[
                  'px-4 py-3 text-sm font-medium transition-colors relative',
                  activeTab === 'clinical'
                    ? 'text-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                ]"
              >
                Clinical Data Summary
                <div
                  v-if="activeTab === 'clinical'"
                  class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t"
                ></div>
              </button>
              <button
                @click="activeTab = 'bop-pi'"
                :class="[
                  'px-4 py-3 text-sm font-medium transition-colors relative',
                  activeTab === 'bop-pi'
                    ? 'text-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                ]"
              >
                %BoP & PI
                <div
                  v-if="activeTab === 'bop-pi'"
                  class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t"
                ></div>
              </button>
            </div>

            <!-- Tab Content -->
            <div class="flex-1 overflow-y-auto p-5 scrollbar-hide relative">
              <Transition name="tab-fade" mode="out-in">
                <!-- Clinical Data Summary Tab -->
                <div v-if="activeTab === 'clinical'" key="clinical">
            <div v-if="clinicalSections.length > 0" class="space-y-6">
              <h3 class="text-sm font-semibold text-slate-900">Clinical Data Summary</h3>

              <!-- Site legend / key -->
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-500 -mt-3">
                <span class="inline-flex items-center gap-1">
                  <span class="inline-block w-2.5 h-2.5 rounded-sm bg-sky-100 ring-1 ring-inset ring-sky-200"></span>
                  Buccal<sup>upper</sup>
                </span>
                <span class="inline-flex items-center gap-1">
                  <span class="inline-block w-2.5 h-2.5 rounded-sm bg-violet-100 ring-1 ring-inset ring-violet-200"></span>
                  Palatal
                </span>
                <span class="inline-flex items-center gap-1">
                  <span class="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-100 ring-1 ring-inset ring-emerald-200"></span>
                  Lingual
                </span>
                <span class="inline-flex items-center gap-1">
                  <span class="inline-block w-2.5 h-2.5 rounded-sm bg-amber-100 ring-1 ring-inset ring-amber-200"></span>
                  Buccal<sup>lower</sup>
                </span>
              </div>

              <!-- Clinical Data Tables -->
              <div class="space-y-6">
                <div
                  v-for="section in clinicalSections"
                  :key="section.title"
                  class="w-full"
                >
                  <table class="w-full border-collapse">
                    <thead>
                      <tr class="bg-slate-50 border-b border-slate-200">
                        <th class="text-left py-2.5 pl-3 pr-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-[30%] rounded-l-lg">
                          {{ section.title }}
                        </th>
                        <th class="text-center py-2.5 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-[20%]">
                          Count
                        </th>
                        <th class="text-left py-2.5 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-[50%] rounded-r-lg">
                          Teeth
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="item in section.items"
                        :key="item.label"
                        class="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors"
                      >
                        <!-- Column 1: Value / Grade / Class -->
                        <td
                          class="py-2.5 pr-3 text-sm"
                          :class="getRowBorderClass(section.title, item.label)"
                        >
                          <span :class="getRowTextColorClass(section.title, item.label)">
                            {{ item.label }}
                          </span>
                        </td>
                        <!-- Column 2: Count -->
                        <td class="py-2.5 px-3 text-center text-sm">
                          <span :class="getRowTextColorClass(section.title, item.label)">
                            {{ item.count }}
                          </span>
                        </td>
                        <!-- Column 3: Teeth List (with site labels) -->
                        <td class="py-2.5 px-3 text-sm text-slate-600">
                          <span
                            v-for="entry in item.teeth"
                            :key="entry.toothId"
                            class="inline-flex items-center gap-1 mr-3 align-middle whitespace-nowrap"
                          >
                            <span class="font-semibold text-slate-700">#{{ entry.toothId }}</span>
                            <span
                              v-for="site in entry.sites"
                              :key="site.label + site.region"
                              class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset"
                              :class="SITE_PILL_CLASS[site.region]"
                            >
                              {{ site.label }}<sup v-if="siteArch(site.region)" class="text-[8px] leading-none">{{ siteArch(site.region) }}</sup>
                            </span>
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Empty state for clinical tab -->
            <div v-else class="text-center py-12 text-slate-400">
              <p class="text-sm">No clinical data abnormalities detected.</p>
            </div>
                </div>

                <!-- %BoP & PI Tab -->
                <div v-else key="bop-pi" class="space-y-4">
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
                      viewBox="0 0 100 100"
                      :width="getToothWidth(id)"
                      :height="getToothWidth(id)"
                      class="select-none transition-opacity duration-200 transform rotate-90"
                      :class="chartData[id]?.extracted ? 'opacity-20' : ''"
                    >
                      <g v-if="!chartData[id]?.extracted">
                        <!-- Background Frame -->
                        <polygon
                          points="50,0 93.3,25 93.3,75 50,100 6.7,75 6.7,25"
                          fill="white"
                        />
                        <!-- Left Side: Buccal -->
                        <path
                          d="M50 50 L6.7 25 L50 0 Z"
                          :fill="chartData[id]?.buccal?.pi?.[2] ? '#3b82f6' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <path
                          d="M50 50 L6.7 75 L6.7 25 Z"
                          :fill="chartData[id]?.buccal?.pi?.[1] ? '#3b82f6' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <path
                          d="M50 50 L50 100 L6.7 75 Z"
                          :fill="chartData[id]?.buccal?.pi?.[0] ? '#3b82f6' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <!-- Right Side: Palatal -->
                        <path
                          d="M50 50 L50 0 L93.3 25 Z"
                          :fill="chartData[id]?.lingual?.pi?.[2] ? '#3b82f6' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <path
                          d="M50 50 L93.3 25 L93.3 75 Z"
                          :fill="chartData[id]?.lingual?.pi?.[1] ? '#3b82f6' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <path
                          d="M50 50 L93.3 75 L50 100 Z"
                          :fill="chartData[id]?.lingual?.pi?.[0] ? '#3b82f6' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <!-- Outer Stroke Frame -->
                        <polygon
                          points="50,0 93.3,25 93.3,75 50,100 6.7,75 6.7,25"
                          fill="none"
                          stroke="#cbd5e1"
                          stroke-width="2"
                        />
                        <!-- Divider Lines -->
                        <line x1="50" y1="50" x2="50" y2="0" stroke="#cbd5e1" stroke-width="1.5" />
                        <line x1="50" y1="50" x2="93.3" y2="25" stroke="#cbd5e1" stroke-width="1.5" />
                        <line x1="50" y1="50" x2="93.3" y2="75" stroke="#cbd5e1" stroke-width="1.5" />
                        <line x1="50" y1="50" x2="50" y2="100" stroke="#cbd5e1" stroke-width="1.5" />
                        <line x1="50" y1="50" x2="6.7" y2="75" stroke="#cbd5e1" stroke-width="1.5" />
                        <line x1="50" y1="50" x2="6.7" y2="25" stroke="#cbd5e1" stroke-width="1.5" />
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
                      viewBox="0 0 100 100"
                      :width="getToothWidth(id)"
                      :height="getToothWidth(id)"
                      class="select-none transition-opacity duration-200 transform rotate-90"
                      :class="chartData[id]?.extracted ? 'opacity-20' : ''"
                    >
                      <g v-if="!chartData[id]?.extracted">
                        <!-- Background Frame -->
                        <polygon
                          points="50,0 93.3,25 93.3,75 50,100 6.7,75 6.7,25"
                          fill="white"
                        />
                        <!-- Left Side: Lingual -->
                        <path
                          d="M50 50 L6.7 25 L50 0 Z"
                          :fill="chartData[id]?.lingual?.pi?.[2] ? '#3b82f6' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <path
                          d="M50 50 L6.7 75 L6.7 25 Z"
                          :fill="chartData[id]?.lingual?.pi?.[1] ? '#3b82f6' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <path
                          d="M50 50 L50 100 L6.7 75 Z"
                          :fill="chartData[id]?.lingual?.pi?.[0] ? '#3b82f6' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <!-- Right Side: Buccal -->
                        <path
                          d="M50 50 L50 0 L93.3 25 Z"
                          :fill="chartData[id]?.buccal?.pi?.[2] ? '#3b82f6' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <path
                          d="M50 50 L93.3 25 L93.3 75 Z"
                          :fill="chartData[id]?.buccal?.pi?.[1] ? '#3b82f6' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <path
                          d="M50 50 L93.3 75 L50 100 Z"
                          :fill="chartData[id]?.buccal?.pi?.[0] ? '#3b82f6' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <!-- Outer Stroke Frame -->
                        <polygon
                          points="50,0 93.3,25 93.3,75 50,100 6.7,75 6.7,25"
                          fill="none"
                          stroke="#cbd5e1"
                          stroke-width="2"
                        />
                        <!-- Divider Lines -->
                        <line x1="50" y1="50" x2="50" y2="0" stroke="#cbd5e1" stroke-width="1.5" />
                        <line x1="50" y1="50" x2="93.3" y2="25" stroke="#cbd5e1" stroke-width="1.5" />
                        <line x1="50" y1="50" x2="93.3" y2="75" stroke="#cbd5e1" stroke-width="1.5" />
                        <line x1="50" y1="50" x2="50" y2="100" stroke="#cbd5e1" stroke-width="1.5" />
                        <line x1="50" y1="50" x2="6.7" y2="75" stroke="#cbd5e1" stroke-width="1.5" />
                        <line x1="50" y1="50" x2="6.7" y2="25" stroke="#cbd5e1" stroke-width="1.5" />
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
                      viewBox="0 0 100 100"
                      :width="getToothWidth(id)"
                      :height="getToothWidth(id)"
                      class="select-none transition-opacity duration-200 transform rotate-90"
                      :class="chartData[id]?.extracted ? 'opacity-20' : ''"
                    >
                      <g v-if="!chartData[id]?.extracted">
                        <!-- Background Frame -->
                        <polygon
                          points="50,0 93.3,25 93.3,75 50,100 6.7,75 6.7,25"
                          fill="white"
                        />
                        <!-- Left Side: Buccal -->
                        <path
                          d="M50 50 L6.7 25 L50 0 Z"
                          :fill="chartData[id]?.buccal?.bop?.[2] ? '#ef4444' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <path
                          d="M50 50 L6.7 75 L6.7 25 Z"
                          :fill="chartData[id]?.buccal?.bop?.[1] ? '#ef4444' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <path
                          d="M50 50 L50 100 L6.7 75 Z"
                          :fill="chartData[id]?.buccal?.bop?.[0] ? '#ef4444' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <!-- Right Side: Palatal -->
                        <path
                          d="M50 50 L50 0 L93.3 25 Z"
                          :fill="chartData[id]?.lingual?.bop?.[2] ? '#ef4444' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <path
                          d="M50 50 L93.3 25 L93.3 75 Z"
                          :fill="chartData[id]?.lingual?.bop?.[1] ? '#ef4444' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <path
                          d="M50 50 L93.3 75 L50 100 Z"
                          :fill="chartData[id]?.lingual?.bop?.[0] ? '#ef4444' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <!-- Outer Stroke Frame -->
                        <polygon
                          points="50,0 93.3,25 93.3,75 50,100 6.7,75 6.7,25"
                          fill="none"
                          stroke="#cbd5e1"
                          stroke-width="2"
                        />
                        <!-- Divider Lines -->
                        <line x1="50" y1="50" x2="50" y2="0" stroke="#cbd5e1" stroke-width="1.5" />
                        <line x1="50" y1="50" x2="93.3" y2="25" stroke="#cbd5e1" stroke-width="1.5" />
                        <line x1="50" y1="50" x2="93.3" y2="75" stroke="#cbd5e1" stroke-width="1.5" />
                        <line x1="50" y1="50" x2="50" y2="100" stroke="#cbd5e1" stroke-width="1.5" />
                        <line x1="50" y1="50" x2="6.7" y2="75" stroke="#cbd5e1" stroke-width="1.5" />
                        <line x1="50" y1="50" x2="6.7" y2="25" stroke="#cbd5e1" stroke-width="1.5" />
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
                      viewBox="0 0 100 100"
                      :width="getToothWidth(id)"
                      :height="getToothWidth(id)"
                      class="select-none transition-opacity duration-200 transform rotate-90"
                      :class="chartData[id]?.extracted ? 'opacity-20' : ''"
                    >
                      <g v-if="!chartData[id]?.extracted">
                        <!-- Background Frame -->
                        <polygon
                          points="50,0 93.3,25 93.3,75 50,100 6.7,75 6.7,25"
                          fill="white"
                        />
                        <!-- Left Side: Lingual -->
                        <path
                          d="M50 50 L6.7 25 L50 0 Z"
                          :fill="chartData[id]?.lingual?.bop?.[2] ? '#ef4444' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <path
                          d="M50 50 L6.7 75 L6.7 25 Z"
                          :fill="chartData[id]?.lingual?.bop?.[1] ? '#ef4444' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <path
                          d="M50 50 L50 100 L6.7 75 Z"
                          :fill="chartData[id]?.lingual?.bop?.[0] ? '#ef4444' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <!-- Right Side: Buccal -->
                        <path
                          d="M50 50 L50 0 L93.3 25 Z"
                          :fill="chartData[id]?.buccal?.bop?.[2] ? '#ef4444' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <path
                          d="M50 50 L93.3 25 L93.3 75 Z"
                          :fill="chartData[id]?.buccal?.bop?.[1] ? '#ef4444' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <path
                          d="M50 50 L93.3 75 L50 100 Z"
                          :fill="chartData[id]?.buccal?.bop?.[0] ? '#ef4444' : '#ffffff'"
                          class="transition-all duration-200"
                        />
                        <!-- Outer Stroke Frame -->
                        <polygon
                          points="50,0 93.3,25 93.3,75 50,100 6.7,75 6.7,25"
                          fill="none"
                          stroke="#cbd5e1"
                          stroke-width="2"
                        />
                        <!-- Divider Lines -->
                        <line x1="50" y1="50" x2="50" y2="0" stroke="#cbd5e1" stroke-width="1.5" />
                        <line x1="50" y1="50" x2="93.3" y2="25" stroke="#cbd5e1" stroke-width="1.5" />
                        <line x1="50" y1="50" x2="93.3" y2="75" stroke="#cbd5e1" stroke-width="1.5" />
                        <line x1="50" y1="50" x2="50" y2="100" stroke="#cbd5e1" stroke-width="1.5" />
                        <line x1="50" y1="50" x2="6.7" y2="75" stroke="#cbd5e1" stroke-width="1.5" />
                        <line x1="50" y1="50" x2="6.7" y2="25" stroke="#cbd5e1" stroke-width="1.5" />
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
              </Transition>

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

/* Tab transition - smooth fade and slide */
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.tab-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.tab-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
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
