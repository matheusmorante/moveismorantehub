const CACHE_NAME = 'morante-cache-v2';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/images/avatar-morante.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Deletando cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Ignorar requisições que não sejam GET (como POST, PUT, DELETE)
  if (event.request.method !== 'GET') {
    return;
  }

  // Para requisições de navegação (HTML), usamos Network-First
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Para outros recursos, usamos Cache-First
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
