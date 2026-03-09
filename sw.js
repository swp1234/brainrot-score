const CACHE_NAME = 'brainrot-score-v1';
const ASSETS = [
  '/brainrot-score/',
  '/brainrot-score/index.html',
  '/brainrot-score/css/style.css',
  '/brainrot-score/js/app.js',
  '/brainrot-score/js/i18n.js',
  '/brainrot-score/js/locales/ko.json',
  '/brainrot-score/js/locales/en.json',
  '/brainrot-score/js/locales/ja.json',
  '/brainrot-score/js/locales/zh.json',
  '/brainrot-score/js/locales/hi.json',
  '/brainrot-score/js/locales/ru.json',
  '/brainrot-score/js/locales/es.json',
  '/brainrot-score/js/locales/pt.json',
  '/brainrot-score/js/locales/id.json',
  '/brainrot-score/js/locales/tr.json',
  '/brainrot-score/js/locales/de.json',
  '/brainrot-score/js/locales/fr.json',
  '/brainrot-score/manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetched = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
