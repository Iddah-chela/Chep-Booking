const CACHE_NAME = 'patakeja-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icons/icon-192-2.png',
  '/manifest.json',
];

// Install — cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
//   API calls        → browser handles (no SW interference)
//   HTML navigations → network-first, no caching, fallback to /index.html shell
//   Static assets    → cache-first with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests entirely
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // API calls — let the browser handle these directly, no SW involvement
  if (url.pathname.startsWith('/api')) return;

  // HTML navigations — always go to network so Vite/server can return fresh index.html.
  // Never cache these: every path is just an alias for index.html and Vite rewrites
  // script hashes on each restart, so a cached nav response causes blank pages on reload.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html').then((cached) => cached || caches.match('/'))
      )
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts) — cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

// ── Push Notifications ─────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    // Support custom actions passed in payload (e.g. nudge yes/no)
    const defaultActions = [{ action: 'open', title: 'Open' }, { action: 'dismiss', title: 'Dismiss' }];
    const options = {
      body: data.body || '',
      icon: data.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || undefined,
      data: { url: data.url || '/', actionUrls: data.actionUrls || {} },
      vibrate: [100, 50, 100],
      actions: data.actions || defaultActions
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'PataKeja', options)
    );
  } catch (e) {
    // Fallback for plain text push
    event.waitUntil(
      self.registration.showNotification('PataKeja', {
        body: event.data.text(),
        icon: '/icons/icon-192.png'
      })
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') { event.notification.close(); return; }

  // If the action has a specific URL mapped (e.g. nudge yes/no), use it
  const actionUrls = event.notification.data?.actionUrls || {};
  const url = actionUrls[event.action] || event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a tab with the app is already open, focus it and navigate
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open a new tab
      return clients.openWindow(url);
    })
  );
});
