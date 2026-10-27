// The app itself, kept on the iPad so it opens with no Wi-Fi. Only this app's own files: VIM Server
// calls and the model are never touched here (the model lives in IndexedDB, see src/storage.ts).
// Network first, so a new version arrives whenever there is a connection; the stored copy otherwise.
const CACHE = 'vim-site-explorer-app-v1' // src/main.ts adds to the same cache by name

self.addEventListener('install', e => {
  e.waitUntil(
    (async () => {
      const c = await caches.open(CACHE)
      let built = []
      try {
        built = await (await fetch('./precache.json', { cache: 'no-store' })).json()
      } catch {
        /* dev server: no list, the runtime copy below still fills the cache */
      }
      const files = ['./', './index.html', './manifest.webmanifest', './icon-512.png', ...built.map(f => './' + f)]
      await Promise.all(files.map(f => c.add(f).catch(() => undefined)))
      await self.skipWaiting()
    })(),
  )
})
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then(c => c.put(req, copy))
        }
        return res
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true, ignoreVary: true }).then(
          hit => hit || (req.mode === 'navigate' ? caches.match('./index.html', { ignoreVary: true }) : Response.error()),
        ),
      ),
  )
})
