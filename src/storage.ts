// THE ONE STORAGE MODULE. Everything the iPad keeps between visits goes through here and nowhere else,
// so that the move from an installed web app to a wrapped iPad app (Capacitor, once there is a Mac)
// changes this file only.
//
// Three stores in one IndexedDB database:
//   blocks  - the model, cut into fixed 4 MB blocks (same scheme as the phone app, vim-glance store.ts:
//             vim-web reads the .vim through ~30 HTTP Range requests, so the file is served out of
//             blocks rather than held whole).
//   kv      - small records: the signed-in account, each project's downloaded bundle (fields, values,
//             floors, views), remembered UI state.
//   outbox  - changes made on site that VIM Server has not confirmed yet. Unlike the other two this
//             is not a cache: a failure to write here is REPORTED, never swallowed, because losing it
//             loses somebody's work.

export const BLOCK_BYTES = 4 * 1024 * 1024
const DB_NAME = 'vim-site-explorer'
const DB_VERSION = 1
const BLOCKS = 'blocks'
const KV = 'kv'
const OUTBOX = 'outbox'

let dbPromise: Promise<IDBDatabase> | null = null

function db(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const d = req.result
      if (!d.objectStoreNames.contains(BLOCKS)) d.createObjectStore(BLOCKS)
      if (!d.objectStoreNames.contains(KV)) d.createObjectStore(KV)
      if (!d.objectStoreNames.contains(OUTBOX)) d.createObjectStore(OUTBOX)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('This iPad would not open its storage.'))
    req.onblocked = () => reject(new Error('Storage is held by another copy of the app. Close the other tab.'))
  })
  dbPromise.catch(() => (dbPromise = null))
  return dbPromise
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    d =>
      new Promise<T>((resolve, reject) => {
        const t = d.transaction(store, mode)
        const r = fn(t.objectStore(store))
        r.onsuccess = () => resolve(r.result)
        r.onerror = () => reject(r.error ?? new Error('storage refused'))
      }),
  )
}

// ── model blocks ────────────────────────────────────────────────────────────

const blockKey = (model: string, i: number) => `${model}#${i}`

export async function getBlock(model: string, i: number): Promise<ArrayBuffer | null> {
  try {
    return ((await run<ArrayBuffer | undefined>(BLOCKS, 'readonly', s => s.get(blockKey(model, i)))) ?? null)
  } catch {
    return null
  }
}

export async function putBlock(model: string, i: number, data: ArrayBuffer): Promise<void> {
  // Thrown on purpose: a block that silently failed to store is a model that is not really on the
  // iPad, and "Download for site" must not say it is.
  await run(BLOCKS, 'readwrite', s => s.put(data, blockKey(model, i)) as IDBRequest<any>)
}

/** How many of a model's blocks are on this iPad. Keys only - never reads the blocks back. */
export async function countBlocks(model: string): Promise<number> {
  try {
    const keys = await run<IDBValidKey[]>(BLOCKS, 'readonly', s => s.getAllKeys() as IDBRequest<any>)
    const prefix = model + '#'
    return keys.filter(k => typeof k === 'string' && k.startsWith(prefix)).length
  } catch {
    return 0
  }
}

export async function clearModel(model: string): Promise<void> {
  const keys = await run<IDBValidKey[]>(BLOCKS, 'readonly', s => s.getAllKeys() as IDBRequest<any>)
  for (const k of keys) {
    if (typeof k === 'string' && k.startsWith(model + '#')) await run(BLOCKS, 'readwrite', s => s.delete(k) as IDBRequest<any>)
  }
}

// ── small records ───────────────────────────────────────────────────────────

export async function kvGet<T>(key: string): Promise<T | null> {
  try {
    return ((await run<T | undefined>(KV, 'readonly', s => s.get(key) as IDBRequest<any>)) ?? null)
  } catch {
    return null
  }
}

export async function kvPut(key: string, value: unknown): Promise<void> {
  await run(KV, 'readwrite', s => s.put(value, key) as IDBRequest<any>)
}

export async function kvDel(key: string): Promise<void> {
  await run(KV, 'readwrite', s => s.delete(key) as IDBRequest<any>)
}

// ── the outbox: changes waiting for VIM Server ──────────────────────────────

/** One write VIM Server has not confirmed yet. The key is fixed at creation, so sending it twice is harmless. */
export interface OutboxItem {
  id: string
  projectId: string
  namespace: string
  key: string
  value: Record<string, unknown>
  queuedAt: string
}

export async function outboxPut(item: OutboxItem): Promise<void> {
  await run(OUTBOX, 'readwrite', s => s.put(item, item.id) as IDBRequest<any>)
}

export async function outboxAll(projectId?: string): Promise<OutboxItem[]> {
  const all = await run<OutboxItem[]>(OUTBOX, 'readonly', s => s.getAll() as IDBRequest<any>)
  const mine = projectId ? all.filter(i => i.projectId === projectId) : all
  return mine.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt))
}

export async function outboxRemove(ids: string[]): Promise<void> {
  for (const id of ids) await run(OUTBOX, 'readwrite', s => s.delete(id) as IDBRequest<any>)
}

// ── keeping it on the iPad ──────────────────────────────────────────────────

/** Ask the iPad not to evict this app's data under storage pressure. The answer is reported, never assumed. */
export async function requestPersistence(): Promise<boolean> {
  try {
    const s = navigator.storage
    if (!s?.persist) return false
    if (await s.persisted?.()) return true
    return await s.persist()
  } catch {
    return false
  }
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.()
    return e ? { usage: Number(e.usage ?? 0), quota: Number(e.quota ?? 0) } : null
  } catch {
    return null
  }
}
