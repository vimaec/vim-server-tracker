// VIM Site Explorer - the iPad app for site teams. One screen: floors and views on
// the left, the model in the middle coloured by a custom field, the element's properties on the right
// with the custom fields editable on top. Works with no Wi-Fi; changes go to VIM Server when it is back.
//
// Sam's rulings, 2026-10-27: edit status and dates on site; one button downloads the whole project;
// the latest on-site change wins and every change is logged with who and when; fields live in VIM
// Server, never in the Revit file; views like Assemble, and a one-floor view loads only that floor;
// floors come from VIM Flex Classify; nothing in this app touches Assemble.

import 'vim-html-ds/ds.css'
import './styles.css'
import {
  createButton,
  createChip,
  createCollapse,
  createDateField,
  createEmpty,
  createInput,
  createLegend,
  createList,
  createSelect,
  createToaster,
  createTree,
  type ChipHandle,
  type LegendHandle,
  type ListHandle,
  type SelectHandle,
  type TreeHandle,
  type TreeItem,
} from 'vim-html-ds'
import { installModelShim, downloadModel } from './model-cache'
import { countBlocks, kvGet, kvPut, kvDel, outboxAll, requestPersistence, storageEstimate } from './storage'
import { listProjects, modelUrl, signIn, type Account, type ProjectRow } from './server'
import {
  buildValueBook,
  currentPending,
  fetchProjectData,
  loadBundle,
  saveBundle,
  type Bundle,
  type CurrentValue,
  type FieldDef,
  type SiteView,
  type ValueBook,
} from './project-data'
import { describeError, flush, isOnline, queueFieldEdit, queueView, type SyncState } from './sync'
import * as V from './viewer'
import { colourBy } from './colour'
import { BLOCK_BYTES } from './storage'

const DEFAULT_SERVER = 'https://server-dev.vimaec.com'
const app = document.getElementById('app')!
const toaster = createToaster({ timeout: 3500 })

installModelShim()
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // The service worker keeps the app's own files so it opens with no Wi-Fi. Files this first visit
  // already loaded are added by hand: the worker only sees requests made after it took over.
  navigator.serviceWorker
    .register('./sw.js')
    .then(() => navigator.serviceWorker.ready)
    .then(async () => {
      const same = performance
        .getEntriesByType('resource')
        .map(e => e.name)
        .filter(u => u.startsWith(location.origin) && !u.includes('/api/'))
      const c = await caches.open('vim-site-explorer-app-v1')
      // One by one: addAll gives up on every file if a single one fails.
      await Promise.all([...new Set([location.origin + location.pathname, ...same])].map(u => c.add(u).catch(() => undefined)))
    })
    .catch(() => undefined)
}

// ── state ───────────────────────────────────────────────────────────────────

let account: Account | null = null
let bundle: Bundle | null = null
let book: ValueBook | null = null
let model: V.ModelIndex | null = null
let activeFloors: string[] = []
let activeViewId: string | null = null
let colourField: string | null = null
let selected: V.ElementInfo | null = null
let sync: SyncState = { kind: 'synced', at: '' }

function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  if (cls) el.className = cls
  if (text !== undefined) el.textContent = text
  return el
}

function timeWords(iso: string): string {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return ''
  const d = new Date(t)
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function mb(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / (1024 * 1024))).toLocaleString()} MB`
}

/** A Revit parameter value is "raw|display": show the display side (VIM data rule). */
function displayValue(v: string): string {
  const i = v.indexOf('|')
  return i >= 0 ? v.slice(i + 1) : v
}

// ── boot ────────────────────────────────────────────────────────────────────

async function boot(): Promise<void> {
  if (localStorage.getItem('se-theme') === 'light') document.documentElement.setAttribute('data-theme', 'light')
  account = await kvGet<Account>('account')
  if (!account) return showSignIn()
  const last = await kvGet<string>('lastProject')
  if (last) {
    const b = await loadBundle(last)
    if (b) return openProject(b)
  }
  return showProjects()
}

// ── sign in ─────────────────────────────────────────────────────────────────

function showSignIn(message?: string): void {
  V.close()
  app.replaceChildren()
  const page = h('div', 'se-page')
  const card = h('div', 'se-card')
  card.append(h('h1', '', 'VIM Site Explorer'))
  card.append(h('div', 'se-muted', 'Sign in to your VIM Server. Microsoft sign-in is coming; for now paste a personal access key from VIM Server.'))
  card.append(h('div', 'se-k', 'VIM Server'))
  const base = createInput(card, { value: DEFAULT_SERVER })
  card.append(h('div', 'se-k', 'Access key'))
  const key = createInput(card, { type: 'password', placeholder: 'Paste your key' })
  const row = h('div', 'se-row')
  card.append(row)
  const err = h('div', 'se-pending', message ?? '')
  createButton(row, {
    label: 'Sign in',
    variant: 'primary',
    onClick: async () => {
      err.textContent = ''
      try {
        account = await signIn(base.getValue().trim(), key.getValue().trim())
        await kvPut('account', account)
        await showProjects()
      } catch (e) {
        err.textContent = describeError(e)
      }
    },
  })
  card.append(err)
  page.append(card)
  app.append(page)
}

// ── projects ────────────────────────────────────────────────────────────────

async function showProjects(): Promise<void> {
  V.close()
  app.replaceChildren()
  const page = h('div', 'se-page')
  const card = h('div', 'se-card')
  page.append(card)
  app.append(page)
  card.append(h('h1', '', 'Projects'))
  const who = h('div', 'se-row')
  who.append(h('span', 'se-muted', `Signed in as ${account!.name}`))
  createButton(who, { label: 'Sign out', onClick: async () => { await kvDel('account'); account = null; showSignIn() } })
  card.append(who)
  const note = h('div', 'se-muted', 'Download a project before going on site. It then works with no Wi-Fi.')
  card.append(note)
  const host = h('div')
  card.append(host)
  let rows: ProjectRow[] = []
  // Not `loading: true`: ds-list keeps that skeleton even after setItems (vim-html-ds a90145c).
  const list = createList(host, {
    empty: 'Loading projects…',
    selectable: true,
    onSelect: async id => {
      const b = await loadBundle(id)
      if (b) return openProject(b)
      const p = rows.find(r => r.id === id)
      if (p) void download(p, card)
    },
  })

  try {
    rows = await listProjects(account!)
  } catch (e) {
    list.setItems([])
    note.textContent = `${describeError(e)} Projects already on this iPad still open.`
  }
  const items = []
  for (const p of rows) {
    const b = await loadBundle(p.id)
    const size = p.latest ? mb(p.latest.sizeInBytes) : 'no model yet'
    const on = b ? `on this iPad since ${timeWords(b.downloadedAt)}` : 'not downloaded'
    items.push({
      id: p.id,
      label: p.name,
      meta: `${size} · ${on}`,
      actions: [{ icon: 'download', tip: 'Download for site', onClick: () => void download(p, card) }],
    })
  }
  // Downloaded projects stay reachable with no connection.
  if (!rows.length) {
    const last = await kvGet<string>('lastProject')
    const b = last ? await loadBundle(last) : null
    if (b) items.push({ id: b.projectId, label: b.projectName, meta: `on this iPad since ${timeWords(b.downloadedAt)}`, actions: [] })
  }
  list.setItems(items)
}

async function download(p: ProjectRow, host: HTMLElement): Promise<void> {
  if (!account) return
  if (!p.latest) {
    toaster.show({ text: `${p.name} has no model on VIM Server yet.`, tone: 'warn' })
    return
  }
  const box = h('div', 'se-section')
  const words = h('div', 'se-muted', `Downloading ${p.name}…`)
  const bar = h('div', 'se-progress')
  const fill = h('div')
  bar.append(fill)
  box.append(words, bar)
  host.append(box)
  try {
    const kept = await requestPersistence()
    const modelKey = `${p.id}:${p.latest.id}`
    const url = await modelUrl(account, p.id)
    await downloadModel(modelKey, url, p.latest.sizeInBytes, pr => {
      fill.style.width = `${Math.round((100 * pr.bytes) / pr.totalBytes)}%`
      words.textContent = `Downloading ${p.name}: ${mb(pr.bytes)} of ${mb(pr.totalBytes)}`
    })
    const have = await countBlocks(modelKey)
    const need = Math.ceil(p.latest.sizeInBytes / BLOCK_BYTES)
    if (have < need) throw new Error(`Only ${have} of ${need} parts of the model were saved. Try again with a steady connection.`)
    words.textContent = 'Getting fields, values, floors and views…'
    const data = await fetchProjectData(account, p.id)
    const b: Bundle = {
      projectId: p.id,
      projectName: p.name,
      modelKey,
      modelBytes: p.latest.sizeInBytes,
      versionTag: p.latest.versionTag,
      downloadedAt: new Date().toISOString(),
      ...data,
    }
    await saveBundle(b)
    const est = await storageEstimate()
    toaster.show({
      text: `${p.name} is on this iPad${kept ? '' : ' (the iPad may clear it if space runs low: add the app to the home screen)'}${est ? ` · ${mb(est.usage)} used` : ''}.`,
      tone: 'good',
    })
    openProject(b)
  } catch (e) {
    words.textContent = `Download stopped: ${describeError(e)}`
    words.className = 'se-pending'
  }
}

// ── the explorer screen ─────────────────────────────────────────────────────

let syncChip: ChipHandle | null = null
let netChip: ChipHandle | null = null
let floorList: ListHandle | null = null
let viewList: ListHandle | null = null
let tree: TreeHandle | null = null
let legend: LegendHandle | null = null
let colourSelect: SelectHandle | null = null
let propsHost: HTMLElement | null = null
let noteEl: HTMLElement | null = null

async function openProject(b: Bundle): Promise<void> {
  bundle = b
  await kvPut('lastProject', b.projectId)
  app.replaceChildren()

  // top bar
  const bar = h('div', 'se-bar')
  const brand = h('div', 'se-brand')
  brand.append(h('b', '', 'VIM'), h('span', '', 'Site Explorer'))
  bar.append(brand, h('div', 'se-project', b.projectName))
  bar.append(h('div', 'se-sp'))
  const status = h('div', 'se-status')
  netChip = createChip(status, { text: '' })
  syncChip = createChip(status, { text: '' })
  bar.append(status)
  createButton(bar, { label: 'Sync now', onClick: () => void trySync(true) })
  createButton(bar, { label: 'Projects', onClick: () => void showProjects() })
  createButton(bar, {
    label: 'Light / dark',
    onClick: () => {
      const light = document.documentElement.getAttribute('data-theme') === 'light'
      if (light) document.documentElement.removeAttribute('data-theme')
      else document.documentElement.setAttribute('data-theme', 'light')
      try {
        localStorage.setItem('se-theme', light ? 'dark' : 'light')
      } catch {
        /* a preference only */
      }
      repaint()
    },
  })

  // three columns
  const main = h('div', 'se-main')
  const left = h('div', 'se-left')
  const center = h('div', 'se-center')
  const right = h('div', 'se-right')
  main.append(left, center, right)
  app.append(bar, main)

  const viewsSec = h('div', 'se-section')
  const vHead = h('div', 'se-eyebrow')
  vHead.append(h('span', '', 'Views'), h('span', 'se-sp'))
  createButton(vHead, { label: 'Save view', onClick: () => void saveCurrentView() })
  viewsSec.append(vHead)
  viewList = createList(viewsSec, { selectable: true, empty: 'No saved views yet', onSelect: id => void applyView(id) })
  const floorsSec = h('div', 'se-section')
  const fHead = h('div', 'se-eyebrow')
  fHead.append(h('span', '', 'Floors'))
  floorsSec.append(fHead)
  floorList = createList(floorsSec, { selectable: true, empty: 'Opening the model…', onSelect: id => void chooseFloor(id) })
  const treeSec = h('div', 'se-section')
  treeSec.append(h('div', 'se-eyebrow', 'Elements on this floor'))
  tree = createTree(treeSec, {
    empty: 'Pick a floor',
    onSelect: id => {
      if (!id.startsWith('el:')) return
      const info = model?.byIndex.get(Number(id.slice(3))) ?? null
      V.select(info)
    },
  })
  left.append(viewsSec, floorsSec, treeSec)

  const canvas = h('div', 'se-canvas')
  center.append(canvas)
  const top = h('div', 'se-overlay-top')
  top.append(h('span', 'se-k', 'Colour by'))
  colourSelect = createSelect(top, { placeholder: 'Nothing', onChange: v => { colourField = v || null; repaint() } })
  center.append(top)
  const legendBox = h('div', 'se-overlay-legend')
  legend = createLegend(legendBox, { rows: [] })
  center.append(legendBox)
  noteEl = h('div', 'se-overlay-note', 'Opening the model from this iPad…')
  center.append(noteEl)

  propsHost = right
  renderProps()

  await refreshBook()
  colourSelect.setOptions([{ id: '', label: 'Nothing' }, ...b.fields.map(f => ({ id: f.fieldId, label: f.label }))])
  const firstChoice = b.fields.find(f => f.type === 'choice')
  colourField = firstChoice?.fieldId ?? null
  colourSelect.setValue(colourField ?? '')
  renderViews()
  void updateStatus()

  try {
    model = await V.open(canvas, b.modelKey, b.floors)
  } catch (e) {
    noteEl.textContent = `The model could not be opened: ${describeError(e)}`
    return
  }
  V.onSelect(info => {
    selected = info
    renderProps()
    if (info) tree?.setSelected(`el:${info.index}`)
  })
  const items = [
    { id: '*', label: 'All floors', meta: model.elements.length.toLocaleString() },
    ...model.floors.map(f => ({ id: f.name, label: f.name, meta: f.count.toLocaleString() })),
  ]
  floorList.setItems(items)
  const remembered = await kvGet<string[]>(`floors:${b.projectId}`)
  await setFloors(remembered && remembered.every(f => model!.floors.some(x => x.name === f)) ? remembered : [])
  void trySync(false)
}

function floorWords(): string {
  if (!model) return ''
  const src =
    model.floorSource === 'classify' ? 'Floors from VIM Flex Classify'
    : model.classifyIgnored ? 'Floors as they came from Revit (the Classify floors on this project are for a different model)'
    : 'Floors as they came from Revit (this project has no Classify floors)'
  const miss = model.floorSource === 'classify' && model.classifyMisses ? ` · ${model.classifyMisses.toLocaleString()} elements Classify did not place use their Revit level` : ''
  return src + miss
}

async function setFloors(floors: string[]): Promise<void> {
  if (!model || !bundle) return
  activeFloors = floors
  floorList?.setSelected(floors.length === 1 ? floors[0] : floors.length ? null : '*')
  noteEl!.textContent = 'Loading…'
  const drawn = await V.showFloors(floors)
  noteEl!.textContent = `${drawn.toLocaleString()} elements drawn · ${floorWords()}`
  await kvPut(`floors:${bundle.projectId}`, floors)
  renderTree()
  repaint()
}

async function chooseFloor(id: string): Promise<void> {
  activeViewId = null
  viewList?.setSelected(null)
  await setFloors(id === '*' ? [] : [id])
}

function shownElements(): V.ElementInfo[] {
  if (!model) return []
  if (!activeFloors.length) return model.elements
  const want = new Set(activeFloors)
  return model.elements.filter(e => want.has(e.floor))
}

function renderTree(): void {
  if (!tree) return
  const cats = new Map<string, Map<string, V.ElementInfo[]>>()
  for (const e of shownElements()) {
    const c = e.category || 'No category'
    const t = `${e.family || '—'} · ${e.type || '—'}`
    let m = cats.get(c)
    if (!m) cats.set(c, (m = new Map()))
    m.set(t, [...(m.get(t) ?? []), e])
  }
  const items: TreeItem[] = [...cats.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([c, types]) => ({
      id: `cat:${c}`,
      label: c,
      meta: [...types.values()].reduce((n, l) => n + l.length, 0).toLocaleString(),
      children: [...types.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([t, els]) => ({
          id: `type:${c}:${t}`,
          label: t,
          meta: els.length.toLocaleString(),
          children: els.slice(0, 300).map(e => ({ id: `el:${e.index}`, label: e.revitId ? `Revit id ${e.revitId}` : e.uniqueId })),
        })),
    }))
  tree.setItems(items)
}

// ── values and colour ───────────────────────────────────────────────────────

async function refreshBook(): Promise<void> {
  if (!bundle) return
  book = buildValueBook(bundle, await currentPending(bundle.projectId))
}

function valueOf(key: string, fieldId: string): CurrentValue | undefined {
  return book?.current.get(key)?.get(fieldId)
}

function repaint(): void {
  if (!model || !bundle) return
  const field = bundle.fields.find(f => f.fieldId === colourField)
  if (!field) {
    V.paint(new Map())
    legend?.setRows([])
    return
  }
  const c = colourBy(field, shownElements(), valueOf)
  V.paint(c.byKey)
  legend?.setRows(c.buckets.map(b => ({ label: b.label, color: b.color, count: b.count })))
}

// ── properties: custom fields on top, then the element as VIM Flex shows it ──

function renderProps(): void {
  if (!propsHost) return
  propsHost.replaceChildren()
  const head = h('div', 'se-props-head')
  propsHost.append(head)
  if (!selected) {
    head.append(h('div', 'se-props-title', 'Properties'))
    createEmpty(propsHost, { title: 'Nothing selected', hint: 'Tap an element in the model or in the list.' })
    return
  }
  const el = selected
  head.append(h('div', 'se-props-title', `${el.category} · ${el.type || el.family}`))
  const body = h('div', 'se-props-body')
  propsHost.append(body)

  const custom = createCollapse(body, { title: 'Site data', open: true, accent: true })
  if (!bundle?.fields.length) {
    custom.body.append(h('div', 'se-muted', 'This project has no custom fields yet. They are defined in the VIM web app.'))
  }
  for (const f of bundle?.fields ?? []) custom.body.append(fieldEditor(f, el))

  const ident = createCollapse(body, { title: 'Element', open: true })
  const kv = h('div', 'se-kv')
  const pairs: [string, string][] = [
    ['Document', el.document],
    ['Category', el.category],
    ['Family', el.family],
    ['Type', el.type],
    ['Floor', el.floor],
    ['Revit level', el.revitLevel],
    ['Revit id', el.revitId],
  ]
  for (const [k, v] of pairs) kv.append(h('div', 'se-k', k), h('div', 'se-v', v || '—'))
  ident.body.append(kv)

  const paramsHost = h('div')
  body.append(paramsHost)
  paramsHost.append(h('div', 'se-muted', 'Reading parameters…'))
  void V.parameters(el).then(ps => {
    if (selected !== el) return
    paramsHost.replaceChildren()
    const groups = new Map<string, { name: string; value: string }[]>()
    for (const p of ps) {
      const v = displayValue(p.value)
      if (!v) continue
      const g = p.group || 'Other'
      groups.set(g, [...(groups.get(g) ?? []), { name: p.name, value: v }])
    }
    for (const [g, rows] of groups) {
      const c = createCollapse(paramsHost, { title: `${g} (${rows.length})`, open: false })
      const grid = h('div', 'se-kv')
      for (const r of rows) grid.append(h('div', 'se-pname', r.name), h('div', 'se-v', r.value))
      c.body.append(grid)
    }
    if (!groups.size) paramsHost.append(h('div', 'se-muted', 'No parameters with a value.'))
  })
}

function fieldEditor(f: FieldDef, el: V.ElementInfo): HTMLElement {
  const wrap = h('div', 'se-field')
  const cur = valueOf(el.key, f.fieldId)
  const label = h('div', 'se-field-label', f.label)
  if (cur?.pending) label.append(h('span', 'se-pending', '● not sent yet'))
  wrap.append(label)
  const commit = (value: string) => void editField(el, f, value)
  if (f.type === 'choice') {
    createSelect(wrap, { options: [{ id: '', label: '—' }, ...(f.choices ?? []).map(c => ({ id: c, label: c }))], value: cur?.value ?? '', block: true, onChange: commit })
  } else if (f.format === 'date') {
    createDateField(wrap, { value: cur?.value ?? '', onChange: commit })
  } else {
    createInput(wrap, { type: f.type === 'number' ? 'number' : 'text', value: cur?.value ?? '', onChange: commit })
  }
  const hist = book?.history.get(`${el.key}#${f.fieldId}`) ?? []
  const log = h('div', 'se-field-log')
  if (cur) log.textContent = `${cur.pending ? 'Changed on this iPad' : 'Set'} by ${cur.by || 'someone'} · ${timeWords(cur.at)}`
  if (hist.length > 1) {
    const prev = hist.find(x => x.editedAt < (cur?.at ?? ''))
    if (prev) log.textContent += ` · before: ${prev.value || '—'} (${prev.authorName || 'someone'}, ${timeWords(prev.editedAt)})`
  }
  wrap.append(log)
  return wrap
}

async function editField(el: V.ElementInfo, f: FieldDef, value: string): Promise<void> {
  if (!bundle || !account) return
  try {
    await queueFieldEdit(bundle.projectId, account, el, f.fieldId, value)
  } catch (e) {
    toaster.show({ text: `The change could not be saved on this iPad: ${describeError(e)}`, tone: 'bad' })
    return
  }
  await refreshBook()
  repaint()
  renderProps()
  await updateStatus()
  void trySync(false)
}

// ── views ───────────────────────────────────────────────────────────────────

async function allViews(): Promise<SiteView[]> {
  if (!bundle) return []
  const byId = new Map(bundle.views.map(v => [v.id, v]))
  for (const i of await outboxAll(bundle.projectId)) {
    if (i.namespace === 'vim-site-explorer.views') byId.set(String(i.value.id), i.value as unknown as SiteView)
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

async function renderViews(): Promise<void> {
  const views = await allViews()
  viewList?.setItems(views.map(v => ({ id: v.id, label: v.name, meta: v.createdBy ? `by ${v.createdBy.split(' ')[0]}` : '' })))
  viewList?.setSelected(activeViewId)
}

async function applyView(id: string): Promise<void> {
  const v = (await allViews()).find(x => x.id === id)
  if (!v) return
  activeViewId = v.id
  colourField = v.colourBy
  colourSelect?.setValue(colourField ?? '')
  await setFloors(v.floors.filter(f => model?.floors.some(x => x.name === f)))
  viewList?.setSelected(v.id)
}

async function saveCurrentView(): Promise<void> {
  if (!bundle || !account) return
  const field = bundle.fields.find(f => f.fieldId === colourField)
  const floors = activeFloors.length ? activeFloors.join(', ') : 'All floors'
  const name = `${floors}${field ? ` · ${field.label}` : ''}`
  const view: SiteView = {
    id: (crypto as any).randomUUID?.() ?? `v${Date.now()}`,
    name,
    floors: [...activeFloors],
    colourBy: colourField,
    createdBy: account.name,
    updatedAt: new Date().toISOString(),
  }
  await queueView(bundle.projectId, view)
  activeViewId = view.id
  await renderViews()
  await updateStatus()
  toaster.show({ text: `View saved: ${name}`, tone: 'good' })
  void trySync(false)
}

// ── sync ────────────────────────────────────────────────────────────────────

async function updateStatus(): Promise<void> {
  if (!bundle) return
  const waiting = (await outboxAll(bundle.projectId)).length
  const online = isOnline()
  if (!online) sync = { kind: 'offline', waiting }
  else if (sync.kind !== 'sending' && sync.kind !== 'error') sync = waiting ? { kind: 'waiting', waiting } : { kind: 'synced', at: sync.kind === 'synced' ? sync.at : '' }
  netChip?.setText(online ? 'Online' : 'No Wi-Fi')
  netChip?.setTone(online ? 'good' : 'warn')
  const words =
    sync.kind === 'offline' ? (waiting ? `${waiting} change${waiting === 1 ? '' : 's'} waiting to send` : 'All changes sent')
    : sync.kind === 'waiting' ? `${waiting} change${waiting === 1 ? '' : 's'} waiting to send`
    : sync.kind === 'sending' ? 'Sending…'
    : sync.kind === 'error' ? `Not sent: ${sync.message}`
    : sync.at ? `All changes sent · ${timeWords(sync.at)}` : 'All changes sent'
  syncChip?.setText(words)
  syncChip?.setTone(sync.kind === 'error' ? 'bad' : waiting ? 'warn' : 'good')
  document.body.dataset.sync = sync.kind
  document.body.dataset.waiting = String(waiting)
}

async function trySync(userAsked: boolean): Promise<void> {
  if (!bundle || !account) return
  if (!isOnline()) {
    await updateStatus()
    if (userAsked) toaster.show({ text: 'No connection. Changes stay on this iPad and go out when Wi-Fi is back.', tone: 'warn' })
    return
  }
  const waiting = (await outboxAll(bundle.projectId)).length
  sync = { kind: 'sending', waiting }
  await updateStatus()
  try {
    const sent = await flush(bundle.projectId, account)
    // Pull what everyone else changed, now that ours is in.
    const data = await fetchProjectData(account, bundle.projectId)
    bundle = { ...bundle, ...data }
    await saveBundle(bundle)
    await refreshBook()
    sync = { kind: 'synced', at: new Date().toISOString() }
    repaint()
    renderProps()
    await renderViews()
    if (sent && userAsked) toaster.show({ text: `${sent} change${sent === 1 ? '' : 's'} sent to VIM Server.`, tone: 'good' })
  } catch (e) {
    sync = { kind: 'error', waiting, message: describeError(e) }
  }
  await updateStatus()
}

window.addEventListener('online', () => void trySync(false))
window.addEventListener('offline', () => void updateStatus())
setInterval(() => {
  if (bundle && isOnline() && Number(document.body.dataset.waiting ?? 0) > 0) void trySync(false)
}, 30_000)

void boot()
