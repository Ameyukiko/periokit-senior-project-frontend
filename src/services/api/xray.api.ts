import { apolloClient } from '../apollo-client'
import { gql } from '@apollo/client/core'
import { ApiError, apiRequest } from './http'
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

// Written against the schema in PER-233, which exists as a card and not yet as
// a running resolver — nothing calls this file today. The board still reads and
// writes through `services/storage/xray-board.storage.ts` (IndexedDB), and that
// stays the only seam the store knows about until the backend lands.
//
// Kept ahead of the backend on purpose: PER-233 says the point of landing the
// type definitions first is to let the frontend write its queries against them.

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

// --- upload (PER-260) -------------------------------------------------------
// REST rather than GraphQL, because the films go up as multipart. Same standing
// as the queries above: the endpoint is specified and not yet running, so
// nothing calls this either. The checks it is built on do run — the board gates
// every add on `checkXrayFiles` today.

export const xrayAssetApi = {
  /**
   * `uploadIds` is passed in rather than minted here so the caller can hand the
   * same ids to the board: the id under which a film is drawn locally has to be
   * the id the server files it under, or the board that comes back points at
   * assets nothing on screen recognises.
   *
   * Throws before sending on a bad pairing, and on any transport or status
   * error — `toUploadFailure` turns whichever one it was into something to say.
   */
  async upload(
    visitId: string,
    files: File[],
    uploadIds: string[],
  ): Promise<XrayUploadOutcome> {
    const body = buildXrayUploadForm(files, uploadIds)
    const response = await apiRequest<XrayUploadResponse>(
      `/visits/${encodeURIComponent(visitId)}/xray-assets`,
      { method: 'POST', body, auth: true },
    )
    return mapUploadOutcome(response.data)
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
