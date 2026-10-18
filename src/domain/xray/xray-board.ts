import { NOTE_DEFAULT_COLOR, NOTE_FONT, XRAY_BOARD_MAX_OBJECTS } from './xray.constants'
import type {
  XrayBoardObjectInput,
  XrayBoardResponse,
  XrayImageObject,
  XrayNoteObject,
  XrayObject,
} from './xray.types'


export function normalizeXrayZIndex(boardObjects: XrayObject[]): XrayObject[] {
  return [...boardObjects]
    .sort((a, b) => a.zIndex - b.zIndex || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((object, index) => ({ ...object, zIndex: index }))
}


export function mapXrayBoardResponse(board: XrayBoardResponse): XrayObject[] {
  if (board.objects.length > XRAY_BOARD_MAX_OBJECTS) {
    throw new Error('The X-ray board contains too many objects')
  }
  const assets = new Map(board.assets.map(asset => [asset.id, asset]))

  return board.objects.map(object => {
    if (object.objectType !== 'image' && object.objectType !== 'note') {
      throw new Error('The X-ray board contains an unknown object type')
    }
    const base = {
      id: object.id,
      zIndex: object.zIndex,
      posX: object.posX,
      posY: object.posY,
      width: object.width,
      height: object.height,
      rotation: object.rotation,
    }

    if (object.objectType === 'note') {
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


export function toXrayBoardObjectInput(object: XrayObject): XrayBoardObjectInput {
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


export function createXrayBoardSaveInput(boardObjects: XrayObject[]): XrayBoardObjectInput[] {
  return normalizeXrayZIndex(boardObjects).map(toXrayBoardObjectInput)
}


export function createXrayBoardSnapshot(boardObjects: XrayObject[]): string {
  return JSON.stringify({ objects: normalizeXrayZIndex(boardObjects) })
}

export function parseXrayBoardSnapshot(snapshot: string): XrayObject[] {
  return (JSON.parse(snapshot) as { objects: XrayObject[] }).objects
}


export function createXrayBoardFingerprint(boardObjects: XrayObject[]): string {
  return JSON.stringify(
    normalizeXrayZIndex(boardObjects).map(object => ({
      ...toXrayBoardObjectInput(object),
      rotation: Math.round(object.rotation * 100) / 100,
    })),
  )
}
