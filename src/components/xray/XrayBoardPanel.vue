<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { AlertTriangle, LayoutGrid, Loader2, Moon, Pencil, RotateCw, Save, Sun, X } from 'lucide-vue-next'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import XrayBoardCanvas from './XrayBoardCanvas.vue'
import XrayBoardToolbar from './XrayBoardToolbar.vue'
import XrayNotePanel from './XrayNotePanel.vue'
import XrayShortcutsCard from './XrayShortcutsCard.vue'
import XrayZoomBar from './XrayZoomBar.vue'
import { UPLOAD_ACCEPT_ATTR } from '@/domain/xray/xray.constants'
import { useNotificationStore } from '@/stores/notification'
import { useXrayBoardStore, xrayBoardKey } from '@/stores/xray-board'

const props = defineProps<{
  patientId: string | null
  visitId: string | null
}>()

const board = useXrayBoardStore()
const notifications = useNotificationStore()
const {
  layout,
  saved,
  savedAt,
  editMode,
  editable,
  canSave,
  isSaving,
  isLoading,
  loadFailed,
  isRetrying,
  retryFailed,
  isEmpty,
  isDirty,
  lightCanvas,
} = storeToRefs(board)

const fileInput = ref<HTMLInputElement | null>(null)
const showSaveConfirm = ref(false)
const showCancelEditConfirm = ref(false)

const boardKey = computed(() => xrayBoardKey(props.patientId, props.visitId))

watch(boardKey, key => board.loadBoard(key), { immediate: true })

const hint = computed(() =>
  layout.value
    ? 'X-ray Board — layout mode, drag films into the slots'
    : 'X-ray Board — free canvas, no fixed layout',
)

/** Failed, or mid-retry: either way we cannot vouch for what the board holds. */
const contentsUnknown = computed(() => loadFailed.value || isRetrying.value)

// A board we could not read is never called Draft: that is the label that
// invites the doctor to save over films they cannot see (SRS-198).
const badgeLabel = computed(() => {
  if (saved.value) return 'Saved'
  return contentsUnknown.value ? 'Unavailable' : 'Draft'
})

const badgeTitle = computed(() => {
  if (contentsUnknown.value) return 'The board could not be read · saving is off'
  if (!saved.value) return 'Not saved yet · editable'
  const time = savedAt.value
    ? ` · ${savedAt.value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    : ''
  return `Saved${time}${editMode.value ? ' · editing' : ' · read-only'}`
})

const saveDisabled = computed(
  () => isSaving.value || !canSave.value || (saved.value && editMode.value && !isDirty.value),
)

// Plain words only — never an error code or a stack trace (SRS-197). What the
// doctor needs to know is that nothing is lost and why saving is off.
const errorTitle = computed(() => {
  if (isRetrying.value) return 'Loading the X-ray board...'
  return retryFailed.value
    ? 'The X-ray board still could not be loaded'
    : 'The X-ray board could not be loaded'
})

const errorDetail = computed(() => {
  if (isRetrying.value) return 'Reading this board again.'
  const why = 'Saving stays off so this board cannot overwrite the films already on it.'
  return retryFailed.value
    ? `Nothing has been changed and no films were lost. ${why} Try again in a moment, or close this visit and open it fresh.`
    : `${why} Nothing on the board has been changed.`
})

// A greyed-out button with no reason reads as a broken one.
const saveTitle = computed(() => {
  if (contentsUnknown.value) return 'Saving is off until the board loads'
  if (isEmpty.value) return 'Add at least one X-ray first'
  return 'Save this board'
})

const canvasVars = computed<Record<string, string>>(() =>
  lightCanvas.value
    ? {
        '--xray-board': '#eef2f7',
        '--xray-dot': '#d3dbe6',
        '--xray-slot-line': 'rgba(15,23,42,0.30)',
        '--xray-slot-text': 'rgba(15,23,42,0.5)',
        '--xray-empty-text': '#64748b',
        '--xray-empty-border': '#c3ccda',
      }
    : {
        '--xray-board': '#171b22',
        '--xray-dot': '#282e38',
        '--xray-slot-line': 'rgba(255,255,255,0.30)',
        '--xray-slot-text': 'rgba(255,255,255,0.55)',
        '--xray-empty-text': '#94a3b8',
        '--xray-empty-border': '#39414e',
      },
)

function openFilePicker() {
  if (isSaving.value) {
    notifications.warning('The board is saving', 'Wait for it to finish, then add the films')
    return
  }
  if (contentsUnknown.value) {
    notifications.warning('The board could not be loaded', 'Try loading it again first')
    return
  }
  if (!editable.value) {
    notifications.warning('Board is read-only', 'Click Edit first to change it')
    return
  }
  fileInput.value?.click()
}

async function onFilesPicked(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.length) {
    const center = board.viewCenter()
    await board.addImageFiles(input.files, center.x, center.y)
  }
  input.value = ''
}

function handleSaveClick() {
  if (isSaving.value || !board.validateBeforeSave()) return
  showSaveConfirm.value = true
}

async function confirmSave() {
  showSaveConfirm.value = false
  await board.saveBoard()
}

function handleCancelEditClick() {
  if (isDirty.value) showCancelEditConfirm.value = true
  else board.cancelEdit()
}

function confirmCancelEdit() {
  showCancelEditConfirm.value = false
  board.cancelEdit()
  notifications.info('Edits discarded')
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex items-center gap-2.5 px-5 py-2.5">
      <span
        class="inline-flex shrink-0 items-center rounded-[9px] border-[1.5px] px-3 py-0.5 text-[12.5px] font-medium whitespace-nowrap"
        :class="
          saved
            ? 'border-[#2f55c7] bg-[#2f55c7] text-white'
            : contentsUnknown
              ? 'border-slate-300 bg-slate-100 text-slate-500'
              : 'border-[#4a6fd8] bg-[#e9efff] text-[#2f55c7]'
        "
        :title="badgeTitle"
      >
        {{ badgeLabel }}
      </span>
      <span class="truncate text-[13px] text-slate-500">{{ hint }}</span>

      <div class="ml-auto flex shrink-0 items-center gap-2">
        <button
          class="xray-chip px-2.5"
          title="Toggle light / dark canvas"
          @click="board.toggleCanvasTheme()"
        >
          <Moon v-if="lightCanvas" class="h-[15px] w-[15px]" />
          <Sun v-else class="h-[15px] w-[15px]" />
        </button>

        <button
          class="xray-chip"
          :class="{ 'is-on': layout }"
          :disabled="!editable"
          title="Switch free canvas ↔ layout (18-film FMX)"
          @click="board.toggleLayout()"
        >
          <LayoutGrid class="h-[15px] w-[15px]" />
          Layout
        </button>

        <button
          v-if="saved && !editMode"
          class="xray-chip"
          title="Edit this board"
          @click="board.startEdit()"
        >
          <Pencil class="h-[15px] w-[15px]" />
          Edit
        </button>

        <button
          v-if="saved && editMode"
          class="xray-chip"
          title="Discard unsaved changes"
          @click="handleCancelEditClick"
        >
          <X class="h-[15px] w-[15px]" />
          Cancel
        </button>

        <!-- Kept on screen while the load is broken, greyed out rather than
             hidden, so the reason is visible instead of just missing. -->
        <button
          v-if="editable || contentsUnknown"
          class="xray-chip is-primary"
          :disabled="saveDisabled"
          :title="saveTitle"
          @click="handleSaveClick"
        >
          <Loader2 v-if="isSaving" class="h-[15px] w-[15px] animate-spin" />
          <Save v-else class="h-[15px] w-[15px]" />
          {{ isSaving ? 'Saving...' : 'Save Board' }}
        </button>
      </div>
    </div>

    <!-- Held on screen through the retry as well, so a second failure reads as
         an answer rather than as a button that did nothing. -->
    <div
      v-if="contentsUnknown"
      class="mx-[18px] mb-2.5 flex items-start gap-2.5 rounded-[10px] border border-amber-300 bg-amber-50 px-3.5 py-3"
    >
      <AlertTriangle class="mt-px h-[17px] w-[17px] shrink-0 text-amber-600" />
      <div class="min-w-0 text-[13px] text-amber-900">
        <p class="font-semibold">{{ errorTitle }}</p>
        <p class="mt-0.5 text-amber-800">{{ errorDetail }}</p>
      </div>
      <button
        class="xray-chip ml-auto shrink-0"
        :disabled="isRetrying"
        @click="board.retryLoad()"
      >
        <Loader2 v-if="isRetrying" class="h-[15px] w-[15px] animate-spin" />
        <RotateCw v-else class="h-[15px] w-[15px]" />
        {{ isRetrying ? 'Trying...' : 'Try again' }}
      </button>
    </div>

    <div
      class="relative mx-[18px] mb-[18px] min-h-0 flex-1 overflow-hidden rounded-[14px] border border-slate-200 shadow-sm"
      :style="canvasVars"
    >
      <XrayBoardCanvas @request-upload="openFilePicker" />

      <XrayBoardToolbar
        class="absolute top-3.5 left-1/2 z-50 -translate-x-1/2"
        @upload="openFilePicker"
      />
      <XrayNotePanel class="absolute top-[78px] right-3.5 z-50" />
      <XrayZoomBar class="absolute bottom-3.5 left-3.5 z-50" />
      <XrayShortcutsCard class="absolute right-3.5 bottom-3.5 z-50" />

      <div
        v-if="isLoading && !isRetrying"
        class="absolute inset-0 z-60 grid place-items-center bg-black/20 backdrop-blur-[2px]"
      >
        <Loader2 class="h-6 w-6 animate-spin text-white" />
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      :accept="UPLOAD_ACCEPT_ATTR"
      multiple
      class="hidden"
      @change="onFilesPicked"
    />

    <ConfirmModal
      :show="showSaveConfirm"
      title="Save Board"
      message="<span class='text-slate-800 font-bold text-lg block mb-1'>Do you want to save this board?</span><span class='text-slate-500 font-normal'>Once saved, you can still click Edit to modify it later.</span>"
      confirm-text="Save"
      cancel-text="Cancel"
      @confirm="confirmSave"
      @cancel="showSaveConfirm = false"
    />

    <ConfirmModal
      :show="showCancelEditConfirm"
      title="Cancel Editing"
      message="<span class='text-slate-800 font-bold text-lg block mb-1'>Are you sure you want to cancel?</span><span class='text-slate-500 font-normal'>Any unsaved changes will be lost.</span>"
      confirm-text="Discard Changes"
      cancel-text="Continue Editing"
      type="danger"
      @confirm="confirmCancelEdit"
      @cancel="showCancelEditConfirm = false"
    />
  </div>
</template>

<style scoped>
.xray-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 6px 13px;
  border: 1px solid #e3e9f1;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  color: #3f4d61;
  white-space: nowrap;
}
.xray-chip:hover:not(:disabled) {
  border-color: #c7d3e5;
}
.xray-chip:disabled {
  opacity: 0.45;
  cursor: default;
}
.xray-chip.is-on {
  background: #e9f0ff;
  border-color: #b9cdf3;
  color: #1d4ed8;
  font-weight: 600;
}
.xray-chip.is-primary {
  background: #0052ff;
  border-color: #0052ff;
  color: #fff;
  font-weight: 600;
  box-shadow: 0 4px 6px -1px rgba(0, 82, 255, 0.25);
}
.xray-chip.is-primary:hover:not(:disabled) {
  background: #0042cc;
  border-color: #0042cc;
}
.xray-chip.is-primary:disabled {
  background: #cbd5e1;
  border-color: #cbd5e1;
  color: #64748b;
  box-shadow: none;
}
</style>
