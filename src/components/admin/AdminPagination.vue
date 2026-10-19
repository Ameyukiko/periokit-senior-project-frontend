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
const start = computed(() => (props.page - 1) * props.pageSize)
const ARROW = 'w-8 h-8 rounded-lg flex items-center justify-center disabled:text-slate-300 disabled:cursor-not-allowed text-slate-600 enabled:hover:bg-slate-100'
</script>

<template>
  <nav v-if="total > 0" aria-label="Pagination" class="flex items-center justify-between px-4 py-3 border-t border-slate-100">
    <span class="text-[12px] text-slate-500">Showing {{ start + 1 }}–{{ Math.min(start + pageSize, total) }} of {{ total }}</span>
    <div class="flex items-center gap-1">
      <button :class="ARROW" :disabled="page <= 1" aria-label="Previous page" @click="emit('change', page - 1)">
        <ChevronLeft class="w-4 h-4" />
      </button>
      <template v-for="(p, i) in pages" :key="p ?? `gap-${i}`">
        <span v-if="p === null" class="px-2 text-slate-400">…</span>
        <button
          v-else
          class="min-w-8 h-8 px-2 rounded-lg text-[13px] font-bold"
          :class="p === page ? 'bg-[#0052ff] text-white' : 'text-slate-600 hover:bg-slate-100'"
          :aria-current="p === page ? 'page' : undefined"
          @click="emit('change', p)"
        >
          {{ p }}
        </button>
      </template>
      <button :class="ARROW" :disabled="page >= totalPages" aria-label="Next page" @click="emit('change', page + 1)">
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>
  </nav>
</template>
