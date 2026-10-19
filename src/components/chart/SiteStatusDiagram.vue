<script setup lang="ts">
import { computed } from 'vue'
import { isUpperTooth } from '@/domain/chart/chart.rules'
import type { ToothData, ToothId } from '@/domain/chart/chart.types'

const props = defineProps<{
  toothId: ToothId
  toothData: ToothData
  field: 'bop' | 'pi'
  label: string
  percentage: string | undefined
  activeFill: string
  badgeClass: string
  clipIdPrefix: string
}>()

const clipId = computed(() => `${props.clipIdPrefix}-${props.toothId}`)
const topSurface = computed(() =>
  isUpperTooth(props.toothId) ? props.toothData.buccal : props.toothData.lingual
)
const bottomSurface = computed(() =>
  isUpperTooth(props.toothId) ? props.toothData.lingual : props.toothData.buccal
)
</script>

<template>
  <div class="relative bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex flex-col items-center">
    <div
      v-if="percentage !== '0%'"
      class="absolute top-2.5 right-2.5 px-2 py-0.5 text-[9px] font-black rounded-lg border shadow-sm animate-in fade-in zoom-in duration-300"
      :class="badgeClass"
    >
      {{ percentage }}
    </div>

    <div class="relative w-20 h-20 mb-2">
      <svg viewBox="0 0 100 100" class="w-full h-full">
        <defs>
          <clipPath :id="clipId">
            <rect x="4" y="4" width="92" height="92" rx="26" />
          </clipPath>
        </defs>
        <g :clip-path="`url(#${clipId})`">
          <rect x="4" y="4" width="92" height="92" rx="26" fill="white" />

          <path v-if="topSurface[field][0]" d="M50 50 L0 50 L0 0 Z" :fill="activeFill" />
          <path v-if="topSurface[field][1]" d="M50 50 L0 0 L100 0 Z" :fill="activeFill" />
          <path v-if="topSurface[field][2]" d="M50 50 L100 0 L100 50 Z" :fill="activeFill" />

          <path v-if="bottomSurface[field][0]" d="M50 50 L0 50 L0 100 Z" :fill="activeFill" />
          <path v-if="bottomSurface[field][1]" d="M50 50 L0 100 L100 100 Z" :fill="activeFill" />
          <path v-if="bottomSurface[field][2]" d="M50 50 L100 100 L100 50 Z" :fill="activeFill" />

          <line x1="0" y1="0" x2="100" y2="100" stroke="#e2e8f0" stroke-width="1.5" />
          <line x1="100" y1="0" x2="0" y2="100" stroke="#e2e8f0" stroke-width="1.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#e2e8f0" stroke-width="1.5" />
        </g>
        <rect x="4" y="4" width="92" height="92" rx="26" fill="none" stroke="#e2e8f0" stroke-width="2" />
      </svg>
    </div>

    <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">{{ label }}</p>
  </div>
</template>
