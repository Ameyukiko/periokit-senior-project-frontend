<script setup lang="ts">
import { ref } from 'vue'
import { Keyboard, X } from 'lucide-vue-next'
import { MOD_KEY_LABEL, shortcutLabel } from '@/utils/keyboard'

const isOpen = ref(false)

const SHORTCUTS: [string, string][] = [
  ['Pan board', 'Drag empty space / Space + drag'],
  ['Zoom', `${MOD_KEY_LABEL} + scroll or pinch`],
  ['Fit / 100%', 'F / 0'],
  ['Edit note text', 'Double-click'],
  ['Paste image', shortcutLabel('V')],
  ['Delete', 'Delete'],
  ['Undo / Redo', `${shortcutLabel('Z')} / ${shortcutLabel('Z', { shift: true })}`],
  ['Snap rotation', 'Shift + drag handle'],
  ['iPad', 'One finger pans · two fingers zoom'],
  ['Cancel / close', 'Esc'],
]
</script>

<template>
  <div
    class="overflow-hidden rounded-[10px] border border-slate-200 bg-white/95 text-[12px] text-slate-500 shadow-[0_8px_26px_rgba(15,23,42,0.28)] backdrop-blur-md"
  >
    <button
      v-if="!isOpen"
      class="flex items-center gap-1.5 px-3 py-2 text-slate-800"
      @click="isOpen = true"
    >
      <Keyboard class="h-3.5 w-3.5" />
      Shortcuts
    </button>

    <div v-else class="relative">
      <div class="flex items-center gap-1.5 px-3 py-2 pr-8 text-slate-800">
        <Keyboard class="h-3.5 w-3.5" />
        Shortcuts
      </div>
      <button
        class="absolute right-1.5 top-1.5 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
        title="Close"
        @click="isOpen = false"
      >
        <X class="h-3.5 w-3.5" />
      </button>
      <table class="mx-3 mb-2.5 border-collapse">
        <tbody>
          <tr v-for="[action, keys] in SHORTCUTS" :key="action">
            <td class="whitespace-nowrap py-0.5 pr-4 text-slate-800">{{ action }}</td>
            <td class="py-0.5">{{ keys }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
