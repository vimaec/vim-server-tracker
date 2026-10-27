// The model, served to the 3D viewer out of the iPad's own storage.
//
// Adapted from the phone app (vim-glance app/src/store.ts), which measured the two facts this rests on:
//   1. vim-web loads the .vim with XMLHttpRequest + a Range header, NOT fetch - so the shim subclasses
//      XMLHttpRequest, and every request that is not the model stays the native object.
//   2. vim-format reads the file in ranges (~half of it for a full load), so the whole file is cut into
//      4 MB blocks once ("Download for site") and every range is assembled from blocks.
//
// The difference from the phone app: this app is offline-FIRST. The 3D viewer only ever opens the
// model from the iPad; a missing block is an error ("not fully downloaded"), never a quiet network read.

import { BLOCK_BYTES, getBlock, putBlock } from './storage'

/** The URL the viewer is given. Nothing answers it but the shim below. */
export const CACHED_PREFIX = 'vimsite-cached:'

export function cachedUrl(modelKey: string): string {
  return CACHED_PREFIX + modelKey
}

let installed = false

export function installModelShim(): void {
  if (installed) return
  installed = true
  const g = globalThis as any
  const Native: typeof XMLHttpRequest = g.XMLHttpRequest

  class CachedXhr extends Native {
    private mine = false
    private key = ''
    private range: { start: number; end: number } | null = null
    private aborted = false
    private res: ArrayBuffer | null = null
    private st = 0
    private ready = 0

    override open(method: string, url: string | URL, ...rest: unknown[]) {
      const href = String(url)
      this.mine = href.startsWith(CACHED_PREFIX)
      this.key = this.mine ? href.slice(CACHED_PREFIX.length) : ''
      this.range = null
      this.aborted = false
      this.res = null
      this.st = 0
      this.ready = 1
      // The native object is opened only for real URLs; a custom scheme would throw on open.
      if (!this.mine) return super.open(method, href, ...(rest as [boolean]))
    }

    override setRequestHeader(k: string, v: string) {
      if (!this.mine) return super.setRequestHeader(k, v)
      if (k.toLowerCase() === 'range') {
        const m = /bytes=(\d+)-(\d+)/.exec(v)
        if (m) this.range = { start: +m[1], end: +m[2] + 1 }
      }
    }

    override abort() {
      if (!this.mine) return super.abort()
      this.aborted = true
    }

    override send(body?: Document | XMLHttpRequestBodyInit | null) {
      if (!this.mine) return super.send(body)
      void this.serve()
    }

    override get response(): any {
      return this.mine ? this.res : super.response
    }
    override get status(): number {
      return this.mine ? this.st : super.status
    }
    override get readyState(): number {
      return this.mine ? this.ready : super.readyState
    }

    private async serve() {
      try {
        if (!this.range) throw new Error('the viewer asked for the whole file at once')
        const bytes = await readRange(this.key, this.range.start, this.range.end)
        if (this.aborted) return
        this.res = bytes
        this.st = 206
        this.ready = 4
        const e = { loaded: bytes.byteLength, total: bytes.byteLength, lengthComputable: true }
        this.onprogress?.(e as ProgressEvent)
        this.onload?.(e as ProgressEvent)
        this.onloadend?.(e as ProgressEvent)
      } catch (err) {
        if (this.aborted) return
        this.st = 0
        this.ready = 4
        console.warn('[model] range not served:', (err as Error)?.message)
        this.onerror?.(err as ProgressEvent)
      }
    }
  }

  g.XMLHttpRequest = CachedXhr
}

async function readRange(model: string, start: number, end: number): Promise<ArrayBuffer> {
  const first = Math.floor(start / BLOCK_BYTES)
  const last = Math.floor((end - 1) / BLOCK_BYTES)
  const out = new Uint8Array(end - start)
  for (let i = first; i <= last; i++) {
    const b = await getBlock(model, i)
    if (!b) throw new Error(`block ${i} is not on this iPad - download the project again`)
    const blockStart = i * BLOCK_BYTES
    const from = Math.max(start, blockStart) - blockStart
    const to = Math.min(end, blockStart + b.byteLength) - blockStart
    if (to > from) out.set(new Uint8Array(b, from, to - from), blockStart + from - start)
  }
  return out.buffer
}

export interface DownloadProgress {
  bytes: number
  totalBytes: number
  blocks: number
  totalBlocks: number
}

/**
 * Every block of the model onto the iPad. Blocks already here are skipped, so a download cut by a
 * lost connection resumes where it stopped instead of starting over.
 */
export async function downloadModel(
  model: string,
  signedUrl: string,
  totalBytes: number,
  onProgress: (p: DownloadProgress) => void,
): Promise<void> {
  const totalBlocks = Math.ceil(totalBytes / BLOCK_BYTES)
  const queue = Array.from({ length: totalBlocks }, (_, i) => i)
  let blocks = 0
  let bytes = 0
  const lane = async () => {
    for (;;) {
      const i = queue.shift()
      if (i === undefined) return
      const have = await getBlock(model, i)
      if (have) {
        bytes += have.byteLength
      } else {
        const start = i * BLOCK_BYTES
        const end = Math.min(start + BLOCK_BYTES, totalBytes) - 1
        const res = await fetch(signedUrl, { headers: { Range: `bytes=${start}-${end}` } })
        if (!(res.status === 206 || res.status === 200)) throw new Error(`the model download stopped (answer ${res.status})`)
        let buf = await res.arrayBuffer()
        // A server that ignores Range sends the whole file; keep only this block's slice.
        if (res.status === 200 && buf.byteLength > end - start + 1) buf = buf.slice(start, end + 1)
        await putBlock(model, i, buf)
        bytes += buf.byteLength
      }
      blocks++
      onProgress({ bytes, totalBytes, blocks, totalBlocks })
    }
  }
  await Promise.all(Array.from({ length: 4 }, lane))
}
