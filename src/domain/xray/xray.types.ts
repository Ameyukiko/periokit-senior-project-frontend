
// Field names follow the XrayBoardObject / XrayAsset contract in PER-233 so the
// board maps 1:1 onto the API response once the backend lands — SRS-169 forbids
// touching geometry on load, and a rename is a transformation.

export interface XrayObjectBase {
  id: string
  /**
   * Stacking order, low to high. Carried as data rather than derived from the
   * array position so a saved board comes back stacked exactly as it was left.
   * May go negative — "send to back" just keeps counting down.
   */
  zIndex: number
  posX: number
  posY: number
  width: number
  height: number
  /** Rotation in degrees, around the object's centre. Kept in [0, 360). */
  rotation: number
}

export interface XrayImageObject extends XrayObjectBase {
  objectType: 'image'
  /** Key of the image blob in the board storage. */
  assetId: string
  /** Natural pixel size — needed to keep the aspect ratio when fitting a slot. */
  naturalWidth: number
  naturalHeight: number
  /** FMX slot this film is mounted in (layout mode only), null when free. */
  slotCode: string | null
}

export interface XrayNoteObject extends XrayObjectBase {
  objectType: 'note'
  noteText: string
  noteColor: string
  noteFontSize: number
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
