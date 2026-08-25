import type { XrayBoardRecord } from '@/domain/xray/xray.types'

// Local persistence for the X-ray board.
//
// The backend has no radiograph API yet (no upload endpoint, no table), so a
// saved board lives in this browser's IndexedDB: the layout in `boards`, the
// film blobs in `images`. Everything goes through the small interface below, so
// swapping it for a real API later only touches this file and the store.

const DB_NAME = 'periokit-xray'
const DB_VERSION = 1
const BOARD_STORE = 'boards'
const IMAGE_STORE = 'images'
const BOARD_KEY_INDEX = 'boardKey'

interface StoredImage {
  id: string
  boardKey: string
  blob: Blob
}

export interface BoardImage {
  id: string
  blob: Blob
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(BOARD_STORE)) {
          db.createObjectStore(BOARD_STORE, { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains(IMAGE_STORE)) {
          const images = db.createObjectStore(IMAGE_STORE, { keyPath: 'id' })
          images.createIndex(BOARD_KEY_INDEX, 'boardKey')
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    dbPromise.catch(() => { dbPromise = null })
  }
  return dbPromise
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// Queues every write synchronously, then resolves once the whole transaction
// commits — an IndexedDB transaction closes as soon as it goes idle.
function runWrite(
  db: IDBDatabase,
  stores: string[],
  work: (transaction: IDBTransaction) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(stores, 'readwrite')
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
    work(transaction)
  })
}

export const xrayBoardStorage = {
  isSupported(): boolean {
    return typeof indexedDB !== 'undefined'
  },

  async getBoard(key: string): Promise<XrayBoardRecord | null> {
    const db = await openDb()
    const store = db.transaction(BOARD_STORE, 'readonly').objectStore(BOARD_STORE)
    const record = await request<XrayBoardRecord | undefined>(store.get(key))
    return record ?? null
  },

  async getImages(boardKey: string): Promise<BoardImage[]> {
    const db = await openDb()
    const index = db
      .transaction(IMAGE_STORE, 'readonly')
      .objectStore(IMAGE_STORE)
      .index(BOARD_KEY_INDEX)
    const stored = await request<StoredImage[]>(index.getAll(boardKey))
    return stored.map(({ id, blob }) => ({ id, blob }))
  },

  /** Writes the layout and its films, dropping blobs the board no longer uses. */
  async saveBoard(record: XrayBoardRecord, images: BoardImage[]): Promise<void> {
    const db = await openDb()
    const index = db
      .transaction(IMAGE_STORE, 'readonly')
      .objectStore(IMAGE_STORE)
      .index(BOARD_KEY_INDEX)
    const existingIds = await request<IDBValidKey[]>(index.getAllKeys(record.key))
    const referenced = new Set(images.map(image => image.id))

    await runWrite(db, [BOARD_STORE, IMAGE_STORE], transaction => {
      transaction.objectStore(BOARD_STORE).put(record)
      const imageStore = transaction.objectStore(IMAGE_STORE)
      for (const id of existingIds) {
        if (!referenced.has(String(id))) imageStore.delete(id)
      }
      for (const image of images) {
        imageStore.put({ id: image.id, boardKey: record.key, blob: image.blob } satisfies StoredImage)
      }
    })
  },

  async deleteBoard(key: string): Promise<void> {
    const db = await openDb()
    const index = db
      .transaction(IMAGE_STORE, 'readonly')
      .objectStore(IMAGE_STORE)
      .index(BOARD_KEY_INDEX)
    const imageIds = await request<IDBValidKey[]>(index.getAllKeys(key))

    await runWrite(db, [BOARD_STORE, IMAGE_STORE], transaction => {
      transaction.objectStore(BOARD_STORE).delete(key)
      const imageStore = transaction.objectStore(IMAGE_STORE)
      for (const id of imageIds) imageStore.delete(id)
    })
  },
}
