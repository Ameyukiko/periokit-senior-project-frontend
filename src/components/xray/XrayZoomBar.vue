<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Minus, Plus } from 'lucide-vue-next'
import { useXrayBoardStore } from '@/stores/xray-board'

const board = useXrayBoardStore()
const { viewport } = storeToRefs(board)

const zoomLabel = computed(() => `${Math.round(viewport.value.scale * 100)}%`)
</script>

<template>
  <div
    class="flex items-center gap-1 rounded-[10px] border border-slate-200 bg-white/95 p-1.5 shadow-[0_8px_26px_rgba(15,23,42,0.28)] backdrop-blur-md"
  >
    <button class="xray-zoom-btn" title="Zoom out" @click="board.zoomBy(0.8)">
      <Minus class="h-3.5 w-3.5" />
    </button>
    <span class="min-w-13 text-center text-[12px] tabular-nums text-slate-500">{{ zoomLabel }}</span>
    <button class="xray-zoom-btn" title="Zoom in" @click="board.zoomBy(1.25)">
      <Plus class="h-3.5 w-3.5" />
    </button>
    <button class="xray-zoom-btn" title="Fit board (F)" @click="board.fit()">Fit</button>
    <button class="xray-zoom-btn" title="Actual size (0)" @click="board.resetZoom()">100%</button>
  </div>
</template>

<style scoped>
.xray-zoom-btn {
  display: grid;
  place-items: center;
  padding: 5px 9px;
  border-radius: 6px;
  font-size: 12px;
  color: #3f4d61;
}
.xray-zoom-btn:hover {
  background: #f1f5fb;
}
</style>
