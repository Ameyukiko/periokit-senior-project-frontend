import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  FMX_SLOTS,
  INTRAORAL_SLOTS,
  IMAGE_CASCADE_OFFSET,
  NOTE_COLORS,
  NOTE_DEFAULT_COLOR,
  NOTE_DEFAULT_SIZE,
  NOTE_FONT,
  XRAY_BOARD_MAX_OBJECTS,
  XRAY_PREF_KEYS,
} from '@/domain/xray/xray.constants'
import {
  createXrayBoardFingerprint,
  createXrayBoardSaveInput,
  createXrayBoardSnapshot,
  mapXrayBoardResponse,
  parseXrayBoardSnapshot,
} from '@/domain/xray/xray-board'
import {
  boardBounds,
  clamp,
  findSlotAt,
  fitIntoSlot,
  initialImageSize,
  slotCodeOf,
} from '@/domain/xray/xray.geometry'
import { newUploadId, reasonText } from '@/domain/xray/xray.upload'
import type {
  XrayBoardResponse,
  XrayGeometryPatch,
  XrayImageObject,
  XrayLayoutMode,
  XrayNoteObject,
  XrayObject,
  XrayUploadItem,
} from '@/domain/xray/xray.types'
import { useXrayHistory } from '@/composables/useXrayHistory'
import { useXraySaveState } from '@/composables/useXraySaveState'
import { useXrayImageCache } from '@/composables/useXrayImageCache'
import { useXrayUploadQueue, type LandResult } from '@/composables/useXrayUploadQueue'
import { useXrayViewport } from '@/composables/useXrayViewport'
import { toBoardFailure, xrayApi } from '@/services/api/xray.api'
import { useNotificationStore } from './notification'






const uid = newUploadId


export function xrayBoardKey(patientId: string | null, visitId: string | null) {
  return `${patientId ?? 'no-patient'}::${visitId ?? 'new'}`
}

type XrayLoadStatus = 'loading' | 'loaded' | 'error' | 'retrying' | 'retry-failed'

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

  }
}

export const useXrayBoardStore = defineStore('xrayBoard', () => {
  const notifications = useNotificationStore()


  const boardKey = ref<string | null>(null)





  const visitId = ref<string | null>(null)
  const objects = ref<XrayObject[]>([])
  const layoutMode = ref<XrayLayoutMode>('off')

  const layout = computed(() => layoutMode.value !== 'off')
  const visibleSlots = computed(() => [
    ...(layoutMode.value === 'fmx' || layoutMode.value === 'both' ? FMX_SLOTS : []),
    ...(layoutMode.value === 'intraoral' || layoutMode.value === 'both' ? INTRAORAL_SLOTS : []),
  ])
  const selectedId = ref<string | null>(null)
  const editingNoteId = ref<string | null>(null)






  const loadStatus = ref<XrayLoadStatus>('loading')



  const {
    saved,
    savedAt,
    savedSnapshot,
    editMode,
    isSaving,
    editable,
    isDirty,
    wasSaved,
    markSaved,
    clear: clearSaveState,
  } = useXraySaveState({
    take: () => createXrayBoardSnapshot(objects.value),
    fingerprint: () => createXrayBoardFingerprint(objects.value),
    isEmpty: () => objects.value.length === 0,
    isReadable: () => loadStatus.value === 'loaded',
  })




  const {
    viewport,
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
    resetViewport,
  } = useXrayViewport(() => boardBounds(objects.value, visibleSlots.value))


  const images = useXrayImageCache(() => boardKey.value)







  let batchOrigin = { x: 0, y: 0 }
  let landed = 0


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


  const selectedObject = computed(
    () => objects.value.find(object => object.id === selectedId.value) ?? null,
  )
  const selectedNote = computed(() =>
    selectedObject.value?.objectType === 'note' ? selectedObject.value : null,
  )
  const selectedIsSaved = computed(() => wasSaved(selectedId.value))
  const isLoading = computed(
    () => loadStatus.value === 'loading' || loadStatus.value === 'retrying',
  )
  const loadFailed = computed(
    () => loadStatus.value === 'error' || loadStatus.value === 'retry-failed',
  )
  const isRetrying = computed(() => loadStatus.value === 'retrying')
  const retryFailed = computed(() => loadStatus.value === 'retry-failed')
  const isEmpty = computed(() => objects.value.length === 0)




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
  const noteColors = computed(() => [...NOTE_COLORS, ...customNoteColors.value])






  const canUpload = computed(() => Boolean(visitId.value) && visitId.value !== 'new')





  const canSave = computed(
    () =>
      loadStatus.value === 'loaded' &&
      editable.value &&

      canUpload.value &&

      (objects.value.length > 0 || saved.value) &&


      !isAddingFiles.value,
  )

















  function snapshot() {
    return createXrayBoardSnapshot(objects.value)
  }


  function topZIndex() {
    return objects.value.length ? Math.max(...objects.value.map(o => o.zIndex)) : -1
  }

  function bottomZIndex() {
    return objects.value.length ? Math.min(...objects.value.map(o => o.zIndex)) : 0
  }


  function restore(snap: string) {
    objects.value = parseXrayBoardSnapshot(snap)
    if (!objects.value.some(object => object.id === selectedId.value)) selectedId.value = null
    editingNoteId.value = null
  }

  const {
    canUndo,
    canRedo,
    push: pushHistory,
    undo,
    redo,
    clear: clearHistory,
    reset: resetHistory,
  } = useXrayHistory(snapshot, restore)


  function select(id: string | null) {
    selectedId.value = id
  }


  function startNoteEditing(id: string) {
    if (!editable.value) return false
    const note = objects.value.find(object => object.id === id)
    if (note?.objectType !== 'note') return false
    selectedId.value = id
    editingNoteId.value = id
    return true
  }


  function finishNoteEditing() {
    if (!editingNoteId.value) return false
    editingNoteId.value = null
    pushHistory()
    return true
  }





  function updateObjectGeometry(id: string, patch: XrayGeometryPatch) {
    if (!editable.value || Object.values(patch).some(value => !Number.isFinite(value))) {
      return false
    }
    const object = objects.value.find(candidate => candidate.id === id)
    if (!object) return false
    Object.assign(object, patch)
    return true
  }

  async function addImageFiles(files: FileList | File[], worldX: number, worldY: number) {



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

    const available = XRAY_BOARD_MAX_OBJECTS - objects.value.length
    if (available <= 0) {
      notifications.warning(
        'The board is full',
        `A board can contain up to ${XRAY_BOARD_MAX_OBJECTS} images and notes.`,
      )
      return
    }
    if (picked.length > available) {
      notifications.warning(
        'Some images were not added',
        `Only ${available} more ${available === 1 ? 'object fits' : 'objects fit'} on this board.`,
      )
      picked.splice(available)
    }

    batchOrigin = { x: worldX, y: worldY }
    await uploads.add(picked)
  }







  async function placeFilm(
    item: XrayUploadItem,
    file: File,
    naturalSize: { width: number; height: number } | null,
  ): Promise<LandResult> {
    const assetId = item.assetId ?? item.uploadId
    const key = boardKey.value
    const url = URL.createObjectURL(file)
    try {



      const { width, height } = naturalSize ?? (await readImageSize(url))


      if (boardKey.value !== key) {
        URL.revokeObjectURL(url)
        return 'failed'
      }
      const { width: boardWidth, height: boardHeight } = initialImageSize(width, height)

      images.put(assetId, file, url)

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
      return 'placed'
    } catch (error) {
      URL.revokeObjectURL(url)
      console.error('Failed to read image:', (error as Error)?.message ?? error)



      if (item.assetId) {
        uploads.failItem(item, 'Uploaded, but it could not be added to the board', true)
      } else {
        uploads.failItem(item, reasonText('unreadable'), false)
      }
      return 'failed'
    }
  }



  const uploads = useXrayUploadQueue({
    visitId: () => visitId.value,
    canUpload: () => canUpload.value,
    isSaving: () => isSaving.value,
    currentKey: () => boardKey.value,
    land: async (item, file, naturalSize) => {


      const placed = objects.value.find(
        (object): object is XrayImageObject =>
          object.objectType === 'image' && object.assetId === item.uploadId,
      )
      if (placed) {
        if (item.assetId) adoptAssetId(placed, item.assetId)
        item.status = 'done'
        item.progress = 100
        item.canRetry = false
        return 'adopted'
      }
      return placeFilm(item, file, naturalSize)
    },
    onLanded: pushHistory,


    onReset: () => {
      landed = 0
    },
  })

  const uploadQueue = uploads.queue
  const isAddingFiles = uploads.isAdding

  function addNote(worldX: number, worldY: number, preset?: Partial<XrayNoteObject>) {
    if (objects.value.length >= XRAY_BOARD_MAX_OBJECTS) {
      notifications.warning(
        'The board is full',
        `A board can contain up to ${XRAY_BOARD_MAX_OBJECTS} images and notes.`,
      )
      return null
    }
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


    const edge = direction === 'front' ? topZIndex() : bottomZIndex()
    if (object.zIndex === edge) return


    object.zIndex = direction === 'front' ? edge + 1 : edge - 1
    pushHistory()
  }








  function setLayoutMode(mode: XrayLayoutMode) {
    if (mode === layoutMode.value) return
    layoutMode.value = mode
    if (mode !== 'off') fit()
  }





  function snapToSlot(id: string): 'ok' | 'occupied' | 'none' {
    const object = objects.value.find(candidate => candidate.id === id)
    if (!object || object.objectType !== 'image') return 'none'

    const slot = findSlotAt(
      object.posX + object.width / 2,
      object.posY + object.height / 2,
      visibleSlots.value,
    )
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


  function toggleCanvasTheme() {
    lightCanvas.value = !lightCanvas.value
    writePref(XRAY_PREF_KEYS.canvasTheme, lightCanvas.value ? 'light' : 'dark')
  }

  function toggleToolbar() {
    toolbarCollapsed.value = !toolbarCollapsed.value
    writePref(XRAY_PREF_KEYS.toolbar, toolbarCollapsed.value ? 'hidden' : 'shown')
  }


  function clearBoardState() {
    objects.value = []
    layoutMode.value = 'off'
    selectedId.value = null
    editingNoteId.value = null
    clearSaveState()
    clearHistory()
  }











  function applyBoard(board: XrayBoardResponse) {
    images.releaseAll()
    objects.value = mapXrayBoardResponse(board)
    for (const asset of board.assets) {
      if (asset.signedUrl) images.putUrl(asset.id, asset.signedUrl)
    }
    for (const object of objects.value) {
      if (object.objectType === 'image' && !images.urls.value[object.assetId]) {
        images.markMissing(object.assetId)
      }
    }



    const mounted = objects.value.filter(
      object => object.objectType === 'image' && object.slotCode !== null,
    ) as XrayImageObject[]
    const hasPhoto = mounted.some(object => object.slotCode!.startsWith('io-'))
    const hasFilm = mounted.some(object => !object.slotCode!.startsWith('io-'))
    layoutMode.value = hasFilm && hasPhoto
      ? 'both'
      : hasPhoto ? 'intraoral' : hasFilm ? 'fmx' : 'off'
    saved.value = board.status === 'saved'
    savedAt.value = board.savedAt ? new Date(board.savedAt) : null
  }

  async function fetchBoard(key: string, attempt: 'initial' | 'retry' = 'initial') {
    loadStatus.value = attempt === 'retry' ? 'retrying' : 'loading'




    if (!canUpload.value) {
      loadStatus.value = 'loaded'
      resetHistory()
      fit()
      return
    }

    try {
      const { data } = await xrayApi.getByVisit(visitId.value as string)
      if (boardKey.value !== key) return


      const board = data?.xrayBoardByVisit ?? null
      if (board) {
        applyBoard(board)
        markSaved()
      }
      loadStatus.value = 'loaded'
    } catch (error) {
      if (boardKey.value !== key) return



      loadStatus.value = attempt === 'retry' ? 'retry-failed' : 'error'

      console.error('Failed to open X-ray board:', (error as Error)?.message ?? error)
    } finally {
      if (boardKey.value === key) {
        resetHistory()
        fit()
      }
    }
  }

  async function loadBoard(key: string, visit: string | null) {
    if (boardKey.value === key) return

    boardKey.value = key
    visitId.value = visit


    clearBoardState()
    images.releaseAll()
    uploads.reset()
    await fetchBoard(key)
  }


  async function retryLoad() {
    const key = boardKey.value
    if (!key || isRetrying.value) return
    await fetchBoard(key, 'retry')
  }

  function validateBeforeSave() {
    if (loadFailed.value) {
      notifications.error(
        'Saving is off until the board loads',
        'We could not read what is already on it, so saving now could overwrite it.',
      )
      return false
    }

    if (!canUpload.value) {
      notifications.error(
        'Save the visit first',
        'This visit has not been created yet, so there is nothing to attach the films to. Save the chart and the films go up with it.',
      )
      return false
    }
    if (!objects.value.length && !saved.value) {
      notifications.error('Add at least one X-ray before saving')
      return false
    }
    return true
  }


  function adoptAssetId(film: XrayImageObject, assetId: string) {
    if (film.assetId === assetId) return
    images.rename(film.assetId, assetId)
    film.assetId = assetId
  }










  async function uploadDraftFilms(key: string) {
    if (!canUpload.value) return
    const films = objects.value.filter(
      (object): object is XrayImageObject =>
        object.objectType === 'image' && images.has(object.assetId),
    )
    if (!films.length) return





    for (const film of films) {
      const blob = images.get(film.assetId)
      if (!blob) continue


      const file =
        blob instanceof File ? blob : new File([blob], 'radiograph', { type: blob.type })
      uploads.adopt(film.assetId, file)
    }

    await uploads.run()



    if (boardKey.value === key) resetHistory()
  }






  async function rekeyBoard(nextKey: string, nextVisitId: string | null) {
    const previousKey = boardKey.value


    if (!previousKey || previousKey === nextKey || loadFailed.value) return

    boardKey.value = nextKey
    visitId.value = nextVisitId


    uploads.reset()
    await uploadDraftFilms(nextKey)
  }






  async function saveBoard(): Promise<boolean> {
    const key = boardKey.value


    if (isSaving.value || !key || loadFailed.value || !canUpload.value) return false
    isSaving.value = true
    try {
      const { data } = await xrayApi.save({
        visitId: visitId.value as string,




        objects: createXrayBoardSaveInput(objects.value),
      })
      const board = data?.saveXrayBoard
      if (!board) throw new Error('saveXrayBoard answered without a board')


      if (boardKey.value !== key) return false





      applyBoard(board)
      editMode.value = false
      selectedId.value = null
      editingNoteId.value = null


      markSaved()



      resetHistory()
      notifications.success('Board saved')
      return true
    } catch (error) {






      console.error('Failed to save X-ray board:', error)
      const failure = toBoardFailure(error)


      notifications.error(failure.title, failure.detail)
      return false
    } finally {
      isSaving.value = false
    }
  }











  function startEdit() {
    markSaved()
    editMode.value = true
  }












  function cancelEdit() {
    if (isSaving.value) return
    editMode.value = false
    selectedId.value = null



    if (savedSnapshot.value) restore(savedSnapshot.value)
    else objects.value = []

    resetHistory()



    uploads.reset()




    images.releaseUnreferenced(
      new Set(
        objects.value
          .filter((object): object is XrayImageObject => object.objectType === 'image')
          .map(object => object.assetId),
      ),
    )
  }

  function closeBoard() {
    images.releaseAll()
    clearBoardState()
    uploads.reset()
    loadStatus.value = 'loading'
    boardKey.value = null
    visitId.value = null
    resetViewport()
  }

  return {

    objects,
    layout,
    layoutMode,
    visibleSlots,
    selectedId,
    editingNoteId,
    saved,
    savedAt,
    editMode,
    isSaving,
    isRetrying,
    retryFailed,
    viewport,
    imageUrls: images.urls,
    failedAssets: images.failed,
    uploadQueue,
    lightCanvas,
    toolbarCollapsed,

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

    select,
    startNoteEditing,
    finishNoteEditing,
    updateObjectGeometry,
    addImageFiles,
    retryUpload: uploads.retry,
    retryFailedUploads: uploads.retryFailed,
    clearUploadQueue: uploads.clear,
    addNote,
    setNoteText,
    setNoteColor,
    addCustomNoteColor,
    changeNoteFontSize,
    removeSelected,
    reorder,
    setLayoutMode,
    snapToSlot,
    pushHistory,
    undo,
    redo,

    recoverAsset: images.recover,
    reloadAsset: images.reload,

    toggleCanvasTheme,
    toggleToolbar,

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
