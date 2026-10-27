// What "Download for site" brings onto the iPad besides the model, and how a value is decided.
//
// All of it lives in VIM Server's shared data namespaces, the same ones the web app already uses, so a
// field defined in the web app shows here and a status set here can show there:
//   vim-web-workflows.fields          the field list (Install Status, Actual Finish, ...)    READ
//   vim-web-workflows.fieldvalues     values the web app shared (one record per element)    READ
//   vim-web-workflows.classification  VIM Flex / web Classify's floor per element           READ
//   vim-web-workflows.fieldedits      ONE RECORD PER CHANGE made on site                    WRITE
//   vim-site-explorer.views           saved views (floors + colour-by)                      READ/WRITE
//
// WHY A CHANGE LOG AND NOT THE web app's fieldvalues: the web app publishes fieldvalues as a whole
// snapshot and deletes every record that is not in its own copy (workflow.ts publishFieldValues, the
// "stale sweep"). An iPad writing into that namespace would have its changes deleted by the next web
// publish, and the web app's snapshot gate would hide every value that is not in the newest snapshot.
// A separate append-only log cannot be swept, keeps every change with who and when (Sam 2026-10-27:
// "a log of all of the changes from the users"), and retries are harmless because the key is the
// change's own id. The current value is the change with the latest on-site time.

import type { Account, DataEntry } from './server'
import { readNamespace } from './server'
import { kvGet, kvPut, outboxAll, type OutboxItem } from './storage'

export const NS_FIELDS = 'vim-web-workflows.fields'
export const NS_VALUES = 'vim-web-workflows.fieldvalues'
export const NS_CLASSIFY = 'vim-web-workflows.classification'
export const NS_EDITS = 'vim-web-workflows.fieldedits'
export const NS_VIEWS = 'vim-site-explorer.views'
export const EDIT_SCHEMA = 'field-edit-v1'
export const VIEW_SCHEMA = 'site-view-v1'

export interface FieldDef {
  fieldId: string
  label: string
  type: 'text' | 'number' | 'choice'
  choices?: string[]
  /** 'date' = shown and edited as a date, stored as YYYY-MM-DD text (the web app reads it as text). */
  format?: 'date'
  /** Optional colour per choice, e.g. Installed = green. Without it the design system's palette is used. */
  colors?: Record<string, string>
}

/** One change to one field of one element, as it is stored on VIM Server. */
export interface FieldEdit {
  editId: string
  document: string
  uniqueId: string
  revitId: string
  fieldId: string
  value: string
  editedAt: string
  authorId: string
  authorName: string
}

export interface SiteView {
  id: string
  name: string
  /** Floor names. Empty = every floor. */
  floors: string[]
  colourBy: string | null
  createdBy: string
  updatedAt: string
}

export interface ClassifyFloor {
  level: string
}

export interface Bundle {
  projectId: string
  projectName: string
  /** The model this bundle belongs to; its blocks are filed under this key. */
  modelKey: string
  modelBytes: number
  versionTag: string
  downloadedAt: string
  fields: FieldDef[]
  /** Values the web app shared, by element then field. */
  shared: Record<string, Record<string, { value: string; at: string; by: string }>>
  edits: FieldEdit[]
  /** Classify's floor per element, by element key. Empty when the project was never classified. */
  floors: Record<string, string>
  views: SiteView[]
}

/** The identity of an element across exports and devices: its model document + Revit UniqueId. */
export function elementKey(document: string, uniqueId: string): string {
  return `${document}|${uniqueId}`
}

const bundleKey = (projectId: string) => `bundle:${projectId}`

export function loadBundle(projectId: string): Promise<Bundle | null> {
  return kvGet<Bundle>(bundleKey(projectId))
}

export function saveBundle(b: Bundle): Promise<void> {
  return kvPut(bundleKey(b.projectId), b)
}

function parseField(e: DataEntry): FieldDef | null {
  const v = e.value
  if (v?.schema !== 'fields-catalogue-v1' || !v.payload) return null
  const p = v.payload
  const type = p.type === 'number' || p.type === 'choice' ? p.type : 'text'
  return {
    fieldId: String(p.fieldId ?? e.key.replace(/^field:/, '')),
    label: String(p.label ?? v.name ?? p.fieldId),
    type,
    choices: Array.isArray(p.choices) ? p.choices.map(String) : undefined,
    format: p.format === 'date' ? 'date' : undefined,
    colors: p.colors && typeof p.colors === 'object' ? p.colors : undefined,
  }
}

export function parseEdit(v: Record<string, any>): FieldEdit | null {
  if (v?.schema !== EDIT_SCHEMA) return null
  if (!v.editId || !v.uniqueId || !v.fieldId || !v.editedAt) return null
  return {
    editId: String(v.editId),
    document: String(v.document ?? ''),
    uniqueId: String(v.uniqueId),
    revitId: String(v.revitId ?? ''),
    fieldId: String(v.fieldId),
    value: String(v.value ?? ''),
    editedAt: String(v.editedAt),
    authorId: String(v.author?.userId ?? ''),
    authorName: String(v.author?.name ?? ''),
  }
}

function parseView(v: Record<string, any>): SiteView | null {
  if (v?.schema !== VIEW_SCHEMA || !v.id) return null
  return {
    id: String(v.id),
    name: String(v.name ?? 'View'),
    floors: Array.isArray(v.floors) ? v.floors.map(String) : [],
    colourBy: v.colourBy ? String(v.colourBy) : null,
    createdBy: String(v.createdBy ?? ''),
    updatedAt: String(v.updatedAt ?? ''),
  }
}

/** Newest-snapshot rows only - the same gate the web app applies, so both read the same values. */
function newestSnapshot(entries: DataEntry[], schema: string): DataEntry[] {
  const mine = entries.filter(e => e.value?.schema === schema)
  let newest: { id: string; at: string } | null = null
  for (const e of mine) {
    const id = String(e.value.snapshotId ?? '')
    const at = String(e.value.generatedAt ?? '')
    if (id && (!newest || at > newest.at)) newest = { id, at }
  }
  return newest ? mine.filter(e => String(e.value.snapshotId) === newest!.id) : mine
}

/** Read everything the project's shared namespaces hold that this app shows. Needs a connection. */
export async function fetchProjectData(a: Account, projectId: string): Promise<Pick<Bundle, 'fields' | 'shared' | 'edits' | 'floors' | 'views'>> {
  const [fieldRows, valueRows, classifyRows, editRows, viewRows] = await Promise.all([
    readNamespace(a, projectId, NS_FIELDS),
    readNamespace(a, projectId, NS_VALUES),
    readNamespace(a, projectId, NS_CLASSIFY),
    readNamespace(a, projectId, NS_EDITS),
    readNamespace(a, projectId, NS_VIEWS),
  ])
  // Choice fields (a status) first, then the rest by name: Install Status, Actual Finish, Forecast Finish.
  const fields = fieldRows
    .map(parseField)
    .filter((f): f is FieldDef => !!f)
    .sort((a, b) => Number(b.type === 'choice') - Number(a.type === 'choice') || a.label.localeCompare(b.label))

  const shared: Bundle['shared'] = {}
  for (const e of newestSnapshot(valueRows, 'field-values-v1')) {
    const v = e.value
    if (!v.uniqueId || !v.fields) continue
    const k = elementKey(String(v.document ?? ''), String(v.uniqueId))
    const at = String(v.updatedAt ?? v.generatedAt ?? '')
    shared[k] = {}
    for (const [fid, raw] of Object.entries(v.fields as Record<string, unknown>)) {
      if (typeof raw === 'string' && raw) shared[k][fid] = { value: raw, at, by: String(v.author ?? '') }
    }
  }

  const floors: Record<string, string> = {}
  for (const e of newestSnapshot(classifyRows, 'classification-level-v1')) {
    const v = e.value
    if (v.uniqueId && v.resolvedLevel) floors[elementKey(String(v.document ?? ''), String(v.uniqueId))] = String(v.resolvedLevel)
  }

  const edits = editRows.map(e => parseEdit(e.value)).filter((x): x is FieldEdit => !!x)
  const views = viewRows.map(e => parseView(e.value)).filter((x): x is SiteView => !!x)
  return { fields, shared, edits, floors, views }
}

/** A field's current value on one element, and where it came from. */
export interface CurrentValue {
  value: string
  at: string
  by: string
  /** True while the change is on this iPad only. */
  pending: boolean
}

export interface ValueBook {
  current: Map<string, Map<string, CurrentValue>>
  history: Map<string, FieldEdit[]>
}

/** Pending changes in the outbox, read back as edits. */
export function pendingEdits(items: OutboxItem[]): FieldEdit[] {
  return items.filter(i => i.namespace === NS_EDITS).map(i => parseEdit(i.value)).filter((x): x is FieldEdit => !!x)
}

/**
 * Decide every value: web-shared values first, then every change in the log, then this iPad's pending
 * changes. Per element and field, the latest on-site time wins (Sam 2026-10-27); every change stays in
 * the history.
 */
export function buildValueBook(b: Bundle, pending: FieldEdit[]): ValueBook {
  const current = new Map<string, Map<string, CurrentValue>>()
  const history = new Map<string, FieldEdit[]>()
  const set = (k: string, fid: string, cv: CurrentValue) => {
    let m = current.get(k)
    if (!m) current.set(k, (m = new Map()))
    const had = m.get(fid)
    if (!had || cv.at >= had.at) m.set(fid, cv)
  }
  for (const [k, fields] of Object.entries(b.shared)) {
    for (const [fid, v] of Object.entries(fields)) set(k, fid, { ...v, pending: false })
  }
  const pendingIds = new Set(pending.map(p => p.editId))
  const seen = new Set<string>()
  for (const e of [...b.edits, ...pending]) {
    if (seen.has(e.editId)) continue
    seen.add(e.editId)
    const k = elementKey(e.document, e.uniqueId)
    set(k, e.fieldId, { value: e.value, at: e.editedAt, by: e.authorName, pending: pendingIds.has(e.editId) })
    const hk = `${k}#${e.fieldId}`
    const list = history.get(hk) ?? []
    list.push(e)
    history.set(hk, list)
  }
  for (const list of history.values()) list.sort((x, y) => y.editedAt.localeCompare(x.editedAt))
  return { current, history }
}

export async function currentPending(projectId: string): Promise<FieldEdit[]> {
  return pendingEdits(await outboxAll(projectId))
}
