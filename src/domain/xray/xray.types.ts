
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

// --- API shapes (PER-233) --------------------------------------------------
// Mirrors the GraphQL schema field for field, including the parts the schema
// leaves nullable. Nothing is narrowed or renamed here: the mapper into
// XrayObject is where the union is recovered, and SRS-169 forbids that mapper
// from touching any value it passes through.

export interface XrayAssetResponse {
  id: string
  fileName: string
  mimeType: string
  fileSize: number
  naturalWidth: number
  naturalHeight: number
  /** pending | active | orphaned | cleanup_failed */
  status: string
  /** Minted per request — never stored, on the server or here (SRS-185, SRS-187). */
  signedUrl: string
  urlExpiresAt: string
}

export interface XrayBoardObjectResponse {
  id: string
  /** image | note */
  objectType: string
  zIndex: number
  posX: number
  posY: number
  width: number
  height: number
  rotation: number
  assetId: string | null
  slotCode: string | null
  noteText: string | null
  noteColor: string | null
  noteFontSize: number | null
}

export interface XrayBoardResponse {
  id: string
  visitId: string
  /** draft | saved */
  status: string
  savedAt: string | null
  objects: XrayBoardObjectResponse[]
  /** Every asset on the visit, including any no object points at yet. */
  assets: XrayAssetResponse[]
}

// --- upload shapes (PER-260) -----------------------------------------------
// The films go up over REST, not GraphQL: `POST /visits/:visitId/xray-assets`,
// multipart, `files[]` paired position by position with `uploadIds[]`.

/**
 * Why a film did not make it onto the board. Everything up to `invalid_upload`
 * is a code the upload endpoint answers with, so a rejection the server sent
 * back and one we caught before sending read the same to the doctor.
 * `unreadable` has no server counterpart — a file only fails to decode once it
 * is being drawn, which is after every check the server would have run.
 */
export type XrayRejectReason =
  | 'unsupported_type'
  | 'file_too_large'
  | 'invalid_dimensions'
  | 'upload_failed'
  | 'invalid_upload_id'
  | 'duplicate_upload_id'
  | 'upload_id_count_mismatch'
  | 'invalid_upload'
  | 'unreadable'
  | 'unknown'

export interface XrayRejection {
  fileName: string
  reason: XrayRejectReason
}

/**
 * An asset the upload accepted. Mirrors XrayAssetResponse — the same row, read
 * back through a different endpoint — plus the `uploadId` we minted, which is
 * the only way to tell which of the files we sent this one came from.
 */
export interface XrayUploadedAsset extends XrayAssetResponse {
  uploadId: string
}

/**
 * Deliberately loose: a partial result is a success as far as the request is
 * concerned, and a batch where every file was refused still comes back 200 with
 * an empty `uploaded`. Narrowing happens in the mapper.
 */
export interface XrayUploadResponse {
  uploaded?: Partial<XrayUploadedAsset>[]
  rejected?: { fileName?: string; reason?: string }[]
}

export interface XrayUploadOutcome {
  uploaded: XrayUploadedAsset[]
  rejected: XrayRejection[]
}

/** What to tell the doctor when the request itself failed, rather than a file. */
export interface XrayUploadFailure {
  title: string
  detail: string
  /** Whether sending the same files again could work. */
  canRetry: boolean
  /** The doctor has to sign in again before any of this will work. */
  needsSignIn: boolean
  /**
   * The answer was about the session or the visit, not about this one film, so
   * the films still queued behind it would only collect the same refusal.
   */
  stopsBatch: boolean
}

export type XrayUploadStatus = 'pending' | 'uploading' | 'done' | 'failed'

/**
 * One film's trip to the server, from picked to on the board (PER-245). The
 * doctor sees one row per entry, so everything here is either shown or is what
 * decides whether the Retry button on that row is offered.
 */
export interface XrayUploadItem {
  /** The id we minted; also the id the server files the asset under (SRS-245). */
  uploadId: string
  fileName: string
  status: XrayUploadStatus
  /** 0–100. Only meaningful while `uploading`. */
  progress: number
  /** Plain words, never a code — set only when `failed` (SRS-238, SRS-239). */
  error?: string
  /** The asset the server accepted. Set once the upload comes back. */
  assetId?: string
  /** Whether sending this one film again could end differently (SRS-244). */
  canRetry: boolean
}

/** No `id`: a save is replace-all, so the server has no old rows to match. */
export interface XrayBoardObjectInput {
  objectType: string
  zIndex: number
  posX: number
  posY: number
  width: number
  height: number
  rotation?: number
  assetId?: string | null
  slotCode?: string | null
  noteText?: string | null
  noteColor?: string | null
  noteFontSize?: number | null
}

export interface SaveXrayBoardInput {
  visitId: string
  objects: XrayBoardObjectInput[]
}
