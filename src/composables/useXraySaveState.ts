import { computed, ref } from 'vue'
import type { XrayObject } from '@/domain/xray/xray.types'

export interface SaveStateDeps {

  take: () => string

  fingerprint: () => string

  isEmpty: () => boolean




  isReadable: () => boolean
}












export function useXraySaveState(deps: SaveStateDeps) {
  const saved = ref(false)
  const savedAt = ref<Date | null>(null)





  const savedSnapshot = ref<string | null>(null)

  const savedFingerprint = ref<string | null>(null)
  const editMode = ref(false)
  const isSaving = ref(false)





  const editable = computed(() => deps.isReadable() && (!saved.value || editMode.value))










  const isDirty = computed(() =>
    savedFingerprint.value === null
      ? !deps.isEmpty()
      : deps.fingerprint() !== savedFingerprint.value,
  )






  function wasSaved(id: string | null) {
    if (!id || !savedSnapshot.value) return false
    const parsed = JSON.parse(savedSnapshot.value) as { objects: XrayObject[] }
    return parsed.objects.some(object => object.id === id)
  }


  function markSaved() {
    savedSnapshot.value = deps.take()
    savedFingerprint.value = deps.fingerprint()
  }


  function clear() {
    saved.value = false
    savedAt.value = null
    savedSnapshot.value = null
    savedFingerprint.value = null
    editMode.value = false
  }

  return {
    saved,
    savedAt,
    savedSnapshot,
    editMode,
    isSaving,
    editable,
    isDirty,
    wasSaved,
    markSaved,
    clear,
  }
}
