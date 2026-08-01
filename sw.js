// Service Worker - Metronomo Poliritmico
// Cache dell'app shell per l'utilizzo offline. Incrementa CACHE_NAME ad ogni release
// per invalidare la cache precedente e forzare l'aggiornamento dei file.
const CACHE_NAME = 'metronomo-poliritmico-v5';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
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

// Strategia: cache-first per l'app shell, con fallback di rete e aggiornamento in background.
self.addEventListener('fetch', (event) => {
  // Ignora richieste non GET o schemi non supportati (es. chrome-extension)
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  if (!['http:', 'https:'].includes(url.protocol)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              // Doppio controllo prima di mettere in cache
              if (url.protocol === 'https:' || url.protocol === 'http:') {
                cache.put(event.request, responseClone);
              }
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);
      
      return cachedResponse || networkFetch;
    })
  );
});