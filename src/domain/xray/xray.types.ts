
export interface XrayObjectBase {
  id: string
  x: number
  y: number
  w: number
  h: number
  /** Rotation in degrees, around the object's centre. */
  rot: number
}

export interface XrayImageObject extends XrayObjectBase {
  type: 'image'
  /** Key of the image blob in the board storage. */
  imageId: string
  /** Natural pixel size — needed to keep the aspect ratio when fitting a slot. */
  natW: number
  natH: number
  /** FMX slot this film is mounted in (layout mode only), null when free. */
  slot: number | null
}

export interface XrayNoteObject extends XrayObjectBase {
  type: 'note'
  text: string
  color: string
  fontSize: number
}

export type XrayObject = XrayImageObject | XrayNoteObject

/** One film position of the 18-film full-mouth series template. */
export interface FmxSlot {
  id: number
  /** Centre of the slot in world coordinates. */
  x: number
  y: number
  w: number
  h: number
  label: string
}

export interface Viewport {
  /** Screen offset of the world origin, in pixels. */
  x: number
  y: number
  scale: number
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** What gets written to storage when the board is saved. */
export interface XrayBoardRecord {
  key: string
  objects: XrayObject[]
  layout: boolean
  savedAt: string
}
