<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ListFilter, ChevronLeft, ChevronRight, X } from 'lucide-vue-next'

export type FilterType = 'phase' | 'date' | 'doctor' | 'gender' | 'age' | 'name' | 'sort'

export interface FilterOption {
  value: string
  label: string
}

export interface FilterConfig {
  type: FilterType
  label: string
  icon: any
  color: 'blue' | 'rose' | 'emerald' | 'purple'
  options?: FilterOption[]
  isSearch?: boolean
  isDateRange?: boolean
  isSort?: boolean
}

const props = defineProps<{
  configs: FilterConfig[]
  modelValue: Record<string, any>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
  'apply': []
}>()

// Local state
const activePopover = ref<'main' | FilterType | null>(null)
const tempValues = ref<Record<string, any>>({})

// Chips are teleported into a slot the parent owns (full-width row below the
// header). Only enable the teleport once mounted so the target exists. If the
// host page provides no #active-filter-chips slot, fall back to rendering the
// chips in place so the component stays self-contained.
const isReady = ref(false)
const hasChipsSlot = ref(false)
onMounted(() => {
  isReady.value = true
  hasChipsSlot.value = !!document.getElementById('active-filter-chips')
})

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
  if (!tempValues.value[key]) {
    tempValues.value[key] = {}
  }
  tempValues.value[key][field] = value
}

// Computed helpers
const hasActiveFilters = computed(() => {
  return props.configs.some(c => isFilterActive(c.type))
})

const activeFilterCount = computed(() => {
  let count = 0
  Object.entries(props.modelValue).forEach(([, value]) => {
    if (value === null || value === undefined || value === '') return
    if (typeof value === 'object') {
      Object.values(value).forEach(v => {
        if (v !== null && v !== undefined && v !== '') count++
      })
    } else {
      count++
    }
  })
  return count
})

const getConfig = (type: FilterType) => {
  return props.configs.find(c => c.type === type)
}

const getFilterValue = (type: FilterType) => {
  return props.modelValue[type]
}

// A filter counts as "active" only when it holds a real value.
// Object-typed values (date range / sort) are always truthy, so we must
// inspect their inner values instead of relying on truthiness.
const isFilterActive = (type: FilterType) => {
  const value = props.modelValue[type]
  if (value === null || value === undefined || value === '') return false
  if (typeof value === 'object') {
    return Object.values(value).some(v => v !== null && v !== undefined && v !== '')
  }
  return true
}

const getFilterDisplay = (type: FilterType) => {
  const value = getFilterValue(type)
  const config = getConfig(type)

  if (!value) return config?.label || type

  // Handle combined sort + date range
  if (config?.isSort && config?.isDateRange && typeof value === 'object') {
    const parts = []
    if (value.sort) {
      if (value.sort === 'date_asc') parts.push('Oldest')
      if (value.sort === 'date_desc') parts.push('Newest')
    }
    if (value.from || value.to) {
      const from = value.from || '...'
      const to = value.to || '...'
      parts.push(`${from}–${to}`)
    }
    return parts.length > 0 ? parts.join(', ') : config.label
  }

  // Handle date range only
  if (config?.isDateRange && !config?.isSort) {
    if (value.from || value.to) {
      const from = value.from || '...'
      const to = value.to || '...'
      return `${from} – ${to}`
    }
    return config.label
  }

  // Handle sort only
  if (config?.isSort && !config?.isDateRange) {
    if (value === 'asc') return `${config.label} (A-Z)`
    if (value === 'desc') return `${config.label} (Z-A)`
    if (value?.includes('asc')) return value.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    if (value?.includes('desc')) return value.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    return config.label
  }

  // Handle select options
  if (config?.options) {
    const option = config.options.find(o => o.value === value)
    return option?.label || value
  }

  // Handle search
  if (config?.isSearch) {
    return value
  }

  return value
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
  tempValues.value[type] = currentValue === value ? null : value
}

const toggleOption = (type: FilterType, value: string) => {
  const currentValue = tempValues.value[type]
  tempValues.value[type] = currentValue === value ? '' : value
}

const setSortValue = (value: string) => {
  const key = getCurrentKey()
  if (!tempValues.value[key]) {
    tempValues.value[key] = {}
  }
  const currentSort = tempValues.value[key]?.sort
  tempValues.value[key] = { ...tempValues.value[key], sort: currentSort === value ? null : value }
}

const getColorClasses = (color: string) => {
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
        class="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden flex flex-col"
        @click.stop
      >
        <!-- Main Menu -->
        <div v-if="activePopover === 'main'" class="py-2 flex-1">
          <div class="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Add Filter</div>
          <button
            v-for="config in configs"
            :key="config.type"
            @click="openSub(config.type)"
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

            <!-- Combined Sort + Date Range -->
            <template v-if="getConfig(activePopover as FilterType)?.isSort && getConfig(activePopover as FilterType)?.isDateRange">
              <div class="space-y-2">
                <!-- Sort Options -->
                <div class="space-y-1">
                  <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">Sort by Date</p>
                  <button
                    @click="setSortValue(activePopover + '_desc')"
                    class="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 rounded flex items-center justify-between transition-colors"
                    :class="[
                      tempValues[activePopover]?.sort === (activePopover + '_desc')
                        ? getColorClasses(getConfig(activePopover as FilterType)?.color || 'blue').text + ' ' + getColorClasses(getConfig(activePopover as FilterType)?.color || 'blue').bg + ' font-medium'
                        : 'text-slate-700'
                    ]"
                  >
                    Newest to Oldest <div v-if="tempValues[activePopover]?.sort === (activePopover + '_desc')" class="w-1.5 h-1.5 rounded-full bg-current"></div>
                  </button>
                  <button
                    @click="setSortValue(activePopover + '_asc')"
                    class="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 rounded flex items-center justify-between transition-colors"
                    :class="[
                      tempValues[activePopover]?.sort === (activePopover + '_asc')
                        ? getColorClasses(getConfig(activePopover as FilterType)?.color || 'blue').text + ' ' + getColorClasses(getConfig(activePopover as FilterType)?.color || 'blue').bg + ' font-medium'
                        : 'text-slate-700'
                    ]"
                  >
                    Oldest to Newest <div v-if="tempValues[activePopover]?.sort === (activePopover + '_asc')" class="w-1.5 h-1.5 rounded-full bg-current"></div>
                  </button>
                </div>

                <!-- Date Range -->
                <div class="pt-2 mt-1 border-t border-slate-100 space-y-1.5">
                  <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">Date Range</p>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs text-slate-500 px-1">From</label>
                    <input
                      type="date"
                      :value="tempValues[activePopover]?.from || ''"
                      @input="(e: any) => setDateValue('from', e.target.value)"
                      @click.stop
                      class="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-400 text-slate-700"
                    />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs text-slate-500 px-1">To</label>
                    <input
                      type="date"
                      :value="tempValues[activePopover]?.to || ''"
                      @input="(e: any) => setDateValue('to', e.target.value)"
                      @click.stop
                      class="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-400 text-slate-700"
                    />
                  </div>
                </div>
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
                    :value="tempValues[activePopover]?.from || ''"
                    @input="(e: any) => setDateValue('from', e.target.value)"
                    @click.stop
                    class="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-400 text-slate-700"
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs text-slate-500 px-1">To</label>
                  <input
                    type="date"
                    :value="tempValues[activePopover]?.to || ''"
                    @input="(e: any) => setDateValue('to', e.target.value)"
                    @click.stop
                    class="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-400 text-slate-700"
                  />
                </div>
              </div>
            </template>

            <!-- Sort Only -->
            <template v-else-if="getConfig(activePopover as FilterType)?.isSort">
              <button
                @click="toggleSort(activePopover as FilterType, (activePopover + '_desc') as string)"
                class="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 rounded flex items-center justify-between transition-colors"
                :class="[
                  tempValues[activePopover] === (activePopover + '_desc')
                    ? getColorClasses(getConfig(activePopover as FilterType)?.color || 'blue').text + ' ' + getColorClasses(getConfig(activePopover as FilterType)?.color || 'blue').bg + ' font-medium'
                    : 'text-slate-700'
                ]"
              >
                Newest First / Descending <div v-if="tempValues[activePopover] === (activePopover + '_desc')" class="w-1.5 h-1.5 rounded-full bg-current"></div>
              </button>
              <button
                @click="toggleSort(activePopover as FilterType, (activePopover + '_asc') as string)"
                class="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 rounded flex items-center justify-between transition-colors"
                :class="[
                  tempValues[activePopover] === (activePopover + '_asc')
                    ? getColorClasses(getConfig(activePopover as FilterType)?.color || 'blue').text + ' ' + getColorClasses(getConfig(activePopover as FilterType)?.color || 'blue').bg + ' font-medium'
                    : 'text-slate-700'
                ]"
              >
                Oldest First / Ascending <div v-if="tempValues[activePopover] === (activePopover + '_asc')" class="w-1.5 h-1.5 rounded-full bg-current"></div>
              </button>
            </template>
          </div>
        </div>

        <!-- Global Apply Button -->
        <div class="p-2 border-t border-slate-100 bg-white">
          <button @click="applyFilter" class="w-full py-1.5 text-sm font-medium text-white bg-[#0052ff] hover:bg-blue-700 rounded-md transition-colors shadow-sm">
            Apply Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Active Filter Chips (rendered into the parent-owned full-width row) -->
    <Teleport to="#active-filter-chips" :disabled="!hasChipsSlot" v-if="isReady">
      <div v-if="hasActiveFilters" class="flex flex-wrap items-center gap-2">
        <template v-for="config in configs" :key="config.type">
          <div
            v-if="isFilterActive(config.type)"
            class="flex items-center rounded-full pl-3 pr-1 py-1 shadow-sm border relative"
            :class="getColorClasses(config.color).bg + ' ' + getColorClasses(config.color).border"
          >
            <span
              class="text-xs font-medium cursor-pointer"
              :class="getColorClasses(config.color).text"
              @click="openSub(config.type)"
            >
              {{ config.label }}: <span class="text-slate-900">{{ getFilterDisplay(config.type) }}</span>
            </span>
            <button
              @click="removeFilter(config.type)"
              class="ml-1.5 p-1 rounded-full transition-colors"
              :class="getColorClasses(config.color).text.replace('600', '400') + ' hover:' + getColorClasses(config.color).text.replace('600', '600') + ' hover:' + getColorClasses(config.color).bg.replace('50', '100')"
            >
              <X class="w-3 h-3"/>
            </button>
          </div>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.filter-panel {
  position: relative;
}
</style>
