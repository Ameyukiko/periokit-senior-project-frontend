import { ref } from 'vue'
import { xrayApi } from '@/services/api/xray.api'













export function useXrayImageCache(currentKey: () => string | null) {


  const blobs = new Map<string, Blob>()
  const urls = ref<Record<string, string>>({})




  const failed = ref(new Set<string>())
  const retried = new Set<string>()

  function has(assetId: string) {
    return blobs.has(assetId)
  }

  function get(assetId: string) {
    return blobs.get(assetId)
  }


  function put(assetId: string, blob: Blob, url: string) {
    blobs.set(assetId, blob)

    urls.value[assetId] = url
  }


  function putUrl(assetId: string, url: string) {
    urls.value[assetId] = url
  }





  function markMissing(assetId: string) {
    retried.add(assetId)
    failed.value.add(assetId)
  }


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





  async function recover(assetId: string) {
    if (retried.has(assetId)) {
      failed.value.add(assetId)
      return
    }
    retried.add(assetId)



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



      const { data } = await xrayApi.refreshUrls([assetId])

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


  function reload(assetId: string) {
    retried.delete(assetId)
    failed.value.delete(assetId)
    return recover(assetId)
  }



  function releaseAll() {
    for (const url of Object.values(urls.value)) {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url)
    }
    urls.value = {}
    blobs.clear()
    failed.value.clear()
    retried.clear()
  }






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
