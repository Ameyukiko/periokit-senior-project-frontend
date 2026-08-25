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
import { boardBounds, clamp, findSlotAt, fitIntoSlot } from '@/domain/xray/xray.geometry'
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
  const imageBlobs = new Map<string, Blob>()
  const imageUrls = ref<Record<string, string>>({})

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
    selectedObject.value?.type === 'note' ? selectedObject.value : null,
  )
  /** A never-saved board is editable; a saved one until Edit is pressed is not. */
  const editable = computed(() => !saved.value || editMode.value)
  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)
  const isEmpty = computed(() => objects.value.length === 0)
  const filledSlots = computed(() => {
    const taken = new Set<number>()
    for (const object of objects.value) {
      if (object.type === 'image' && object.slot) taken.add(object.slot)
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
        const imageId = uid()
        imageBlobs.set(imageId, file)
        imageUrls.value[imageId] = url

        // Cascade multi-file drops so they don't land exactly on top of each other.
        const longSide = Math.max(width, height)
        const scale = longSide > IMAGE_MAX_LONG_SIDE ? IMAGE_MAX_LONG_SIDE / longSide : 1
        const w = Math.round(width * scale)
        const h = Math.round(height * scale)
        const object: XrayImageObject = {
          id: uid(),
          type: 'image',
          imageId,
          natW: width,
          natH: height,
          x: Math.round(worldX + index * 28 - w / 2),
          y: Math.round(worldY + index * 28 - h / 2),
          w,
          h,
          rot: 0,
          slot: null,
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
      type: 'note',
      text: preset?.text ?? '',
      color: preset?.color ?? NOTE_DEFAULT_COLOR,
      fontSize: preset?.fontSize ?? NOTE_FONT.default,
      x: Math.round(worldX - NOTE_DEFAULT_SIZE.w / 2),
      y: Math.round(worldY - NOTE_DEFAULT_SIZE.h / 2),
      w: NOTE_DEFAULT_SIZE.w,
      h: NOTE_DEFAULT_SIZE.h,
      rot: 0,
    }
    objects.value.push(note)
    selectedId.value = note.id
    editingNoteId.value = note.id
    pushHistory()
    return note
  }

  function setNoteText(id: string, text: string) {
    const note = objects.value.find(object => object.id === id)
    if (note?.type !== 'note') return
    note.text = text
  }

  function setNoteColor(color: string) {
    const note = selectedNote.value
    if (!note) return
    note.color = color
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
    const next = clamp(note.fontSize + delta, NOTE_FONT.min, NOTE_FONT.max)
    if (next === note.fontSize) return
    note.fontSize = next
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
    const rest = objects.value.filter(candidate => candidate.id !== object.id)
    objects.value = direction === 'front' ? [...rest, object] : [object, ...rest]
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
    if (!object || object.type !== 'image') return 'none'

    const slot = findSlotAt(object.x + object.w / 2, object.y + object.h / 2)
    if (!slot) {
      object.slot = null
      return 'none'
    }
    const taken = objects.value.some(
      candidate =>
        candidate.id !== object.id && candidate.type === 'image' && candidate.slot === slot.id,
    )
    if (taken) {
      object.slot = null
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

  // --- board lifecycle ------------------------------------------------------
  function releaseImages() {
    for (const url of Object.values(imageUrls.value)) URL.revokeObjectURL(url)
    imageUrls.value = {}
    imageBlobs.clear()
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
    isLoading.value = true

    try {
      const record = await xrayBoardStorage.getBoard(key)
      if (boardKey.value !== key) return

      releaseImages()
      if (record) {
        const stored = await xrayBoardStorage.getImages(key)
        if (boardKey.value !== key) return
        for (const image of stored) {
          imageBlobs.set(image.id, image.blob)
          imageUrls.value[image.id] = URL.createObjectURL(image.blob)
        }
        objects.value = record.objects
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
      if (object.type !== 'image') continue
      const blob = imageBlobs.get(object.imageId)
      if (blob) images.push({ id: object.imageId, blob })
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
    lightCanvas,
    toolbarCollapsed,
    // derived
    selectedObject,
    selectedNote,
    editable,
    canUndo,
    canRedo,
    isEmpty,
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
