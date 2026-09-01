<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { AArrowDown, AArrowUp, Plus, X } from 'lucide-vue-next'
import { NOTE_FONT } from '@/domain/xray/xray.constants'
import { useXrayBoardStore } from '@/stores/xray-board'

const board = useXrayBoardStore()
const { selectedNote, editable, noteColors } = storeToRefs(board)

const colorInput = ref<HTMLInputElement | null>(null)
// Closing the panel hides it until another note is selected.
const closedFor = ref<string | null>(null)

const note = computed(() => (editable.value ? selectedNote.value : null))
const isOpen = computed(() => !!note.value && closedFor.value !== note.value.id)

watch(note, current => {
  if (current && closedFor.value !== current.id) closedFor.value = null
})

function pickCustomColor(event: Event) {
  board.addCustomNoteColor((event.target as HTMLInputElement).value)
}
</script>

<template>
  <aside
    v-if="isOpen && note"
    class="w-49 rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-[0_8px_26px_rgba(15,23,42,0.28)] backdrop-blur-md"
  >
    <div class="mb-2.5 flex items-center justify-between gap-2">
      <h3 class="text-[12px] font-medium uppercase tracking-[0.08em] text-slate-500">
        Sticky note
      </h3>
      <button
        class="rounded p-0.5 text-slate-400 hover:text-slate-800"
        title="Close"
        @click="closedFor = note.id"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <div class="grid grid-cols-6 gap-1.5">
      <button
        v-for="color in noteColors"
        :key="color"
        class="aspect-square w-full rounded-md border-2 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.14)] transition-transform hover:scale-110"
        :class="note.noteColor === color ? 'border-[#0052ff]' : 'border-transparent'"
        :style="{ background: color }"
        :title="color"
        @click="board.setNoteColor(color)"
      ></button>
      <button
        class="grid aspect-square w-full place-items-center rounded-md border-2 border-dashed border-slate-300 text-slate-400 hover:border-[#0052ff] hover:text-[#0052ff]"
        title="Add custom colour"
        @click="colorInput?.click()"
      >
        <Plus class="h-3.5 w-3.5" />
      </button>
      <input
        ref="colorInput"
        type="color"
        class="pointer-events-none absolute h-0 w-0 opacity-0"
        :value="note.noteColor"
        @change="pickCustomColor"
      />
    </div>

    <div class="mt-3.5 flex items-center justify-between gap-2">
      <span class="text-[12px] text-slate-500">
        Text size <b class="font-semibold tabular-nums text-slate-800">{{ note.noteFontSize }}</b>
      </span>
      <div class="flex gap-1.5">
        <button
          class="xray-font-btn"
          :disabled="note.noteFontSize <= NOTE_FONT.min"
          title="Smaller text"
          @click="board.changeNoteFontSize(-NOTE_FONT.step)"
        >
          <AArrowDown class="h-4 w-4" />
        </button>
        <button
          class="xray-font-btn"
          :disabled="note.noteFontSize >= NOTE_FONT.max"
          title="Larger text"
          @click="board.changeNoteFontSize(NOTE_FONT.step)"
        >
          <AArrowUp class="h-4 w-4" />
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.xray-font-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 28px;
  border: 1px solid #e3e9f1;
  border-radius: 7px;
  background: #fff;
  font-size: 12px;
  line-height: 1;
  color: #3f4d61;
}
.xray-font-btn:hover:not(:disabled) {
  border-color: #c7d3e5;
  color: #0f172a;
}
.xray-font-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
