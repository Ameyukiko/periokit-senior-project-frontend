<script setup lang="ts">
import { computed, ref } from 'vue'
import { RotateCcw, Info } from 'lucide-vue-next'

const props = defineProps<{
  label: string
  hint?: string
  /**
   * Laid out rather than written as a paragraph: a bold answer on the first
   * line, the sentence that explains it, then the caveats one to a bullet. A
   * box this narrow is unreadable as prose.
   */
  tooltip?: { title: string; body?: string; points?: string[] }
  // The doctor typed over the value the chart started the field with.
  overridden?: boolean
  // A saved visit nobody has pressed Edit on: the mark that the value was
  // typed over is still worth reading, but it is no longer an offer to undo it.
  readonly?: boolean
}>()

const emit = defineEmits<{ reset: [] }>()
const isTooltipHovered = ref(false)

// The same words in one run, for a reader that gets no layout at all.
const tooltipLabel = computed(() =>
  props.tooltip
    ? [props.tooltip.title, props.tooltip.body, ...(props.tooltip.points ?? [])]
        .filter(Boolean)
        .join('. ')
    : undefined,
)
</script>

<template>
  <div class="flex flex-col gap-1 min-w-0">
    <span class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
      {{ label }}

      <!-- Tooltip Info Icon -->
      <div v-if="tooltip" class="relative inline-flex items-center">
        <!-- No `title` here: the browser would draw its own tooltip on top of
             the one below, showing the same text twice. `aria-label` carries it
             to screen readers instead. -->
        <button
          type="button"
          class="text-slate-300 hover:text-slate-500 focus:text-slate-500 outline-none transition-colors"
          :aria-label="tooltipLabel"
          @mouseenter="isTooltipHovered = true"
          @mouseleave="isTooltipHovered = false"
          @focus="isTooltipHovered = true"
          @blur="isTooltipHovered = false"
        >
          <Info class="w-3 h-3" />
        </button>
        <div
          v-if="isTooltipHovered"
          class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-3 py-2 bg-slate-800 text-[11px] font-normal normal-case tracking-normal rounded-lg shadow-lg whitespace-normal w-60 text-left z-50 pointer-events-none leading-snug"
        >
          <span class="block font-bold text-white">{{ tooltip.title }}</span>
          <span v-if="tooltip.body" class="block mt-1 text-slate-300">{{ tooltip.body }}</span>
          <span
            v-for="point in tooltip.points"
            :key="point"
            class="flex gap-1.5 mt-1 text-slate-300"
          >
            <span class="text-slate-500 shrink-0">•</span>
            <span>{{ point }}</span>
          </span>
          <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
        </div>
      </div>

      <template v-if="overridden">
        <button
          v-if="!readonly"
          type="button"
          class="flex items-center gap-0.5 text-[9px] font-bold text-[#0052ff] normal-case hover:underline"
          title="Use the chart's value again"
          @click="emit('reset')"
        >
          <RotateCcw class="w-2.5 h-2.5" /> edited
        </button>
        <!-- Read-only: the same mark, with nothing to press. Undoing the
             override would change the diagnosis of a visit nobody is editing. -->
        <span
          v-else
          class="flex items-center gap-0.5 text-[9px] font-bold text-slate-400 normal-case"
          title="Custom value entered. Click Edit to change it."
        >
          <RotateCcw class="w-2.5 h-2.5" /> edited
        </span>
      </template>
    </span>

    <div class="flex items-center gap-2 flex-nowrap">
      <slot />
    </div>

    <!-- A slot rather than the plain string where the hint carries something to
         press, which is why this one is not truncated. -->
    <span v-if="$slots.hint" class="flex items-center gap-1.5 text-[10px] text-slate-400 min-w-0">
      <slot name="hint" />
    </span>
    <span v-else-if="hint" class="text-[10px] text-slate-400 truncate" :title="hint">{{ hint }}</span>
  </div>
</template>
