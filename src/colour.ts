// Colour by a custom field: one bucket per value, one legend row per bucket, and the legend is built
// from the same buckets that paint the model, so it cannot disagree with the picture.

import { categoricalPalette } from 'vim-html-ds'
import type { CurrentValue, FieldDef } from './project-data'
import type { ElementInfo } from './viewer'

export interface Bucket {
  label: string
  color: string
  count: number
}

export interface Colouring {
  buckets: Bucket[]
  byKey: Map<string, string | null>
}

function token(name: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return v || fallback
  } catch {
    return fallback
  }
}

/** Today as YYYY-MM-DD in the iPad's own time zone. */
export function todayIso(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function dateBucket(iso: string, today: string): string {
  if (iso < today) return 'Before today'
  if (iso === today) return 'Today'
  const t = new Date(today + 'T00:00:00')
  t.setDate(t.getDate() + 7)
  return iso <= todayIso(t) ? 'Next 7 days' : 'Later'
}

export function colourBy(
  field: FieldDef,
  elements: ElementInfo[],
  valueOf: (key: string, fieldId: string) => CurrentValue | undefined,
): Colouring {
  const none = 'No value'
  const labels = new Map<string, number>()
  const assign = new Map<string, string>()
  const today = todayIso()
  for (const e of elements) {
    const raw = valueOf(e.key, field.fieldId)?.value ?? ''
    let label = raw ? raw : none
    if (raw && field.format === 'date') label = dateBucket(raw.slice(0, 10), today)
    assign.set(e.key, label)
    labels.set(label, (labels.get(label) ?? 0) + 1)
  }

  // Order: the field's own choice order, then date order, then most common first.
  let order: string[]
  if (field.type === 'choice' && field.choices?.length) order = field.choices.filter(c => labels.has(c))
  else if (field.format === 'date') order = ['Before today', 'Today', 'Next 7 days', 'Later'].filter(c => labels.has(c))
  else order = [...labels.keys()].filter(l => l !== none).sort((a, b) => (labels.get(b) ?? 0) - (labels.get(a) ?? 0))
  for (const l of labels.keys()) if (l !== none && !order.includes(l)) order.push(l)

  const palette = categoricalPalette(Math.max(order.length, 1))
  const dateColours: Record<string, string> = {
    'Before today': token('--good', '#4ADE80'),
    Today: token('--vim-cyan', '#3DB8F5'),
    'Next 7 days': token('--warn', '#FACC15'),
    Later: token('--vim-violet', '#9B8CFA'),
  }
  const colourOf = new Map<string, string>()
  order.forEach((l, i) => {
    colourOf.set(l, field.colors?.[l] ?? (field.format === 'date' ? dateColours[l] : undefined) ?? palette[i % palette.length])
  })
  // Light enough to read the building by; the coloured buckets still stand out against it.
  const greyed = token('--text-300', '#9AA4B5')

  const buckets: Bucket[] = order.map(l => ({ label: l, color: colourOf.get(l)!, count: labels.get(l) ?? 0 }))
  if (labels.has(none)) buckets.push({ label: none, color: greyed, count: labels.get(none)! })
  const byKey = new Map<string, string | null>()
  for (const [k, l] of assign) byKey.set(k, l === none ? greyed : colourOf.get(l) ?? null)
  return { buckets, byKey }
}
