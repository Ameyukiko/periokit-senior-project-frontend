import { FMX_SLOTS, SLOT_PADDING, SLOT_SNAP_TOLERANCE } from './xray.constants'
import type { Bounds, FmxSlot, XrayImageObject, XrayObject } from './xray.types'

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const toRad = (degrees: number) => (degrees * Math.PI) / 180

/** Rotate a vector by `angle` radians. */
export const rotateVec = (x: number, y: number, angle: number) => ({
  x: x * Math.cos(angle) - y * Math.sin(angle),
  y: x * Math.sin(angle) + y * Math.cos(angle),
})

/**
 * Axis-aligned bounding box of everything on the board, used by "Fit".
 * Rotated objects contribute their rotated corners, so nothing is clipped.
 */
export function boardBounds(objects: XrayObject[], includeSlots: boolean): Bounds | null {
  if (!objects.length && !includeSlots) return null

  const bounds: Bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  }

  if (includeSlots) {
    for (const slot of FMX_SLOTS) {
      bounds.minX = Math.min(bounds.minX, slot.x - slot.w / 2)
      bounds.minY = Math.min(bounds.minY, slot.y - slot.h / 2)
      bounds.maxX = Math.max(bounds.maxX, slot.x + slot.w / 2)
      bounds.maxY = Math.max(bounds.maxY, slot.y + slot.h / 2)
    }
  }

  for (const object of objects) {
    const cx = object.x + object.w / 2
    const cy = object.y + object.h / 2
    const angle = toRad(object.rot)
    for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const corner = rotateVec((dx * object.w) / 2, (dy * object.h) / 2, angle)
      bounds.minX = Math.min(bounds.minX, cx + corner.x)
      bounds.minY = Math.min(bounds.minY, cy + corner.y)
      bounds.maxX = Math.max(bounds.maxX, cx + corner.x)
      bounds.maxY = Math.max(bounds.maxY, cy + corner.y)
    }
  }

  return bounds
}

/** The FMX slot a film dropped at (cx, cy) should snap into, if any. */
export function findSlotAt(cx: number, cy: number): FmxSlot | undefined {
  return FMX_SLOTS.find(
    slot =>
      Math.abs(cx - slot.x) <= slot.w / 2 + SLOT_SNAP_TOLERANCE &&
      Math.abs(cy - slot.y) <= slot.h / 2 + SLOT_SNAP_TOLERANCE,
  )
}

/** Geometry a film takes once mounted in a slot — centred, upright, aspect kept. */
export function fitIntoSlot(image: XrayImageObject, slot: FmxSlot) {
  const scale = Math.min(
    (slot.w - SLOT_PADDING) / image.natW,
    (slot.h - SLOT_PADDING) / image.natH,
  )
  const w = Math.round(image.natW * scale)
  const h = Math.round(image.natH * scale)
  return {
    w,
    h,
    x: Math.round(slot.x - w / 2),
    y: Math.round(slot.y - h / 2),
    rot: 0,
    slot: slot.id,
  }
}
