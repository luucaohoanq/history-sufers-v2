import { PRECACHE_URLS } from './asset-manifest.js';

const CACHE_NAME = 'history-surfers-preload-v1';

self.addEventListener('install', (event) => {
  const precacheRequests = PRECACHE_URLS.map((url) => new Request(`/${url}`, { cache: 'reload' }));

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(precacheRequests))
  );

  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function shouldHandleFetch(request) {
  if (request.method !== 'GET') {
    return false;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return false;
  }

  return true;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!shouldHandleFetch(request)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }

          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request));
    })
  );
});
