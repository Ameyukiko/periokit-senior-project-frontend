<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{ page: number; totalPages: number; total: number; pageSize: number }>()
const emit = defineEmits<{ change: [page: number] }>()

/** Page numbers with gaps (null) around the current page. */
const pages = computed(() => {
  const { page, totalPages } = props
  const out: (number | null)[] = []
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) out.push(p)
    else if (out[out.length - 1] !== null) out.push(null)
  }
  return out
})
const range = computed(() => {
  if (!props.total) return '0 users'
  const start = (props.page - 1) * props.pageSize + 1
  return `${start}–${Math.min(props.page * props.pageSize, props.total)} of ${props.total}`
})
const BTN = 'min-w-8 h-8 px-2 rounded-lg text-sm font-semibold disabled:opacity-40'
</script>

<template>
  <nav aria-label="Pagination" class="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-200">
    <p class="text-xs text-slate-500">{{ range }}</p>
    <div class="flex items-center gap-1">
      <button :class="BTN" class="hover:bg-slate-100" :disabled="page <= 1" aria-label="Previous page" @click="emit('change', page - 1)">
        <ChevronLeft class="w-4 h-4 mx-auto" />
      </button>
      <template v-for="(p, i) in pages" :key="p ?? `gap-${i}`">
        <span v-if="p === null" class="px-1 text-slate-400">…</span>
        <button
          v-else
          :class="[BTN, p === page ? 'bg-[#0052ff] text-white' : 'hover:bg-slate-100 text-slate-700']"
          :aria-current="p === page ? 'page' : undefined"
          @click="emit('change', p)"
        >
          {{ p }}
        </button>
      </template>
      <button :class="BTN" class="hover:bg-slate-100" :disabled="page >= totalPages" aria-label="Next page" @click="emit('change', page + 1)">
        <ChevronRight class="w-4 h-4 mx-auto" />
      </button>
    </div>
  </nav>
</template>
