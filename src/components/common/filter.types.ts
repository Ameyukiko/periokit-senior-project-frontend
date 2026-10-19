import type { Component } from 'vue'

export type FilterType = 'phase' | 'date' | 'doctor' | 'gender' | 'age' | 'name' | 'sort'
export type FilterColor = 'blue' | 'rose' | 'emerald' | 'purple'
export type SortDirection = 'asc' | 'desc'
export type DateSortValue = `${string}_${SortDirection}`

export interface FilterOption {
  value: string
  label: string
}

export interface DateRangeValue {
  from: string
  to: string
}

export interface CombinedDateSortValue extends DateRangeValue {
  sort: DateSortValue | null
}

export type FilterValue = string | DateSortValue | DateRangeValue | CombinedDateSortValue | null | undefined
export type FilterValues = Partial<Record<FilterType, FilterValue>>

export interface FilterConfig<TType extends FilterType = FilterType> {
  type: TType
  label: string
  icon: Component
  color: FilterColor
  options?: FilterOption[]
  isSearch?: boolean
  isDateRange?: boolean
  isSort?: boolean
  sortLabels?: { asc: string; desc: string }
}
