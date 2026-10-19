<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ListFilter, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type {
  CombinedDateSortValue,
  DateRangeValue,
  DateSortValue,
  FilterConfig,
  FilterType,
  FilterValue,
  FilterValues,
} from '@/components/common/filter.types'

export type {
  FilterConfig,
  FilterType,
  FilterValue,
  FilterValues,
} from '@/components/common/filter.types'

const props = defineProps<{
  configs: FilterConfig[]
  modelValue: FilterValues
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FilterValues]
  'apply': []
}>()

// Local state
const activePopover = ref<'main' | FilterType | null>(null)
const tempValues = ref<FilterValues>({})

// Initialize temp values from modelValue
watch(() => props.modelValue, (newVal) => {
  tempValues.value = { ...newVal }
}, { immediate: true, deep: true })

// Helper to get current filter key safely
const getCurrentKey = (): FilterType => {
  return activePopover.value as FilterType
}

// Helper to set date value
const setDateValue = (field: 'from' | 'to', value: string) => {
  const key = getCurrentKey()
  const current = toObjectValue(tempValues.value[key])
  tempValues.value[key] = { ...current, [field]: value } as DateRangeValue | CombinedDateSortValue
}

const setDateValueFromEvent = (field: 'from' | 'to', event: Event) => {
  const target = event.target as HTMLInputElement | null
  setDateValue(field, target?.value ?? '')
}

// Computed helpers
const hasActiveFilters = computed(() => {
  return props.configs.some(c => isFilterActive(c.type))
})

const activeFilterCount = computed(() => {
  let count = 0
  Object.values(props.modelValue).forEach(value => {
    if (isEmptyFilterValue(value)) return
    if (isObjectValue(value)) return Object.values(value).forEach(v => {
      if (v !== null && v !== undefined && v !== '') count++
    })
    count++
  })
  return count
})

const getConfig = (type: FilterType) => {
  return props.configs.find(c => c.type === type)
}

const getFilterValue = (type: FilterType) => {
  return props.modelValue[type]
}

const isObjectValue = (value: FilterValue): value is DateRangeValue | CombinedDateSortValue => {
  return typeof value === 'object' && value !== null
}

const toObjectValue = (value: FilterValue): Partial<DateRangeValue & CombinedDateSortValue> => {
  return isObjectValue(value) ? value : {}
}

const isEmptyFilterValue = (value: FilterValue) => {
  if (value === null || value === undefined || value === '') return true
  if (isObjectValue(value)) return !Object.values(value).some(v => v !== null && v !== undefined && v !== '')
  return false
}

const isFilterActive = (type: FilterType) => {
  return !isEmptyFilterValue(props.modelValue[type])
}

const getFilterDisplay = (type: FilterType) => {
  const value = getFilterValue(type)
  const config = getConfig(type)

  if (isEmptyFilterValue(value)) return config?.label || type

  // Handle combined sort + date range
  if (config?.isSort && config?.isDateRange && isObjectValue(value)) {
    const parts = []
    if ('sort' in value && value.sort) {
      if (value.sort === 'date_asc') parts.push('Oldest')
      if (value.sort === 'date_desc') parts.push('Latest')
    }
    if (value.from || value.to) {
      const from = value.from || '...'
      const to = value.to || '...'
      parts.push(`${from}–${to}`)
    }
    return parts.length > 0 ? parts.join(', ') : config.label
  }

  // Handle date range only
  if (config?.isDateRange && !config?.isSort && isObjectValue(value)) {
    if (value.from || value.to) {
      const from = value.from || '...'
      const to = value.to || '...'
      return `${from} – ${to}`
    }
    return config.label
  }

  // Handle sort only
  if (config?.isSort && !config?.isDateRange) {
    const sortValue = String(value)
    if (config.sortLabels) {
      if (sortValue === 'asc' || sortValue.includes('asc')) return config.sortLabels.asc
      if (sortValue === 'desc' || sortValue.includes('desc')) return config.sortLabels.desc
    }
    if (sortValue === 'asc') return `${config.label} (A-Z)`
    if (sortValue === 'desc') return `${config.label} (Z-A)`
    if (sortValue.includes('asc')) return 'A-Z'
    if (sortValue.includes('desc')) return 'Z-A'
    return config.label
  }

  // Handle select options
  if (config?.options) {
    const option = config.options.find(o => o.value === String(value))
    return option?.label || String(value)
  }

  // Handle search
  if (config?.isSearch) {
    return String(value)
  }

  return String(value)
}

const openMain = () => {
  if (activePopover.value) {
    activePopover.value = null
  } else {
    activePopover.value = 'main'
    tempValues.value = { ...props.modelValue }
  }
}

const openSub = (type: FilterType) => {
  activePopover.value = type
  tempValues.value = { ...props.modelValue }
}

const removeFilter = (type: FilterType) => {
  const newValues = { ...props.modelValue }
  const config = getConfig(type)

  if (config?.isDateRange && config?.isSort) {
    newValues[type] = { sort: null, from: '', to: '' }
  } else if (config?.isDateRange) {
    newValues[type] = { from: '', to: '' }
  } else {
    newValues[type] = ''
  }

  emit('update:modelValue', newValues)
  activePopover.value = null
}

const applyFilter = () => {
  emit('update:modelValue', tempValues.value)
  emit('apply')
  activePopover.value = null
}

const toggleSort = (type: FilterType, value: string) => {
  const currentValue = tempValues.value[type]
  tempValues.value[type] = currentValue === value ? null : value as DateSortValue
}

const toggleOption = (type: FilterType, value: string) => {
  const currentValue = tempValues.value[type]
  tempValues.value[type] = currentValue === value ? '' : value
}

const setSortValue = (value: string) => {
  const key = getCurrentKey()
  const current = toObjectValue(tempValues.value[key])
  const currentSort = 'sort' in current ? current.sort : null
  tempValues.value[key] = { ...current, sort: currentSort === value ? null : value as DateSortValue } as CombinedDateSortValue
}

const getTempDateValue = (field: 'from' | 'to') => {
  const current = toObjectValue(tempValues.value[getCurrentKey()])
  return current[field] || ''
}

const isTempSortSelected = (value: string) => {
  const current = toObjectValue(tempValues.value[getCurrentKey()])
  return 'sort' in current && current.sort === value
}

const getColorClasses = (color: FilterConfig['color']) => {
  const colors = {
    blue: { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    rose: { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
    emerald: { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    purple: { text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' }
  }
  return colors[color as keyof typeof colors] || colors.blue
}

</script>

<template>
  <div class="filter-panel">
    <!-- Filter Button -->
    <div class="relative">
      <button
        @click="openMain"
        class="px-4 py-2.5 border border-slate-200 rounded-full text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-2 transition-colors shadow-sm"
        :class="{ 'ring-2 ring-[#0052ff] border-transparent': activePopover || hasActiveFilters }"
      >
        <ListFilter class="w-4 h-4" />
        <span>Filter</span>
        <div v-if="activeFilterCount > 0" class="w-5 h-5 bg-[#0052ff] rounded-full flex items-center justify-center text-white text-xs font-bold">
          {{ activeFilterCount }}
        </div>
      </button>

      <!-- Unified Filter Menu -->
      <div
        v-if="activePopover"
        class="absolute left-0 sm:left-auto sm:right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden flex flex-col origin-top-left sm:origin-top-right"
        @click.stop
      >
        <!-- Main Menu -->
        <div v-if="activePopover === 'main'" class="py-2 flex-1">
          <div class="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Add Filter</div>
          <button
            v-for="config in configs"
            :key="config.type"
            @click="openSub(config.type)"
            :title="isFilterActive(config.type) ? getFilterDisplay(config.type) : config.label"
            class="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center justify-between transition-colors"
            :class="[
              modelValue[config.type] ? getColorClasses(config.color).text + ' font-medium' : 'text-slate-700'
            ]"
          >
            <span class="flex items-center gap-2">
              <component :is="config.icon" class="w-4 h-4"/>
              {{ config.label }}
            </span>
            <ChevronRight class="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <!-- Sub Menus -->
        <div v-else class="flex flex-col flex-1 max-h-[400px] overflow-y-auto">
          <!-- Header -->
          <div class="flex items-center px-2 py-2 border-b border-slate-100 bg-slate-50 sticky top-0">
            <button @click="activePopover = 'main'" class="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors">
              <ChevronLeft class="w-4 h-4"/>
            </button>
            <span class="flex-1 text-center text-sm font-semibold text-slate-700 pr-6 capitalize">
              {{ getConfig(activePopover as FilterType)?.label }}
            </span>
          </div>

          <!-- Content Options -->
          <div class="p-2 space-y-1">
            <!-- Select Options -->
            <template v-if="getConfig(activePopover as FilterType)?.options">
              <button
                v-for="option in getConfig(activePopover as FilterType)?.options"
                :key="option.value"
                @click="toggleOption(activePopover as FilterType, option.value)"
                class="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 rounded flex items-center justify-between transition-colors capitalize"
                :class="[
                  tempValues[activePopover] === option.value
                    ? getColorClasses(getConfig(activePopover as FilterType)?.color || 'blue').text + ' ' + getColorClasses(getConfig(activePopover as FilterType)?.color || 'blue').bg + ' font-medium'
                    : 'text-slate-700'
                ]"
              >
                {{ option.label }}
                <div v-if="tempValues[activePopover] === option.value" class="w-1.5 h-1.5 rounded-full bg-current"></div>
              </button>
            </template>

            <!-- Search Input -->
            <template v-if="getConfig(activePopover as FilterType)?.isSearch">
              <div class="px-2 py-2">
                <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Search</p>
                <input
                  type="text"
                  v-model="tempValues[activePopover]"
                  @click.stop
                  :placeholder="`Enter ${getConfig(activePopover as FilterType)?.label.toLowerCase()}...`"
                  class="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-400 text-slate-700"
                />
              </div>
            </template>

            <!-- Combined Sort + Date Range (sort only — date range inputs removed) -->
            <template v-if="getConfig(activePopover as FilterType)?.isSort && getConfig(activePopover as FilterType)?.isDateRange">
              <div class="space-y-1">
                <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">Sort by Date</p>
                <button
                  @click="setSortValue(activePopover + '_desc')"
                  class="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 rounded flex items-center justify-between transition-colors"
                  :class="[
                    isTempSortSelected(activePopover + '_desc')
                      ? getColorClasses(getConfig(activePopover as FilterType)?.color || 'blue').text + ' ' + getColorClasses(getConfig(activePopover as FilterType)?.color || 'blue').bg + ' font-medium'
                      : 'text-slate-700'
                  ]"
                >
                  {{ getConfig(activePopover as FilterType)?.sortLabels?.desc ?? 'Latest' }}
                  <div v-if="isTempSortSelected(activePopover + '_desc')" class="w-1.5 h-1.5 rounded-full bg-current"></div>
                </button>
                <button
                  @click="setSortValue(activePopover + '_asc')"
                  class="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 rounded flex items-center justify-between transition-colors"
                  :class="[
                    isTempSortSelected(activePopover + '_asc')
                      ? getColorClasses(getConfig(activePopover as FilterType)?.color || 'blue').text + ' ' + getColorClasses(getConfig(activePopover as FilterType)?.color || 'blue').bg + ' font-medium'
                      : 'text-slate-700'
                  ]"
                >
                  {{ getConfig(activePopover as FilterType)?.sortLabels?.asc ?? 'Oldest' }}
                  <div v-if="isTempSortSelected(activePopover + '_asc')" class="w-1.5 h-1.5 rounded-full bg-current"></div>
                </button>
              </div>
            </template>

            <!-- Date Range Only -->
            <template v-else-if="getConfig(activePopover as FilterType)?.isDateRange">
              <div class="pt-2 mt-1 space-y-1.5">
                <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">Date Range</p>
                <div class="flex flex-col gap-1">
                  <label class="text-xs text-slate-500 px-1">From</label>
                  <input
                    type="date"
                    :value="getTempDateValue('from')"
                    @input="setDateValueFromEvent('from', $event)"
                    @click.stop
                    class="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-400 text-slate-700"
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs text-slate-500 px-1">To</label>
                  <input
                    type="date"
                    :value="getTempDateValue('to')"
                    @input="setDateValueFromEvent('to', $event)"
                    @click.stop
                    class="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-400 text-slate-700"
                  />
                </div>
              </div>
            </template>

            <!-- Sort Only -->
            <template v-else-if="getConfig(activePopover as FilterType)?.isSort">
             <button
                @click="toggleSort(activePopover as FilterType, (activePopover + '_asc') as string)"
                class="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 rounded flex items-center justify-between transition-colors"
                :class="[
                  tempValues[activePopover] === (activePopover + '_asc')
                    ? getColorClasses(getConfig(activePopover as FilterType)?.color || 'blue').text + ' ' + getColorClasses(getConfig(activePopover as FilterType)?.color || 'blue').bg + ' font-medium'
                    : 'text-slate-700'
                ]"
              >
                {{ getConfig(activePopover as FilterType)?.sortLabels?.asc ?? 'Ascending' }}
                <div v-if="tempValues[activePopover] === (activePopover + '_asc')" class="w-1.5 h-1.5 rounded-full bg-current"></div>
              </button>

              <button
                @click="toggleSort(activePopover as FilterType, (activePopover + '_desc') as string)"
                class="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 rounded flex items-center justify-between transition-colors"
                :class="[
                  tempValues[activePopover] === (activePopover + '_desc')
                    ? getColorClasses(getConfig(activePopover as FilterType)?.color || 'blue').text + ' ' + getColorClasses(getConfig(activePopover as FilterType)?.color || 'blue').bg + ' font-medium'
                    : 'text-slate-700'
                ]"
              >
                {{ getConfig(activePopover as FilterType)?.sortLabels?.desc ?? 'Descending' }}
                <div v-if="tempValues[activePopover] === (activePopover + '_desc')" class="w-1.5 h-1.5 rounded-full bg-current"></div>
              </button>
            </template>
          </div>
        </div>

        <!-- Global Apply Button -->
        <div class="p-2 border-t border-slate-100 bg-white space-y-2">
          <button
            v-if="activePopover !== 'main' && isFilterActive(activePopover as FilterType)"
            @click="removeFilter(activePopover as FilterType)"
            class="w-full py-1.5 text-sm font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors"
          >
            Clear Filter
          </button>
          <button @click="applyFilter" class="w-full py-1.5 text-sm font-medium text-white bg-[#0052ff] hover:bg-blue-700 rounded-md transition-colors shadow-sm">
            Apply Filters
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
