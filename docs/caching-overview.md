# Asset Caching & Offline Strategy

This document explains how the Con đường đổi mới frontend warms heavy assets ahead of gameplay and how the new service worker keeps those assets available even if the backend goes offline.

---

## 1. Shared Asset Manifest

Path: `scripts/asset-manifest.js`

- Holds the canonical list of GLB models, textures, and audio that the game relies on.
- Exported in two forms:
  - `ASSET_MANIFEST`: array with `{ url, type }` entries.
  - `PRECACHE_URLS`: unique set of URLs used by the service worker during precache.
- Keeping the manifest centralized guarantees the preloader, service worker, and any future tools work against the exact same asset list.

> **Reminder:** bump `CACHE_NAME` (currently `history-surfers-preload-v2`) when you change this manifest. That forces the service worker to precache new assets and ignore stale ones.

---

## 2. Lobby Preloader & Banner

Files: `scripts/preload-assets.js`, `scripts/preload-banner.js`

### What the preloader does

1. Converts the manifest to absolute URLs and warms them with `fetch`.
2. For GLB assets, it loads them via `GLTFLoader` to populate the shared in-memory clone cache.
3. Non-GLB assets are fetched with `{ cache: 'force-cache' }` and also copied into Cache Storage (`history-surfers-preload-v1`) for redundancy.
4. Progress is broadcast to subscribers so the lobby banner can show completion status.
5. Once all assets succeed, a localStorage flag (`hs-preload-status = history-surfers-preload-v1::ready`) is written. Subsequent visits skip the warm-up unless the version changes.

### Banner UX

- Created on demand, fades in/out whenever asset preloading runs.
- Even when the cache is already primed, it briefly shows a success state so the player knows resources are ready.
- Display timings are controlled in `scripts/preload-banner.js` (`BANNER_DONE_VISIBILITY_MS` currently 1500 ms).

---

## 3. Service Worker (SW) Cache-First Strategy

File: `sw.js`

### Lifecycle

- **Install**: precaches every URL in `PRECACHE_URLS`.
- **Activate**: removes old caches (anything whose key differs from `CACHE_NAME`) and takes control of existing clients.

### Fetch handling

- For same-origin `GET` requests, respond from Cache Storage first.
- If not cached, fetch from the network, stream the response back, and cache a clone for future requests.
- If the network fetch fails (e.g., server down), attempt to fall back to whatever cache entry exists.

This makes the game resilient when the server becomes unreachable, as long as the assets were precached at least once.

---

## 4. Page Registration

- `index.html`, `singleplayer.html`, and `multiplayer-spa.html` register the service worker on `window.load`.
- The same pages also trigger the preloader (banner UI + warm-up). The two systems coexist: SW guarantees offline availability; preloader still accelerates cold loads and keeps the user informed.

---

## 5. Versioning & Refresh Strategy

- To invalidate old caches, update `CACHE_NAME` (and optionally `STORAGE_READY_VALUE`) in both `sw.js` and `scripts/preload-assets.js`.
- After a deployment with new assets, browsers will:
  1. Install a new SW → precache fresh assets.
  2. Purge old caches during `activate`.
  3. Continue to serve cached copies when offline.

If preloader manifest changes but cache name stays the same, the SW will not pick up new files. Therefore, always bump the version when the manifest list changes.

---

## 6. Testing Checklist

1. **Initial Load**
   - Open the site with the browser devtools console.
   - Confirm the service worker appears under *Application → Service Workers*.
   - Ensure the lobby banner finishes with “Tài nguyên đã sẵn sàng!”.
2. **Offline Simulation**
   - Reload once (to ensure precache complete), then shut down the dev server or switch DevTools to “Offline.”
   - Reload again; assets should load from cache, gameplay should not crash, and console should show cache hits rather than 5xx errors.
3. **Version Bump**
   - Change `CACHE_NAME`, reload; verify the new SW installs, old cache is purged, and assets are precached again.

---

## 7. Extending the System

- **Additional Assets**: add to `scripts/asset-manifest.js`. Remember to bump cache version.
- **Runtime Data**: if you need API responses cached, adapt the `fetch` handler to include those endpoints with an appropriate strategy (e.g., network-first with stale fallback).
- **User Messaging**: you can listen for SW update events in the client and prompt players to reload when a new version becomes available.

This architecture balances quick-loading lobby UX with true offline resilience, while keeping cache versioning explicit and maintainable.
