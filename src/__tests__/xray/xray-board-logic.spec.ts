import { describe, expect, it } from 'vitest'
import {
  createXrayBoardFingerprint,
  createXrayBoardSaveInput,
  createXrayBoardSnapshot,
  mapXrayBoardResponse,
  normalizeXrayZIndex,
  parseXrayBoardSnapshot,
} from '@/domain/xray/xray-board'
import { NOTE_DEFAULT_COLOR, NOTE_FONT } from '@/domain/xray/xray.constants'
import type { XrayBoardResponse, XrayImageObject, XrayNoteObject } from '@/domain/xray/xray.types'

const image: XrayImageObject = {
  id: 'image-1',
  objectType: 'image',
  assetId: 'asset-1',
  naturalWidth: 1200,
  naturalHeight: 800,
  slotCode: '1',
  zIndex: 8,
  posX: 10,
  posY: 20,
  width: 300,
  height: 200,
  rotation: 45,
}

const note: XrayNoteObject = {
  id: 'note-1',
  objectType: 'note',
  noteText: 'Check distal root',
  noteColor: '#ffee99',
  noteFontSize: 18,
  zIndex: -4,
  posX: 50,
  posY: 60,
  width: 180,
  height: 90,
  rotation: 0,
}

function response(): XrayBoardResponse {
  return {
    id: 'board-1',
    visitId: 'visit-1',
    status: 'saved',
    savedAt: '2026-09-10T00:00:00.000Z',
    assets: [
      {
        id: 'asset-1',
        fileName: 'film.png',
        mimeType: 'image/png',
        fileSize: 42,
        naturalWidth: 1600,
        naturalHeight: 1000,
        status: 'active',
        signedUrl: 'https://example.test/film.png',
        urlExpiresAt: '2026-09-10T01:00:00.000Z',
      },
    ],
    objects: [
      {
        id: 'image-1',
        objectType: 'image',
        assetId: 'asset-1',
        slotCode: '1',
        noteText: null,
        noteColor: null,
        noteFontSize: null,
        zIndex: 5,
        posX: 10,
        posY: 20,
        width: 300,
        height: 200,
        rotation: 15,
      },
      {
        id: 'note-1',
        objectType: 'note',
        assetId: null,
        slotCode: null,
        noteText: null,
        noteColor: null,
        noteFontSize: null,
        zIndex: 6,
        posX: 40,
        posY: 50,
        width: 160,
        height: 80,
        rotation: 0,
      },
    ],
  }
}

describe('X-ray board domain logic', () => {
  it('normalizes z-index deterministically without mutating the board', () => {
    const first = { ...image, id: 'b', zIndex: 3 }
    const second = { ...note, id: 'a', zIndex: 3 }
    const objects = [first, second]

    const normalized = normalizeXrayZIndex(objects)

    expect(normalized.map(object => [object.id, object.zIndex])).toEqual([
      ['a', 0],
      ['b', 1],
    ])
    expect(objects).toEqual([first, second])
    expect(normalized[0]).not.toBe(second)
  })

  it('maps response assets and note defaults without changing geometry', () => {
    const mapped = mapXrayBoardResponse(response())

    expect(mapped[0]).toEqual({
      id: 'image-1',
      objectType: 'image',
      assetId: 'asset-1',
      naturalWidth: 1600,
      naturalHeight: 1000,
      slotCode: '1',
      zIndex: 5,
      posX: 10,
      posY: 20,
      width: 300,
      height: 200,
      rotation: 15,
    })
    expect(mapped[1]).toMatchObject({
      objectType: 'note',
      noteText: '',
      noteColor: NOTE_DEFAULT_COLOR,
      noteFontSize: NOTE_FONT.default,
      posX: 40,
      posY: 50,
      width: 160,
      height: 80,
    })
  })

  it('falls back to board dimensions when an image asset is unavailable', () => {
    const board = response()
    board.assets = []

    expect(mapXrayBoardResponse(board)[0]).toMatchObject({
      naturalWidth: 300,
      naturalHeight: 200,
    })
  })

  it('creates the normalized replace-all save contract only', () => {
    expect(createXrayBoardSaveInput([image, note])).toEqual([
      {
        objectType: 'note',
        zIndex: 0,
        posX: 50,
        posY: 60,
        width: 180,
        height: 90,
        rotation: 0,
        noteText: 'Check distal root',
        noteColor: '#ffee99',
        noteFontSize: 18,
      },
      {
        objectType: 'image',
        zIndex: 1,
        posX: 10,
        posY: 20,
        width: 300,
        height: 200,
        rotation: 45,
        assetId: 'asset-1',
        slotCode: '1',
      },
    ])
  })

  it('round-trips full board snapshots used by history', () => {
    const restored = parseXrayBoardSnapshot(createXrayBoardSnapshot([image, note]))

    expect(restored).toEqual([
      { ...note, zIndex: 0 },
      { ...image, zIndex: 1 },
    ])
  })

  it('ignores client-only identity and float noise in dirty checks', () => {
    const samePersistedImage = {
      ...image,
      id: 'new-client-id',
      naturalWidth: 999,
      naturalHeight: 777,
      rotation: 45.004,
    }

    expect(createXrayBoardFingerprint([samePersistedImage])).toBe(
      createXrayBoardFingerprint([{ ...image, rotation: 45.001 }]),
    )
    expect(createXrayBoardFingerprint([{ ...image, width: 301 }])).not.toBe(
      createXrayBoardFingerprint([image]),
    )
  })
})
