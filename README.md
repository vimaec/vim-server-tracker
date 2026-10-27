# VIM Site Explorer

A very simple iPad app for site teams: pick a floor, colour the model by a custom field
(Install Status, Actual Finish, Forecast Finish), tap an element to see its properties and change its
site data. It works with no Wi-Fi and sends changes to VIM Server when Wi-Fi is back.

First version: an installable web app (add to the iPad home screen). Built so it can be wrapped as a real
iPad app later (Capacitor, needs a Mac): all storage is in `src/storage.ts`, sync is a queue of changes
with ids and timestamps (`src/sync.ts`), and nothing uses Safari-only tricks.

## How it fits VIM Server
| Namespace | Use |
|---|---|
| `vim-web-workflows.fields` | the field list, shared with the web app (read) |
| `vim-web-workflows.fieldvalues` | values the web app shared (read) |
| `vim-web-workflows.classification` | VIM Flex / web Classify floors (read; used only if they match the model) |
| `vim-web-workflows.fieldedits` | one record per change made on site (write; append-only, key = change id) |
| `vim-site-explorer.views` | saved views: floors + colour-by (read/write) |

Why a change log and not `fieldvalues`: the web app publishes `fieldvalues` as a whole snapshot and deletes
records it does not hold, so iPad writes there would be swept. Latest on-site time wins; every change is
kept (who, when). The web app does not read `fieldedits` yet (follow-up).

## Run
```
npm install
npm run dev          # http://localhost:5820
npm run build && npm run preview   # http://localhost:5821, with the offline service worker
```

## Proof (offline round trip)
```
VIM_PAT=<key> node tools/dev-proxy.mjs                 # local relay: the page never holds a key
VIM_PAT=<key> node tools/proof-offline.mjs <projectId> # iPad-sized headless Edge; screenshots in _proof/
```
Only against a throwaway `QA-PW-*` project.
