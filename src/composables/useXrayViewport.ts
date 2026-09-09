import { ref } from 'vue'
import {
  FIT_MAX_SCALE,
  FIT_PADDING,
  MAX_SCALE,
  MIN_SCALE,
} from '@/domain/xray/xray.constants'
import { clamp } from '@/domain/xray/xray.geometry'
import type { Viewport } from '@/domain/xray/xray.types'

/** What `fit` frames — the extent of everything currently on the board. */
export interface FitBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Pan and zoom, on their own. Nothing here reads or writes a board object: the
 * viewport is a way of looking rather than part of what gets saved, which is
 * why undo steps past it and why it can live outside the store entirely.
 *
 * The one thing it needs from the board is where its contents are, and it asks
 * for that through `bounds` at the moment it fits — so the caller stays free to
 * work that out from whatever is on screen at the time.
 */
export function useXrayViewport(bounds: () => FitBounds | null) {
  const viewport = ref<Viewport>({ x: 0, y: 0, scale: 1 })
  const stageSize = ref({ width: 0, height: 0 })
  let pendingFit = false

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

    const box = bounds()
    if (!box) {
      viewport.value = { x: width / 2, y: height / 2, scale: 1 }
      return
    }

    const scale = clamp(
      Math.min(
        (width - FIT_PADDING * 2) / (box.maxX - box.minX),
        (height - FIT_PADDING * 2) / (box.maxY - box.minY),
      ),
      MIN_SCALE,
      FIT_MAX_SCALE,
    )
    viewport.value = {
      scale,
      x: width / 2 - ((box.minX + box.maxX) / 2) * scale,
      y: height / 2 - ((box.minY + box.maxY) / 2) * scale,
    }
  }

  function setStageSize(width: number, height: number) {
    stageSize.value = { width, height }
    if (pendingFit && width && height) fit()
  }

  /** Back to where a board opens: origin at the top-left corner, unzoomed. */
  function resetViewport() {
    viewport.value = { x: 0, y: 0, scale: 1 }
  }

  return {
    viewport,
    stageSize,
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
  }
}
