<script setup lang="ts">
import { X } from 'lucide-vue-next'
import type {
  CombinedDateSortValue,
  DateRangeValue,
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
}>()

const isObjectValue = (value: FilterValue): value is DateRangeValue | CombinedDateSortValue => {
  return typeof value === 'object' && value !== null
}

const isEmptyFilterValue = (value: FilterValue) => {
  if (value === null || value === undefined || value === '') return true
  if (isObjectValue(value)) return !Object.values(value).some(v => v !== null && v !== undefined && v !== '')
  return false
}

const isFilterActive = (type: FilterType) => !isEmptyFilterValue(props.modelValue[type])

const getFilterValue = (type: FilterType) => props.modelValue[type]

const getFilterDisplay = (config: FilterConfig) => {
  const value = getFilterValue(config.type)
  if (isEmptyFilterValue(value)) return config.label

  if (config.isSort && config.isDateRange && isObjectValue(value)) {
    const parts = []
    if ('sort' in value && value.sort) {
      if (value.sort === 'date_asc') parts.push('Oldest')
      if (value.sort === 'date_desc') parts.push('Latest')
    }
    if (value.from || value.to) {
      const from = value.from || '...'
      const to = value.to || '...'
      parts.push(`${from}-${to}`)
    }
    return parts.length > 0 ? parts.join(', ') : config.label
  }

  if (config.isDateRange && !config.isSort && isObjectValue(value)) {
    if (value.from || value.to) {
      const from = value.from || '...'
      const to = value.to || '...'
      return `${from} - ${to}`
    }
    return config.label
  }

  if (config.isSort && !config.isDateRange) {
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

  if (config.options) {
    const option = config.options.find(o => o.value === String(value))
    return option?.label || String(value)
  }

  return String(value)
}

const removeFilter = (config: FilterConfig) => {
  const nextValues = { ...props.modelValue }

  if (config.isDateRange && config.isSort) {
    nextValues[config.type] = { sort: null, from: '', to: '' }
  } else if (config.isDateRange) {
    nextValues[config.type] = { from: '', to: '' }
  } else {
    nextValues[config.type] = ''
  }

  emit('update:modelValue', nextValues)
}

const getColorClasses = (color: FilterConfig['color']) => {
  const colors = {
    blue: { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    rose: { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
    emerald: { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    purple: { text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  }
  return colors[color]
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <template v-for="config in configs" :key="config.type">
      <div
        v-if="isFilterActive(config.type)"
        class="flex items-center rounded-full pl-3 pr-1 py-1 shadow-sm border relative"
        :class="getColorClasses(config.color).bg + ' ' + getColorClasses(config.color).border"
      >
        <span
          class="text-xs font-medium"
          :class="getColorClasses(config.color).text"
        >
          {{ config.label }}: <span class="text-slate-900">{{ getFilterDisplay(config) }}</span>
        </span>
        <button
          @click="removeFilter(config)"
          class="ml-1.5 p-1 rounded-full transition-colors"
          :class="getColorClasses(config.color).text.replace('600', '400') + ' hover:' + getColorClasses(config.color).text + ' hover:' + getColorClasses(config.color).bg.replace('50', '100')"
        >
          <X class="w-3 h-3" />
        </button>
      </div>
    </template>
  </div>
</template>
