import { computed, reactive, ref, watch } from 'vue'

export interface KeyedDraftsOptions<T extends object> {

  create: () => T

  storageKey: string

  snapshotsKey: string





  versionKey: string
  version: string

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















export function useKeyedDrafts<T extends object>(options: KeyedDraftsOptions<T>) {
  const { create, storageKey, snapshotsKey, versionKey, version } = options

  function loadRecords(): Record<string, T> {
    if (typeof window === 'undefined' || !window.localStorage) return {}
    try {



      for (const key of options.legacyKeys ?? []) localStorage.removeItem(key)
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

  let isRestoring = false


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


  const isDirty = computed(() => {
    if (!currentKey.value) return false
    const saved = savedSnapshots.value[currentKey.value]
    const current = JSON.stringify(inputs)
    return saved !== undefined ? saved !== current : current !== JSON.stringify(create())
  })


  watch(
    inputs,
    newVal => {
      if (isRestoring || !currentKey.value) return
      putRecord(currentKey.value, clone(newVal) as T)
    },
    { deep: true },
  )


  function reset() {
    restoring(() => {
      const fresh = create()
      Object.assign(inputs, fresh)
      if (currentKey.value) putRecord(currentKey.value, fresh)
    })
  }


  function openFor(nextKey: string) {

    if (currentKey.value && currentKey.value !== nextKey && !isRestoring) {
      putRecord(currentKey.value, clone(inputs))
    }

    currentKey.value = nextKey
    const existing = records.value[nextKey]


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






  function replace(values: Partial<T>) {
    restoring(() => {
      Object.assign(inputs, create(), values)
      if (currentKey.value) {
        putRecord(currentKey.value, clone(inputs))
        commitSaved(currentKey.value)
      }
    })
  }


  function commitSaved(key?: string) {
    const target = key || currentKey.value
    if (!target) return
    const currentData = records.value[target] ?? inputs
    savedSnapshots.value = { ...savedSnapshots.value, [target]: JSON.stringify(currentData) }
    writeJson(snapshotsKey, savedSnapshots.value)
  }


  function revertToSaved(key?: string) {
    const target = key || currentKey.value
    if (!target) return
    const saved = savedSnapshots.value[target]

    restoring(() => {



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
