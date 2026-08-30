<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ImageOff, RotateCw } from 'lucide-vue-next'
import {
  FMX_SLOTS,
  GRID_SIZE,
  MAX_SCALE,
  MIN_OBJECT_SIZE,
  MIN_SCALE,
} from '@/domain/xray/xray.constants'
import { clamp, rotateVec, toRad } from '@/domain/xray/xray.geometry'
import type { FmxSlot, Viewport, XrayImageObject, XrayObject } from '@/domain/xray/xray.types'
import { useNotificationStore } from '@/stores/notification'
import { useXrayBoardStore } from '@/stores/xray-board'
import { shortcutLabel } from '@/utils/keyboard'

const props = defineProps<{
  /**
   * A dialog is covering the board. Its backdrop stops every pointer, but these
   * handlers sit on the document and would keep firing behind it — and a ⌘Z or
   * a paste there changes the very board the dialog is asking about.
   */
  dialogOpen?: boolean
}>()

const emit = defineEmits<{
  (event: 'request-upload'): void
  // Deleting a saved film asks first, and the panel is where the dialog lives.
  (event: 'request-delete'): void
}>()

const pasteShortcut = shortcutLabel('V')

const board = useXrayBoardStore()
const notifications = useNotificationStore()
const {
  objects,
  sortedObjects,
  layout,
  selectedId,
  editingNoteId,
  viewport,
  imageUrls,
  editable,
  filledSlots,
  isEmpty,
  failedAssets,
  loadFailed,
} = storeToRefs(board)

/** A missing URL never fires `error`, so the placeholder can't rely on it. */
function showsFilm(object: XrayImageObject) {
  return Boolean(imageUrls.value[object.assetId]) && !failedAssets.value.has(object.assetId)
}

const HANDLES = ['nw', 'ne', 'sw', 'se', 'rot'] as const
const RESIZE_DIRECTIONS = {
  nw: [-1, -1],
  ne: [1, -1],
  sw: [-1, 1],
  se: [1, 1],
} as const

/** How far the pointer may travel and still count as a click, not a drag. */
const CLICK_SLOP = 4

type Drag =
  | {
      mode: 'pan'
      startX: number
      startY: number
      originX: number
      originY: number
      moved: boolean
      /** This pan started on empty board — a click here clears the selection. */
      deselect: boolean
      /** This pan started on an object nobody may move — say so once it moves. */
      refused: boolean
    }
  | { mode: 'move'; id: string; offsetX: number; offsetY: number; moved: boolean }
  | {
      mode: 'resize'
      id: string
      dirX: number
      dirY: number
      angle: number
      startW: number
      startH: number
      anchorX: number
      anchorY: number
      moved: boolean
    }
  | { mode: 'rotate'; id: string; centerX: number; centerY: number; moved: boolean }

const stageEl = ref<HTMLDivElement | null>(null)
const isPanning = ref(false)
const spaceDown = ref(false)
const isDropping = ref(false)

let drag: Drag | null = null
let dropDepth = 0
let resizeObserver: ResizeObserver | null = null

const noteRefs = new Map<string, HTMLTextAreaElement>()

/* ---------------- styles ---------------- */
const stageStyle = computed(() => ({
  backgroundColor: 'var(--xray-board)',
  backgroundImage: 'radial-gradient(circle, var(--xray-dot) 1px, transparent 1px)',
  backgroundSize: `${GRID_SIZE * viewport.value.scale}px ${GRID_SIZE * viewport.value.scale}px`,
  backgroundPosition: `${viewport.value.x}px ${viewport.value.y}px`,
}))

// --inv keeps selection rings and handles the same size on screen at any zoom.
const worldStyle = computed<Record<string, string>>(() => ({
  transform: `translate(${viewport.value.x}px, ${viewport.value.y}px) scale(${viewport.value.scale})`,
  '--inv': String(1 / viewport.value.scale),
}))

// The CSS layer comes from the position in the sorted list, not from
// `object.zIndex` itself — a stored zIndex may be negative, which would drop the
// object behind the board background.
function objectStyle(object: XrayObject, index: number): Record<string, string> {
  const style: Record<string, string> = {
    width: `${object.width}px`,
    height: `${object.height}px`,
    transform: `translate(${object.posX}px, ${object.posY}px) rotate(${object.rotation}deg)`,
    zIndex: String(index + 1),
  }
  if (object.objectType === 'note') style.background = object.noteColor
  return style
}

function slotStyle(slot: FmxSlot): Record<string, string> {
  return {
    left: `${slot.x - slot.w / 2}px`,
    top: `${slot.y - slot.h / 2}px`,
    width: `${slot.w}px`,
    height: `${slot.h}px`,
  }
}

/* ---------------- coordinates ---------------- */
function stagePoint(event: { clientX: number; clientY: number }) {
  const rect = stageEl.value?.getBoundingClientRect()
  if (!rect) return { sx: 0, sy: 0 }
  return { sx: event.clientX - rect.left, sy: event.clientY - rect.top }
}

function worldPoint(event: { clientX: number; clientY: number }) {
  const { sx, sy } = stagePoint(event)
  return board.toWorld(sx, sy)
}

/* ---------------- touch: one finger pans, two fingers zoom ---------------- */
const touches = new Map<number, { x: number; y: number }>()
let pinch: { distance: number; midX: number; midY: number; viewport: Viewport } | null = null

function touchMid() {
  const [a, b] = [...touches.values()]
  return stagePoint({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 })
}

function startPinch() {
  const [a, b] = [...touches.values()]
  const mid = touchMid()
  pinch = {
    distance: Math.hypot(a.x - b.x, a.y - b.y),
    midX: mid.sx,
    midY: mid.sy,
    viewport: { ...viewport.value },
  }
}

function applyPinch() {
  if (!pinch) return
  const [a, b] = [...touches.values()]
  const distance = Math.hypot(a.x - b.x, a.y - b.y)
  const mid = touchMid()
  const scale = clamp(pinch.viewport.scale * (distance / pinch.distance), MIN_SCALE, MAX_SCALE)
  const worldX = (pinch.midX - pinch.viewport.x) / pinch.viewport.scale
  const worldY = (pinch.midY - pinch.viewport.y) / pinch.viewport.scale
  board.setViewport({ scale, x: mid.sx - worldX * scale, y: mid.sy - worldY * scale })
}

/* ---------------- pointer interaction ---------------- */
function capture(event: PointerEvent) {
  try {
    stageEl.value?.setPointerCapture(event.pointerId)
  } catch {
    /* pointer already released */
  }
}

function startPan(event: PointerEvent, deselect: boolean, refused = false) {
  drag = {
    mode: 'pan',
    startX: event.clientX,
    startY: event.clientY,
    originX: viewport.value.x,
    originY: viewport.value.y,
    moved: false,
    deselect,
    refused,
  }
  isPanning.value = true
  capture(event)
  event.preventDefault()
}

function onPointerDown(event: PointerEvent) {
  if (event.button === 2) return

  // Controls drawn on top of the canvas keep their own click: panning captures
  // the pointer, which would retarget the click to the stage and swallow it.
  if ((event.target as HTMLElement).closest('[data-board-ui]')) return

  if (event.pointerType === 'touch') {
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (touches.size === 2) {
      endDrag()
      startPinch()
      return
    }
    if (touches.size > 2) return
  }

  const target = event.target as HTMLElement
  const handleEl = target.closest<HTMLElement>('[data-handle]')
  const objectEl = target.closest<HTMLElement>('[data-object-id]')
  const object = objects.value.find(candidate => candidate.id === objectEl?.dataset.objectId)

  // Read-only board: nothing may move, but picking a film is still allowed
  // (SRS-257) — clicking the one you are reading is how a doctor keeps their
  // place, and it changes nothing on the board.
  if (!editable.value) {
    blurEditingNote()
    if (object) board.select(object.id)
    startPan(event, !object, Boolean(object))
    return
  }

  if (event.button === 1 || spaceDown.value || (!objectEl && !handleEl)) {
    blurEditingNote()
    startPan(event, !objectEl)
    return
  }

  if (!object) return

  if (handleEl) {
    startHandleDrag(event, object, handleEl.dataset.handle ?? '')
    return
  }

  board.select(object.id)
  if (editingNoteId.value && editingNoteId.value !== object.id) blurEditingNote()
  if (editingNoteId.value === object.id) return

  const point = worldPoint(event)
  drag = {
    mode: 'move',
    id: object.id,
    offsetX: point.x - object.posX,
    offsetY: point.y - object.posY,
    moved: false,
  }
  capture(event)
  event.preventDefault()
}

function startHandleDrag(event: PointerEvent, object: XrayObject, handle: string) {
  const centerX = object.posX + object.width / 2
  const centerY = object.posY + object.height / 2

  if (handle === 'rot') {
    drag = { mode: 'rotate', id: object.id, centerX, centerY, moved: false }
  } else {
    const direction = RESIZE_DIRECTIONS[handle as keyof typeof RESIZE_DIRECTIONS]
    if (!direction) return
    const angle = toRad(object.rotation)
    // Resizing keeps the opposite corner pinned.
    const anchor = rotateVec(
      (-direction[0] * object.width) / 2,
      (-direction[1] * object.height) / 2,
      angle,
    )
    drag = {
      mode: 'resize',
      id: object.id,
      dirX: direction[0],
      dirY: direction[1],
      angle,
      startW: object.width,
      startH: object.height,
      anchorX: centerX + anchor.x,
      anchorY: centerY + anchor.y,
      moved: false,
    }
  }
  capture(event)
  event.preventDefault()
}

type GeometryPatch = {
  posX?: number
  posY?: number
  width?: number
  height?: number
  rotation?: number
}

/**
 * Writes geometry only when every number in it is real, and reports whether it
 * did. A film stored with a width of 0 divides into the resize scale as
 * Infinity and comes back out as NaN, which drops the object off the board and
 * would be refused by the xray_object CHECKs at save time — long after the
 * doctor could tell what went wrong. Holding the last good geometry costs one
 * skipped frame instead.
 */
function applyGeometry(object: XrayObject, patch: GeometryPatch) {
  if (Object.values(patch).some(value => !Number.isFinite(value))) return false
  Object.assign(object, patch)
  return true
}

function onPointerMove(event: PointerEvent) {
  if (event.pointerType === 'touch' && touches.has(event.pointerId)) {
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pinch && touches.size === 2) {
      applyPinch()
      return
    }
  }

  const current = drag
  if (!current) return

  if (current.mode === 'pan') {
    const dx = event.clientX - current.startX
    const dy = event.clientY - current.startY
    if (!current.moved && (Math.abs(dx) > CLICK_SLOP || Math.abs(dy) > CLICK_SLOP)) {
      current.moved = true
      // Dragging a film on a board nobody may change: the board pans under it
      // and the film stays put. Saying why beats letting the doctor drag at a
      // picture that will never follow and decide the page has hung (A4).
      if (current.refused) rejectChange()
    }
    board.setViewportOrigin(current.originX + dx, current.originY + dy)
    return
  }

  const object = objects.value.find(candidate => candidate.id === current.id)
  if (!object) return
  const point = worldPoint(event)

  if (current.mode === 'move') {
    const written = applyGeometry(object, {
      posX: Math.round(point.x - current.offsetX),
      posY: Math.round(point.y - current.offsetY),
    })
    if (written) current.moved = true
    return
  }

  if (current.mode === 'resize') {
    const local = rotateVec(point.x - current.anchorX, point.y - current.anchorY, -current.angle)
    const scale = Math.max(
      (local.x * current.dirX) / current.startW,
      (local.y * current.dirY) / current.startH,
      MIN_OBJECT_SIZE / current.startW,
      MIN_OBJECT_SIZE / current.startH,
    )
    // Whole units only, like every other write on the board: PER-233 types
    // posX, posY, width and height as Int!, so a film left on a fraction of a
    // unit would be refused by the scalar the first time a save reaches the API
    // — long after the resize that caused it. Rounded before the centre is
    // worked out, so the pinned corner follows the size the object really gets.
    const width = Math.round(current.startW * scale)
    const height = Math.round(current.startH * scale)
    const center = rotateVec((current.dirX * width) / 2, (current.dirY * height) / 2, current.angle)
    const written = applyGeometry(object, {
      width,
      height,
      posX: Math.round(current.anchorX + center.x - width / 2),
      posY: Math.round(current.anchorY + center.y - height / 2),
    })
    if (written) current.moved = true
    return
  }

  let angle =
    (Math.atan2(point.y - current.centerY, point.x - current.centerX) * 180) / Math.PI + 90
  if (event.shiftKey) angle = Math.round(angle / 15) * 15
  // Normalised into [0, 360) to match the xray_object_rotation_valid CHECK (PER-231).
  if (applyGeometry(object, { rotation: ((angle % 360) + 360) % 360 })) current.moved = true
}

function endDrag() {
  const current = drag
  drag = null
  isPanning.value = false
  if (!current) return

  // Only a pan that stayed put is a click on empty board (SRS-254). Judging it
  // on release rather than on press is what keeps a film selected through a pan
  // — the doctor is dragging the board, not throwing their choice away.
  if (current.mode === 'pan') {
    if (!current.moved && current.deselect) board.select(null)
    return
  }

  if (!current.moved) return

  if (layout.value && current.mode === 'move') {
    if (board.snapToSlot(current.id) === 'occupied') {
      notifications.warning(
        'That slot already has an image',
        'The film was left where you dropped it',
      )
    }
  }
  board.pushHistory()
}

function onPointerUp(event: PointerEvent) {
  if (event.pointerType === 'touch') {
    touches.delete(event.pointerId)
    if (touches.size < 2) pinch = null
  }
  endDrag()
}

function onWheel(event: WheelEvent) {
  event.preventDefault()
  const { sx, sy } = stagePoint(event)
  if (event.ctrlKey || event.metaKey) {
    board.zoomAt(sx, sy, Math.exp(-event.deltaY * 0.01))
  } else if (event.shiftKey) {
    board.panBy(-event.deltaY, 0)
  } else {
    board.panBy(-event.deltaX, -event.deltaY)
  }
}

/* ---------------- sticky notes ---------------- */
function setNoteRef(id: string, el: unknown) {
  if (el) noteRefs.set(id, el as HTMLTextAreaElement)
  else noteRefs.delete(id)
}

function blurEditingNote() {
  const id = editingNoteId.value
  if (id) noteRefs.get(id)?.blur()
}

function onNoteBlur() {
  if (!editingNoteId.value) return
  board.editingNoteId = null
  board.pushHistory()
}

function onDoubleClick(event: MouseEvent) {
  if (!editable.value) return
  const objectEl = (event.target as HTMLElement).closest<HTMLElement>('[data-object-id]')
  const object = objects.value.find(candidate => candidate.id === objectEl?.dataset.objectId)
  if (object?.objectType !== 'note') return
  board.select(object.id)
  board.editingNoteId = object.id
}

watch(editingNoteId, async id => {
  if (!id) return
  await nextTick()
  const el = noteRefs.get(id)
  if (!el) return
  el.focus()
  el.setSelectionRange(el.value.length, el.value.length)
})

/* ---------------- drop / paste ---------------- */
// `editable` is false for three different reasons; saying "click Edit first"
// when the board never loaded just sends the user after a button that is not
// there.
function rejectChange() {
  if (loadFailed.value) {
    notifications.warning('The board could not be loaded', 'Try loading it again first')
  } else {
    notifications.warning('Board is read-only', 'Click Edit first to change it')
  }
}

function onDragEnter(event: DragEvent) {
  event.preventDefault()
  dropDepth += 1
  isDropping.value = true
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
}

function onDragLeave() {
  dropDepth -= 1
  if (dropDepth <= 0) {
    dropDepth = 0
    isDropping.value = false
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  dropDepth = 0
  isDropping.value = false
  if (!editable.value) {
    rejectChange()
    return
  }
  const files = event.dataTransfer?.files
  if (!files?.length) return
  const point = worldPoint(event)
  board.addImageFiles(files, point.x, point.y)
}

function onPaste(event: ClipboardEvent) {
  if (props.dialogOpen) return
  const active = document.activeElement
  if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) return
  const files = Array.from(event.clipboardData?.items ?? [])
    .filter(item => item.kind === 'file')
    .map(item => item.getAsFile())
    .filter((file): file is File => file !== null)
  if (!files.length) return
  event.preventDefault()
  if (!editable.value) {
    rejectChange()
    return
  }
  const center = board.viewCenter()
  board.addImageFiles(files, center.x, center.y)
}

/* ---------------- keyboard ---------------- */
function onKeyDown(event: KeyboardEvent) {
  // Escape included: the dialog on top answers that one itself, and clearing
  // the selection under it would be a change made by the button that promises
  // to change nothing.
  if (props.dialogOpen) return
  const active = document.activeElement
  const typing = active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement
  const modifier = event.metaKey || event.ctrlKey

  if (event.code === 'Space' && !typing) {
    spaceDown.value = true
    event.preventDefault()
  }

  if (modifier && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    if (!editable.value) return
    if (event.shiftKey) board.redo()
    else board.undo()
    return
  }

  if (event.key === 'Escape') {
    if (typing) (active as HTMLElement).blur()
    else board.select(null)
    return
  }

  if (typing) return

  // Nothing selected is not an error, and the key keeps whatever meaning the
  // browser gives it (A5).
  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (!editable.value || !selectedId.value) return
    event.preventDefault()
    emit('request-delete')
    return
  }
  if (event.key === 'f' || event.key === 'F') board.fit()
  if (event.key === '0') board.resetZoom()
}

function onKeyUp(event: KeyboardEvent) {
  if (event.code === 'Space') spaceDown.value = false
}

/* ---------------- lifecycle ---------------- */
onMounted(() => {
  const el = stageEl.value
  if (!el) return
  board.setStageSize(el.clientWidth, el.clientHeight)
  resizeObserver = new ResizeObserver(() => board.setStageSize(el.clientWidth, el.clientHeight))
  resizeObserver.observe(el)
  el.addEventListener('wheel', onWheel, { passive: false })
  document.addEventListener('paste', onPaste)
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  stageEl.value?.removeEventListener('wheel', onWheel)
  document.removeEventListener('paste', onPaste)
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('keyup', onKeyUp)
})
</script>

<template>
  <div
    ref="stageEl"
    class="absolute inset-0 overflow-hidden touch-none select-none"
    :class="isPanning ? 'cursor-grabbing' : spaceDown ? 'cursor-grab' : 'cursor-default'"
    :style="stageStyle"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @lostpointercapture="endDrag"
    @dblclick="onDoubleClick"
    @contextmenu.prevent
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <div class="absolute left-0 top-0 origin-top-left" :style="worldStyle">
      <!-- 18-film full-mouth template, layout mode only -->
      <div v-if="layout" class="pointer-events-none absolute inset-0 z-0">
        <div
          v-for="slot in FMX_SLOTS"
          :key="slot.id"
          class="xray-slot"
          :class="{ 'is-filled': filledSlots.has(String(slot.id)) }"
          :style="slotStyle(slot)"
        >
          <span>{{ slot.label }}</span>
        </div>
      </div>

      <!-- A read-only board draws no ring (PER-257 §1). Picking a film is still
           allowed and still remembered — it is how a doctor keeps their place
           (SRS-257) — but a board nothing can be done to should look like one,
           and the ring only means anything next to the handles it normally
           comes with. -->
      <div
        v-for="(object, index) in sortedObjects"
        :key="object.id"
        :data-object-id="object.id"
        class="xray-object"
        :class="[
          object.objectType === 'image' ? 'xray-image' : 'xray-note',
          { 'is-selected': object.id === selectedId && editable },
        ]"
        :style="objectStyle(object, index)"
      >
        <template v-if="object.objectType === 'image'">
          <img
            v-if="showsFilm(object)"
            :src="imageUrls[object.assetId]"
            class="block h-full w-full rounded bg-black"
            draggable="false"
            alt="Radiograph"
            @error="board.recoverAsset(object.assetId)"
          />
          <!-- Never an empty frame (SRS-190): a blank box reads as "deleted". -->
          <div v-else class="xray-broken">
            <ImageOff class="h-6 w-6 shrink-0" />
            <span>Image failed to load</span>
            <button
              data-board-ui
              class="xray-broken-btn"
              title="Try loading this image again"
              @click="board.reloadAsset(object.assetId)"
            >
              <RotateCw class="h-3.5 w-3.5" />
              Reload
            </button>
          </div>
        </template>
        <textarea
          v-else
          :ref="el => setNoteRef(object.id, el)"
          class="xray-note-text"
          :class="{ 'is-editing': editingNoteId === object.id }"
          :style="{ fontSize: `${object.noteFontSize}px` }"
          :value="object.noteText"
          :readonly="editingNoteId !== object.id"
          placeholder="Type a note…"
          @input="board.setNoteText(object.id, ($event.target as HTMLTextAreaElement).value)"
          @blur="onNoteBlur"
        ></textarea>

        <div v-if="object.id === selectedId && editable" class="pointer-events-none absolute inset-0">
          <div
            v-for="handle in HANDLES"
            :key="handle"
            class="xray-handle"
            :class="`is-${handle}`"
            :data-handle="handle"
          ></div>
        </div>
      </div>
    </div>

    <!-- Layout mode already shows the slots, so the drop hint is redundant there.
         Hidden after a failed load too: an empty board we could not read must
         not invite the doctor to fill it in (SRS-193). -->
    <div
      v-if="isEmpty && !layout && !loadFailed"
      class="pointer-events-none absolute inset-0 grid place-items-center text-center"
      :style="{ color: 'var(--xray-empty-text)' }"
    >
      <div
        class="rounded-2xl border-2 border-dashed px-14 py-10 text-[13px]"
        :style="{ borderColor: 'var(--xray-empty-border)' }"
      >
        Drop files on the board · paste from clipboard
        <kbd class="xray-kbd">{{ pasteShortcut }}</kbd> · or
        <br />
        <button
          data-board-ui
          class="pointer-events-auto mt-3.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-[12px] text-slate-600 hover:text-slate-900"
          @click="emit('request-upload')"
        >
          Choose file
        </button>
      </div>
    </div>

    <div
      v-if="isDropping"
      class="pointer-events-none absolute inset-2.5 rounded-[14px] border-2 border-dashed border-[#0052ff] bg-[#4da3ff]/10"
    ></div>
  </div>
</template>

<style scoped>
.xray-object {
  position: absolute;
  transform-origin: center center;
}
.xray-image {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.55);
}
.xray-image.is-selected {
  box-shadow:
    0 0 0 calc(1.5px * var(--inv)) #0052ff,
    0 6px 24px rgba(0, 0, 0, 0.55);
}
/* Keeps the film's own footprint so the board layout never shifts (SRS-191). */
.xray-broken {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  overflow: hidden;
  padding: 8px;
  border-radius: 4px;
  border: 1px dashed #94a3b8;
  background: #e2e8f0;
  color: #64748b;
  font-size: 12px;
  text-align: center;
}
.xray-broken-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  font-size: 11.5px;
  color: #475569;
}
.xray-broken-btn:hover {
  color: #0f172a;
  border-color: #94a3b8;
}

.xray-note {
  color: #26303f;
  border-radius: 6px;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}
.xray-note.is-selected {
  box-shadow:
    0 0 0 calc(1.5px * var(--inv)) #0052ff,
    0 8px 22px rgba(0, 0, 0, 0.45);
}
.xray-note-text {
  width: 100%;
  height: 100%;
  border: 0;
  background: transparent;
  resize: none;
  outline: none;
  font: inherit;
  color: inherit;
  padding: 10px;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
}
.xray-note-text.is-editing {
  pointer-events: auto;
  user-select: text;
  cursor: text;
}

.xray-handle {
  position: absolute;
  width: 11px;
  height: 11px;
  background: #0052ff;
  border: 1.5px solid #fff;
  border-radius: 3px;
  pointer-events: auto;
  transform: translate(-50%, -50%) scale(var(--inv));
}
.xray-handle.is-nw {
  left: 0;
  top: 0;
  cursor: nwse-resize;
}
.xray-handle.is-ne {
  left: 100%;
  top: 0;
  cursor: nesw-resize;
}
.xray-handle.is-sw {
  left: 0;
  top: 100%;
  cursor: nesw-resize;
}
.xray-handle.is-se {
  left: 100%;
  top: 100%;
  cursor: nwse-resize;
}
.xray-handle.is-rot {
  left: 50%;
  top: 0;
  border-radius: 50%;
  background: #fff;
  border-color: #0052ff;
  cursor: grab;
  transform: translate(-50%, -50%) scale(var(--inv)) translateY(-22px);
}

.xray-slot {
  position: absolute;
  box-sizing: border-box;
  border: calc(1.5px * var(--inv)) dashed var(--xray-slot-line);
  border-radius: calc(8px * var(--inv));
  display: grid;
  place-items: center;
  overflow: hidden;
}
.xray-slot span {
  font-size: 24px;
  font-weight: 500;
  line-height: 1.4;
  text-align: center;
  padding: 0 10px;
  color: var(--xray-slot-text);
}
.xray-slot.is-filled {
  border-style: solid;
  opacity: 0.4;
}
.xray-slot.is-filled span {
  display: none;
}

.xray-kbd {
  background: rgba(148, 163, 184, 0.16);
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-bottom-width: 2px;
  border-radius: 4px;
  padding: 1px 5px;
  font: 11px ui-monospace, SFMono-Regular, Menlo, monospace;
}
</style>
