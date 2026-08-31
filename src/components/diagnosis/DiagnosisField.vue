<script setup lang="ts">
import { RotateCcw } from 'lucide-vue-next'

defineProps<{
  label: string
  hint?: string
  // Nothing recorded yet — the header counts these.
  missing?: boolean
  // The doctor typed over what the chart recorded.
  overridden?: boolean
}>()

const emit = defineEmits<{ reset: [] }>()
</script>

<template>
  <div class="flex flex-col gap-1 min-w-0">
    <span class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
      <span v-if="missing" class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
      {{ label }}
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

    <div class="flex items-center gap-1.5 flex-wrap">
      <slot />
    </div>

    <span v-if="hint" class="text-[10px] text-slate-400 truncate" :title="hint">{{ hint }}</span>
  </div>
</template>
