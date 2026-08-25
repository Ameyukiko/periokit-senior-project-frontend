<script setup lang="ts">
import { storeToRefs } from 'pinia'
import {
  BringToFront,
  ChevronUp,
  Redo2,
  SendToBack,
  StickyNote,
  Trash2,
  Undo2,
  Upload,
} from 'lucide-vue-next'
import { useXrayBoardStore } from '@/stores/xray-board'
import { shortcutLabel } from '@/utils/keyboard'

const emit = defineEmits<{ (event: 'upload'): void }>()

const undoLabel = `Undo (${shortcutLabel('Z')})`
const redoLabel = `Redo (${shortcutLabel('Z', { shift: true })})`

const board = useXrayBoardStore()
const { editable, selectedId, canUndo, canRedo, toolbarCollapsed, isSaving } = storeToRefs(board)

function addNote() {
  const center = board.viewCenter()
  board.addNote(center.x, center.y)
}
</script>

<template>
  <div
    class="flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-[0_8px_26px_rgba(15,23,42,0.28)] backdrop-blur-md"
  >
    <div v-if="!toolbarCollapsed" class="flex items-center gap-1">
      <!-- Off during a save: the payload is built when Save is pressed, so a
           film added now would be on screen but not in it. -->
      <button
        class="xray-tool"
        :disabled="!editable || isSaving"
        title="Add image"
        @click="emit('upload')"
      >
        <Upload class="h-4 w-4" />
        Add image
      </button>
      <button class="xray-tool" :disabled="!editable" title="Sticky note" @click="addNote">
        <StickyNote class="h-4 w-4" />
        Note
      </button>

      <span class="mx-0.5 h-[22px] w-px bg-slate-200"></span>

      <button
        class="xray-tool"
        :disabled="!editable || !selectedId"
        title="Bring to front"
        @click="board.reorder('front')"
      >
        <BringToFront class="h-4 w-4" />
      </button>
      <button
        class="xray-tool"
        :disabled="!editable || !selectedId"
        title="Send to back"
        @click="board.reorder('back')"
      >
        <SendToBack class="h-4 w-4" />
      </button>
      <button
        class="xray-tool"
        :disabled="!editable || !selectedId"
        title="Delete (Del)"
        @click="board.removeSelected()"
      >
        <Trash2 class="h-4 w-4" />
      </button>

      <span class="mx-0.5 h-[22px] w-px bg-slate-200"></span>

      <button
        class="xray-tool"
        :disabled="!editable || !canUndo"
        :title="undoLabel"
        @click="board.undo()"
      >
        <Undo2 class="h-4 w-4" />
      </button>
      <button
        class="xray-tool"
        :disabled="!editable || !canRedo"
        :title="redoLabel"
        @click="board.redo()"
      >
        <Redo2 class="h-4 w-4" />
      </button>
    </div>

    <button class="xray-tool" title="Hide / show toolbar" @click="board.toggleToolbar()">
      <ChevronUp
        class="h-4 w-4 transition-transform duration-200"
        :class="{ 'rotate-180': toolbarCollapsed }"
      />
    </button>
  </div>
</template>

<style scoped>
.xray-tool {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 13.5px;
  line-height: 1.35;
  white-space: nowrap;
  color: #3f4d61;
}
.xray-tool:hover:not(:disabled) {
  background: #f1f5fb;
}
.xray-tool:disabled {
  opacity: 0.34;
  cursor: default;
}
</style>
