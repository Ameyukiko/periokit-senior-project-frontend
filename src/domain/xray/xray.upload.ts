import { UPLOAD_ACCEPTED_TYPES, UPLOAD_MAX_BYTES, UPLOAD_MAX_MB } from './xray.constants'
import type {
  XrayRejectReason,
  XrayUploadFailure,
  XrayUploadOutcome,
  XrayUploadResponse,
  XrayUploadedAsset,
} from './xray.types'

// Everything PER-260 asks for on the way to `POST /visits/:visitId/xray-assets`,
// kept free of Vue, Pinia and fetch so the checks can run before a request is
// built and again on what comes back.
//
// PER-260 §6 refused a whole batch over one bad file. Reversed on 2026-08-26 at
// the user's decision, in favour of PER-245's DoD: the good films go up and the
// refused ones are named beside them in the same report.

/**
 * Plain words for each reason, in the second half of "name — reason". A code
 * like `file_too_large` tells a doctor nothing and reads like a crash, so the
 * codes stop here (SRS-238, SRS-239).
 */
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

/**
 * Sending the same bytes again only helps where the answer was about the trip,
 * not about the file: a type or a size comes back the same every time, and so
 * does an image the server could not read. `upload_failed` is the storage or
 * the database having a bad moment, which is exactly what Retry is for.
 *
 * The id reasons are left out deliberately — a retry resends the same
 * `uploadId` (SRS-245), so an id the server has already refused would be
 * refused again, and a button that cannot work is worse than no button.
 */
const RETRYABLE_REASONS = new Set<XrayRejectReason>(['upload_failed', 'unknown'])

export function isRetryableReason(reason: XrayRejectReason): boolean {
  return RETRYABLE_REASONS.has(reason)
}

/** The second half of "name — reason", on its own for the per-file rows. */
export function reasonText(reason: XrayRejectReason): string {
  return REASON_TEXT[reason]
}

/**
 * Type and size, in that order — a 40 MB PDF is refused for being a PDF, which
 * is the thing the doctor has to fix. `null` means the file passed.
 *
 * Per file rather than per batch, so the caller can keep the doctor's own order
 * when it lists them: a refusal and a film that went up sit in one report,
 * where they were picked (PER-245).
 *
 * Runs before the upload to spare the user a long transfer that ends in a
 * rejection; it does not stand in for the server's own check, which is the one
 * that counts (SRS-208, SRS-211).
 */
export function checkXrayFile(file: File): XrayRejectReason | null {
  if (!UPLOAD_ACCEPTED_TYPES.includes(file.type)) return 'unsupported_type'
  if (file.size > UPLOAD_MAX_BYTES) return 'file_too_large'
  return null
}

/** Anything the server sends that we have no wording for lands on `unknown`. */
export function toRejectReason(value: unknown): XrayRejectReason {
  return typeof value === 'string' && value in REASON_TEXT
    ? (value as XrayRejectReason)
    : 'unknown'
}

/**
 * RFC 4122 v4. `randomUUID` only exists in a secure context and the dev server
 * is reached over plain http on the LAN, so there is a fallback — built on
 * `getRandomValues` rather than `Math.random`, because PER-260 §4 asks for ids
 * that cannot repeat and a seven-character random string repeats often enough
 * to matter across an 18-film series.
 */
export function newUploadId(): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID()

  const bytes = new Uint8Array(16)
  if (cryptoApi?.getRandomValues) cryptoApi.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 1

  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
}

/** One id per file, all different — checked rather than assumed (PER-260 §4). */
export function createUploadIds(count: number): string[] {
  const ids = new Set<string>()
  while (ids.size < count) ids.add(newUploadId())
  return [...ids]
}

/**
 * Raised before anything is sent, so the request the server would answer with
 * `upload_id_count_mismatch` never leaves the browser (PER-260 §3). Carries the
 * same reason code as that answer, so both paths reach the doctor as one
 * sentence.
 */
export class XrayUploadIdError extends Error {
  readonly reason: XrayRejectReason = 'upload_id_count_mismatch'

  constructor(message: string) {
    super(message)
    this.name = 'XrayUploadIdError'
  }
}

/**
 * `files[]` and `uploadIds[]` are paired by position and nothing else, so the
 * two arrays are appended together rather than in two loops — a batch whose
 * ids drift by one mounts every film under the wrong asset.
 */
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

/**
 * A response with a `rejected` list is still a successful request: some films
 * are on the server and some are not, and calling the whole batch a failure
 * would throw away the ones that arrived (PER-260, Upload result). Fields are
 * read defensively because a partial result is exactly where a payload is
 * likeliest to be missing something.
 */
export function mapUploadOutcome(
  payload: XrayUploadResponse | null | undefined,
): XrayUploadOutcome {
  const uploaded = (payload?.uploaded ?? [])
    // No id means nothing on the board can point at it, so it is not "uploaded".
    .filter((asset): asset is Partial<XrayUploadedAsset> => Boolean(asset?.id))
    .map(asset => ({
      id: asset.id as string,
      // The endpoint files an asset under the very id we sent it, so `id` is
      // the `uploadId` whenever the payload does not spell one out separately.
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
    // A rejection we cannot name is still worth reporting — the count alone
    // tells the doctor films are missing.
    fileName: entry?.fileName || 'This file',
    reason: toRejectReason(entry?.reason),
  }))

  return { uploaded, rejected }
}

/**
 * What to say when the request itself failed — as opposed to a per-file
 * rejection inside a successful one. `status` is absent when the request never
 * reached a server at all, which is the case worth offering a retry for.
 */
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
      // Reads as "The upload was refused — larger than 10 MB", which is the
      // same half-sentence a pre-flight rejection ends with.
      detail: `The upload was refused — ${REASON_TEXT[reason]}.`,
      canRetry: isRetryableReason(reason),
      needsSignIn: false,
      // About this one film, so the rest of the batch still has a chance.
      stopsBatch: false,
    }
  }

  return {
    title: 'The film could not be uploaded',
    detail: 'Nothing was lost. The file is still here — try again.',
    canRetry: true,
    needsSignIn: false,
    stopsBatch: false,
  }
}
