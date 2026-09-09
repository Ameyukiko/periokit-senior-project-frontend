import { computed, reactive, ref, watch } from 'vue'

export interface KeyedDraftsOptions<T extends object> {
  /** A blank draft. Called for every key that has nothing recorded yet. */
  create: () => T
  /** Where the drafts themselves are kept. */
  storageKey: string
  /** Where the "as last saved" copy of each draft is kept. */
  snapshotsKey: string
  /**
   * Bumped when the shape of a draft changes. A stored draft written by an
   * older shape is thrown away rather than merged — a half-recognised worksheet
   * is worse than a blank one.
   */
  versionKey: string
  version: string
  /** Older storage keys to clear out on sign-out, if any were ever used. */
  legacyKeys?: string[]
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch (error) {
    console.error(`Failed to read ${key} from localStorage:`, error)
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Failed to write ${key} to localStorage:`, error)
  }
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/**
 * One form, filled in separately for each of many keys, and outliving the tab.
 *
 * The diagnosis worksheet is per visit: opening another visit puts that visit's
 * answers in the same fields, and the visit that was on screen keeps its own.
 * That is three things kept in step — the live form, the record of every key,
 * and the copy of each as it was last saved (what Cancel restores and what
 * "unsaved changes" is measured against) — and each of the three has to be
 * written to storage at the moment it moves.
 *
 * `isRestoring` is why they can be: every path that puts values into the form
 * raises it, so the watcher that mirrors the form into its record does not fire
 * on a restore and record what was just read back as a fresh edit.
 */
export function useKeyedDrafts<T extends object>(options: KeyedDraftsOptions<T>) {
  const { create, storageKey, snapshotsKey, versionKey, version } = options

  function loadRecords(): Record<string, T> {
    if (typeof window === 'undefined' || !window.localStorage) return {}
    try {
      if (localStorage.getItem(versionKey) !== version) {
        localStorage.removeItem(storageKey)
        localStorage.removeItem(snapshotsKey)
        localStorage.setItem(versionKey, version)
        return {}
      }
    } catch {
      return {}
    }
    return readJson<Record<string, T>>(storageKey, {})
  }

  const records = ref<Record<string, T>>(loadRecords())
  const savedSnapshots = ref<Record<string, string>>(
    readJson<Record<string, string>>(snapshotsKey, {}),
  )
  const currentKey = ref<string | null>(null)
  const inputs = reactive(create()) as T
  /** Raised while values are being put into the form rather than typed into it. */
  let isRestoring = false

  /** Runs `fill` without the watcher below reading it as an edit. */
  function restoring(fill: () => void) {
    isRestoring = true
    try {
      fill()
    } finally {
      isRestoring = false
    }
  }

  function putRecord(key: string, value: T) {
    records.value = { ...records.value, [key]: value }
    writeJson(storageKey, records.value)
  }

  /** Has the form moved away from the copy taken at the last save? */
  const isDirty = computed(() => {
    if (!currentKey.value) return false
    const saved = savedSnapshots.value[currentKey.value]
    const current = JSON.stringify(inputs)
    return saved !== undefined ? saved !== current : current !== JSON.stringify(create())
  })

  // Real-time synchronization into records and localStorage
  watch(
    inputs,
    newVal => {
      if (isRestoring || !currentKey.value) return
      putRecord(currentKey.value, clone(newVal) as T)
    },
    { deep: true },
  )

  /** Blanks the form, and the record behind it. */
  function reset() {
    restoring(() => {
      const fresh = create()
      Object.assign(inputs, fresh)
      if (currentKey.value) putRecord(currentKey.value, fresh)
    })
  }

  /** Point the form at a key, loading its recorded values if any exist. */
  function openFor(nextKey: string) {
    // Save previous inputs if needed when switching keys
    if (currentKey.value && currentKey.value !== nextKey && !isRestoring) {
      putRecord(currentKey.value, clone(inputs))
    }

    currentKey.value = nextKey
    const existing = records.value[nextKey]

    // If inputs already matches what's stored, don't reassign
    if (existing && JSON.stringify(inputs) === JSON.stringify(existing)) return

    restoring(() => {
      if (existing) {
        Object.assign(inputs, create(), existing)
      } else {
        const fresh = create()
        Object.assign(inputs, fresh)
        putRecord(nextKey, fresh)
      }
    })
  }

  /**
   * Moves a draft onto another key — a visit saved for the first time is minted
   * a real id, and the work done under the draft id belongs to it.
   */
  function rekey(oldKey: string, newKey: string) {
    if (!oldKey || !newKey || oldKey === newKey) return
    const newRecords = { ...records.value }
    if (newRecords[oldKey]) {
      newRecords[newKey] = clone(newRecords[oldKey])
      delete newRecords[oldKey]
      records.value = newRecords
      writeJson(storageKey, newRecords)
    }
    const newSnapshots = { ...savedSnapshots.value }
    if (newSnapshots[oldKey] !== undefined) {
      newSnapshots[newKey] = newSnapshots[oldKey]
      delete newSnapshots[oldKey]
      savedSnapshots.value = newSnapshots
      writeJson(snapshotsKey, newSnapshots)
    }
    if (currentKey.value === oldKey) currentKey.value = newKey
  }

  /**
   * Puts values that came from somewhere other than the doctor into the form —
   * a draft read back from the backend — and takes them as saved, because that
   * is exactly what they are.
   */
  function replace(values: Partial<T>) {
    restoring(() => {
      Object.assign(inputs, create(), values)
      if (currentKey.value) {
        putRecord(currentKey.value, clone(inputs))
        commitSaved(currentKey.value)
      }
    })
  }

  /** Pins the current values as the ones last written down. */
  function commitSaved(key?: string) {
    const target = key || currentKey.value
    if (!target) return
    const currentData = records.value[target] ?? inputs
    savedSnapshots.value = { ...savedSnapshots.value, [target]: JSON.stringify(currentData) }
    writeJson(snapshotsKey, savedSnapshots.value)
  }

  /** Throws the edit away and puts back the values Edit was pressed on. */
  function revertToSaved(key?: string) {
    const target = key || currentKey.value
    if (!target) return
    const saved = savedSnapshots.value[target]

    restoring(() => {
      // Nothing was ever saved under this key — or what was is unreadable, and
      // a draft that cannot be parsed is one there is no going back to. Either
      // way the honest answer is a blank form.
      let values: T | null = null
      if (saved) {
        try {
          values = JSON.parse(saved) as T
        } catch {
          values = null
        }
      }
      const next = values ?? create()
      putRecord(target, next)
      if (currentKey.value === target) Object.assign(inputs, create(), next)
    })
  }

  /** Sign-out: every key, every snapshot, and the form on screen. */
  function clearAll() {
    records.value = {}
    savedSnapshots.value = {}
    currentKey.value = null
    restoring(() => Object.assign(inputs, create()))
    try {
      localStorage.removeItem(storageKey)
      localStorage.removeItem(snapshotsKey)
      for (const key of options.legacyKeys ?? []) localStorage.removeItem(key)
    } catch {
      /* private mode — nothing was stored to remove */
    }
  }

  return {
    records,
    savedSnapshots,
    currentKey,
    inputs,
    isDirty,
    openFor,
    reset,
    rekey,
    replace,
    commitSaved,
    revertToSaved,
    clearAll,
  }
}
