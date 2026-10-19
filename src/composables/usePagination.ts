import { computed, ref, type Ref } from 'vue'

export function usePagination<T>(items: Ref<T[]>, initialPageSize = 10) {
  const page = ref(1)
  const pageSize = ref(initialPageSize)

  const total = computed(() => items.value.length)
  const totalPages = computed(() => Math.ceil(total.value / pageSize.value))
  const paginatedItems = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return items.value.slice(start, start + pageSize.value)
  })

  const resetPage = () => {
    page.value = 1
  }

  return {
    page,
    pageSize,
    total,
    totalPages,
    paginatedItems,
    resetPage,
  }
}
