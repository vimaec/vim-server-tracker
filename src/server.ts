// VIM Server, straight from the iPad. No proxy in between: every /api/v1 route answers CORS (measured
// for the phone app, vim-glance server.ts), and a customer's project must not pass through
// our own web hosting.
//
// Sign-in is a personal access key for now. Microsoft sign-in (Entra) is the target and is a Martin
// ask: VIM Server has no token endpoint, only Entra (GET /api/v1/config hands out the MSAL settings),
// and the app's address must be registered as a redirect first. The key rides in the Authorization
// header and nowhere else: never a URL, never a log line.

export interface Account {
  base: string
  key: string
  userId: string
  name: string
}

export interface ProjectRow {
  id: string
  name: string
  role: string
  orgName: string
  latest: { id: string; versionTag: string; sizeInBytes: number; created: string } | null
}

export class ServerError extends Error {
  constructor(message: string, readonly kind: 'auth' | 'offline' | 'server' | 'notfound') {
    super(message)
  }
}

function fail(status: number): ServerError {
  if (status === 401 || status === 403) return new ServerError('VIM Server did not accept this key.', 'auth')
  if (status === 404) return new ServerError('That project is not on VIM Server any more.', 'notfound')
  return new ServerError(`VIM Server answered with an error (${status}).`, 'server')
}

async function call(a: Pick<Account, 'base' | 'key'>, path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${a.key}`)
  let res: Response
  try {
    res = await fetch(a.base.replace(/\/+$/, '') + path, { ...init, headers, cache: 'no-store' })
  } catch {
    throw new ServerError('No connection to VIM Server.', 'offline')
  }
  if (!res.ok) throw fail(res.status)
  return res
}

async function json<T>(a: Pick<Account, 'base' | 'key'>, path: string, init?: RequestInit): Promise<T> {
  const res = await call(a, path, init)
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}

export async function signIn(base: string, key: string): Promise<Account> {
  const p = await json<any>({ base, key }, '/api/v1/profile')
  const name = `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim() || String(p?.email ?? 'Signed in')
  return { base, key, userId: String(p?.userId ?? ''), name }
}

export async function listProjects(a: Account): Promise<ProjectRow[]> {
  const orgs = await json<any[]>(a, '/api/v1/org')
  const out: ProjectRow[] = []
  for (const org of orgs ?? []) {
    const rows = await json<any[]>(a, `/api/v1/org/${encodeURIComponent(org.id)}/project`)
    for (const r of rows ?? []) {
      const v = r?.latestVim
      out.push({
        id: String(r.id),
        name: String(r.name ?? 'Untitled'),
        role: String(r.role ?? ''),
        orgName: String(org.name ?? ''),
        latest: v ? { id: String(v.id), versionTag: String(v.versionTag ?? ''), sizeInBytes: Number(v.sizeInBytes ?? 0), created: String(v.created ?? '') } : null,
      })
    }
  }
  return out.sort((x, y) => x.name.localeCompare(y.name))
}

export async function projectRole(a: Account, projectId: string): Promise<string> {
  const r = await json<any>(a, `/api/v1/project/${projectId}/role`)
  return String(r?.role ?? '')
}

/** A signed URL (six hours) for the project's latest model. Never stored: asked again each download. */
export async function modelUrl(a: Account, projectId: string): Promise<string> {
  const r = await json<any>(a, `/api/v1/project/${projectId}/vim/download?redirect=false`)
  return String(r?.url ?? '')
}

export interface DataEntry {
  key: string
  value: Record<string, any>
}

/**
 * Every record in one shared namespace. Paged by the count actually returned: a bare request silently
 * truncates (measured on VIM Server, 2026-09).
 */
export async function readNamespace(a: Account, projectId: string, ns: string): Promise<DataEntry[]> {
  const list = await json<any[]>(a, `/api/v1/project/${projectId}/data`)
  if (!(list ?? []).some(n => n.namespace === ns && Number(n.count ?? 0) > 0)) return []
  const out: DataEntry[] = []
  for (let skip = 0; ; ) {
    const page = await json<DataEntry[]>(a, `/api/v1/project/${projectId}/data/${encodeURIComponent(ns)}?take=1000&skip=${skip}`)
    if (!page?.length) break
    out.push(...page)
    skip += page.length
  }
  return out
}

/** Write records. Each key is fixed by its author, so repeating a write changes nothing. */
export async function putRecords(a: Account, projectId: string, ns: string, records: DataEntry[]): Promise<void> {
  if (!records.length) return
  await call(a, `/api/v1/project/${projectId}/data/${encodeURIComponent(ns)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(records),
  })
}
