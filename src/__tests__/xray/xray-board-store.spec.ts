import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getByVisit: vi.fn(),
  save: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  notifyWarning: vi.fn(),
}))

vi.mock('@/stores/notification', () => ({
  useNotificationStore: () => ({
    error: mocks.notifyError,
    success: mocks.notifySuccess,
    warning: mocks.notifyWarning,
  }),
}))

vi.mock('@/services/api/xray.api', () => ({
  xrayApi: {
    getByVisit: mocks.getByVisit,
    refreshUrls: vi.fn(),
    save: mocks.save,
  },
  xrayAssetApi: { upload: vi.fn() },
  toBoardFailure: vi.fn(() => ({ title: 'Save failed', detail: '' })),
  toUploadFailure: vi.fn(() => ({
    title: 'Upload failed',
    detail: '',
    canRetry: true,
    needsSignIn: false,
    stopsBatch: false,
  })),
}))

import { useXrayBoardStore } from '@/stores/xray-board'

describe('X-ray board store interface', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.getByVisit.mockReset()
    mocks.save.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('owns note editing through intent-based actions', async () => {
    const board = useXrayBoardStore()
    await board.loadBoard('patient::new', null)
    const note = board.addNote(100, 100)
    if (!note) throw new Error('Expected the note to be added')

    expect(board.finishNoteEditing()).toBe(true)
    expect(board.editingNoteId).toBeNull()
    expect(board.startNoteEditing(note.id)).toBe(true)
    expect(board.selectedId).toBe(note.id)
    expect(board.editingNoteId).toBe(note.id)
  })

  it('updates a complete geometry frame and rejects invalid values atomically', async () => {
    const board = useXrayBoardStore()
    await board.loadBoard('patient::new', null)
    const note = board.addNote(100, 100)
    if (!note) throw new Error('Expected the note to be added')
    const original = { posX: note.posX, posY: note.posY, rotation: note.rotation }

    expect(board.updateObjectGeometry(note.id, { posX: 20, posY: 30, rotation: 45 })).toBe(true)
    expect(note).toMatchObject({ posX: 20, posY: 30, rotation: 45 })

    expect(board.updateObjectGeometry(note.id, { posX: 90, rotation: Number.NaN })).toBe(false)
    expect(note).toMatchObject({ posX: 20, posY: 30, rotation: 45 })
    expect(original).not.toEqual({ posX: note.posX, posY: note.posY, rotation: note.rotation })
  })

  it('does not expose lifecycle details that have no external consumer', () => {
    const board = useXrayBoardStore()

    expect('boardKey' in board).toBe(false)
    expect('visitId' in board).toBe(false)
    expect('loadState' in board).toBe(false)
    expect('stageSize' in board).toBe(false)
    expect('selectedObject' in board).toBe(false)
  })

  it('represents load and retry as one consistent lifecycle', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.getByVisit.mockRejectedValueOnce(new Error('offline'))
    const board = useXrayBoardStore()

    await board.loadBoard('patient::visit-1', 'visit-1')

    expect(board.isLoading).toBe(false)
    expect(board.loadFailed).toBe(true)
    expect(board.isRetrying).toBe(false)
    expect(board.retryFailed).toBe(false)
    expect(board.editable).toBe(false)

    let rejectRetry!: (reason: Error) => void
    mocks.getByVisit.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectRetry = reject
        }),
    )
    const retry = board.retryLoad()

    expect(board.isLoading).toBe(true)
    expect(board.loadFailed).toBe(false)
    expect(board.isRetrying).toBe(true)
    expect(board.retryFailed).toBe(false)

    rejectRetry(new Error('still offline'))
    await retry

    expect(board.isLoading).toBe(false)
    expect(board.loadFailed).toBe(true)
    expect(board.isRetrying).toBe(false)
    expect(board.retryFailed).toBe(true)

    mocks.getByVisit.mockResolvedValueOnce({ data: { xrayBoardByVisit: null } })
    await board.retryLoad()

    expect(board.isLoading).toBe(false)
    expect(board.loadFailed).toBe(false)
    expect(board.isRetrying).toBe(false)
    expect(board.retryFailed).toBe(false)
    expect(board.editable).toBe(true)
  })

  it('saves an existing board after its last object is removed', async () => {
    const savedBoard = {
      id: 'board-1',
      visitId: 'visit-1',
      status: 'saved' as const,
      savedAt: '2026-09-30T00:00:00.000Z',
      assets: [],
      objects: [
        {
          id: 'note-1',
          objectType: 'note' as const,
          zIndex: 0,
          posX: 0,
          posY: 0,
          width: 180,
          height: 120,
          rotation: 0,
          assetId: null,
          slotCode: null,
          noteText: 'Remove me',
          noteColor: '#fde68a',
          noteFontSize: 14,
        },
      ],
    }
    const clearedBoard = { ...savedBoard, objects: [], savedAt: '2026-09-30T00:01:00.000Z' }
    mocks.getByVisit.mockResolvedValue({ data: { xrayBoardByVisit: savedBoard } })
    mocks.save.mockResolvedValue({ data: { saveXrayBoard: clearedBoard } })
    const board = useXrayBoardStore()

    await board.loadBoard('patient::visit-1', 'visit-1')
    board.startEdit()
    board.select('note-1')
    board.removeSelected()

    expect(board.isEmpty).toBe(true)
    expect(board.isDirty).toBe(true)
    expect(board.canSave).toBe(true)
    await expect(board.saveBoard()).resolves.toBe(true)
    expect(mocks.save).toHaveBeenCalledWith({ visitId: 'visit-1', objects: [] })
  })

  it('does not add more than 100 objects to a board', async () => {
    const board = useXrayBoardStore()
    await board.loadBoard('patient::new', null)

    for (let index = 0; index < 100; index += 1) board.addNote(index, index)

    expect(board.objects).toHaveLength(100)
    expect(board.addNote(101, 101)).toBeNull()
    expect(board.objects).toHaveLength(100)
    expect(mocks.notifyWarning).toHaveBeenCalledWith(
      'The board is full',
      'A board can contain up to 100 images and notes.',
    )
  })
})
