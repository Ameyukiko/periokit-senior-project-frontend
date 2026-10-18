import { computed, ref } from 'vue'
import {
  checkXrayFile,
  createUploadIds,
  isRetryableReason,
  reasonText,
} from '@/domain/xray/xray.upload'
import type {
  XrayRejectReason,
  XrayUploadFailure,
  XrayUploadItem,
} from '@/domain/xray/xray.types'
import { toUploadFailure, xrayAssetApi } from '@/services/api/xray.api'
import { useNotificationStore } from '@/stores/notification'


export type LandResult = 'placed' | 'adopted' | 'failed'

export interface UploadQueueDeps {

  visitId: () => string | null

  canUpload: () => boolean

  isSaving: () => boolean

  currentKey: () => string | null

  land: (
    item: XrayUploadItem,
    file: File,
    naturalSize: { width: number; height: number } | null,
  ) => Promise<LandResult>

  onLanded: () => void

  onReset: () => void
}










export function useXrayUploadQueue(deps: UploadQueueDeps) {
  const notifications = useNotificationStore()




  const queue = ref<XrayUploadItem[]>([])






  const files = new Map<string, File>()
  let running = false





  let abortController: AbortController | null = null

  const isAdding = computed(() =>
    queue.value.some(item => item.status === 'pending' || item.status === 'uploading'),
  )












  function canAppeal(reason: XrayRejectReason) {
    return reason === 'unsupported_type' && deps.canUpload()
  }

  function failItem(item: XrayUploadItem, error: string, canRetry: boolean) {
    item.status = 'failed'
    item.error = error
    item.canRetry = canRetry
  }








  type UploadStep =
    | { outcome: 'uploaded'; size: { width: number; height: number } | null }
    | { outcome: 'refused' }
    | { outcome: 'halted'; failure: XrayUploadFailure }

  async function uploadOne(
    item: XrayUploadItem,
    file: File,
    signal: AbortSignal,
  ): Promise<UploadStep> {
    try {
      const outcome = await xrayAssetApi.upload(
        deps.visitId() as string,
        [file],
        [item.uploadId],
        percent => {
          item.progress = percent
        },
        signal,
      )

      const rejection = outcome.rejected[0]
      if (rejection) {
        failItem(item, reasonText(rejection.reason), isRetryableReason(rejection.reason))
        return { outcome: 'refused' }
      }

      const asset = outcome.uploaded[0]
      if (!asset) {


        failItem(item, reasonText('upload_failed'), true)
        return { outcome: 'refused' }
      }



      item.assetId = asset.id
      item.progress = 100


      const size =
        asset.naturalWidth > 0 && asset.naturalHeight > 0
          ? { width: asset.naturalWidth, height: asset.naturalHeight }
          : null
      return { outcome: 'uploaded', size }
    } catch (error) {



      if (signal.aborted) return { outcome: 'refused' }
      const failure = toUploadFailure(error)
      failItem(item, failure.title, failure.canRetry)
      return failure.stopsBatch ? { outcome: 'halted' as const, failure } : { outcome: 'refused' }
    }
  }






  function halt(failure: XrayUploadFailure) {
    for (const item of queue.value) {
      if (item.status === 'pending' || item.status === 'uploading') {
        failItem(item, failure.title, false)
      }
    }
    notifications.error(failure.title, failure.detail, 8000)
  }







  async function run() {
    if (running) return
    running = true
    const key = deps.currentKey()
    const abort = new AbortController()
    abortController = abort
    let added = 0

    try {
      for (const item of queue.value) {
        if (item.status !== 'pending') continue



        if (deps.currentKey() !== key || abort.signal.aborted) break

        const file = files.get(item.uploadId)
        if (!file) {
          failItem(item, 'The file is no longer open', false)
          continue
        }

        item.status = 'uploading'
        item.progress = 0
        item.error = undefined

        let naturalSize: { width: number; height: number } | null = null
        if (deps.canUpload()) {




          const step = await uploadOne(item, file, abort.signal)
          if (step.outcome === 'halted') {
            halt(step.failure)
            break
          }
          if (step.outcome === 'refused') continue
          naturalSize = step.size
        }



        if (abort.signal.aborted) break

        if ((await deps.land(item, file, naturalSize)) === 'placed') added += 1
      }
    } finally {
      running = false
      if (abortController === abort) abortController = null
    }

    if (added > 0 && deps.currentKey() === key && !abort.signal.aborted) deps.onLanded()
  }








  async function add(picked: File[]) {


    reset()





    const uploadIds = createUploadIds(picked.length)

    let sending = 0
    picked.forEach((file, index) => {
      const uploadId = uploadIds[index]
      files.set(uploadId, file)
      const reason = checkXrayFile(file)

      queue.value.push({
        uploadId,
        fileName: file.name,
        status: reason ? 'failed' : 'pending',
        progress: 0,
        error: reason ? reasonText(reason) : undefined,
        canRetry: reason !== null && canAppeal(reason),
      })

      if (!reason) sending += 1
    })



    if (sending > 0) await run()
  }







  function adopt(uploadId: string, file: File) {
    files.set(uploadId, file)
    queue.value.push({
      uploadId,
      fileName: file.name,
      status: 'pending',
      progress: 0,
      canRetry: false,
    })
  }


  async function retry(uploadId: string) {
    if (deps.isSaving() || isAdding.value) return
    const item = queue.value.find(candidate => candidate.uploadId === uploadId)
    if (!item || item.status !== 'failed' || !item.canRetry) return
    item.status = 'pending'
    item.progress = 0
    item.error = undefined
    await run()
  }






  async function retryFailed() {
    if (deps.isSaving() || isAdding.value) return
    let queuedAny = false
    for (const item of queue.value) {
      if (item.status !== 'failed' || !item.canRetry) continue
      item.status = 'pending'
      item.progress = 0
      item.error = undefined
      queuedAny = true
    }
    if (queuedAny) await run()
  }


  function clear() {
    if (isAdding.value) return
    reset()
  }







  function reset() {
    abortController?.abort()
    abortController = null
    queue.value = []
    files.clear()
    deps.onReset()
  }

  return { queue, isAdding, add, adopt, run, retry, retryFailed, clear, reset, failItem }
}
