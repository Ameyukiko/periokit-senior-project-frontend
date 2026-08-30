import { apolloClient } from '../apollo-client'
import { gql } from '@apollo/client/core'
import { getAuthHeaders } from '../token-storage'
import { API_URL, ApiError } from './http'
import {
  XrayUploadIdError,
  buildXrayUploadForm,
  describeUploadFailure,
  mapUploadOutcome,
} from '@/domain/xray/xray.upload'
import type {
  SaveXrayBoardInput,
  XrayAssetResponse,
  XrayBoardResponse,
  XrayUploadFailure,
  XrayUploadOutcome,
  XrayUploadResponse,
} from '@/domain/xray/xray.types'

// Written against the schema in PER-233, and live end to end: PER-234 (read),
// PER-254 (write) and PER-255 (orphan cleanup) all have resolvers behind them,
// and the board calls all three. The browser no longer keeps a copy — a visit's
// board is whatever the server says it is.

const BOARD_FIELDS = gql`
  fragment XrayBoardFields on XrayBoard {
    id
    visitId
    status
    savedAt
    objects {
      id
      objectType
      zIndex
      posX
      posY
      width
      height
      rotation
      assetId
      slotCode
      noteText
      noteColor
      noteFontSize
    }
    assets {
      id
      fileName
      mimeType
      fileSize
      naturalWidth
      naturalHeight
      status
      signedUrl
      urlExpiresAt
    }
  }
`

/** Null when the visit has no board yet — which is not the same as a failed read. */
const XRAY_BOARD_BY_VISIT = gql`
  ${BOARD_FIELDS}
  query XrayBoardByVisit($visitId: ID!) {
    xrayBoardByVisit(visitId: $visitId) {
      ...XrayBoardFields
    }
  }
`

const REFRESH_XRAY_URLS = gql`
  query RefreshXrayUrls($assetIds: [ID!]!) {
    refreshXrayUrls(assetIds: $assetIds) {
      id
      fileName
      mimeType
      fileSize
      naturalWidth
      naturalHeight
      status
      signedUrl
      urlExpiresAt
    }
  }
`

const SAVE_XRAY_BOARD = gql`
  ${BOARD_FIELDS}
  mutation SaveXrayBoard($input: SaveXrayBoardInput!) {
    saveXrayBoard(input: $input) {
      ...XrayBoardFields
    }
  }
`

export const xrayApi = {
  // network-only: a cached board would hand back signed URLs that expired hours
  // ago, and the placeholder in PER-239 would fire for every film on the board.
  getByVisit: (visitId: string) =>
    apolloClient.query<{ xrayBoardByVisit: XrayBoardResponse | null }>({
      query: XRAY_BOARD_BY_VISIT,
      variables: { visitId },
      fetchPolicy: 'network-only',
    }),

  /**
   * Assets the caller may not read are dropped from the result rather than
   * raising — the board shows a placeholder for whatever does not come back.
   */
  refreshUrls: (assetIds: string[]) =>
    apolloClient.query<{ refreshXrayUrls: XrayAssetResponse[] }>({
      query: REFRESH_XRAY_URLS,
      variables: { assetIds },
      fetchPolicy: 'network-only',
    }),

  save: (input: SaveXrayBoardInput) =>
    apolloClient.mutate<{ saveXrayBoard: XrayBoardResponse }>({
      mutation: SAVE_XRAY_BOARD,
      variables: { input },
    }),
}

/**
 * What to tell the doctor when a board read or write did not go through. Same
 * shape of answer as the upload's: plain words, never a code (SRS-197), plus
 * whether pressing the button again could end differently.
 */
export interface XrayBoardFailure {
  title: string
  detail: string
  canRetry: boolean
}

/** The code the resolver put on the error — null when no server answered. */
function graphqlCode(error: unknown): string | null {
  const errors = (error as { graphQLErrors?: { extensions?: { code?: unknown } }[] })
    ?.graphQLErrors
  const code = errors?.[0]?.extensions?.code
  return typeof code === 'string' ? code : null
}

export function toBoardFailure(error: unknown): XrayBoardFailure {
  switch (graphqlCode(error)) {
    case 'UNAUTHENTICATED':
      return {
        title: 'You have been signed out',
        detail: 'Sign in again, then open this board. Nothing on it was lost.',
        canRetry: false,
      }
    case 'NOT_FOUND':
      return {
        title: 'This visit is no longer there',
        detail: 'It may have been removed in another tab. Close it and open the visit again.',
        canRetry: false,
      }
    // The board points at a film this visit does not own — the only way to get
    // here is an asset that was cleaned up, or a board left open across a visit
    // change. Re-reading is what fixes it, so the message says so.
    case 'FORBIDDEN':
      return {
        title: 'One of the films no longer belongs to this visit',
        detail: 'Load the board again to see what is really on it. Nothing has been saved.',
        canRetry: false,
      }
    case 'BAD_USER_INPUT':
      return {
        title: 'The board could not be saved',
        detail: 'Something on it is outside what the server accepts. Nothing has been changed.',
        canRetry: false,
      }
    // No code at all means no server answered: a dropped connection or a
    // timeout, and those are the ones worth pressing again.
    default:
      return {
        title: 'Could not reach the server',
        detail: 'Nothing on the board was lost. Check your connection and try again.',
        canRetry: true,
      }
  }
}

// --- upload (PER-260, PER-245) ----------------------------------------------
// REST rather than GraphQL, because the films go up as multipart.

/** The endpoint answers with the payload itself, not the `{ success, data }`
 *  envelope the rest of the REST API uses, and puts its message under `error`
 *  rather than `message`. Parsed here rather than through `apiRequest` for that
 *  reason as much as for the progress events. */
function parseBody(text: string): Record<string, unknown> | null {
  if (!text) return null
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * `XMLHttpRequest` rather than `fetch`, because `fetch` says nothing at all
 * until the response starts coming back: an 8 MB film would sit at 0% for its
 * entire journey, which is the one thing PER-245 exists to fix.
 *
 * Rejects with an `ApiError` when a server answered and refused, and with a
 * plain `Error` when the request never got that far — `toUploadFailure` tells
 * the two apart, and only the second is worth offering a retry for.
 */
function postWithProgress<T>(
  path: string,
  form: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', `${API_URL}${path}`)
    for (const [name, value] of Object.entries(getAuthHeaders())) {
      request.setRequestHeader(name, value)
    }
    // Content-Type is left alone on purpose: only the browser knows the
    // multipart boundary it is about to write.

    request.upload.onprogress = event => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    request.onerror = () => reject(new Error('The upload could not be sent'))
    request.ontimeout = () => reject(new Error('The upload timed out'))
    request.onabort = () => reject(new Error('The upload was cancelled'))

    request.onload = () => {
      const payload = parseBody(request.responseText)
      if (request.status >= 200 && request.status < 300) {
        resolve((payload ?? {}) as T)
        return
      }
      // The controller answers `{ error, reason }`; the auth middleware in front
      // of it still answers `{ success, message }`. Both are read so a log line
      // says what actually came back.
      reject(
        new ApiError(
          typeof payload?.error === 'string'
            ? payload.error
            : typeof payload?.message === 'string'
              ? payload.message
              : 'Upload failed',
          request.status,
          undefined,
          payload,
          typeof payload?.reason === 'string' ? payload.reason : undefined,
        ),
      )
    }

    request.send(form)
  })
}

export const xrayAssetApi = {
  /**
   * `uploadIds` is passed in rather than minted here so the caller can hand the
   * same ids to the board: the id under which a film is drawn locally has to be
   * the id the server files it under, or the board that comes back points at
   * assets nothing on screen recognises. Resending one is also what makes Retry
   * safe — the endpoint hands back the asset it already has rather than storing
   * the film twice (SRS-245).
   *
   * Throws before sending on a bad pairing, and on any transport or status
   * error — `toUploadFailure` turns whichever one it was into something to say.
   */
  async upload(
    visitId: string,
    files: File[],
    uploadIds: string[],
    onProgress?: (percent: number) => void,
  ): Promise<XrayUploadOutcome> {
    const body = buildXrayUploadForm(files, uploadIds)
    const payload = await postWithProgress<XrayUploadResponse>(
      `/visits/${encodeURIComponent(visitId)}/xray-assets`,
      body,
      onProgress,
    )
    return mapUploadOutcome(payload)
  },
}

/**
 * Anything that is not an ApiError never reached a server — a dropped
 * connection, a request that timed out — and those are the ones worth offering
 * a retry for, so they fall through to the catch-all with no status at all.
 */
export function toUploadFailure(error: unknown): XrayUploadFailure {
  if (error instanceof XrayUploadIdError) {
    return describeUploadFailure({ status: 400, reason: error.reason })
  }
  if (error instanceof ApiError) {
    return describeUploadFailure({ status: error.status, reason: error.reason })
  }
  return describeUploadFailure(null)
}
