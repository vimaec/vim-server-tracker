// The round's proof: on an iPad-sized screen, download the project, cut the network, reload (the app
// must open from the iPad alone), change a status, see it wait, reconnect, and read the change back
// from VIM Server. Runs against the throwaway QA-PW-SiteExplorer project only.
//   node tools/proof-offline.mjs <projectId>     (app on :5821, relay on :5830, VIM_PAT for the read-back)
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const PROJECT = process.argv[2]
const APP = 'http://localhost:5821/'
const OUT = fileURLToPath(new URL('../_proof/', import.meta.url))
const started = new Date().toISOString()
const step = (s, d = '') => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}${d ? ' ' + d : ''}`)
const kill = setTimeout(() => { console.log('GAVE UP after 6 minutes'); process.exit(2) }, 360_000)

const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
// iPad Air 11" landscape, in CSS pixels.
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error' || m.text().startsWith('[model]')) step('console', m.text().slice(0, 200)) })
page.on('response', r => { const ct = r.headers()['content-type'] ?? ''; if (/\.(js|css|woff2?)$/.test(new URL(r.url()).pathname) && ct.includes('html')) step('WRONG FILE', r.url() + ' fromSW=' + r.fromServiceWorker()) })
const shot = async name => { await page.screenshot({ path: OUT + name + '.png' }); step('screenshot', name) }
const waitFor = (fn, arg, ms = 60_000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 250 })

step('open app')
await page.goto(APP)
await page.getByPlaceholder('Paste your key').waitFor()
const inputs = page.locator('input')
await inputs.nth(0).fill('http://localhost:5830')
await inputs.nth(1).fill('via-local-relay')
await page.getByRole('button', { name: 'Sign in' }).click()
step('signed in, waiting for projects')
await page.getByText('QA-PW-SiteExplorer', { exact: true }).click()
step('download started')
await waitFor(() => !!globalThis.__site?.index()?.floors?.length, null, 180_000)
await page.waitForTimeout(1500)
const floors = await page.evaluate(() => globalThis.__site.index().floors.map(f => `${f.name} (${f.count})`))
const source = await page.evaluate(() => globalThis.__site.index().floorSource)
step('model open', `${floors.length} floors from ${source}: ${floors.join(', ')}`)
await shot('1-online-all-floors')

// Pick the floor with the most elements and open it from the floor list.
const floor = await page.evaluate(() => [...globalThis.__site.index().floors].sort((a, b) => b.count - a.count)[0].name)
await page.locator('.se-left').getByText(floor, { exact: true }).first().click()
await waitFor(f => document.querySelector('.se-overlay-note')?.textContent?.includes('elements drawn'), floor)
step('floor', floor + ' · ' + (await page.locator('.se-overlay-note').textContent()))

// The element under test: a wall on that floor if there is one.
const target = await page.evaluate(f => {
  const els = globalThis.__site.index().elements.filter(e => e.floor === f)
  return els.find(e => /wall/i.test(e.category)) ?? els[0]
}, floor)
step('element', `${target.category} · ${target.type} · Revit id ${target.revitId}`)
await shot('2-online-one-floor')

// The app's own files must be on the device before the network goes (the service worker stores them).
let stored = []
for (let i = 0; i < 40; i++) {
  stored = await page.evaluate(async () => {
    const names = await caches.keys()
    const out = []
    for (const n of names) for (const r of await (await caches.open(n)).keys()) out.push(new URL(r.url).pathname)
    return out
  })
  if (stored.some(p => p.endsWith('.js')) && (await page.evaluate(() => !!navigator.serviceWorker.controller))) break
  await page.waitForTimeout(500)
}
step('app files on the device', stored.join(' '))
await page.evaluate(k => globalThis.__site.selectKey(k), target.key)
await page.locator('.se-right .se-field').first().waitFor()
await page.waitForTimeout(800)
await shot('2b-online-selected')
step('CUT THE NETWORK and reload')
await ctx.setOffline(true)
await page.reload()
await waitFor(() => !!globalThis.__site?.index()?.floors?.length, null, 90_000)
await waitFor(() => document.querySelector('.se-overlay-note')?.textContent?.includes('elements drawn'))
step('reopened offline', (await page.locator('.se-status').textContent()) ?? '')
await page.evaluate(k => globalThis.__site.selectKey(k), target.key)
const status = page.locator('.se-right .se-field').filter({ hasText: 'Install Status' })
await status.waitFor()
// Pick a value different from what the wall says now, so every run makes a real change.
const before = ((await status.locator('button').first().textContent()) ?? '').trim()
const pick = before === 'Installed' ? 'In progress' : 'Installed'
step('status before', `${before || '(none)'} -> ${pick}`)
await status.locator('button').first().click()
await page.getByText(pick, { exact: true }).last().click()
await waitFor(() => document.body.dataset.waiting === '1')
step('edited offline', (await page.locator('.se-status').textContent()) ?? '')
await shot('3-offline-edit-waiting')

step('RECONNECT')
await ctx.setOffline(false)
await page.evaluate(() => window.dispatchEvent(new Event('online')))
await waitFor(() => document.body.dataset.waiting === '0' && document.body.dataset.sync === 'synced', null, 60_000)
step('synced', (await page.locator('.se-status').textContent()) ?? '')
await shot('4-back-online-synced')

// A saved view: Ground floor, coloured by Install Status.
await page.getByRole('button', { name: 'Save view' }).click()
await waitFor(() => document.body.dataset.waiting === '0' && document.body.dataset.sync === 'synced', null, 60_000)
step('view saved', (await page.locator('.se-left .se-section').first().textContent()) ?? '')

// A real tap on the model (not a script selection): clear, tap the middle of the 3D view, see what the card shows.
await page.evaluate(() => globalThis.__site.viewer().selection.clear())
const box = await page.locator('.se-canvas').boundingBox()
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
await page.waitForTimeout(1200)
step('tap in the middle of the model ->', (await page.locator('.se-props-title').textContent()) ?? '')
await shot('5-tap-and-view')

// Read it back from VIM Server, outside the app.
const key = process.env.VIM_PAT
const rows = []
for (let skip = 0; ; ) {
  const r = await fetch(`https://server-dev.vimaec.com/api/v1/project/${PROJECT}/data/vim-web-workflows.fieldedits?take=1000&skip=${skip}`, { headers: { Authorization: `Bearer ${key}` } })
  const page = await r.json()
  if (!page.length) break
  rows.push(...page); skip += page.length
}
const mine = rows.filter(r => r.value.uniqueId === target.uniqueId && r.value.editedAt >= started)
step('VIM Server read-back', `${mine.length} record(s) for this element since ${started}`)
for (const r of mine) console.log(JSON.stringify({ key: r.key, ...r.value, author: { ...r.value.author, userId: '(hidden)' } }, null, 1))
const views = await (await fetch(`https://server-dev.vimaec.com/api/v1/project/${PROJECT}/data/vim-site-explorer.views?take=100&skip=0`, { headers: { Authorization: `Bearer ${key}` } })).json()
const newViews = views.filter(v => v.value.updatedAt >= started)
step('VIM Server views saved this run', newViews.map(v => `${v.value.name} [floors: ${v.value.floors.join(', ') || 'all'}; colour: ${v.value.colourBy}]`).join(' | '))
const hide = r => ({ ...r, value: { ...r.value, ...(r.value.author ? { author: { ...r.value.author, userId: '(hidden)' } } : {}) } })
fs.writeFileSync(OUT + 'readback.json', JSON.stringify({ edits: mine.map(hide), views: newViews }, null, 1))
clearTimeout(kill)
await browser.close()
process.exit(mine.length === 1 && mine[0].value.value === pick && newViews.length === 1 ? 0 : 1)
