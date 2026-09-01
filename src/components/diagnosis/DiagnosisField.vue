<script setup lang="ts">
import { ref } from 'vue'
import { RotateCcw, Info } from 'lucide-vue-next'

defineProps<{
  label: string
  hint?: string
  tooltip?: string
  // Nothing recorded yet — the header counts these.
  missing?: boolean
  // The doctor typed over what the chart recorded.
  overridden?: boolean
}>()

const emit = defineEmits<{ reset: [] }>()
const isTooltipHovered = ref(false)
</script>

<template>
  <div class="flex flex-col gap-1 min-w-0">
    <span class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
      {{ label }}

      <!-- Tooltip Info Icon -->
      <div v-if="tooltip" class="relative inline-flex items-center">
        <button
          type="button"
          class="text-slate-300 hover:text-slate-500 focus:text-slate-500 outline-none transition-colors"
          :title="tooltip"
          @mouseenter="isTooltipHovered = true"
          @mouseleave="isTooltipHovered = false"
        >
          <Info class="w-3 h-3" />
        </button>
        <div
          v-if="isTooltipHovered"
          class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-slate-800 text-white text-[11px] font-normal normal-case rounded-lg shadow-lg whitespace-normal w-48 text-center z-50 pointer-events-none leading-tight"
        >
          {{ tooltip }}
          <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
        </div>
      </div>

      <button
        v-if="overridden"
        type="button"
        class="flex items-center gap-0.5 text-[9px] font-bold text-[#0052ff] normal-case hover:underline"
        title="Use the chart's value again"
        @click="emit('reset')"
      >
        <RotateCcw class="w-2.5 h-2.5" /> edited
      </button>
    </span>

    <div class="flex items-center gap-1.5 flex-nowrap">
      <span v-if="missing" class="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
      <slot />
    </div>

    <span v-if="hint" class="text-[10px] text-slate-400 truncate" :title="hint">{{ hint }}</span>
  </div>
</template>
