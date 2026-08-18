const CACHE_PREFIX = 'huajian-link-game';
const CACHE_NAME = `${CACHE_PREFIX}-v5`;
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './assets/mengchong-sprites-v1.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './src/board-movement.js',
  './src/board.js',
  './src/constants.js',
  './src/engine.js',
  './src/levels.js',
  './src/main.js',
  './src/pathfinding.js',
  './src/pwa.js',
  './src/progress.js',
  './src/tile-layout.js'
];

function scopeUrl(path) {
  return new URL(path, self.registration.scope).href;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL.map(scopeUrl)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request))
      || (await cache.match(scopeUrl('./index.html')))
      || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  const isAppAsset = url.origin === scope.origin && url.pathname.startsWith(scope.pathname);
  const isFontAsset = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
  } else if (isAppAsset || isFontAsset) {
    event.respondWith(cacheFirst(request));
  }
});
