/* Service worker: installable app, offline Sell page, phone notifications */
const V = 'ssm-v1';
const SHELL = ['/static/css/app.css', '/static/js/app.js', '/static/js/pos.js', '/static/icons/icon-192.png', '/offline'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/static/')) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const c = res.clone(); caches.open(V).then(x => x.put(req, c)); return res; })));
    return;
  }
  if (url.pathname === '/pos' || url.pathname === '/api/items') {
    e.respondWith(fetch(req).then(res => { if (res.ok) { const c = res.clone(); caches.open(V).then(x => x.put(req, c)); } return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('/offline'))));
    return;
  }
  if (req.mode === 'navigate') e.respondWith(fetch(req).catch(() => caches.match('/offline')));
});
self.addEventListener('push', e => {
  let d = {}; try { d = e.data.json(); } catch (x) { d = {title: 'Smart Shop', body: e.data ? e.data.text() : ''}; }
  e.waitUntil(self.registration.showNotification(d.title || 'Smart Shop', {
    body: d.body || '', icon: '/static/icons/icon-192.png', badge: '/static/icons/badge.png',
    data: {url: d.url || '/dashboard'}, vibrate: [120, 60, 120], tag: d.tag || undefined}));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/dashboard';
  e.waitUntil(clients.matchAll({type: 'window', includeUncontrolled: true}).then(ws => {
    for (const w of ws) if ('focus' in w) { w.navigate(url); return w.focus(); }
    return clients.openWindow(url);
  }));
});
