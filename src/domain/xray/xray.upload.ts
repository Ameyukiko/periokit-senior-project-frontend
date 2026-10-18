import { UPLOAD_ACCEPTED_TYPES, UPLOAD_MAX_BYTES, UPLOAD_MAX_MB } from './xray.constants'
import type {
  XrayRejectReason,
  XrayUploadFailure,
  XrayUploadOutcome,
  XrayUploadResponse,
  XrayUploadedAsset,
} from './xray.types'














const REASON_TEXT: Record<XrayRejectReason, string> = {
  unsupported_type: 'only JPEG, PNG or WebP',
  file_too_large: `larger than ${UPLOAD_MAX_MB} MB`,
  invalid_dimensions: 'the image could not be read',
  upload_failed: 'the upload did not go through',
  invalid_upload_id: 'the upload did not arrive complete',
  duplicate_upload_id: 'it was sent twice',
  upload_id_count_mismatch: 'the upload did not arrive complete',
  invalid_upload: 'the upload did not arrive complete',
  unreadable: 'the file could not be opened',
  unknown: 'it was not accepted',
}











const RETRYABLE_REASONS = new Set<XrayRejectReason>(['upload_failed', 'unknown'])

export function isRetryableReason(reason: XrayRejectReason): boolean {
  return RETRYABLE_REASONS.has(reason)
}


export function reasonText(reason: XrayRejectReason): string {
  return REASON_TEXT[reason]
}













export function checkXrayFile(file: File): XrayRejectReason | null {
  if (!UPLOAD_ACCEPTED_TYPES.includes(file.type)) return 'unsupported_type'
  if (file.size > UPLOAD_MAX_BYTES) return 'file_too_large'
  return null
}


export function toRejectReason(value: unknown): XrayRejectReason {
  return typeof value === 'string' && value in REASON_TEXT
    ? (value as XrayRejectReason)
    : 'unknown'
}








export function newUploadId(): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID()

  const bytes = new Uint8Array(16)
  if (cryptoApi?.getRandomValues) cryptoApi.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
}


export function createUploadIds(count: number): string[] {
  const ids = new Set<string>()
  while (ids.size < count) ids.add(newUploadId())
  return [...ids]
}







export class XrayUploadIdError extends Error {
  readonly reason: XrayRejectReason = 'upload_id_count_mismatch'

  constructor(message: string) {
    super(message)
    this.name = 'XrayUploadIdError'
  }
}






export function buildXrayUploadForm(files: File[], uploadIds: string[]): FormData {
  if (files.length !== uploadIds.length) {
    throw new XrayUploadIdError(`${uploadIds.length} upload ids for ${files.length} files`)
  }
  if (new Set(uploadIds).size !== uploadIds.length) {
    throw new XrayUploadIdError('upload ids are not all different')
  }

  const form = new FormData()
  files.forEach((file, index) => {
    form.append('files[]', file, file.name)
    form.append('uploadIds[]', uploadIds[index])
  })
  return form
}








export function mapUploadOutcome(
  payload: XrayUploadResponse | null | undefined,
): XrayUploadOutcome {
  const uploaded = (payload?.uploaded ?? [])

    .filter((asset): asset is Partial<XrayUploadedAsset> => Boolean(asset?.id))
    .map(asset => ({
      id: asset.id as string,


      uploadId: asset.uploadId ?? (asset.id as string),
      fileName: asset.fileName ?? '',
      mimeType: asset.mimeType ?? '',
      fileSize: asset.fileSize ?? 0,
      naturalWidth: asset.naturalWidth ?? 0,
      naturalHeight: asset.naturalHeight ?? 0,
      status: asset.status ?? 'pending',
      signedUrl: asset.signedUrl ?? '',
      urlExpiresAt: asset.urlExpiresAt ?? '',
    }))

  const rejected = (payload?.rejected ?? []).map(entry => ({


    fileName: entry?.fileName || 'This file',
    reason: toRejectReason(entry?.reason),
  }))

  return { uploaded, rejected }
}






export function describeUploadFailure(
  failure: { status?: number; reason?: string } | null | undefined,
): XrayUploadFailure {
  const status = failure?.status
  const reason = toRejectReason(failure?.reason)

  if (status === 401) {
    return {
      title: 'Your session has expired',
      detail: 'Sign in again, then add the films. Nothing has been uploaded.',
      canRetry: false,
      needsSignIn: true,
      stopsBatch: true,
    }
  }

  if (status === 403) {
    return {
      title: 'You do not have access to this visit',
      detail: 'Ask whoever owns the visit to share it with you. No films were uploaded.',
      canRetry: false,
      needsSignIn: false,
      stopsBatch: true,
    }
  }

  if (status === 400 && reason !== 'unknown') {
    return {
      title: 'The film was not accepted',


      detail: `The upload was refused: ${REASON_TEXT[reason]}.`,
      canRetry: isRetryableReason(reason),
      needsSignIn: false,

      stopsBatch: false,
    }
  }

  return {
    title: 'The film could not be uploaded',
    detail: 'Nothing was lost. The file is still here. Please try again.',
    canRetry: true,
    needsSignIn: false,
    stopsBatch: false,
  }
}
