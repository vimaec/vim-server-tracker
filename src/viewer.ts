// The 3D view: vim-web's WebGL viewer, opened from the copy of the model on this iPad.
//
// Floors: a view that names floors loads ONLY those floors' elements (vim.load(subset)), which is how a
// large (500 MB+) model stays light enough for an iPad (Sam 2026-10-27: "if they only want to load one floor,
// they can load the one floor using the VIM Flex classified level information"). The phone app
// measured a floor swap at 18-35 ms on TowerS.
//
// Traps carried over from the phone app (vim-glance three-d.ts), each measured there:
//   - vim.load() must be awaited after viewer.load(), or nothing is drawn and nothing says why;
//   - camera.frame() must be awaited before anyone judges the picture;
//   - selection never repaints: colour is set only when the colour-by choice or a value changes.

import { Core, THREE } from 'vim-web'
import { cachedUrl } from './model-cache'
import { elementKey } from './project-data'

type Viewer = ReturnType<typeof Core.Webgl.createViewer>
type Vim = Viewer['vims'][number]
type El = NonNullable<ReturnType<Vim['getElementFromIndex']>>

export interface ElementInfo {
  index: number
  key: string
  document: string
  uniqueId: string
  revitId: string
  category: string
  family: string
  type: string
  revitLevel: string
  floor: string
  instances: number[]
}

export interface Floor {
  name: string
  elevation: number
  count: number
}

export interface ModelIndex {
  elements: ElementInfo[]
  byIndex: Map<number, ElementInfo>
  byKey: Map<string, ElementInfo>
  floors: Floor[]
  /** Where the floors come from: Classify's levels, or the levels as they came from Revit. */
  floorSource: 'classify' | 'revit'
  /** Elements Classify had no floor for, which fell back to their Revit level. */
  classifyMisses: number
  /** The project has Classify floors, but none of them are about this model, so they were not used. */
  classifyIgnored: boolean
}

let viewer: Viewer | null = null
let vim: Vim | null = null
let index: ModelIndex | null = null
const selectListeners = new Set<(el: ElementInfo | null) => void>()

export function onSelect(fn: (el: ElementInfo | null) => void): () => void {
  selectListeners.add(fn)
  return () => selectListeners.delete(fn)
}

export function currentIndex(): ModelIndex | null {
  return index
}

export async function open(host: HTMLElement, modelKey: string, classifyFloors: Record<string, string>): Promise<ModelIndex> {
  close()
  const v = Core.Webgl.createViewer({ background: { color: new THREE.Color(0x0b121c) } } as any)
  viewer = v
  v.viewport.reparent(host)
  try {
    ;(v.gizmos as any).axes.canvas.style.display = 'none'
  } catch {
    /* older builds: nothing to hide */
  }
  const m = await v.load({ url: cachedUrl(modelKey) }).getVim()
  vim = m
  index = await buildIndex(m, classifyFloors)
  v.selection.onSelectionChanged.sub(() => {
    const picked = v.selection.getAll().find((o: any) => o?.type === 'Element3D') as El | undefined
    const info = picked ? index?.byIndex.get(picked.element) ?? null : null
    for (const fn of selectListeners) fn(info)
  })
  return index
}

export function close(): void {
  if (viewer) {
    try {
      if (vim) viewer.unload(vim)
      ;(viewer as any).dispose?.()
    } catch {
      /* best effort */
    }
  }
  viewer = null
  vim = null
  index = null
}

async function buildIndex(m: Vim, classify: Record<string, string>): Promise<ModelIndex> {
  const bim = m.bim
  if (!bim?.element) throw new Error('This model has no element table.')
  const [ids, uniq, names, famNames, levelIdx, catIdx, docIdx] = await Promise.all([
    bim.element.getAllId(),
    bim.element.getAllUniqueId(),
    bim.element.getAllName(),
    bim.element.getAllFamilyName(),
    bim.element.getAllLevelIndex(),
    bim.element.getAllCategoryIndex(),
    bim.element.getAllBimDocumentIndex(),
  ])
  const catNames = (await bim.category?.getAllName()) ?? []
  const docTitles = (await bim.bimDocument?.getAllTitle()) ?? []
  const levelElement = (await bim.level?.getAllElementIndex()) ?? []
  const levelElev = (await bim.level?.getAllElevation()) ?? []
  const levelName = (li: number | undefined) => {
    if (li === undefined || li < 0) return ''
    const ei = levelElement[li]
    return ei !== undefined && ei >= 0 ? names?.[ei] ?? '' : ''
  }

  // Classify's floors are used only when they are about THIS model. Measured 2026-10-27: the Dwelling
  // project on server-dev holds 9,920 Classify rows that are all TowerS elements; trusting the row count
  // would label every Dwelling floor "from Classify" while not one element matched.
  const keysHere = new Set<string>()
  if (Object.keys(classify).length) {
    for (const el of m.getAllElements() as El[]) {
      const i = el.element
      keysHere.add(elementKey(docTitles[docIdx?.[i] ?? -1] ?? '', uniq?.[i] ?? el.elementUniqueId ?? ''))
    }
  }
  const useClassify = Object.keys(classify).some(k => keysHere.has(k))
  const elements: ElementInfo[] = []
  let misses = 0
  // Only elements that draw: this is a 3D explorer, and an element with no geometry cannot be seen,
  // picked or coloured. (The .vim carries no ElementDomain; the web app filters Physical-Visible.)
  for (const el of m.getAllElements() as El[]) {
    const i = el.element
    const inst = el.instances
    if (!inst?.length) continue
    const document = docTitles[docIdx?.[i] ?? -1] ?? ''
    const uniqueId = uniq?.[i] ?? el.elementUniqueId ?? ''
    const key = elementKey(document, uniqueId)
    const revitLevel = levelName(levelIdx?.[i])
    let floor = revitLevel
    if (useClassify) {
      const c = classify[key]
      if (c) floor = c
      else misses++
    }
    elements.push({
      index: i,
      key,
      document,
      uniqueId,
      revitId: ids?.[i] !== undefined ? String(ids[i]) : '',
      category: catNames[catIdx?.[i] ?? -1] ?? '',
      family: famNames?.[i] ?? '',
      type: names?.[i] ?? '',
      revitLevel,
      floor: floor || 'No floor',
      instances: inst,
    })
  }

  // Floor order is by height, never by name ("Level 10" sorts before "Level 2" as text). A Classify
  // floor takes the elevation of the Revit level of the same name, else the lowest Revit level among
  // its own elements.
  const elevByName = new Map<string, number>()
  levelElement.forEach((ei, li) => {
    const n = ei >= 0 ? names?.[ei] : undefined
    if (n && !elevByName.has(n)) elevByName.set(n, levelElev[li] ?? 0)
  })
  const floorMap = new Map<string, Floor>()
  for (const e of elements) {
    let f = floorMap.get(e.floor)
    if (!f) {
      const elev = elevByName.get(e.floor) ?? elevByName.get(e.revitLevel) ?? Number.POSITIVE_INFINITY
      floorMap.set(e.floor, (f = { name: e.floor, elevation: elev, count: 0 }))
    } else if (!elevByName.has(e.floor)) {
      const elev = elevByName.get(e.revitLevel)
      if (elev !== undefined && elev < f.elevation) f.elevation = elev
    }
    f.count++
  }
  // Highest first, like a building section; elements with no floor at all go last.
  const floors = [...floorMap.values()].sort((a, b) => {
    const an = a.elevation === Number.POSITIVE_INFINITY, bn = b.elevation === Number.POSITIVE_INFINITY
    if (an !== bn) return an ? 1 : -1
    return b.elevation - a.elevation || a.name.localeCompare(b.name)
  })

  return {
    elements,
    byIndex: new Map(elements.map(e => [e.index, e])),
    byKey: new Map(elements.map(e => [e.key, e])),
    floors,
    floorSource: useClassify ? 'classify' : 'revit',
    classifyMisses: misses,
    classifyIgnored: Object.keys(classify).length > 0 && !useClassify,
  }
}

/** Load only these floors (empty = all). Returns how many elements are drawn. */
export async function showFloors(floors: string[]): Promise<number> {
  if (!viewer || !vim || !index) return 0
  const want = new Set(floors)
  const shown = floors.length ? index.elements.filter(e => want.has(e.floor)) : index.elements
  if (!floors.length) await vim.load()
  else {
    const inst: number[] = []
    for (const e of shown) inst.push(...e.instances)
    await vim.load(vim.subset().filter('instance', inst))
  }
  const box = await vim.getBoundingBox()
  if (box) await viewer.camera.snap().frame(box)
  redraw()
  return shown.length
}

/** Paint elements. A key missing from the map goes back to its own look. */
export function paint(colours: Map<string, string | null>): void {
  if (!vim || !index) return
  for (const e of index.elements) {
    const el = vim.getElementFromIndex(e.index) as El | undefined
    if (!el || !el.hasMesh) continue
    const hex = colours.get(e.key)
    el.color = hex ? new THREE.Color(hex) : undefined
  }
  redraw()
}

export function select(info: ElementInfo | null): void {
  if (!viewer || !vim) return
  if (!info) {
    viewer.selection.clear()
    return
  }
  const el = vim.getElementFromIndex(info.index) as El | undefined
  if (!el) return
  viewer.selection.select(el)
  void viewer.camera.lerp(0.6).frame(el)
}

export async function parameters(info: ElementInfo): Promise<{ name: string; value: string; group: string }[]> {
  if (!vim) return []
  const el = vim.getElementFromIndex(info.index) as El | undefined
  if (!el) return []
  const ps = await el.getBimParameters()
  return ps.map(p => ({ name: p.name ?? '', value: p.value ?? '', group: p.group ?? '' }))
}

export function redraw(): void {
  try {
    viewer?.renderer.requestRender()
  } catch {
    /* not ready */
  }
}

/** For the proof script only. */
;(globalThis as any).__site = {
  viewer: () => viewer,
  vim: () => vim,
  index: () => index,
  selectKey: (key: string) => select(index?.byKey.get(key) ?? null),
}
