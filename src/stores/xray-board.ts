import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  FIT_MAX_SCALE,
  FIT_PADDING,
  HISTORY_MAX,
  IMAGE_MAX_LONG_SIDE,
  MAX_SCALE,
  MIN_SCALE,
  NOTE_COLORS,
  NOTE_DEFAULT_COLOR,
  NOTE_DEFAULT_SIZE,
  NOTE_FONT,
  XRAY_PREF_KEYS,
} from '@/domain/xray/xray.constants'
import { boardBounds, clamp, findSlotAt, fitIntoSlot, slotCodeOf } from '@/domain/xray/xray.geometry'
import type { Viewport, XrayImageObject, XrayNoteObject, XrayObject } from '@/domain/xray/xray.types'
import { xrayBoardStorage, type BoardImage } from '@/services/storage/xray-board.storage'
import { useNotificationStore } from './notification'

const uid = () => Math.random().toString(36).slice(2, 9)

/** One board per visit — the draft visit ('new') gets its own key until saved. */
export function xrayBoardKey(patientId: string | null, visitId: string | null) {
  return `${patientId ?? 'no-patient'}::${visitId ?? 'new'}`
}

function readImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => reject(new Error('Image could not be decoded'))
    image.src = url
  })
}

function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode — preferences just don't stick */
  }
}

export const useXrayBoardStore = defineStore('xrayBoard', () => {
  const notifications = useNotificationStore()

  // --- board document -------------------------------------------------------
  const boardKey = ref<string | null>(null)
  const objects = ref<XrayObject[]>([])
  const layout = ref(false)
  const selectedId = ref<string | null>(null)
  const editingNoteId = ref<string | null>(null)

  // --- save state (Draft -> Saved -> Edit -> Saved) --------------------------
  const saved = ref(false)
  const savedAt = ref<Date | null>(null)
  const savedSnapshot = ref<string | null>(null)
  const editMode = ref(false)
  const isSaving = ref(false)
  const isLoading = ref(false)

  // --- viewport -------------------------------------------------------------
  const viewport = ref<Viewport>({ x: 0, y: 0, scale: 1 })
  const stageSize = ref({ width: 0, height: 0 })
  let pendingFit = false

  // Films live in memory as blobs + object URLs while the board is open; the
  // blobs are only written to storage when the board is saved.
  //
  // Kept apart from `objects` on purpose (SRS-191): recovering a film rewrites
  // only the URL, so geometry never moves and the board never turns dirty.
  const imageBlobs = new Map<string, Blob>()
  const imageUrls = ref<Record<string, string>>({})

  // Films that could not be shown, and the ones already retried once. Counted
  // per asset rather than per component so a film that is genuinely gone can't
  // loop error -> recover -> error forever (SRS-192).
  const failedAssets = ref(new Set<string>())
  const retriedAssets = new Set<string>()

  const history = ref<string[]>([])
  const historyIndex = ref(-1)

  // --- view preferences (per user, not per board) ---------------------------
  const lightCanvas = ref(readPref(XRAY_PREF_KEYS.canvasTheme) === 'light')
  const toolbarCollapsed = ref(readPref(XRAY_PREF_KEYS.toolbar) === 'hidden')
  const customNoteColors = ref<string[]>(parseCustomColors())

  function parseCustomColors(): string[] {
    try {
      const parsed = JSON.parse(readPref(XRAY_PREF_KEYS.noteColors) || '[]')
      return Array.isArray(parsed) ? parsed.filter(c => typeof c === 'string') : []
    } catch {
      return []
    }
  }

  // --- derived --------------------------------------------------------------
  const selectedObject = computed(
    () => objects.value.find(object => object.id === selectedId.value) ?? null,
  )
  const selectedNote = computed(() =>
    selectedObject.value?.objectType === 'note' ? selectedObject.value : null,
  )
  /** A never-saved board is editable; a saved one until Edit is pressed is not. */
  const editable = computed(() => !saved.value || editMode.value)
  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)
  const isEmpty = computed(() => objects.value.length === 0)
  /**
   * Paint order (SRS-167). Sorted here rather than by reordering `objects`, so
   * loading never has to touch the stored zIndex values — SRS-169.
   */
  const sortedObjects = computed(() =>
    [...objects.value].sort((a, b) => a.zIndex - b.zIndex),
  )
  const filledSlots = computed(() => {
    const taken = new Set<string>()
    for (const object of objects.value) {
      if (object.objectType === 'image' && object.slotCode) taken.add(object.slotCode)
    }
    return taken
  })
  const isDirty = computed(() =>
    savedSnapshot.value === null ? objects.value.length > 0 : snapshot() !== savedSnapshot.value,
  )
  const noteColors = computed(() => [...NOTE_COLORS, ...customNoteColors.value])

  function snapshot() {
    return JSON.stringify({ objects: objects.value, layout: layout.value })
  }

  /** Next free slot on top of the stack. An empty board starts at 0. */
  function topZIndex() {
    return objects.value.length ? Math.max(...objects.value.map(o => o.zIndex)) : -1
  }

  function bottomZIndex() {
    return objects.value.length ? Math.min(...objects.value.map(o => o.zIndex)) : 0
  }

  // --- history --------------------------------------------------------------
  function pushHistory() {
    const snap = snapshot()
    if (history.value[historyIndex.value] === snap) return
    history.value = history.value.slice(0, historyIndex.value + 1)
    history.value.push(snap)
    if (history.value.length > HISTORY_MAX + 1) history.value.shift()
    historyIndex.value = history.value.length - 1
  }

  function restore(snap: string) {
    const parsed = JSON.parse(snap) as { objects: XrayObject[]; layout: boolean }
    objects.value = parsed.objects
    layout.value = parsed.layout
    if (!objects.value.some(object => object.id === selectedId.value)) selectedId.value = null
    editingNoteId.value = null
  }

  function undo() {
    if (!canUndo.value) return
    historyIndex.value -= 1
    restore(history.value[historyIndex.value])
  }

  function redo() {
    if (!canRedo.value) return
    historyIndex.value += 1
    restore(history.value[historyIndex.value])
  }

  function resetHistory() {
    history.value = []
    historyIndex.value = -1
    pushHistory()
  }

  // --- viewport -------------------------------------------------------------
  function toWorld(screenX: number, screenY: number) {
    return {
      x: (screenX - viewport.value.x) / viewport.value.scale,
      y: (screenY - viewport.value.y) / viewport.value.scale,
    }
  }

  function viewCenter() {
    return toWorld(stageSize.value.width / 2, stageSize.value.height / 2)
  }

  function zoomAt(screenX: number, screenY: number, factor: number) {
    const before = toWorld(screenX, screenY)
    const scale = clamp(viewport.value.scale * factor, MIN_SCALE, MAX_SCALE)
    viewport.value = {
      scale,
      x: screenX - before.x * scale,
      y: screenY - before.y * scale,
    }
  }

  function zoomBy(factor: number) {
    zoomAt(stageSize.value.width / 2, stageSize.value.height / 2, factor)
  }

  function resetZoom() {
    zoomBy(1 / viewport.value.scale)
  }

  function panBy(dx: number, dy: number) {
    viewport.value = { ...viewport.value, x: viewport.value.x + dx, y: viewport.value.y + dy }
  }

  function setViewportOrigin(x: number, y: number) {
    viewport.value = { ...viewport.value, x, y }
  }

  function setViewport(next: Viewport) {
    viewport.value = { ...next, scale: clamp(next.scale, MIN_SCALE, MAX_SCALE) }
  }

  function fit() {
    const { width, height } = stageSize.value
    // The board has no size yet (hidden tab) — fit as soon as it gets one.
    if (!width || !height) {
      pendingFit = true
      return
    }
    pendingFit = false

    const bounds = boardBounds(objects.value, layout.value)
    if (!bounds) {
      viewport.value = { x: width / 2, y: height / 2, scale: 1 }
      return
    }

    const scale = clamp(
      Math.min(
        (width - FIT_PADDING * 2) / (bounds.maxX - bounds.minX),
        (height - FIT_PADDING * 2) / (bounds.maxY - bounds.minY),
      ),
      MIN_SCALE,
      FIT_MAX_SCALE,
    )
    viewport.value = {
      scale,
      x: width / 2 - ((bounds.minX + bounds.maxX) / 2) * scale,
      y: height / 2 - ((bounds.minY + bounds.maxY) / 2) * scale,
    }
  }

  function setStageSize(width: number, height: number) {
    stageSize.value = { width, height }
    if (pendingFit && width && height) fit()
  }

  // --- objects --------------------------------------------------------------
  function select(id: string | null) {
    selectedId.value = id
  }

  async function addImageFiles(files: FileList | File[], worldX: number, worldY: number) {
    const all = Array.from(files)
    const images = all.filter(file => file.type.startsWith('image/'))
    const skipped = all.length - images.length
    if (skipped > 0) {
      notifications.warning(`Skipped ${skipped} non-image file${skipped > 1 ? 's' : ''}`)
    }
    if (!images.length) return

    let added = 0
    for (const [index, file] of images.entries()) {
      const url = URL.createObjectURL(file)
      try {
        const { width, height } = await readImageSize(url)
        const assetId = uid()
        imageBlobs.set(assetId, file)
        imageUrls.value[assetId] = url

        // Cascade multi-file drops so they don't land exactly on top of each other.
        const longSide = Math.max(width, height)
        const scale = longSide > IMAGE_MAX_LONG_SIDE ? IMAGE_MAX_LONG_SIDE / longSide : 1
        const boardWidth = Math.round(width * scale)
        const boardHeight = Math.round(height * scale)
        const object: XrayImageObject = {
          id: uid(),
          zIndex: topZIndex() + 1,
          objectType: 'image',
          assetId,
          naturalWidth: width,
          naturalHeight: height,
          posX: Math.round(worldX + index * 28 - boardWidth / 2),
          posY: Math.round(worldY + index * 28 - boardHeight / 2),
          width: boardWidth,
          height: boardHeight,
          rotation: 0,
          slotCode: null,
        }
        objects.value.push(object)
        selectedId.value = object.id
        added += 1
      } catch (error) {
        URL.revokeObjectURL(url)
        console.error('Failed to read image:', error)
        notifications.error(`Could not open "${file.name}"`)
      }
    }

    if (added > 0) pushHistory()
  }

  function addNote(worldX: number, worldY: number, preset?: Partial<XrayNoteObject>) {
    const note: XrayNoteObject = {
      id: uid(),
      zIndex: topZIndex() + 1,
      objectType: 'note',
      noteText: preset?.noteText ?? '',
      noteColor: preset?.noteColor ?? NOTE_DEFAULT_COLOR,
      noteFontSize: preset?.noteFontSize ?? NOTE_FONT.default,
      posX: Math.round(worldX - NOTE_DEFAULT_SIZE.w / 2),
      posY: Math.round(worldY - NOTE_DEFAULT_SIZE.h / 2),
      width: NOTE_DEFAULT_SIZE.w,
      height: NOTE_DEFAULT_SIZE.h,
      rotation: 0,
    }
    objects.value.push(note)
    selectedId.value = note.id
    editingNoteId.value = note.id
    pushHistory()
    return note
  }

  function setNoteText(id: string, text: string) {
    const note = objects.value.find(object => object.id === id)
    if (note?.objectType !== 'note') return
    note.noteText = text
  }

  function setNoteColor(color: string) {
    const note = selectedNote.value
    if (!note) return
    note.noteColor = color
    pushHistory()
  }

  function addCustomNoteColor(color: string) {
    const value = color.toLowerCase()
    if (!noteColors.value.includes(value)) {
      customNoteColors.value = [...customNoteColors.value, value]
      writePref(XRAY_PREF_KEYS.noteColors, JSON.stringify(customNoteColors.value))
    }
    setNoteColor(value)
  }

  function changeNoteFontSize(delta: number) {
    const note = selectedNote.value
    if (!note) return
    const next = clamp(note.noteFontSize + delta, NOTE_FONT.min, NOTE_FONT.max)
    if (next === note.noteFontSize) return
    note.noteFontSize = next
    pushHistory()
  }

  function removeSelected() {
    const object = selectedObject.value
    if (!object) return
    objects.value = objects.value.filter(candidate => candidate.id !== object.id)
    selectedId.value = null
    editingNoteId.value = null
    pushHistory()
  }

  function reorder(direction: 'front' | 'back') {
    const object = selectedObject.value
    if (!object) return
    // Only the moved object changes — everything else keeps the zIndex it was
    // saved with, so restacking one film can't shuffle the rest of the board.
    object.zIndex = direction === 'front' ? topZIndex() + 1 : bottomZIndex() - 1
    pushHistory()
  }

  function toggleLayout() {
    layout.value = !layout.value
    pushHistory()
    if (layout.value) fit()
  }

  /**
   * Layout mode: a film dropped on a slot snaps in, dropped anywhere else stays
   * free — so a film can always be pulled back out of its slot.
   */
  function snapToSlot(id: string): 'ok' | 'occupied' | 'none' {
    const object = objects.value.find(candidate => candidate.id === id)
    if (!object || object.objectType !== 'image') return 'none'

    const slot = findSlotAt(object.posX + object.width / 2, object.posY + object.height / 2)
    if (!slot) {
      object.slotCode = null
      return 'none'
    }
    const code = slotCodeOf(slot)
    const taken = objects.value.some(
      candidate =>
        candidate.id !== object.id &&
        candidate.objectType === 'image' &&
        candidate.slotCode === code,
    )
    if (taken) {
      object.slotCode = null
      return 'occupied'
    }
    Object.assign(object, fitIntoSlot(object, slot))
    return 'ok'
  }

  // --- view preferences -----------------------------------------------------
  function toggleCanvasTheme() {
    lightCanvas.value = !lightCanvas.value
    writePref(XRAY_PREF_KEYS.canvasTheme, lightCanvas.value ? 'light' : 'dark')
  }

  function toggleToolbar() {
    toolbarCollapsed.value = !toolbarCollapsed.value
    writePref(XRAY_PREF_KEYS.toolbar, toolbarCollapsed.value ? 'hidden' : 'shown')
  }

  // --- film recovery --------------------------------------------------------
  /**
   * Re-reads a film from storage after its <img> failed. Runs at most once per
   * asset; a second failure gives up and leaves the placeholder in place.
   */
  async function recoverAsset(assetId: string) {
    if (retriedAssets.has(assetId)) {
      failedAssets.value.add(assetId)
      return
    }
    retriedAssets.add(assetId)

    const key = boardKey.value
    try {
      const blob = await xrayBoardStorage.getImage(assetId)
      // The board was closed or swapped while we were reading.
      if (boardKey.value !== key) return
      if (!blob) {
        failedAssets.value.add(assetId)
        return
      }
      const stale = imageUrls.value[assetId]
      if (stale) URL.revokeObjectURL(stale)
      imageBlobs.set(assetId, blob)
      imageUrls.value[assetId] = URL.createObjectURL(blob)
      failedAssets.value.delete(assetId)
    } catch (error) {
      console.error('Failed to reload X-ray image:', error)
      if (boardKey.value === key) failedAssets.value.add(assetId)
    }
  }

  /** The Reload button — the user asked, so the once-per-asset budget resets. */
  function reloadAsset(assetId: string) {
    retriedAssets.delete(assetId)
    failedAssets.value.delete(assetId)
    return recoverAsset(assetId)
  }

  // --- board lifecycle ------------------------------------------------------
  function releaseImages() {
    for (const url of Object.values(imageUrls.value)) URL.revokeObjectURL(url)
    imageUrls.value = {}
    imageBlobs.clear()
    failedAssets.value.clear()
    retriedAssets.clear()
  }

  function clearBoardState() {
    objects.value = []
    layout.value = false
    selectedId.value = null
    editingNoteId.value = null
    saved.value = false
    savedAt.value = null
    savedSnapshot.value = null
    editMode.value = false
    history.value = []
    historyIndex.value = -1
  }

  async function loadBoard(key: string) {
    if (boardKey.value === key) return

    boardKey.value = key
    clearBoardState()
    // Nothing points at the old films any more, so drop them here rather than
    // mid-load — a failed read would otherwise strand them.
    releaseImages()
    isLoading.value = true

    try {
      const record = await xrayBoardStorage.getBoard(key)
      if (boardKey.value !== key) return

      if (record) {
        const stored = await xrayBoardStorage.getImages(key)
        if (boardKey.value !== key) return
        for (const image of stored) {
          imageBlobs.set(image.id, image.blob)
          imageUrls.value[image.id] = URL.createObjectURL(image.blob)
        }
        objects.value = record.objects

        // A film the browser evicted leaves its object pointing at nothing.
        // The read above already came up empty, so there is nothing to retry —
        // go straight to the placeholder and let the user ask for a reload.
        for (const object of record.objects) {
          if (object.objectType === 'image' && !imageUrls.value[object.assetId]) {
            retriedAssets.add(object.assetId)
            failedAssets.value.add(object.assetId)
          }
        }
        layout.value = record.layout
        saved.value = true
        savedAt.value = new Date(record.savedAt)
        savedSnapshot.value = snapshot()
      }
    } catch (error) {
      console.error('Failed to open X-ray board:', error)
      notifications.error('Could not open the saved X-ray board')
    } finally {
      if (boardKey.value === key) {
        isLoading.value = false
        resetHistory()
        pendingFit = true
        fit()
      }
    }
  }

  function validateBeforeSave() {
    if (!objects.value.length) {
      notifications.error('Add at least one X-ray before saving')
      return false
    }
    return true
  }

  async function persist(key: string) {
    // Plain copies: Vue's reactive proxies can't be structured-cloned into IndexedDB.
    const plainObjects = JSON.parse(JSON.stringify(objects.value)) as XrayObject[]
    const images: BoardImage[] = []
    for (const object of plainObjects) {
      if (object.objectType !== 'image') continue
      const blob = imageBlobs.get(object.assetId)
      if (blob) images.push({ id: object.assetId, blob })
    }

    await xrayBoardStorage.saveBoard(
      { key, objects: plainObjects, layout: layout.value, savedAt: new Date().toISOString() },
      images,
    )
  }

  /**
   * Moves the open board to a new key — the draft visit ('new') has just been
   * saved and got its real visit id, so the board follows it.
   */
  async function rekeyBoard(nextKey: string) {
    const previousKey = boardKey.value
    if (!previousKey || previousKey === nextKey || !objects.value.length) return
    boardKey.value = nextKey
    if (!saved.value) return
    try {
      await persist(nextKey)
      await xrayBoardStorage.deleteBoard(previousKey)
    } catch (error) {
      console.error('Failed to move the X-ray board to the saved visit:', error)
    }
  }

  async function saveBoard() {
    const key = boardKey.value
    if (isSaving.value || !key) return
    isSaving.value = true
    try {
      await persist(key)

      saved.value = true
      editMode.value = false
      selectedId.value = null
      editingNoteId.value = null
      savedAt.value = new Date()
      savedSnapshot.value = snapshot()
      notifications.success('Board saved')
    } catch (error) {
      console.error('Failed to save X-ray board:', error)
      notifications.error('Save failed — please try again', 'Nothing on the board was lost.')
    } finally {
      isSaving.value = false
    }
  }

  function startEdit() {
    editMode.value = true
  }

  function cancelEdit() {
    editMode.value = false
    selectedId.value = null
    if (savedSnapshot.value) {
      restore(savedSnapshot.value)
      resetHistory()
    }
  }

  function closeBoard() {
    releaseImages()
    clearBoardState()
    boardKey.value = null
    viewport.value = { x: 0, y: 0, scale: 1 }
  }

  return {
    // state
    boardKey,
    objects,
    layout,
    selectedId,
    editingNoteId,
    saved,
    savedAt,
    editMode,
    isSaving,
    isLoading,
    viewport,
    stageSize,
    imageUrls,
    failedAssets,
    lightCanvas,
    toolbarCollapsed,
    // derived
    selectedObject,
    selectedNote,
    editable,
    canUndo,
    canRedo,
    isEmpty,
    sortedObjects,
    isDirty,
    filledSlots,
    noteColors,
    // viewport
    toWorld,
    viewCenter,
    zoomAt,
    zoomBy,
    resetZoom,
    panBy,
    setViewportOrigin,
    setViewport,
    fit,
    setStageSize,
    // objects
    select,
    addImageFiles,
    addNote,
    setNoteText,
    setNoteColor,
    addCustomNoteColor,
    changeNoteFontSize,
    removeSelected,
    reorder,
    toggleLayout,
    snapToSlot,
    pushHistory,
    undo,
    redo,
    // film recovery
    recoverAsset,
    reloadAsset,
    // preferences
    toggleCanvasTheme,
    toggleToolbar,
    // lifecycle
    loadBoard,
    rekeyBoard,
    validateBeforeSave,
    saveBoard,
    startEdit,
    cancelEdit,
    closeBoard,
  }
})
