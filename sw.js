/* RO World Journey service worker — Phase 9 */
const VERSION = 'ro-wj-v2';
const SHELL = VERSION + '-shell';
const RUNTIME = VERSION + '-runtime';

const PRECACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/shared/ro-ui.css',
  '/shared/ro-tooltip.js',
  '/shared/ro-search.js',
  '/shared/ro-favorites.js',
  '/shared/ro-links.js',
  '/shared/ro-deeplink.js',
  '/shared/ro-pwa.js',
  '/shared/asset_version.js',
  '/shared/client_switcher.js',
  '/shared/sticky_header.js',
  '/shared/share_link.js',
  '/media/fonts/noto-sans-tc.css',
  '/media/images/zhujiemian/icon_zhujiemian_jineng.webp',
  '/media/images/zhujiemian/icon_zhujiemian_chongwuzhuangbei.webp',
  '/media/images/zhujiemian/icon_zhujiemian_jingji.webp',
  '/media/images/zhujiemian/icon_zhujiemian_tujian.webp',
  '/media/images/zhujiemian/icon_zhujiemian_fuben.webp',
  '/media/images/zhujiemian/icon_zhujiemian_miwusenlin.webp',
  '/media/images/zhujiemian/icon_zhujiemian_huodong.webp',
  '/media/images/zhujiemian/icon_zhujiemian_shitu.webp',
  '/sea/skill_planner/',
  '/sea/affix_planner/',
  '/sea/equipment/',
  '/sea/cards/',
  '/sea/monster_album/',
  '/sea/maps/',
  '/sea/events/',
  '/sea/study/',
  '/sea/map-simulator/map_view.css',
  '/sea/map-simulator/map_mobile.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) =>
      cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))).catch(() =>
        // partial precache: add one-by-one
        Promise.all(
          PRECACHE.map((u) =>
            cache.add(new Request(u, { cache: 'reload' })).catch(() => undefined)
          )
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL && k !== RUNTIME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function isJSON(url) {
  return url.pathname.endsWith('.json');
}

function isAsset(url) {
  return (
    url.pathname.startsWith('/shared/') ||
    url.pathname.startsWith('/media/') ||
    url.pathname.startsWith('/sea/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.png')
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigation: network first, fallback cache / offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('/offline.html'))
        )
    );
    return;
  }

  // JSON data: stale-while-revalidate
  if (isJSON(url)) {
    event.respondWith(
      caches.open(RUNTIME).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Static assets: cache-first
  if (isAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, copy));
          }
          return res;
        });
      })
    );
  }
});
