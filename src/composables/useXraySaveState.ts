import { computed, ref } from 'vue'
import type { XrayObject } from '@/domain/xray/xray.types'

export interface SaveStateDeps {
  /** A restore point of the board as it stands — what Cancel puts back. */
  take: () => string
  /** The same moment, reduced to what a save would write (PER-257 §3). */
  fingerprint: () => string
  /** Whether there is anything on the board at all. */
  isEmpty: () => boolean
  /**
   * Whether we know what is already on the board. A board we failed to read is
   * nobody's to edit and nobody's to overwrite (SRS-195).
   */
  isReadable: () => boolean
}

/**
 * The board's `Draft -> Saved -> Edit -> Saved` cycle, and the two copies of the
 * last save that it turns on.
 *
 * Both copies are taken at the same instant and neither can be moved on its own:
 * `snapshot` is what Cancel restores, `fingerprint` is what decides whether
 * anything has changed since. Keeping them behind one `markSaved` is the whole
 * point — PER-257 §5 allows exactly three callers (a board just read, a board
 * just saved, and the moment Edit is pressed), and anything else moving one of
 * them puts back a board the doctor never agreed to.
 */
export function useXraySaveState(deps: SaveStateDeps) {
  const saved = ref(false)
  const savedAt = ref<Date | null>(null)
  /**
   * The board as it was last written down, in full — this is what Cancel puts
   * back and what tells a saved object from one added since, so it keeps every
   * field rather than only the saved ones.
   */
  const savedSnapshot = ref<string | null>(null)
  /** The same moment, reduced to what a save would write (PER-257 §3). */
  const savedFingerprint = ref<string | null>(null)
  const editMode = ref(false)
  const isSaving = ref(false)

  /**
   * A never-saved board is editable; a saved one until Edit is pressed is not.
   * A board we have not read is nobody's to edit — we don't know what it holds.
   */
  const editable = computed(() => deps.isReadable() && (!saved.value || editMode.value))

  /**
   * Whether a save would write anything different from what is already there.
   *
   * PER-257 §3 returns false outside edit mode; here a board that has never been
   * written down at all counts its films instead. A Draft with films on it has
   * unsaved work by definition, and it is what the route guard reads — a doctor
   * closing the tab on films that were never saved has to be asked, and there is
   * no edit mode to be in yet.
   */
  const isDirty = computed(() =>
    savedFingerprint.value === null
      ? !deps.isEmpty()
      : deps.fingerprint() !== savedFingerprint.value,
  )

  /**
   * Was this object part of the board as it was last saved? Deleting one of
   * those is worth a question (SRS-283) — a film added a moment ago is not, and
   * asking every time is what teaches a doctor to click straight through it.
   */
  function wasSaved(id: string | null) {
    if (!id || !savedSnapshot.value) return false
    const parsed = JSON.parse(savedSnapshot.value) as { objects: XrayObject[] }
    return parsed.objects.some(object => object.id === id)
  }

  /** Pins the board as it stands now. Both copies move, or neither does. */
  function markSaved() {
    savedSnapshot.value = deps.take()
    savedFingerprint.value = deps.fingerprint()
  }

  /** Nothing written down and nothing to go back to — a board being replaced. */
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
