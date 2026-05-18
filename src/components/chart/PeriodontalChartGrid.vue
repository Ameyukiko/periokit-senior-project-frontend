<script setup lang="ts">
import { ref } from 'vue'
import ToothColumn from './ToothColumn.vue'
import ToothImageRow from './ToothImageRow.vue'
import { BUCCAL_ROWS, INNER_SURFACE_ROWS, LINGUAL_ROWS, LOWER_ARCH, PALATAL_ROWS, UPPER_ARCH } from '@/domain/chart/chart.constants'
import { getToothColumnWidth } from '@/domain/chart/chart.image'
import type { ChartData, SiteIndex, Surface, ToothId } from '@/domain/chart/chart.types'

defineProps<{
  chartData: ChartData
  selectedToothId: ToothId | null
  getFieldValidation: (id: ToothId, surface: Surface, field: string, site: number) => 'valid' | 'invalid' | 'none'
}>()

const emit = defineEmits<{
  selectTooth: [id: ToothId]
  toggleBop: [id: ToothId, surface: Surface, site: SiteIndex]
  togglePi: [id: ToothId, surface: Surface, site: SiteIndex]
  toggleFur: [id: ToothId, surface: Surface, index: number]
  updatePd: [id: ToothId, surface: Surface, site: SiteIndex, value: string]
  updateRec: [id: ToothId, surface: Surface, site: SiteIndex, value: string]
  updateMobility: [id: ToothId, value: string]
  updateKtw: [id: ToothId, surface: Surface, value: string]
  validateField: [id: ToothId, surface: Surface, field: string, site: number, state: 'valid' | 'invalid' | 'none']
  toggleExtracted: [id: ToothId]
}>()

const chartContainerRef = ref<HTMLElement | null>(null)

// Define section order for navigation
const SECTION_ORDER = ['upper-buccal', 'upper-palatal', 'lower-lingual', 'lower-buccal'] as const
type Section = typeof SECTION_ORDER[number]

const getNextSection = (current: string | null): string | null => {
  if (!current) return SECTION_ORDER[0]
  const idx = SECTION_ORDER.indexOf(current as Section)
  if (idx === -1) return SECTION_ORDER[0]
  return SECTION_ORDER[(idx + 1) % SECTION_ORDER.length]
}

const getPrevSection = (current: string | null): string | null => {
  if (!current) return SECTION_ORDER[SECTION_ORDER.length - 1]
  const idx = SECTION_ORDER.indexOf(current as Section)
  if (idx === -1) return SECTION_ORDER[SECTION_ORDER.length - 1]
  return SECTION_ORDER[(idx - 1 + SECTION_ORDER.length) % SECTION_ORDER.length]
}

const getToothColumnStyle = (id: ToothId) => {
  const width = `${getToothColumnWidth(id)}px`

  return {
    width,
    flexBasis: width
  }
}

const isFocusableChartInput = (input: HTMLElement) => {
  if (input.offsetParent === null) return false
  if (input.getAttribute('aria-disabled') === 'true') return false
  if (input instanceof HTMLInputElement && (input.disabled || input.readOnly)) return false
  return true
}

// Single-cell fields: only one value per tooth (no site navigation)
const SINGLE_CELL_FIELDS = ['mo'] as const
const isSingleCellField = (field: string | null) => field && SINGLE_CELL_FIELDS.includes(field as any)

// Mirrors the legacy PeriodontalChartView keyboard navigation, but keeps
// keyboard focus movement independent from selected tooth/sidebar state.
const handleKeyDown = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement
  if (!target.classList.contains('chart-input')) return

  const key = event.key
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(key)) return

  event.preventDefault()

  const currentTooth = target.getAttribute('data-tooth')
  const currentField = target.getAttribute('data-field')
  const currentSite = target.getAttribute('data-site') || '0'
  const currentSurface = target.getAttribute('data-surface')
  const currentSection = target.getAttribute('data-section')
  const isSingleCell = isSingleCellField(currentField)

  const allInputs = Array.from(chartContainerRef.value?.querySelectorAll('.chart-input') || []) as HTMLElement[]
  const currentIndex = allInputs.indexOf(target)
  if (currentIndex === -1) return

  let nextTarget: HTMLElement | null = null

  if (key === 'ArrowDown') {
    for (let i = currentIndex + 1; i < allInputs.length; i += 1) {
      const input = allInputs[i]
      const targetField = input.getAttribute('data-field')
      const isTargetSingleCell = isSingleCellField(targetField)

      if (
        input.getAttribute('data-tooth') === currentTooth &&
        // Skip site check for single-cell fields (mo, ktw), but enforce it for multi-site fields
        (isTargetSingleCell || input.getAttribute('data-site') === currentSite) &&
        (input.getAttribute('data-surface') || '') === currentSurface &&
        (input.getAttribute('data-section') || '') === currentSection &&
        isFocusableChartInput(input)
      ) {
        nextTarget = input
        break
      }
    }
  } else if (key === 'ArrowUp') {
    for (let i = currentIndex - 1; i >= 0; i -= 1) {
      const input = allInputs[i]
      const targetField = input.getAttribute('data-field')
      const isTargetSingleCell = isSingleCellField(targetField)

      if (
        input.getAttribute('data-tooth') === currentTooth &&
        // Skip site check for single-cell fields (mo, ktw), but enforce it for multi-site fields
        (isTargetSingleCell || input.getAttribute('data-site') === currentSite) &&
        (input.getAttribute('data-surface') || '') === currentSurface &&
        (input.getAttribute('data-section') || '') === currentSection &&
        isFocusableChartInput(input)
      ) {
        nextTarget = input
        break
      }
    }
  } else if (key === 'ArrowRight' || key === 'Enter') {
    if (isSingleCell) {
      // Single-cell field: go directly to next tooth (same field, same surface)
      for (let i = currentIndex + 1; i < allInputs.length; i += 1) {
        const input = allInputs[i]
        if (
          input.getAttribute('data-field') === currentField &&
          (input.getAttribute('data-surface') || '') === currentSurface &&
          input.getAttribute('data-section') === currentSection &&
          isFocusableChartInput(input)
        ) {
          nextTarget = input
          break
        }
      }

      // Wrap to next section, leftmost tooth
      if (!nextTarget && currentSection) {
        const nextSection = getNextSection(currentSection)
        for (let i = 0; i < allInputs.length; i += 1) {
          const input = allInputs[i]
          if (
            input.getAttribute('data-field') === currentField &&
            input.getAttribute('data-section') === nextSection &&
            isFocusableChartInput(input)
          ) {
            nextTarget = input
            break
          }
        }
      }
    } else {
      // Multi-site field: First priority: next site within same tooth (site 0→1→2)
      for (let i = currentIndex + 1; i < allInputs.length; i += 1) {
        const input = allInputs[i]
        if (
          input.getAttribute('data-tooth') === currentTooth &&
          input.getAttribute('data-field') === currentField &&
          (input.getAttribute('data-surface') || '') === currentSurface &&
          input.getAttribute('data-section') === currentSection &&
          isFocusableChartInput(input)
        ) {
          nextTarget = input
          break
        }
      }

      // Second priority: next tooth with site 0 (wrapping to next tooth)
      if (!nextTarget) {
        for (let i = currentIndex + 1; i < allInputs.length; i += 1) {
          const input = allInputs[i]
          if (
            input.getAttribute('data-field') === currentField &&
            (input.getAttribute('data-surface') || '') === currentSurface &&
            input.getAttribute('data-section') === currentSection &&
            input.getAttribute('data-site') === '0' &&
            isFocusableChartInput(input)
          ) {
            nextTarget = input
            break
          }
        }
      }

      // Third priority: go to next section, leftmost tooth, site 0
      if (!nextTarget && currentSection) {
        const nextSection = getNextSection(currentSection)
        for (let i = 0; i < allInputs.length; i += 1) {
          const input = allInputs[i]
          if (
            input.getAttribute('data-field') === currentField &&
            input.getAttribute('data-section') === nextSection &&
            input.getAttribute('data-site') === '0' &&
            isFocusableChartInput(input)
          ) {
            nextTarget = input
            break
          }
        }
      }
    }
  } else if (key === 'ArrowLeft') {
    if (isSingleCell) {
      // Single-cell field: go directly to previous tooth (same field, same surface)
      for (let i = currentIndex - 1; i >= 0; i -= 1) {
        const input = allInputs[i]
        if (
          input.getAttribute('data-field') === currentField &&
          (input.getAttribute('data-surface') || '') === currentSurface &&
          input.getAttribute('data-section') === currentSection &&
          isFocusableChartInput(input)
        ) {
          nextTarget = input
          break
        }
      }

      // Wrap to previous section, rightmost tooth
      if (!nextTarget && currentSection) {
        const prevSection = getPrevSection(currentSection)
        for (let i = allInputs.length - 1; i >= 0; i -= 1) {
          const input = allInputs[i]
          if (
            input.getAttribute('data-field') === currentField &&
            input.getAttribute('data-section') === prevSection &&
            isFocusableChartInput(input)
          ) {
            nextTarget = input
            break
          }
        }
      }
    } else {
      // Multi-site field: First priority: previous site within same tooth (site 2→1→0)
      for (let i = currentIndex - 1; i >= 0; i -= 1) {
        const input = allInputs[i]
        if (
          input.getAttribute('data-tooth') === currentTooth &&
          input.getAttribute('data-field') === currentField &&
          (input.getAttribute('data-surface') || '') === currentSurface &&
          input.getAttribute('data-section') === currentSection &&
          isFocusableChartInput(input)
        ) {
          nextTarget = input
          break
        }
      }

      // Second priority: previous tooth with site 2 (wrapping to previous tooth)
      if (!nextTarget) {
        for (let i = currentIndex - 1; i >= 0; i -= 1) {
          const input = allInputs[i]
          if (
            input.getAttribute('data-field') === currentField &&
            (input.getAttribute('data-surface') || '') === currentSurface &&
            input.getAttribute('data-section') === currentSection &&
            input.getAttribute('data-site') === '2' &&
            isFocusableChartInput(input)
          ) {
            nextTarget = input
            break
          }
        }
      }

      // Third priority: go to previous section, rightmost tooth, site 2
      if (!nextTarget && currentSection) {
        const prevSection = getPrevSection(currentSection)
        for (let i = allInputs.length - 1; i >= 0; i -= 1) {
          const input = allInputs[i]
          if (
            input.getAttribute('data-field') === currentField &&
            input.getAttribute('data-section') === prevSection &&
            input.getAttribute('data-site') === '2' &&
            isFocusableChartInput(input)
          ) {
            nextTarget = input
            break
          }
        }
      }
    }
  }

  if (!nextTarget) return

  nextTarget.focus()
}
</script>

<template>
  <section class="mt-4 w-full bg-white rounded-3xl shadow-xl border border-slate-300 overflow-hidden">
    <div class="p-3 bg-[#f8fafc] overflow-x-auto">
      <div ref="chartContainerRef" class="w-fit mx-auto" @keydown="handleKeyDown">

        <!-- Upper Arch Buccal -->
        <div class="flex items-end mb-1" data-section="upper-buccal">
          <div class="flex flex-col bg-white border-l border-t border-slate-400 text-[9px] font-bold text-slate-500 uppercase w-20 sticky left-0 z-20">
            <div class="h-7 border-b border-r border-slate-400"></div>
            <div v-for="row in BUCCAL_ROWS" :key="row" class="h-6 flex items-center px-2 border-b border-r border-slate-400">{{ row }}</div>
          </div>
          <div class="flex">
            <template v-for="(group, gIdx) in UPPER_ARCH" :key="gIdx">
              <div class="flex border-l border-t border-r border-slate-400 bg-white">
                <ToothColumn
                  v-for="(id, idx) in group"
                  :id="id"
                  :key="id"
                  :tooth-data="chartData[id]"
                  surface="buccal"
                  section="upper-buccal"
                  order="standard"
                  header-position="top"
                  :midline="gIdx === 1 && idx === 3"
                  :selected="selectedToothId === id"
                  @select="emit('selectTooth', $event)"
                  @toggle-bop="(...args) => emit('toggleBop', ...args)"
                  @toggle-pi="(...args) => emit('togglePi', ...args)"
                  @toggle-fur="(...args) => emit('toggleFur', ...args)"
                  @update-pd="(...args) => emit('updatePd', ...args)"
                  @update-rec="(...args) => emit('updateRec', ...args)"
                  @update-mobility="(...args) => emit('updateMobility', ...args)"
                  @update-ktw="(...args) => emit('updateKtw', ...args)"
                  :get-field-validation="getFieldValidation"
                  @validate-field="(...args) => emit('validateField', ...args)"
                />
              </div>
              <div v-if="gIdx !== UPPER_ARCH.length - 1" class="w-4"></div>
            </template>
          </div>
        </div>

        <!-- Upper Arch - Extracted Button-->
        <div class="flex mb-4">
          <div class="w-20"></div>
          <div class="flex">
            <template v-for="(group, gIdx) in UPPER_ARCH" :key="gIdx">
              <div class="flex">
                <div v-for="id in group" :key="id" class="h-8 flex shrink-0 items-center justify-center" :style="getToothColumnStyle(id)">
                  <button class="w-full h-6 text-[9px] font-black transition-all duration-200 border border-slate-300" :class="chartData[id].extracted ? 'bg-red-500 text-white border-red-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'" @click="emit('toggleExtracted', id)">Ext</button>
                </div>
              </div>
              <div v-if="gIdx !== UPPER_ARCH.length - 1" class="w-4"></div>
            </template>
          </div>
        </div>

        <!-- Upper Arch - Images -->
        <div class="flex flex-col gap-6 mb-4">
          <ToothImageRow label="BUCCAL" :arch="UPPER_ARCH" :chart-data="chartData" surface="buccal" :selected-tooth-id="selectedToothId" grid-class="clinical-grid-bg" group-gap-class="w-4" label-position="top" :baseline-y="99" />
          <ToothImageRow label="PALATAL" :arch="UPPER_ARCH" :chart-data="chartData" surface="lingual" :selected-tooth-id="selectedToothId" grid-class="clinical-grid-bg-inf" group-gap-class="w-4" label-position="top" :baseline-y="62" />
        </div>

        <!-- Upper Arch Palatal -->
        <div class="flex mt-4 mb-10" data-section="upper-palatal">
          <div class="flex flex-col bg-white border-l border-y border-slate-400 text-[9px] font-bold text-slate-500 w-20 sticky left-0 z-20">
            <div v-for="row in PALATAL_ROWS" :key="row" class="h-6 flex items-center px-2 border-b border-r border-slate-300 last:border-b-0">{{ row }}</div>
          </div>
          <div class="flex">
            <template v-for="(group, gIdx) in UPPER_ARCH" :key="gIdx">
              <div class="flex border border-slate-400 bg-white">
                <ToothColumn
                  v-for="(id, idx) in group"
                  :id="id"
                  :key="id"
                  :tooth-data="chartData[id]"
                  surface="lingual"
                  section="upper-palatal"
                  order="palatal"
                  header-position="none"
                  :midline="gIdx === 1 && idx === 3"
                  :selected="selectedToothId === id"
                  @select="emit('selectTooth', $event)"
                  @toggle-bop="(...args) => emit('toggleBop', ...args)"
                  @toggle-pi="(...args) => emit('togglePi', ...args)"
                  @toggle-fur="(...args) => emit('toggleFur', ...args)"
                  @update-pd="(...args) => emit('updatePd', ...args)"
                  @update-rec="(...args) => emit('updateRec', ...args)"
                  @update-mobility="(...args) => emit('updateMobility', ...args)"
                  @update-ktw="(...args) => emit('updateKtw', ...args)"
                  :get-field-validation="getFieldValidation"
                  @validate-field="(...args) => emit('validateField', ...args)"
                />
              </div>
              <div v-if="gIdx !== UPPER_ARCH.length - 1" class="w-4"></div>
            </template>
          </div>
        </div>

        <!-- Lower Arch Lingual -->
        <div class="flex mb-1 mt-8" data-section="lower-lingual">
          <div class="flex flex-col bg-white border-l border-y border-slate-400 text-[9px] font-bold text-slate-500 uppercase w-20 sticky left-0 z-20">
            <div v-for="row in LINGUAL_ROWS" :key="row" class="h-6 flex items-center px-2 border-b border-r border-slate-300 last:border-b-0">{{ row }}</div>
          </div>
          <div class="flex">
            <template v-for="(group, gIdx) in LOWER_ARCH" :key="gIdx">
              <div class="flex border border-slate-400 bg-white">
                <ToothColumn
                  v-for="(id, idx) in group"
                  :id="id"
                  :key="id"
                  :tooth-data="chartData[id]"
                  surface="lingual"
                  section="lower-lingual"
                  order="lingual"
                  header-position="none"
                  :midline="gIdx === 1 && idx === 3"
                  :selected="selectedToothId === id"
                  @select="emit('selectTooth', $event)"
                  @toggle-bop="(...args) => emit('toggleBop', ...args)"
                  @toggle-pi="(...args) => emit('togglePi', ...args)"
                  @toggle-fur="(...args) => emit('toggleFur', ...args)"
                  @update-pd="(...args) => emit('updatePd', ...args)"
                  @update-rec="(...args) => emit('updateRec', ...args)"
                  @update-mobility="(...args) => emit('updateMobility', ...args)"
                  @update-ktw="(...args) => emit('updateKtw', ...args)"
                  :get-field-validation="getFieldValidation"
                  @validate-field="(...args) => emit('validateField', ...args)"
                />
              </div>
              <div v-if="gIdx !== LOWER_ARCH.length - 1" class="w-6"></div>
            </template>
          </div>
        </div>

        <!-- Lower Arch - Extracted Button -->
        <div class="flex mt-1 mb-4">
          <div class="w-20"></div>
          <div class="flex">
            <template v-for="(group, gIdx) in LOWER_ARCH" :key="gIdx">
              <div class="flex">
                <div v-for="id in group" :key="id" class="h-8 flex shrink-0 items-center justify-center" :style="getToothColumnStyle(id)">
                  <button class="w-full h-6 text-[9px] font-black uppercase transition-all duration-200 border border-slate-300" :class="chartData[id].extracted ? 'bg-red-500 text-white border-red-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'" @click="emit('toggleExtracted', id)">Ext</button>
                </div>
              </div>
              <div v-if="gIdx !== LOWER_ARCH.length - 1" class="w-6"></div>
            </template>
          </div>
        </div>

        <div class="flex flex-col gap-6 mb-4">
          <ToothImageRow label="LINGUAL" :arch="LOWER_ARCH" :chart-data="chartData" surface="lingual" :selected-tooth-id="selectedToothId" grid-class="clinical-grid-bg" group-gap-class="w-6" label-position="bottom" :baseline-y="99" />
          <ToothImageRow label="BUCCAL" :arch="LOWER_ARCH" :chart-data="chartData" surface="buccal" :selected-tooth-id="selectedToothId" grid-class="clinical-grid-bg-inf" group-gap-class="w-6" label-position="bottom" :baseline-y="62" />
        </div>

        <!-- Lower Arch Buccal -->
        <div class="flex mb-4" data-section="lower-buccal">
          <div class="flex flex-col bg-white border-l border-y border-slate-400 text-[9px] font-bold text-slate-500 uppercase w-20 sticky left-0 z-20">
            <div v-for="row in INNER_SURFACE_ROWS" :key="row" class="h-6 flex items-center px-2 border-b border-r border-slate-300 last:border-b-0">{{ row }}</div>
            <div class="h-7 border-t border-r border-slate-400 bg-slate-50"></div>
          </div>
          <div class="flex">
            <template v-for="(group, gIdx) in LOWER_ARCH" :key="gIdx">
              <div class="flex border border-slate-400 bg-white">
                <ToothColumn
                  v-for="(id, idx) in group"
                  :id="id"
                  :key="id"
                  :tooth-data="chartData[id]"
                  surface="buccal"
                  section="lower-buccal"
                  order="reverse"
                  header-position="bottom"
                  :midline="gIdx === 1 && idx === 3"
                  :selected="selectedToothId === id"
                  @select="emit('selectTooth', $event)"
                  @toggle-bop="(...args) => emit('toggleBop', ...args)"
                  @toggle-pi="(...args) => emit('togglePi', ...args)"
                  @toggle-fur="(...args) => emit('toggleFur', ...args)"
                  @update-pd="(...args) => emit('updatePd', ...args)"
                  @update-rec="(...args) => emit('updateRec', ...args)"
                  @update-mobility="(...args) => emit('updateMobility', ...args)"
                  @update-ktw="(...args) => emit('updateKtw', ...args)"
                  :get-field-validation="getFieldValidation"
                  @validate-field="(...args) => emit('validateField', ...args)"
                />
              </div>
              <div v-if="gIdx !== LOWER_ARCH.length - 1" class="w-6"></div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
