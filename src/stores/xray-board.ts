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
import {
  checkXrayFile,
  createUploadIds,
  isRetryableReason,
  newUploadId,
  reasonText,
} from '@/domain/xray/xray.upload'
import type {
  Viewport,
  XrayBoardObjectInput,
  XrayBoardResponse,
  XrayImageObject,
  XrayNoteObject,
  XrayObject,
  XrayRejectReason,
  XrayUploadFailure,
  XrayUploadItem,
} from '@/domain/xray/xray.types'
import { toBoardFailure, toUploadFailure, xrayApi, xrayAssetApi } from '@/services/api/xray.api'
import { useNotificationStore } from './notification'

/**
 * Ids the server will mint once the board is saved through PER-254. UUIDs so a
 * board drafted offline can never collide with them — the same generator the
 * upload uses, since a film's assetId here is the uploadId it goes up under.
 */
const uid = newUploadId

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
    // The id breaks a tie so the order is the board's and not the array's:
    // without it, two objects sharing a zIndex would be flattened in whatever
    // order they happen to sit in, and moving one of them within the array
    // would read as an edit to a board that looks identical.
    .sort((a, b) => a.zIndex - b.zIndex || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((object, index) => ({ ...object, zIndex: index }))
}

/**
 * The API response, back into the board's own shape. Nothing is recomputed on
 * the way in — SRS-169 forbids touching geometry on load, so every number is
 * passed through as the server sent it, and the union is recovered from
 * `objectType` alone.
 *
 * `naturalWidth`/`naturalHeight` live on the asset rather than the object, so
 * they are looked up; a film whose asset did not come back (cleaned up, or a URL
 * the server could not sign) falls back to its on-board size, which keeps the
 * aspect ratio it is already drawn at rather than collapsing it.
 */
function fromResponse(board: XrayBoardResponse): XrayObject[] {
  const assets = new Map(board.assets.map(asset => [asset.id, asset]))
  return board.objects.map(object => {
    const base = {
      id: object.id,
      zIndex: object.zIndex,
      posX: object.posX,
      posY: object.posY,
      width: object.width,
      height: object.height,
      rotation: object.rotation,
    }
    if (object.objectType !== 'image') {
      return {
        ...base,
        objectType: 'note',
        noteText: object.noteText ?? '',
        noteColor: object.noteColor ?? NOTE_DEFAULT_COLOR,
        noteFontSize: object.noteFontSize ?? NOTE_FONT.default,
      } satisfies XrayNoteObject
    }
    const asset = object.assetId ? assets.get(object.assetId) : undefined
    return {
      ...base,
      objectType: 'image',
      assetId: object.assetId ?? '',
      naturalWidth: asset?.naturalWidth || object.width,
      naturalHeight: asset?.naturalHeight || object.height,
      slotCode: object.slotCode,
    } satisfies XrayImageObject
  })
}

/**
 * One object, on its way to `saveXrayBoard`. The id is deliberately dropped: a
 * save is replace-all, so the server has no old row to match it against and
 * mints a fresh one (PER-233). A note must not carry `assetId` at all — the
 * resolver refuses one that does — so the two branches send different fields
 * rather than one shape with nulls in it.
 */
function toSaveInput(object: XrayObject): XrayBoardObjectInput {
  const base = {
    objectType: object.objectType,
    zIndex: object.zIndex,
    posX: object.posX,
    posY: object.posY,
    width: object.width,
    height: object.height,
    rotation: object.rotation,
  }
  return object.objectType === 'image'
    ? { ...base, assetId: object.assetId, slotCode: object.slotCode }
    : {
        ...base,
        noteText: object.noteText,
        noteColor: object.noteColor,
        noteFontSize: object.noteFontSize,
      }
}

/**
 * The board reduced to what a save would actually write down (PER-257 §3).
 * Built from `toSaveInput` on purpose: the dirty check then compares the exact
 * payload the mutation would send, and a field added to one is a field added to
 * the other. Everything else is left out by construction — the id, the natural
 * size, and above all the signed URL, which lives in `imageUrls` and would
 * otherwise turn the board dirty every time it was refreshed.
 *
 * Rotation is the one saved number that is not an integer: it comes out of an
 * `atan2` during a drag, so it is rounded here to keep 45 and 45.00000001 from
 * reading as different boards. The value on the board is left alone.
 */
function fingerprint(boardObjects: XrayObject[]): string {
  return JSON.stringify(
    normalizeZIndex(boardObjects).map(object => ({
      ...toSaveInput(object),
      rotation: Math.round(object.rotation * 100) / 100,
    })),
  )
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
  /**
   * The visit the films belong to, kept apart from the board key because the
   * key is a storage address and this is what the upload endpoint is addressed
   * by. `'new'` is the draft tab, which has no visit server-side yet.
   */
  const visitId = ref<string | null>(null)
  const objects = ref<XrayObject[]>([])
  const layout = ref(false)
  const selectedId = ref<string | null>(null)
  const editingNoteId = ref<string | null>(null)

  // --- save state (Draft -> Saved -> Edit -> Saved) --------------------------
  const saved = ref(false)
  const savedAt = ref<Date | null>(null)
  /**
   * The board as it was last written down, in full — this is what Cancel puts
   * back and what tells a saved object from one added since, so it keeps every
   * field rather than only the saved ones.
   */
  const savedSnapshot = ref<string | null>(null)
  /** The same moment, reduced to what a save would write (PER-257 §3). */
  const savedFingerprint = ref<string | null>(null)
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

  // --- upload queue (PER-245) -----------------------------------------------
  // One row per film the doctor picked, from picked to on the board. It outlives
  // the batch on purpose: a row that vanishes the moment the last upload settles
  // takes the report of what failed with it.
  const uploadQueue = ref<XrayUploadItem[]>([])
  /**
   * The file behind each row. Held outside the reactive list because a File has
   * nothing worth tracking, and kept at all so a Retry can resend the same
   * bytes — including for a file the checks here refused, which is an appeal to
   * the server rather than a repeat of the same question.
   */
  const queued = new Map<string, File>()
  /**
   * Where this batch was dropped, and how many of its films have landed. The
   * cascade is counted at the moment a film lands rather than when it was
   * picked, so refused files leave no gap in the fan and one that only makes it
   * on the second try still gets the next place in line (SRS-232).
   */
  let batchOrigin = { x: 0, y: 0 }
  let landed = 0
  let queueRunning = false

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
  /**
   * Whether a save would write anything different from what is already there.
   *
   * PER-257 §3 returns false outside edit mode; here a board that has never been
   * written down at all counts its films instead. A Draft with films on it has
   * unsaved work by definition, and it is what the route guard reads — a doctor
   * closing the tab on films that were never saved has to be asked, and there is
   * no edit mode to be in yet.
   */
  const isDirty = computed(() =>
    savedFingerprint.value === null
      ? objects.value.length > 0
      : fingerprint(objects.value) !== savedFingerprint.value,
  )
  const noteColors = computed(() => [...NOTE_COLORS, ...customNoteColors.value])
  const isAddingFiles = computed(() =>
    uploadQueue.value.some(item => item.status === 'pending' || item.status === 'uploading'),
  )
  /**
   * A visit only exists server-side once `saveChart` has created it, so the
   * draft tab has nowhere to send films to. Its board still works — the films
   * stay in this browser until the visit is saved — and the queue says so
   * rather than reporting an upload that was never attempted.
   */
  const canUpload = computed(() => Boolean(visitId.value) && visitId.value !== 'new')
  /**
   * Saving is only safe once we know what is already on the board (SRS-195) —
   * a save rewrites the whole record, so writing from a board we failed to read
   * would drop every film we never saw.
   */
  const canSave = computed(
    () =>
      loadState.value === 'loaded' &&
      editable.value &&
      // A board belongs to a visit, and the draft tab has no visit to belong to.
      canUpload.value &&
      objects.value.length > 0 &&
      // Saving mid-batch writes half the films and marks the board clean, which
      // is the same silent loss that blocking uploads during a save prevents.
      !isAddingFiles.value,
  )

  /**
   * A board this store can put back: what undo steps through, and what Cancel
   * restores. Every field is kept, including the ones a save never sends — the
   * id an object is selected by, and the natural size a slot is fitted from —
   * because this is a restore point, not a comparison. `fingerprint` is the one
   * that decides whether anything changed.
   *
   * The viewport is deliberately absent: pan and zoom are ways of looking, not
   * edits, and stepping back through them would undo nothing the doctor did
   * (SRS-300, SRS-301). The layout toggle is absent for the same reason — which
   * film sits in which FMX slot travels in `slot_code`, but which mode you
   * happen to be looking through is not part of the board.
   *
   * zIndex is normalised so a stack that ends up back in the order it was saved
   * in reads as unchanged, the same way a film dragged out and back does.
   */
  function snapshot() {
    return JSON.stringify({ objects: normalizeZIndex(objects.value) })
  }

  /**
   * Pins the board as it stands now. PER-257 §5 allows exactly three callers —
   * a board that has just been read, a board that has just been saved, and the
   * moment Edit is pressed — and nothing else may move these, or Cancel would
   * put back a board the doctor never agreed to.
   */
  function markSaved() {
    savedSnapshot.value = snapshot()
    savedFingerprint.value = fingerprint(objects.value)
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
    const parsed = JSON.parse(snap) as { objects: XrayObject[] }
    objects.value = parsed.objects
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
    if (isAddingFiles.value) {
      notifications.warning('Still adding the last films', 'Wait for that batch to finish')
      return
    }

    const picked = Array.from(files)
    if (!picked.length) return

    // A new batch gets a new list. The rows from the last one have been read by
    // now, and leaving them would bury this batch's failures among them.
    clearUploadQueue()

    batchOrigin = { x: worldX, y: worldY }

    // Minted for everything picked, one per file and all different: the id a
    // film is drawn under here is the id it is filed under server-side
    // (PER-260 §4), and the id a retry resends (SRS-245). Files that never
    // leave the browser get one too, so a row is always a row's own thing.
    const uploadIds = createUploadIds(picked.length)

    // A file the checks refuse becomes a row in the same list as the films that
    // go up, in the order the doctor picked them (PER-245): three films land
    // and the two PDFs among them are named right where they were chosen, so
    // there is one report to read instead of a message about some of the batch
    // and a list about the rest.
    let sending = 0
    picked.forEach((file, index) => {
      const uploadId = uploadIds[index]
      queued.set(uploadId, file)
      const reason = checkXrayFile(file)

      uploadQueue.value.push({
        uploadId,
        fileName: file.name,
        status: reason ? 'failed' : 'pending',
        progress: 0,
        error: reason ? reasonText(reason) : undefined,
        canRetry: reason !== null && canAppeal(reason),
      })

      if (!reason) sending += 1
    })

    // Every file was refused: the rows are the whole report, and there is
    // nothing to send.
    if (sending > 0) await runUploadQueue()
  }

  /**
   * Whether a Retry on a file this browser refused is worth offering. The
   * checks here run on `file.type`, which is the operating system's guess from
   * the extension and is wrong often enough to matter — the server reads the
   * actual bytes. So Retry on an `unsupported_type` means "send it up anyway
   * and let the server decide", and a film the browser mislabelled gets on the
   * board (SRS-208, SRS-211).
   *
   * Size is left out: both sides use the same 10 MB limit and a byte count is
   * not a guess, so that Retry would only be a long upload with a known ending.
   */
  function canAppeal(reason: XrayRejectReason) {
    return reason === 'unsupported_type' && canUpload.value
  }

  function failItem(item: XrayUploadItem, error: string, canRetry: boolean) {
    item.status = 'failed'
    item.error = error
    item.canRetry = canRetry
  }

  /**
   * How far one film got. `halted` is the only one that concerns the films
   * behind it: the answer was about the session or the visit rather than about
   * this film, so the rest would only collect the same refusal. A plain
   * `refused` stops at its own row — one bad film must not cost the doctor the
   * other seventeen (SRS-240, SRS-243).
   */
  type UploadStep =
    | { outcome: 'uploaded'; size: { width: number; height: number } | null }
    | { outcome: 'refused' }
    | { outcome: 'halted'; failure: XrayUploadFailure }

  async function uploadOne(item: XrayUploadItem, file: File): Promise<UploadStep> {
    try {
      const outcome = await xrayAssetApi.upload(
        visitId.value as string,
        [file],
        [item.uploadId],
        percent => {
          item.progress = percent
        },
      )

      const rejection = outcome.rejected[0]
      if (rejection) {
        failItem(item, reasonText(rejection.reason), isRetryableReason(rejection.reason))
        return { outcome: 'refused' }
      }

      const asset = outcome.uploaded[0]
      if (!asset) {
        // Accepted, but with neither a film nor a reason: nothing to put on the
        // board and nothing to explain, so it counts as a trip that didn't land.
        failItem(item, reasonText('upload_failed'), true)
        return { outcome: 'refused' }
      }

      // Only ever the id this visit's endpoint just handed back, so an object
      // can never end up pointing at another visit's film (SRS-228, SRS-229).
      item.assetId = asset.id
      item.progress = 100
      // The server read the film with sharp on the way in, so its size is
      // already known and the browser has nothing left to measure (SRS-223).
      const size =
        asset.naturalWidth > 0 && asset.naturalHeight > 0
          ? { width: asset.naturalWidth, height: asset.naturalHeight }
          : null
      return { outcome: 'uploaded', size }
    } catch (error) {
      const failure = toUploadFailure(error)
      failItem(item, failure.title, failure.canRetry)
      return failure.stopsBatch ? { outcome: 'halted', failure } : { outcome: 'refused' }
    }
  }

  /**
   * Puts an uploaded film on the board. Split from the upload because the two
   * can fail separately: A3 in PER-245 is the film reaching the server and the
   * board still not being able to take it, and a half-drawn object must never
   * appear (SRS-241) — the row says what happened and offers another go.
   */
  async function placeFilm(
    item: XrayUploadItem,
    file: File,
    naturalSize: { width: number; height: number } | null,
  ): Promise<boolean> {
    const assetId = item.assetId ?? item.uploadId
    const key = boardKey.value
    const url = URL.createObjectURL(file)
    try {
      // The server read the film's size with sharp on the way in, so there is
      // nothing to decode twice (SRS-223). Without a server there is no other
      // way to know how big the film is.
      const { width, height } = naturalSize ?? (await readImageSize(url))
      // The board was closed or swapped while the film was being read: this one
      // belongs to a visit nobody is looking at any more.
      if (boardKey.value !== key) {
        URL.revokeObjectURL(url)
        return false
      }
      const { width: boardWidth, height: boardHeight } = initialImageSize(width, height)

      imageBlobs.set(assetId, file)
      // URLs live in this map and never on the object itself (SRS-234).
      imageUrls.value[assetId] = url

      const object: XrayImageObject = {
        id: uid(),
        zIndex: topZIndex() + 1,
        objectType: 'image',
        assetId,
        naturalWidth: width,
        naturalHeight: height,
        posX: Math.round(batchOrigin.x + landed * IMAGE_CASCADE_OFFSET - boardWidth / 2),
        posY: Math.round(batchOrigin.y + landed * IMAGE_CASCADE_OFFSET - boardHeight / 2),
        width: boardWidth,
        height: boardHeight,
        rotation: 0,
        slotCode: null,
      }
      objects.value.push(object)
      selectedId.value = object.id
      landed += 1

      item.status = 'done'
      item.progress = 100
      item.canRetry = false
      return true
    } catch (error) {
      URL.revokeObjectURL(url)
      console.error('Failed to read image:', (error as Error)?.message ?? error)
      // Uploaded and then refused by the board is worth another go; a file that
      // passed every check and still would not decode gives the same answer
      // however often it is asked, so that row gets no button.
      if (item.assetId) {
        failItem(item, 'Uploaded, but it could not be added to the board', true)
      } else {
        failItem(item, reasonText('unreadable'), false)
      }
      return false
    }
  }

  /**
   * Works through whatever is still pending, one film at a time. One request
   * per film rather than one for the batch: a batch reports a single byte count
   * for all of them, and the per-file bar and the per-file Retry both depend on
   * knowing which film the bytes belong to (SRS-205, SRS-244).
   */
  async function runUploadQueue() {
    if (queueRunning) return
    queueRunning = true
    const key = boardKey.value
    let added = 0

    try {
      for (const item of uploadQueue.value) {
        if (item.status !== 'pending') continue
        // Switching visits mid-batch abandons the rest: the films left in it
        // were picked for a board that is no longer open.
        if (boardKey.value !== key) break

        const file = queued.get(item.uploadId)
        if (!file) {
          failItem(item, 'The file is no longer open', false)
          continue
        }

        item.status = 'uploading'
        item.progress = 0
        item.error = undefined

        let naturalSize: { width: number; height: number } | null = null
        if (canUpload.value) {
          // No second look at `file.type` here: a row only reaches this loop
          // because it passed the checks, or because the doctor asked for it to
          // go up in spite of them. Running the same check again would answer
          // the appeal with the opinion it was appealing against.
          const step = await uploadOne(item, file)
          if (step.outcome === 'halted') {
            haltQueue(step.failure)
            break
          }
          if (step.outcome === 'refused') continue
          naturalSize = step.size
        }

        // A film handed over from the draft board is already on screen: this
        // trip was to give it a real asset id, not to put a second copy down.
        const placed = objects.value.find(
          (object): object is XrayImageObject =>
            object.objectType === 'image' && object.assetId === item.uploadId,
        )
        if (placed) {
          if (item.assetId) adoptAssetId(placed, item.assetId)
          item.status = 'done'
          item.progress = 100
          item.canRetry = false
          continue
        }

        if (await placeFilm(item, file, naturalSize)) added += 1
      }
    } finally {
      queueRunning = false
    }

    if (added > 0 && boardKey.value === key) pushHistory()
  }

  /**
   * 401 and 403 are answers about the session or the visit rather than about
   * one film, so every film still waiting behind it would only be refused the
   * same way. One message, once, and the rows say the same thing.
   */
  function haltQueue(failure: XrayUploadFailure) {
    for (const item of uploadQueue.value) {
      if (item.status === 'pending' || item.status === 'uploading') {
        failItem(item, failure.title, false)
      }
    }
    notifications.error(failure.title, failure.detail, 8000)
  }

  /** Retries one film, under the id it already went up with (SRS-245). */
  async function retryUpload(uploadId: string) {
    if (isSaving.value || isAddingFiles.value) return
    const item = uploadQueue.value.find(candidate => candidate.uploadId === uploadId)
    if (!item || item.status !== 'failed' || !item.canRetry) return
    item.status = 'pending'
    item.progress = 0
    item.error = undefined
    await runUploadQueue()
  }

  /**
   * The films that failed, and only those. A button that resent the whole batch
   * would upload the ones already on the board a second time, which is the one
   * thing PER-245 spells out as forbidden.
   */
  async function retryFailedUploads() {
    if (isSaving.value || isAddingFiles.value) return
    let queuedAny = false
    for (const item of uploadQueue.value) {
      if (item.status !== 'failed' || !item.canRetry) continue
      item.status = 'pending'
      item.progress = 0
      item.error = undefined
      queuedAny = true
    }
    if (queuedAny) await runUploadQueue()
  }

  /** Puts the report away. Never mid-flight — those rows are still moving. */
  function clearUploadQueue() {
    if (isAddingFiles.value) return
    resetUploadQueue()
  }

  /**
   * The same, without the question: closing or swapping a board takes its films
   * with it, so whatever the run was still holding has nowhere to go. Safe
   * mid-flight because the run checks the board key between films.
   */
  function resetUploadQueue() {
    uploadQueue.value = []
    queued.clear()
    landed = 0
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

  /**
   * Not an edit and not undoable: the mode is a way of looking at the board, and
   * the slots a film is mounted in travel in `slot_code` either way.
   */
  function toggleLayout() {
    layout.value = !layout.value
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
   * Gets a film back on screen after its <img> failed. Runs at most once per
   * asset; a second failure gives up and leaves the placeholder in place.
   */
  async function recoverAsset(assetId: string) {
    if (retriedAssets.has(assetId)) {
      failedAssets.value.add(assetId)
      return
    }
    retriedAssets.add(assetId)

    // A film added this session is still in memory — there is nothing to ask
    // the server for, and asking would only be slower.
    const blob = imageBlobs.get(assetId)
    if (blob) {
      const stale = imageUrls.value[assetId]
      if (stale?.startsWith('blob:')) URL.revokeObjectURL(stale)
      imageUrls.value[assetId] = URL.createObjectURL(blob)
      failedAssets.value.delete(assetId)
      return
    }

    const key = boardKey.value
    try {
      // Signed URLs are minted per request and run out (SRS-185, SRS-187), so
      // the usual reason a film stops loading on a board left open all morning
      // is simply that its URL has expired.
      const { data } = await xrayApi.refreshUrls([assetId])
      // The board was closed or swapped while we were asking.
      if (boardKey.value !== key) return
      const asset = data?.refreshXrayUrls?.find(candidate => candidate.id === assetId)
      if (!asset?.signedUrl) {
        failedAssets.value.add(assetId)
        return
      }
      imageUrls.value[assetId] = asset.signedUrl
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
  // Only the object URLs are ours to revoke — a signed URL is the server's, and
  // revoking one is a no-op that reads as if it were doing something.
  function releaseImages() {
    for (const url of Object.values(imageUrls.value)) {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url)
    }
    imageUrls.value = {}
    imageBlobs.clear()
    failedAssets.value.clear()
    retriedAssets.clear()
  }

  /**
   * Drops the films nothing on the board points at any more. Only ever safe
   * where they cannot come back — `cancelEdit` clears the undo history along
   * with them, so there is no state left that could ask for one.
   */
  function releaseUnreferencedImages() {
    const inUse = new Set(
      objects.value.filter(object => object.objectType === 'image').map(object => object.assetId),
    )
    for (const assetId of new Set([...Object.keys(imageUrls.value), ...imageBlobs.keys()])) {
      if (inUse.has(assetId)) continue
      const url = imageUrls.value[assetId]
      if (url) URL.revokeObjectURL(url)
      delete imageUrls.value[assetId]
      imageBlobs.delete(assetId)
      failedAssets.value.delete(assetId)
      retriedAssets.delete(assetId)
    }
  }

  function clearBoardState() {
    objects.value = []
    layout.value = false
    selectedId.value = null
    editingNoteId.value = null
    saved.value = false
    savedAt.value = null
    savedSnapshot.value = null
    savedFingerprint.value = null
    editMode.value = false
    history.value = []
    historyIndex.value = -1
  }

  /**
   * Puts a board the server just handed us on screen — used by the read and by
   * the save, which answers with the same shape. Signed URLs go straight into
   * `imageUrls`: they are minted per request and must never be stored (SRS-185).
   *
   * A film whose asset did not come back gets a placeholder rather than an empty
   * frame, and is marked as already retried: the board we just read is the
   * freshest answer there is, so asking for it again would only repeat it. The
   * Reload button clears that budget when the doctor asks.
   */
  function applyBoard(board: XrayBoardResponse) {
    releaseImages()
    objects.value = fromResponse(board)
    for (const asset of board.assets) {
      if (asset.signedUrl) imageUrls.value[asset.id] = asset.signedUrl
    }
    for (const object of objects.value) {
      if (object.objectType === 'image' && !imageUrls.value[object.assetId]) {
        retriedAssets.add(object.assetId)
        failedAssets.value.add(object.assetId)
      }
    }
    // No column says which mode the board was left in, and none is needed: a
    // board with a film mounted in a slot is a board being laid out.
    layout.value = objects.value.some(
      object => object.objectType === 'image' && object.slotCode !== null,
    )
    saved.value = board.status === 'saved'
    savedAt.value = board.savedAt ? new Date(board.savedAt) : null
  }

  async function fetchBoard(key: string) {
    loadState.value = 'loading'

    // A visit that does not exist server-side has no board to read. Not an
    // error and not an empty board either — it is a board that has nowhere to
    // be yet, and the films on it stay in this browser until it does.
    if (!canUpload.value) {
      loadState.value = 'loaded'
      resetHistory()
      pendingFit = true
      fit()
      return
    }

    try {
      const { data } = await xrayApi.getByVisit(visitId.value as string)
      if (boardKey.value !== key) return

      // Null is "this visit has no board", which is a Draft — not a failure.
      const board = data?.xrayBoardByVisit ?? null
      if (board) {
        applyBoard(board)
        markSaved()
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

  async function loadBoard(key: string, visit: string | null) {
    if (boardKey.value === key) return

    boardKey.value = key
    visitId.value = visit
    // A different visit's films must never linger on screen, so this board is
    // cleared up front — there is nothing here worth preserving on failure.
    clearBoardState()
    releaseImages()
    resetUploadQueue()
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
    // A board belongs to a visit, and this one does not have a visit yet.
    if (!canUpload.value) {
      notifications.error(
        'Save the visit first',
        'This visit has not been created yet, so there is nothing to attach the films to. Save the chart and the films go up with it.',
      )
      return false
    }
    if (!objects.value.length) {
      notifications.error('Add at least one X-ray before saving')
      return false
    }
    return true
  }

  /** Moves a film's blob and its URL onto the id the server filed it under. */
  function adoptAssetId(film: XrayImageObject, assetId: string) {
    if (film.assetId === assetId) return
    const previous = film.assetId
    const blob = imageBlobs.get(previous)
    if (blob) {
      imageBlobs.set(assetId, blob)
      imageBlobs.delete(previous)
    }
    const url = imageUrls.value[previous]
    if (url) {
      imageUrls.value[assetId] = url
      delete imageUrls.value[previous]
    }
    film.assetId = assetId
  }

  /**
   * The films drafted before the visit existed, sent up now that it does.
   *
   * A board on the draft tab has nowhere to upload to, so its films sit in this
   * browser under ids we minted. `saveXrayBoard` refuses an object pointing at
   * an asset the visit does not own, so without this the first save after the
   * chart is created would be rejected whole — and the doctor would have to
   * re-add every film they had already placed.
   */
  async function uploadDraftFilms(key: string) {
    if (!canUpload.value) return
    const films = objects.value.filter(
      (object): object is XrayImageObject =>
        object.objectType === 'image' && imageBlobs.has(object.assetId),
    )
    if (!films.length) return

    // Queued rather than uploaded here, so these films go up the same way every
    // other film does: one request each, a progress bar per row, and a Retry
    // that means the same thing. The run adopts rather than places them,
    // because they are already on the board.
    for (const film of films) {
      const blob = imageBlobs.get(film.assetId)
      if (!blob) continue
      // Always a File in practice — the one the doctor picked, kept since — but
      // a Blob would still upload, just without its original name.
      const file =
        blob instanceof File ? blob : new File([blob], 'radiograph', { type: blob.type })
      queued.set(film.assetId, file)
      uploadQueue.value.push({
        uploadId: film.assetId,
        fileName: file.name,
        status: 'pending',
        progress: 0,
        canRetry: false,
      })
    }

    await runUploadQueue()
    // The ids these films were drawn under before the hand-off point at nothing
    // the server has ever heard of, so an undo back past it would build a board
    // that `saveXrayBoard` refuses whole.
    if (boardKey.value === key) resetHistory()
  }

  /**
   * Moves the open board to a new key — the draft visit ('new') has just been
   * saved and got its real visit id, so the board follows it, and its films
   * finally have somewhere to go.
   */
  async function rekeyBoard(nextKey: string, nextVisitId: string | null) {
    const previousKey = boardKey.value
    // Bailing here leaves the key alone, so the panel's own watcher opens the
    // new board from scratch.
    if (!previousKey || previousKey === nextKey || loadFailed.value) return

    boardKey.value = nextKey
    visitId.value = nextVisitId
    // The report was about films added to the draft. It says nothing true about
    // the visit they have just moved to, so it goes rather than misleads.
    resetUploadQueue()
    await uploadDraftFilms(nextKey)
  }

  /**
   * Writes the board down. Reports whether it landed so the caller can keep the
   * confirmation up on failure — a dialog that closes on a save that did not
   * happen leaves the doctor with a toast and nothing to press.
   */
  async function saveBoard(): Promise<boolean> {
    const key = boardKey.value
    // Checked again here, not just on the button: this is the only call that
    // rewrites the board server-side, so it is the one place that must hold.
    if (isSaving.value || !key || loadFailed.value || !canUpload.value) return false
    isSaving.value = true
    try {
      const { data } = await xrayApi.save({
        visitId: visitId.value as string,
        // Flattened to 0..n-1 on the way out only (SRS-280) — z_index is a
        // SmallInt and "send to back" keeps counting down. The board on screen
        // keeps the zIndex the doctor's last reorder gave it, so nothing shifts
        // under them mid-session.
        objects: normalizeZIndex(objects.value).map(toSaveInput),
      })
      const board = data?.saveXrayBoard
      if (!board) throw new Error('saveXrayBoard answered without a board')
      // The board was closed or swapped while the save was in flight — the
      // answer belongs to a visit nobody is looking at any more.
      if (boardKey.value !== key) return false

      // PER-256 §4.2. The ids the frontend minted were never sent and do not
      // exist in the database: the save is replace-all and the server issued its
      // own. Keeping the old ones would leave every object on screen pointing at
      // a row that is not there.
      applyBoard(board)
      editMode.value = false
      selectedId.value = null
      editingNoteId.value = null
      // Taken after the payload lands, or the dirty check would be comparing
      // against a board built from ids the server never issued.
      markSaved()
      // PER-255 deletes the assets no saved object points at any more, so the
      // states before this one are gone for good — an undo back into them would
      // put frames on the board with nothing behind them.
      resetHistory()
      notifications.success('Board saved')
      return true
    } catch (error) {
      console.error('Failed to save X-ray board:', error)
      const failure = toBoardFailure(error)
      notifications.error(failure.title, failure.detail, 8000)
      return false
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Nothing but a flag on this side of the wire (PER-257 §2). No request goes
   * out and `xray_boards.status` stays `saved` — a board that turned back into a
   * draft the moment someone opened it to look would be marked unfinished by a
   * doctor who changed nothing and closed the tab.
   *
   * The snapshot is re-pinned even though view mode cannot have moved anything,
   * so that what Cancel restores is always the board Edit was pressed on rather
   * than something taken further back.
   */
  function startEdit() {
    markSaved()
    editMode.value = true
  }

  function cancelEdit() {
    editMode.value = false
    selectedId.value = null
    if (savedSnapshot.value) {
      restore(savedSnapshot.value)
      resetHistory()
      // The films the report was about are off the board with the edit, so a
      // list still offering to retry them has nothing left to add them to.
      clearUploadQueue()
      // The films added during the edit are off the board and out of the undo
      // history with it, so their blobs belong to nobody now (SRS-353). A
      // full-mouth series discarded and re-added a few times is a lot of memory
      // to leave behind for the life of the tab.
      releaseUnreferencedImages()
    }
  }

  function closeBoard() {
    releaseImages()
    clearBoardState()
    resetUploadQueue()
    loadState.value = 'loading'
    retryFailed.value = false
    boardKey.value = null
    visitId.value = null
    viewport.value = { x: 0, y: 0, scale: 1 }
  }

  return {
    // state
    boardKey,
    visitId,
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
    uploadQueue,
    lightCanvas,
    toolbarCollapsed,
    // derived
    selectedObject,
    selectedNote,
    selectedIsSaved,
    isLoading,
    loadFailed,
    isAddingFiles,
    canUpload,
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
    retryUpload,
    retryFailedUploads,
    clearUploadQueue,
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
