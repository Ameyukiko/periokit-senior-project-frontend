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

/** What became of one film once it reached the board. */
export type LandResult = 'placed' | 'adopted' | 'failed'

export interface UploadQueueDeps {
  /** The visit the films are filed under. `'new'` is the draft tab. */
  visitId: () => string | null
  /** Whether there is a visit server-side to send films to at all. */
  canUpload: () => boolean
  /** A save serialises the board, so the queue holds off while one is in flight. */
  isSaving: () => boolean
  /** The board this run belongs to — a swap mid-batch abandons the rest. */
  currentKey: () => string | null
  /** Puts an uploaded film on the board. The one part the queue does not own. */
  land: (
    item: XrayUploadItem,
    file: File,
    naturalSize: { width: number; height: number } | null,
  ) => Promise<LandResult>
  /** At least one film was placed by this run — a step worth an undo. */
  onLanded: () => void
  /** The report is being put away, with whatever it was still holding. */
  onReset: () => void
}

/**
 * The queue that carries films from picked to on the board: one row per file,
 * one request per film, and a Retry that resends the same bytes under the same
 * id (SRS-245).
 *
 * It owns the transport and the report, never the board. Placing a film is
 * handed back through `land`, because a film can reach the server and still
 * fail to be drawn (PER-245 A3) — the two must be able to fail apart.
 */
export function useXrayUploadQueue(deps: UploadQueueDeps) {
  const notifications = useNotificationStore()

  // One row per film the doctor picked. It outlives the batch on purpose: a row
  // that vanishes the moment the last upload settles takes the report of what
  // failed with it.
  const queue = ref<XrayUploadItem[]>([])
  /**
   * The file behind each row. Held outside the reactive list because a File has
   * nothing worth tracking, and kept at all so a Retry can resend the same
   * bytes — including for a file the checks here refused, which is an appeal to
   * the server rather than a repeat of the same question.
   */
  const files = new Map<string, File>()
  let running = false
  /**
   * Calls off the film currently on its way up. Discarding an edit throws away
   * the films it was adding, so the request in flight is one whose answer will
   * be dropped the moment it lands (PER-258 §4).
   */
  let abortController: AbortController | null = null

  const isAdding = computed(() =>
    queue.value.some(item => item.status === 'pending' || item.status === 'uploading'),
  )

  /**
   * Whether a Retry on a file this browser refused is worth offering. The
   * checks here run on `file.type`, which is the operating system's guess from
   * the extension and is wrong often enough to matter — the server reads the
   * actual bytes. So Retry on an `unsupported_type` means "send it up anyway
   * and let the server decide", and a film the browser mislabelled gets on the
   * board (SRS-208, SRS-211).
   *
   * Size is left out: both sides use the same 10 MB limit and a byte count is
   * not a guess, so that Retry would only be a long upload with a known ending.
   */
  function canAppeal(reason: XrayRejectReason) {
    return reason === 'unsupported_type' && deps.canUpload()
  }

  function failItem(item: XrayUploadItem, error: string, canRetry: boolean) {
    item.status = 'failed'
    item.error = error
    item.canRetry = canRetry
  }

  /**
   * How far one film got. `halted` is the only one that concerns the films
   * behind it: the answer was about the session or the visit rather than about
   * this film, so the rest would only collect the same refusal. A plain
   * `refused` stops at its own row — one bad film must not cost the doctor the
   * other seventeen (SRS-240, SRS-243).
   */
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
        // Accepted, but with neither a film nor a reason: nothing to put on the
        // board and nothing to explain, so it counts as a trip that didn't land.
        failItem(item, reasonText('upload_failed'), true)
        return { outcome: 'refused' }
      }

      // Only ever the id this visit's endpoint just handed back, so an object
      // can never end up pointing at another visit's film (SRS-228, SRS-229).
      item.assetId = asset.id
      item.progress = 100
      // The server read the film with sharp on the way in, so its size is
      // already known and the browser has nothing left to measure (SRS-223).
      const size =
        asset.naturalWidth > 0 && asset.naturalHeight > 0
          ? { width: asset.naturalWidth, height: asset.naturalHeight }
          : null
      return { outcome: 'uploaded', size }
    } catch (error) {
      // Called off rather than failed. The row is about to be cleared with the
      // rest of the discarded edit, and a message about a film nobody is
      // waiting for would be the only trace left of a choice the doctor made.
      if (signal.aborted) return { outcome: 'refused' }
      const failure = toUploadFailure(error)
      failItem(item, failure.title, failure.canRetry)
      return failure.stopsBatch ? { outcome: 'halted' as const, failure } : { outcome: 'refused' }
    }
  }

  /**
   * 401 and 403 are answers about the session or the visit rather than about
   * one film, so every film still waiting behind it would only be refused the
   * same way. One message, once, and the rows say the same thing.
   */
  function halt(failure: XrayUploadFailure) {
    for (const item of queue.value) {
      if (item.status === 'pending' || item.status === 'uploading') {
        failItem(item, failure.title, false)
      }
    }
    notifications.error(failure.title, failure.detail, 8000)
  }

  /**
   * Works through whatever is still pending, one film at a time. One request
   * per film rather than one for the batch: a batch reports a single byte count
   * for all of them, and the per-file bar and the per-file Retry both depend on
   * knowing which film the bytes belong to (SRS-205, SRS-244).
   */
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
        // Switching visits mid-batch abandons the rest: the films left in it
        // were picked for a board that is no longer open. Cancelling the edit
        // abandons them for the same reason — nowhere left to land.
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
          // No second look at `file.type` here: a row only reaches this loop
          // because it passed the checks, or because the doctor asked for it to
          // go up in spite of them. Running the same check again would answer
          // the appeal with the opinion it was appealing against.
          const step = await uploadOne(item, file, abort.signal)
          if (step.outcome === 'halted') {
            halt(step.failure)
            break
          }
          if (step.outcome === 'refused') continue
          naturalSize = step.size
        }

        // Called off while this film was on its way. It has nowhere to go: the
        // board it belonged to has already been put back.
        if (abort.signal.aborted) break

        if ((await deps.land(item, file, naturalSize)) === 'placed') added += 1
      }
    } finally {
      running = false
      if (abortController === abort) abortController = null
    }

    if (added > 0 && deps.currentKey() === key && !abort.signal.aborted) deps.onLanded()
  }

  /**
   * Takes a batch of picked files. A file the checks refuse becomes a row in
   * the same list as the films that go up, in the order the doctor picked them
   * (PER-245): three films land and the two PDFs among them are named right
   * where they were chosen, so there is one report to read instead of a message
   * about some of the batch and a list about the rest.
   */
  async function add(picked: File[]) {
    // A new batch gets a new list. The rows from the last one have been read by
    // now, and leaving them would bury this batch's failures among them.
    reset()

    // Minted for everything picked, one per file and all different: the id a
    // film is drawn under here is the id it is filed under server-side
    // (PER-260 §4), and the id a retry resends (SRS-245). Files that never
    // leave the browser get one too, so a row is always a row's own thing.
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

    // Every file was refused: the rows are the whole report, and there is
    // nothing to send.
    if (sending > 0) await run()
  }

  /**
   * A film already on the board, going up now that there is somewhere to send
   * it. Queued rather than uploaded on the spot so it travels the way every
   * other film does: one request, a progress bar, and a Retry that means the
   * same thing.
   */
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

  /** Retries one film, under the id it already went up with (SRS-245). */
  async function retry(uploadId: string) {
    if (deps.isSaving() || isAdding.value) return
    const item = queue.value.find(candidate => candidate.uploadId === uploadId)
    if (!item || item.status !== 'failed' || !item.canRetry) return
    item.status = 'pending'
    item.progress = 0
    item.error = undefined
    await run()
  }

  /**
   * The films that failed, and only those. A button that resent the whole batch
   * would upload the ones already on the board a second time, which is the one
   * thing PER-245 spells out as forbidden.
   */
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

  /** Puts the report away. Never mid-flight — those rows are still moving. */
  function clear() {
    if (isAdding.value) return
    reset()
  }

  /**
   * The same, without the question: closing or swapping a board takes its films
   * with it, and so does discarding the edit that was adding them, so whatever
   * the run was still holding has nowhere to go. The film on its way up is
   * called off rather than left to finish into a board that will not have it.
   */
  function reset() {
    abortController?.abort()
    abortController = null
    queue.value = []
    files.clear()
    deps.onReset()
  }

  return { queue, isAdding, add, adopt, run, retry, retryFailed, clear, reset, failItem }
}
