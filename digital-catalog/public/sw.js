const CACHE_NAME = 'morante-pwa-v4';
const urlsToCache = [
  '/manifest.json',
  '/images/avatar-morante.png',
  '/images/morante-mark-192.png',
  '/images/morante-mark-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
      .catch(err => {
        console.warn('Falha no pré-cache de assets:', err);
        return self.skipWaiting();
      })
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
  // Ignorar requisições que não sejam GET
  if (event.request.method !== 'GET') {
    return;
  }

  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }

  // NUNCA interceptar chunks, builds e assets internos do Next.js
  if (url.pathname.startsWith('/_next/')) {
    return;
  }

  // NUNCA interceptar APIs ou domínios externos (Supabase, CDN, etc)
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
    return;
  }

  // Para requisições de navegação (HTML), sempre priorizar rede para não prender em builds desatualizados
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return new Response('Sem conexão com a internet', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
    );
    return;
  }

  // Apenas intercepta assets estáticos conhecidos do PWA (ícones, manifest)
  if (urlsToCache.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).catch(() => Response.error());
      })
    );
    return;
  }

  // Qualquer outro recurso do app segue diretamente pela rede do navegador
});
