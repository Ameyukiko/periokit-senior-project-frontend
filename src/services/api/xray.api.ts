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


  getByVisit: (visitId: string) =>
    apolloClient.query<{ xrayBoardByVisit: XrayBoardResponse | null }>({
      query: XRAY_BOARD_BY_VISIT,
      variables: { visitId },
      fetchPolicy: 'network-only',
    }),





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






export interface XrayBoardFailure {
  title: string
  detail: string
  canRetry: boolean
}


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


    default:
      return {
        title: 'Could not reach the server',
        detail: 'Nothing on the board was lost. Check your connection and try again.',
        canRetry: true,
      }
  }
}





function parseBody(text: string): Record<string, unknown> | null {
  if (!text) return null
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return null
  }
}










function postWithProgress<T>(
  path: string,
  form: FormData,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {

    if (signal?.aborted) {
      reject(new Error('The upload was cancelled'))
      return
    }

    const request = new XMLHttpRequest()
    request.open('POST', `${API_URL}${path}`)

    const stopOnAbort = () => request.abort()
    signal?.addEventListener('abort', stopOnAbort, { once: true })


    request.onloadend = () => signal?.removeEventListener('abort', stopOnAbort)
    for (const [name, value] of Object.entries(getAuthHeaders())) {
      request.setRequestHeader(name, value)
    }



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















  async upload(
    visitId: string,
    files: File[],
    uploadIds: string[],
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
  ): Promise<XrayUploadOutcome> {
    const body = buildXrayUploadForm(files, uploadIds)
    const payload = await postWithProgress<XrayUploadResponse>(
      `/visits/${encodeURIComponent(visitId)}/xray-assets`,
      body,
      onProgress,
      signal,
    )
    return mapUploadOutcome(payload)
  },
}






export function toUploadFailure(error: unknown): XrayUploadFailure {
  if (error instanceof XrayUploadIdError) {
    return describeUploadFailure({ status: 400, reason: error.reason })
  }
  if (error instanceof ApiError) {
    return describeUploadFailure({ status: error.status, reason: error.reason })
  }
  return describeUploadFailure(null)
}
