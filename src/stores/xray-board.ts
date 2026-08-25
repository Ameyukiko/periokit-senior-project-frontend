import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  FIT_MAX_SCALE,
  FIT_PADDING,
  HISTORY_MAX,
  IMAGE_CASCADE_OFFSET,
  MAX_SCALE,
  MIN_SCALE,
  NOTE_COLORS,
  NOTE_DEFAULT_COLOR,
  NOTE_DEFAULT_SIZE,
  NOTE_FONT,
  UPLOAD_ACCEPTED_TYPES,
  UPLOAD_MAX_BYTES,
  UPLOAD_MAX_MB,
  XRAY_PREF_KEYS,
} from '@/domain/xray/xray.constants'
import {
  boardBounds,
  clamp,
  findSlotAt,
  fitIntoSlot,
  initialImageSize,
  slotCodeOf,
} from '@/domain/xray/xray.geometry'
import type { Viewport, XrayImageObject, XrayNoteObject, XrayObject } from '@/domain/xray/xray.types'
import { xrayBoardStorage, type BoardImage } from '@/services/storage/xray-board.storage'
import { useNotificationStore } from './notification'

/**
 * Ids the server will mint once the board is saved through PER-254. UUIDs here
 * so a board drafted offline can never collide with them — with a fallback,
 * because `randomUUID` only exists in a secure context and the dev server is
 * reached over plain http on the LAN.
 */
const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 9)

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

/**
 * Flattens the stack to 0..n-1 — no gaps, nothing negative (SRS-280). "Send to
 * back" counts downwards for as long as the doctor keeps pressing it, and
 * z_index is a SmallInt on the backend, so the drift has to be squeezed out at
 * the point the board is written down. Paint order is unchanged: the sort is
 * what the board was already rendering.
 */
function normalizeZIndex(boardObjects: XrayObject[]): XrayObject[] {
  return [...boardObjects]
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((object, index) => ({ ...object, zIndex: index }))
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

  /**
   * "no board for this visit" and "we could not find out" are different answers
   * (SRS-193). Collapsing them shows an empty Draft over a board that really
   * has films, and the next save wipes it — the one way Phase 1 can lose a
   * patient's data for good.
   */
  const loadState = ref<'loading' | 'loaded' | 'error'>('loading')
  const isRetrying = ref(false)
  /** A retry has come back empty-handed — worth saying so, in plain words. */
  const retryFailed = ref(false)

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

  /** Films read so far out of the batch being added; null when nothing is running. */
  const addProgress = ref<{ done: number; total: number } | null>(null)

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
  /**
   * Was the selected object part of the board as it was last saved? Deleting one
   * of those is worth a question (SRS-283) — a film added a moment ago is not,
   * and asking every time is what teaches a doctor to click straight through it.
   */
  const selectedIsSaved = computed(() => {
    if (!selectedId.value || !savedSnapshot.value) return false
    const parsed = JSON.parse(savedSnapshot.value) as { objects: XrayObject[] }
    return parsed.objects.some(object => object.id === selectedId.value)
  })
  const isLoading = computed(() => loadState.value === 'loading')
  const loadFailed = computed(() => loadState.value === 'error')
  /**
   * A never-saved board is editable; a saved one until Edit is pressed is not.
   * A board we have not read is nobody's to edit — we don't know what it holds.
   */
  const editable = computed(
    () => loadState.value === 'loaded' && (!saved.value || editMode.value),
  )
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
  const isAddingFiles = computed(() => addProgress.value !== null)
  /**
   * Saving is only safe once we know what is already on the board (SRS-195) —
   * a save rewrites the whole record, so writing from a board we failed to read
   * would drop every film we never saw.
   */
  const canSave = computed(
    () =>
      loadState.value === 'loaded' &&
      editable.value &&
      objects.value.length > 0 &&
      // Saving mid-batch writes half the films and marks the board clean, which
      // is the same silent loss that blocking uploads during a save prevents.
      !isAddingFiles.value,
  )

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
    // A save serialises the board the moment the button is pressed. A film added
    // while that is in flight shows on screen but is missing from what gets
    // written, and the next save drops it for good.
    if (isSaving.value) {
      notifications.warning('The board is saving', 'Wait for it to finish, then add the films')
      return
    }
    if (addProgress.value) {
      notifications.warning('Still adding the last films', 'Wait for that batch to finish')
      return
    }

    const images: File[] = []
    const rejected: string[] = []
    for (const file of Array.from(files)) {
      if (!UPLOAD_ACCEPTED_TYPES.includes(file.type)) {
        rejected.push(`${file.name} — only JPEG, PNG or WebP`)
      } else if (file.size > UPLOAD_MAX_BYTES) {
        rejected.push(`${file.name} — larger than ${UPLOAD_MAX_MB} MB`)
      } else {
        images.push(file)
      }
    }

    if (!images.length) {
      reportRejected(rejected)
      return
    }

    // Decoding 18 films is not instant. Showing the count moving is the point —
    // a board that sits still looks broken (SRS-205).
    addProgress.value = { done: 0, total: images.length }

    let added = 0
    for (const [index, file] of images.entries()) {
      const url = URL.createObjectURL(file)
      try {
        const { width, height } = await readImageSize(url)
        const assetId = uid()
        imageBlobs.set(assetId, file)
        imageUrls.value[assetId] = url

        const { width: boardWidth, height: boardHeight } = initialImageSize(width, height)
        const object: XrayImageObject = {
          id: uid(),
          zIndex: topZIndex() + 1,
          objectType: 'image',
          assetId,
          naturalWidth: width,
          naturalHeight: height,
          // Cascade a multi-file batch so the films don't land on top of each other.
          posX: Math.round(worldX + index * IMAGE_CASCADE_OFFSET - boardWidth / 2),
          posY: Math.round(worldY + index * IMAGE_CASCADE_OFFSET - boardHeight / 2),
          width: boardWidth,
          height: boardHeight,
          rotation: 0,
          slotCode: null,
        }
        objects.value.push(object)
        selectedId.value = object.id
        added += 1
      } catch (error) {
        // One bad film does not cost the doctor the other seventeen — this loop
        // never became a Promise.all for that reason (SRS-240, SRS-243). The
        // failed file gets no board object at all (SRS-241).
        URL.revokeObjectURL(url)
        console.error('Failed to read image:', (error as Error)?.message ?? error)
        rejected.push(`${file.name} — the file could not be opened`)
      }
      addProgress.value = { done: index + 1, total: images.length }
    }

    addProgress.value = null
    reportRejected(rejected)
    if (added > 0) pushHistory()
  }

  /**
   * One list at the end rather than a toast per file: 18 separate toasts for 18
   * bad files is not a report, it is a stampede. Names and plain reasons only,
   * never an error code (SRS-238, SRS-239).
   */
  function reportRejected(rejected: string[]) {
    if (!rejected.length) return
    notifications.warning(
      rejected.length === 1 ? 'One file was not added' : `${rejected.length} files were not added`,
      rejected.join('\n'),
      8000,
    )
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
    // Already where it is being sent: bumping the zIndex again would leave the
    // board looking untouched but reading as unsaved (SRS-276, SRS-277).
    const edge = direction === 'front' ? topZIndex() : bottomZIndex()
    if (object.zIndex === edge) return
    // Only the moved object changes — everything else keeps the zIndex it was
    // saved with, so restacking one film can't shuffle the rest of the board.
    object.zIndex = direction === 'front' ? edge + 1 : edge - 1
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

  async function fetchBoard(key: string) {
    loadState.value = 'loading'

    try {
      const record = await xrayBoardStorage.getBoard(key)
      if (boardKey.value !== key) return

      if (record) {
        const stored = await xrayBoardStorage.getImages(key)
        if (boardKey.value !== key) return
        // Held until the read succeeds: a retry that fails must leave the films
        // already on screen exactly where they are (SRS-194).
        releaseImages()
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
      loadState.value = 'loaded'
    } catch (error) {
      if (boardKey.value !== key) return
      // Only the flag moves: the objects on screen stay put (SRS-194) and a
      // board that was Saved is still Saved — a failed read is not a downgrade
      // to Draft (SRS-198).
      loadState.value = 'error'
      // Message only, never the board key: it carries the patient id (SRS-199).
      console.error('Failed to open X-ray board:', (error as Error)?.message ?? error)
    } finally {
      if (boardKey.value === key) {
        resetHistory()
        pendingFit = true
        fit()
      }
    }
  }

  async function loadBoard(key: string) {
    if (boardKey.value === key) return

    boardKey.value = key
    // A different visit's films must never linger on screen, so this board is
    // cleared up front — there is nothing here worth preserving on failure.
    clearBoardState()
    releaseImages()
    retryFailed.value = false
    await fetchBoard(key)
  }

  /** The Try again button. Keeps the current board if the read fails again. */
  async function retryLoad() {
    const key = boardKey.value
    if (!key || isRetrying.value) return
    isRetrying.value = true
    try {
      await fetchBoard(key)
      retryFailed.value = loadState.value === 'error'
    } finally {
      isRetrying.value = false
    }
  }

  function validateBeforeSave() {
    if (loadFailed.value) {
      notifications.error(
        'Saving is off until the board loads',
        'We could not read what is already on it, so saving now could overwrite it.',
      )
      return false
    }
    if (!objects.value.length) {
      notifications.error('Add at least one X-ray before saving')
      return false
    }
    return true
  }

  async function persist(key: string) {
    // Plain copies: Vue's reactive proxies can't be structured-cloned into IndexedDB.
    // Normalised on the way out only — the board on screen keeps the zIndex the
    // doctor's last reorder gave it, so nothing shifts under them mid-session.
    const plainObjects = normalizeZIndex(
      JSON.parse(JSON.stringify(objects.value)) as XrayObject[],
    )
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
    // Also a write that drops the old record, so it needs the same guard as
    // saveBoard — never move a board we could not read in full.
    if (!previousKey || previousKey === nextKey || !objects.value.length || loadFailed.value) {
      return
    }
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
    // Checked again here, not just on the button: this is the only call that
    // rewrites the stored record, so it is the one place that must hold.
    if (isSaving.value || !key || loadFailed.value) return
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
    loadState.value = 'loading'
    retryFailed.value = false
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
    loadState,
    isRetrying,
    retryFailed,
    viewport,
    stageSize,
    imageUrls,
    failedAssets,
    addProgress,
    lightCanvas,
    toolbarCollapsed,
    // derived
    selectedObject,
    selectedNote,
    selectedIsSaved,
    isLoading,
    loadFailed,
    isAddingFiles,
    editable,
    canSave,
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
    retryLoad,
    rekeyBoard,
    validateBeforeSave,
    saveBoard,
    startEdit,
    cancelEdit,
    closeBoard,
  }
})
