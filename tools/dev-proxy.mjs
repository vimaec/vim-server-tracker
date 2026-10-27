// DEV/TEST ONLY: a local relay to VIM Server that adds the access key on the way out, so a test page
// never holds a real key (project rule: never stage a token into any page). The app signs in to
// http://localhost:5830 with any placeholder key; this replaces the Authorization header.
//   VIM_PAT=<key> node tools/dev-proxy.mjs            (the key is read from the environment, never printed)
import http from 'node:http'

const TARGET = process.env.VIM_SERVER ?? 'https://server-dev.vimaec.com'
const KEY = process.env.VIM_PAT
const PORT = Number(process.env.PROXY_PORT ?? 5830)
if (!KEY) throw new Error('VIM_PAT is not set')

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Range, If-Match, If-None-Match',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
  'Access-Control-Expose-Headers': 'ETag, Content-Range',
}

http
  .createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return res.writeHead(204, cors).end()
    if (!req.url?.startsWith('/api/v1/')) return res.writeHead(404, cors).end()
    const chunks = []
    for await (const c of req) chunks.push(c)
    const body = chunks.length ? Buffer.concat(chunks) : undefined
    try {
      const r = await fetch(TARGET + req.url, {
        method: req.method,
        headers: { Authorization: `Bearer ${KEY}`, ...(req.headers['content-type'] ? { 'Content-Type': req.headers['content-type'] } : {}) },
        body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
      })
      const buf = Buffer.from(await r.arrayBuffer())
      res.writeHead(r.status, { ...cors, 'Content-Type': r.headers.get('content-type') ?? 'application/json' })
      res.end(buf)
      console.log(`${new Date().toISOString()} ${req.method} ${req.url.split('?')[0]} -> ${r.status}`)
    } catch (e) {
      res.writeHead(502, cors).end()
      console.log(`${req.method} ${req.url} -> relay error ${e.message}`)
    }
  })
  .listen(PORT, () => console.log(`relay on http://localhost:${PORT} -> ${TARGET} (key length ${KEY.length})`))
