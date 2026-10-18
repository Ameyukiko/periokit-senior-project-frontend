<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Check, Loader2, RotateCw, TriangleAlert, X } from 'lucide-vue-next'
import { useXrayBoardStore } from '@/stores/xray-board'






const board = useXrayBoardStore()
const { uploadQueue, isAddingFiles, canUpload } = storeToRefs(board)

const total = computed(() => uploadQueue.value.length)
const done = computed(() => uploadQueue.value.filter(item => item.status === 'done').length)
const failed = computed(() => uploadQueue.value.filter(item => item.status === 'failed'))
const retryable = computed(() => failed.value.filter(item => item.canRetry))
const settled = computed(() => done.value + failed.value.length)


const working = computed(() => Math.min(settled.value + 1, total.value))

const title = computed(() => {
  if (isAddingFiles.value) return `Adding ${working.value} of ${total.value}`
  if (!failed.value.length) return done.value === 1 ? 'Film added' : `${done.value} films added`
  if (!done.value) {
    return failed.value.length === 1 ? 'Film not added' : `${failed.value.length} films not added`
  }
  return `${done.value} added · ${failed.value.length} not added`
})






const CLEAN_HOLD_MS = 1500












watch(
  () => isAddingFiles.value || failed.value.length > 0,
  busy => {
    if (busy || !total.value) return
    const batch = uploadQueue.value[0]?.uploadId
    window.setTimeout(() => {
      if (uploadQueue.value[0]?.uploadId === batch) board.clearUploadQueue()
    }, CLEAN_HOLD_MS)
  },
  { immediate: true },
)
</script>

<template>


  <Transition name="xray-queue">
    <div
      v-if="total"
      data-board-ui
      class="w-[320px] overflow-hidden rounded-[10px] border border-slate-200 bg-white/95 text-[12.5px] text-slate-600 shadow-[0_8px_26px_rgba(15,23,42,0.28)] backdrop-blur-md"
    >
    <div class="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
      <Loader2 v-if="isAddingFiles" class="h-[15px] w-[15px] shrink-0 animate-spin text-[#0052ff]" />
      <TriangleAlert v-else-if="failed.length" class="h-[15px] w-[15px] shrink-0 text-amber-600" />
      <Check v-else class="h-[15px] w-[15px] shrink-0 text-emerald-600" />

      <span class="truncate font-semibold text-slate-700">{{ title }}</span>

      <div class="ml-auto flex shrink-0 items-center gap-1">
        <button
          v-if="retryable.length > 1 && !isAddingFiles"
          class="xray-queue-btn"
          :title="`Try the ${retryable.length} files that failed again`"
          @click="board.retryFailedUploads()"
        >
          <RotateCw class="h-[13px] w-[13px]" />
          Retry {{ retryable.length }}
        </button>
        <button
          v-if="!isAddingFiles"
          class="xray-queue-btn px-1.5"
          title="Dismiss"
          @click="board.clearUploadQueue()"
        >
          <X class="h-[13px] w-[13px]" />
        </button>
      </div>
    </div>



    <ul class="max-h-[210px] overflow-y-auto">
      <li
        v-for="item in uploadQueue"
        :key="item.uploadId"
        class="flex items-center gap-2 px-3 py-1.5"
      >
        <Check v-if="item.status === 'done'" class="h-[13px] w-[13px] shrink-0 text-emerald-600" />
        <X v-else-if="item.status === 'failed'" class="h-[13px] w-[13px] shrink-0 text-rose-600" />
        <Loader2
          v-else-if="item.status === 'uploading'"
          class="h-[13px] w-[13px] shrink-0 animate-spin text-[#0052ff]"
        />
        <span v-else class="h-[13px] w-[13px] shrink-0"></span>

        <span class="min-w-0 flex-1">
          <span class="block truncate text-slate-700" :title="item.fileName">
            {{ item.fileName }}
          </span>

          <span v-if="item.error" class="block truncate text-[11.5px] text-rose-600">
            {{ item.error }}
          </span>
        </span>



        <div
          v-if="item.status === 'uploading' && canUpload"
          class="h-1 w-14 shrink-0 rounded-full bg-slate-200"
        >
          <div
            class="h-full rounded-full bg-[#0052ff] transition-[width] duration-150"
            :style="{ width: `${item.progress}%` }"
          ></div>
        </div>

        <button
          v-else-if="item.status === 'failed' && item.canRetry"
          class="xray-queue-btn shrink-0 px-1.5"
          :disabled="isAddingFiles"
          title="Try this file again"
          @click="board.retryUpload(item.uploadId)"
        >
          <RotateCw class="h-[13px] w-[13px]" />
        </button>
      </li>
    </ul>



      <p
        v-if="!canUpload"
        class="border-t border-slate-100 px-3 py-1.5 text-[11.5px] text-slate-500"
      >
        This visit is not saved yet. These films stay on this device until saved.
      </p>
    </div>
  </Transition>
</template>

<style scoped>


.xray-queue-enter-active {
  transition: opacity 120ms ease-out, transform 120ms ease-out;
}
.xray-queue-leave-active {
  transition: opacity 320ms ease-in, transform 320ms ease-in;
}
.xray-queue-enter-from,
.xray-queue-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (prefers-reduced-motion: reduce) {
  .xray-queue-enter-active,
  .xray-queue-leave-active {
    transition: opacity 120ms linear;
  }
  .xray-queue-enter-from,
  .xray-queue-leave-to {
    transform: none;
  }
}

.xray-queue-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border: 1px solid #e3e9f1;
  border-radius: 6px;
  background: #fff;
  font-size: 11.5px;
  color: #3f4d61;
  white-space: nowrap;
}
.xray-queue-btn:hover:not(:disabled) {
  border-color: #c7d3e5;
  color: #0f172a;
}
.xray-queue-btn:disabled {
  opacity: 0.45;
  cursor: default;
}
</style>
