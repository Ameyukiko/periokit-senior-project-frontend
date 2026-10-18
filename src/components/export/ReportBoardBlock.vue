<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { ImageOff } from 'lucide-vue-next'
import { useXrayBoardStore } from '@/stores/xray-board'
import { boardBounds } from '@/domain/xray/xray.geometry'
import type { XrayObject } from '@/domain/xray/xray.types'


const props = defineProps<{ title: string; objects: XrayObject[]; width: number; maxH: number }>()
const { imageUrls, failedAssets } = storeToRefs(useXrayBoardStore())

const PAD = 30
const box = computed(() => {
  const b = boardBounds(props.objects, []) ?? { minX: 0, minY: 0, maxX: 1, maxY: 1 }
  const w = b.maxX - b.minX + PAD * 2
  const h = b.maxY - b.minY + PAD * 2
  const k = Math.min(props.width / w, props.maxH / h)
  return { minX: b.minX - PAD, minY: b.minY - PAD, k, W: w * k, H: h * k }
})
const place = (o: XrayObject) => {
  const { minX, minY, k } = box.value
  return {
    left: `${(o.posX - minX) * k}px`,
    top: `${(o.posY - minY) * k}px`,
    width: `${o.width * k}px`,
    height: `${o.height * k}px`,
    transform: `rotate(${o.rotation}deg)`,
  }
}
const hasFilm = (o: XrayObject) => o.objectType === 'image' && !!imageUrls.value[o.assetId] && !failedAssets.value.has(o.assetId)
const count = (type: XrayObject['objectType']) => props.objects.filter((o) => o.objectType === type).length
</script>

<template>
  <div :style="{ width: `${width}px` }">
    <h2 class="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">{{ title }}</h2>
    <p v-if="!objects.length" class="py-16 text-center text-[12px] text-slate-400 rounded border border-dashed border-slate-200">
      Nothing on the board for this visit
    </p>
    <template v-else>
      <div class="relative mx-auto rounded border border-slate-200 bg-slate-50 overflow-hidden" :style="{ width: `${box.W}px`, height: `${box.H}px` }">
        <div v-for="o in objects" :key="o.id" class="absolute" :style="place(o)">
          <template v-if="o.objectType === 'image'">
            <img v-if="hasFilm(o)" :src="imageUrls[o.assetId]" class="block h-full w-full rounded-sm bg-black object-contain" alt="Radiograph" />
            <div v-else class="h-full w-full rounded-sm bg-slate-200 text-slate-400 flex items-center justify-center">
              <ImageOff class="w-4 h-4" />
            </div>
          </template>
          <div
            v-else
            class="h-full w-full rounded-sm shadow-sm p-1 leading-snug whitespace-pre-wrap overflow-hidden"
            :style="{ background: o.noteColor, fontSize: `${o.noteFontSize * box.k}px` }"
          >
            {{ o.noteText }}
          </div>
        </div>
      </div>
      <p class="text-[8px] text-slate-400 mt-1 text-center">
        Layout as arranged on the board · {{ count('image') }} images · {{ count('note') }} notes
      </p>
    </template>
  </div>
</template>
