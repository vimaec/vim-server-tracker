// Changes made on site, and getting them to VIM Server.
//
// A change is written to the iPad's outbox FIRST and only then shown, so a closed app, a dead battery
// or a stairwell with no signal loses nothing. When a connection is back the outbox is sent as-is: each
// record's key is fixed when the change is made, so a send that VIM Server received but whose answer
// never arrived is simply sent again and lands on the same record.

import type { Account } from './server'
import { putRecords, ServerError } from './server'
import { outboxAll, outboxPut, outboxRemove, type OutboxItem } from './storage'
import { EDIT_SCHEMA, NS_EDITS, NS_VIEWS, VIEW_SCHEMA, type SiteView } from './project-data'

export type SyncState =
  | { kind: 'offline'; waiting: number }
  | { kind: 'waiting'; waiting: number }
  | { kind: 'sending'; waiting: number }
  | { kind: 'synced'; at: string }
  | { kind: 'error'; waiting: number; message: string }

function newId(): string {
  const c = globalThis.crypto as Crypto | undefined
  if (c?.randomUUID) return c.randomUUID()
  return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

function deviceName(): string {
  const ua = navigator.userAgent
  return /iPad|Macintosh.*Mobile/.test(ua) ? 'iPad' : /iPhone/.test(ua) ? 'iPhone' : 'browser'
}

export interface ElementId {
  document: string
  uniqueId: string
  revitId: string
}

/** Record one field change on this iPad. Returns once it is safely stored, before any network. */
export async function queueFieldEdit(projectId: string, who: Account, el: ElementId, fieldId: string, value: string): Promise<string> {
  const editId = newId()
  const editedAt = new Date().toISOString()
  const item: OutboxItem = {
    id: editId,
    projectId,
    namespace: NS_EDITS,
    key: `edit:${editId}`,
    queuedAt: editedAt,
    value: {
      app: 'vim-site-explorer',
      schema: EDIT_SCHEMA,
      editId,
      document: el.document,
      uniqueId: el.uniqueId,
      revitId: el.revitId,
      fieldId,
      value,
      editedAt,
      author: { userId: who.userId, name: who.name },
      device: deviceName(),
    },
  }
  await outboxPut(item)
  return editId
}

export async function queueView(projectId: string, view: SiteView): Promise<void> {
  await outboxPut({
    id: `view:${view.id}:${view.updatedAt}`,
    projectId,
    namespace: NS_VIEWS,
    key: `view:${view.id}`,
    queuedAt: view.updatedAt,
    value: { app: 'vim-site-explorer', schema: VIEW_SCHEMA, ...view },
  })
}

export function isOnline(): boolean {
  return navigator.onLine !== false
}

let sending: Promise<number> | null = null

/** Send everything waiting for this project. Returns how many records VIM Server accepted. */
export function flush(projectId: string, a: Account): Promise<number> {
  if (sending) return sending
  sending = (async () => {
    const items = await outboxAll(projectId)
    if (!items.length) return 0
    const byNs = new Map<string, OutboxItem[]>()
    for (const i of items) byNs.set(i.namespace, [...(byNs.get(i.namespace) ?? []), i])
    let sent = 0
    for (const [ns, list] of byNs) {
      // A view saved twice offline: only its newest version goes, the older one is dropped with it.
      const latest = new Map<string, OutboxItem>()
      for (const i of list) latest.set(i.key, i)
      for (let n = 0; n < list.length; n += 200) {
        const chunk = list.slice(n, n + 200)
        const records = [...new Map(chunk.map(i => [i.key, latest.get(i.key)!])).values()].map(i => ({ key: i.key, value: i.value }))
        await putRecords(a, projectId, ns, records)
        await outboxRemove(chunk.map(i => i.id))
        sent += chunk.length
      }
    }
    return sent
  })().finally(() => (sending = null))
  return sending
}

export function describeError(err: unknown): string {
  if (err instanceof ServerError) return err.message
  return String((err as Error)?.message ?? err)
}
