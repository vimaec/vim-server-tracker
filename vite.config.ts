import { defineConfig, type Plugin } from 'vite'

// Writes precache.json: every file the build produced, so the service worker can keep ALL of them on
// the iPad at install - including fonts the first screen never asked for (a bold face first used
// offline would otherwise be missing).
function precacheList(): Plugin {
  return {
    name: 'precache-list',
    generateBundle(_opts, bundle) {
      const files = Object.keys(bundle).filter(f => !f.endsWith('.map'))
      this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify(files) })
    },
  }
}

// :5820 so it never collides with the web app (:5600) or the phone app (:5173 / :5810).
export default defineConfig({
  base: './',
  plugins: [precacheList()],
  server: { port: 5820, strictPort: true },
  preview: { port: 5821, strictPort: true },
  build: { target: 'es2022', chunkSizeWarningLimit: 4000 },
})
