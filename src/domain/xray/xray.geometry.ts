import {
  IMAGE_MAX_LONG_SIDE,
  SLOT_PADDING,
  SLOT_SNAP_TOLERANCE,
} from './xray.constants'
import type { Bounds, FmxSlot, XrayImageObject, XrayObject } from './xray.types'

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const toRad = (degrees: number) => (degrees * Math.PI) / 180


export const rotateVec = (x: number, y: number, angle: number) => ({
  x: x * Math.cos(angle) - y * Math.sin(angle),
  y: x * Math.sin(angle) + y * Math.cos(angle),
})






export function boardBounds(objects: XrayObject[], slots: FmxSlot[]): Bounds | null {
  if (!objects.length && !slots.length) return null

  const bounds: Bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  }

  for (const slot of slots) {
    bounds.minX = Math.min(bounds.minX, slot.x - slot.w / 2)
    bounds.minY = Math.min(bounds.minY, slot.y - slot.h / 2)
    bounds.maxX = Math.max(bounds.maxX, slot.x + slot.w / 2)
    bounds.maxY = Math.max(bounds.maxY, slot.y + slot.h / 2)
  }

  for (const object of objects) {
    const cx = object.posX + object.width / 2
    const cy = object.posY + object.height / 2
    const angle = toRad(object.rotation)
    for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const corner = rotateVec((dx * object.width) / 2, (dy * object.height) / 2, angle)
      bounds.minX = Math.min(bounds.minX, cx + corner.x)
      bounds.minY = Math.min(bounds.minY, cy + corner.y)
      bounds.maxX = Math.max(bounds.maxX, cx + corner.x)
      bounds.maxY = Math.max(bounds.maxY, cy + corner.y)
    }
  }

  return bounds
}






export function findSlotAt(cx: number, cy: number, slots: FmxSlot[]): FmxSlot | undefined {
  return slots.find(
    slot =>
      Math.abs(cx - slot.x) <= slot.w / 2 + SLOT_SNAP_TOLERANCE &&
      Math.abs(cy - slot.y) <= slot.h / 2 + SLOT_SNAP_TOLERANCE,
  )
}





export const slotCodeOf = (slot: FmxSlot) => slot.code






export function initialImageSize(naturalWidth: number, naturalHeight: number) {
  const longSide = Math.max(naturalWidth, naturalHeight)
  const scale = longSide > IMAGE_MAX_LONG_SIDE ? IMAGE_MAX_LONG_SIDE / longSide : 1
  return {
    width: Math.round(naturalWidth * scale),
    height: Math.round(naturalHeight * scale),
  }
}


export function fitIntoSlot(image: XrayImageObject, slot: FmxSlot) {
  const scale = Math.min(
    (slot.w - SLOT_PADDING) / image.naturalWidth,
    (slot.h - SLOT_PADDING) / image.naturalHeight,
  )
  const width = Math.round(image.naturalWidth * scale)
  const height = Math.round(image.naturalHeight * scale)
  return {
    width,
    height,
    posX: Math.round(slot.x - width / 2),
    posY: Math.round(slot.y - height / 2),
    rotation: 0,
    slotCode: slotCodeOf(slot),
  }
}
