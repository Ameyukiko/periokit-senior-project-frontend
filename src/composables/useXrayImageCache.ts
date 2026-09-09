import { ref } from 'vue'
import { xrayApi } from '@/services/api/xray.api'

/**
 * The films themselves, apart from the board that arranges them.
 *
 * Kept out of `objects` on purpose (SRS-191): recovering a film rewrites only
 * its URL, so geometry never moves and the board never turns dirty. Gathering
 * the blobs, the URLs and the two "this one would not load" sets in one place
 * puts every `revokeObjectURL` behind one door — a URL let go of anywhere else
 * is a leak, and a URL revoked twice is a film that vanishes.
 *
 * `currentKey` is how a slow answer knows whether it still matters: the board
 * may have been closed or swapped while a refresh was in flight.
 */
export function useXrayImageCache(currentKey: () => string | null) {
  // Films live in memory as blobs + object URLs while the board is open; the
  // blobs are only written to storage when the board is saved.
  const blobs = new Map<string, Blob>()
  const urls = ref<Record<string, string>>({})

  // Films that could not be shown, and the ones already retried once. Counted
  // per asset rather than per component so a film that is genuinely gone can't
  // loop error -> recover -> error forever (SRS-192).
  const failed = ref(new Set<string>())
  const retried = new Set<string>()

  function has(assetId: string) {
    return blobs.has(assetId)
  }

  function get(assetId: string) {
    return blobs.get(assetId)
  }

  /** A film added this session: bytes in memory and a URL drawn from them. */
  function put(assetId: string, blob: Blob, url: string) {
    blobs.set(assetId, blob)
    // URLs live in this map and never on the object itself (SRS-234).
    urls.value[assetId] = url
  }

  /** A film the server holds: its URL is signed, minted per read (SRS-185). */
  function putUrl(assetId: string, url: string) {
    urls.value[assetId] = url
  }

  /**
   * Marks a film as already asked about — the answer we hold is the freshest
   * there is, so a retry would only repeat it. The Reload button clears this.
   */
  function markMissing(assetId: string) {
    retried.add(assetId)
    failed.value.add(assetId)
  }

  /** Moves a film onto the id the server filed it under. */
  function rename(previous: string, next: string) {
    if (previous === next) return
    const blob = blobs.get(previous)
    if (blob) {
      blobs.set(next, blob)
      blobs.delete(previous)
    }
    const url = urls.value[previous]
    if (url) {
      urls.value[next] = url
      delete urls.value[previous]
    }
  }

  /**
   * Gets a film back on screen after its <img> failed. Runs at most once per
   * asset; a second failure gives up and leaves the placeholder in place.
   */
  async function recover(assetId: string) {
    if (retried.has(assetId)) {
      failed.value.add(assetId)
      return
    }
    retried.add(assetId)

    // A film added this session is still in memory — there is nothing to ask
    // the server for, and asking would only be slower.
    const blob = blobs.get(assetId)
    if (blob) {
      const stale = urls.value[assetId]
      if (stale?.startsWith('blob:')) URL.revokeObjectURL(stale)
      urls.value[assetId] = URL.createObjectURL(blob)
      failed.value.delete(assetId)
      return
    }

    const key = currentKey()
    try {
      // Signed URLs are minted per request and run out (SRS-185, SRS-187), so
      // the usual reason a film stops loading on a board left open all morning
      // is simply that its URL has expired.
      const { data } = await xrayApi.refreshUrls([assetId])
      // The board was closed or swapped while we were asking.
      if (currentKey() !== key) return
      const asset = data?.refreshXrayUrls?.find(candidate => candidate.id === assetId)
      if (!asset?.signedUrl) {
        failed.value.add(assetId)
        return
      }
      urls.value[assetId] = asset.signedUrl
      failed.value.delete(assetId)
    } catch (error) {
      console.error('Failed to reload X-ray image:', error)
      if (currentKey() === key) failed.value.add(assetId)
    }
  }

  /** The Reload button — the user asked, so the once-per-asset budget resets. */
  function reload(assetId: string) {
    retried.delete(assetId)
    failed.value.delete(assetId)
    return recover(assetId)
  }

  // Only the object URLs are ours to revoke — a signed URL is the server's, and
  // revoking one is a no-op that reads as if it were doing something.
  function releaseAll() {
    for (const url of Object.values(urls.value)) {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url)
    }
    urls.value = {}
    blobs.clear()
    failed.value.clear()
    retried.clear()
  }

  /**
   * Drops the films nothing on the board points at any more. Only ever safe
   * where they cannot come back — `cancelEdit` clears the undo history along
   * with them, so there is no state left that could ask for one.
   */
  function releaseUnreferenced(inUse: Set<string>) {
    for (const assetId of new Set([...Object.keys(urls.value), ...blobs.keys()])) {
      if (inUse.has(assetId)) continue
      const url = urls.value[assetId]
      if (url) URL.revokeObjectURL(url)
      delete urls.value[assetId]
      blobs.delete(assetId)
      failed.value.delete(assetId)
      retried.delete(assetId)
    }
  }

  return {
    urls,
    failed,
    has,
    get,
    put,
    putUrl,
    markMissing,
    rename,
    recover,
    reload,
    releaseAll,
    releaseUnreferenced,
  }
}
