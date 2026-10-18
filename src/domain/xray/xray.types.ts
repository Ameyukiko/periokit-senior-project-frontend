




export type XrayObjectType = 'image' | 'note'
export type XrayBoardStatus = 'draft' | 'saved'
export type XrayAssetStatus = 'pending' | 'active' | 'orphaned' | 'cleanup_failed'

export interface XrayObjectBase {
  id: string





  zIndex: number
  posX: number
  posY: number
  width: number
  height: number

  rotation: number
}

export interface XrayImageObject extends XrayObjectBase {
  objectType: 'image'

  assetId: string

  naturalWidth: number
  naturalHeight: number

  slotCode: string | null
}

export interface XrayNoteObject extends XrayObjectBase {
  objectType: 'note'
  noteText: string
  noteColor: string
  noteFontSize: number
}

export type XrayObject = XrayImageObject | XrayNoteObject


export type XrayGeometryPatch = Partial<
  Pick<XrayObjectBase, 'posX' | 'posY' | 'width' | 'height' | 'rotation'>
>





export interface FmxSlot {

  id: number

  code: string

  x: number
  y: number
  w: number
  h: number
  label: string

  teeth?: number[]
}






export type XrayLayoutMode = 'off' | 'fmx' | 'intraoral' | 'both'

export interface Viewport {

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







export interface XrayAssetResponse {
  id: string
  fileName: string
  mimeType: string
  fileSize: number
  naturalWidth: number
  naturalHeight: number

  status: XrayAssetStatus

  signedUrl: string
  urlExpiresAt: string
}

export interface XrayBoardObjectResponse {
  id: string
  objectType: XrayObjectType
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
  status: XrayBoardStatus
  savedAt: string | null
  objects: XrayBoardObjectResponse[]

  assets: XrayAssetResponse[]
}












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






export interface XrayUploadedAsset extends XrayAssetResponse {
  uploadId: string
}






export interface XrayUploadResponse {
  uploaded?: Partial<XrayUploadedAsset>[]
  rejected?: { fileName?: string; reason?: string }[]
}

export interface XrayUploadOutcome {
  uploaded: XrayUploadedAsset[]
  rejected: XrayRejection[]
}


export interface XrayUploadFailure {
  title: string
  detail: string

  canRetry: boolean

  needsSignIn: boolean




  stopsBatch: boolean
}

export type XrayUploadStatus = 'pending' | 'uploading' | 'done' | 'failed'






export interface XrayUploadItem {

  uploadId: string
  fileName: string
  status: XrayUploadStatus

  progress: number

  error?: string

  assetId?: string






  canRetry: boolean
}


export interface XrayBoardObjectInput {
  objectType: XrayObjectType
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
