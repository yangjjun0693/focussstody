const CACHE = 'focussstody-v1';
const ASSETS = [
    './',
    './index.html',
    './store.html',
    './stats.html',
    './css/style.css',
    './js/app.js',
    './js/timer.js',
    './js/pro.js',
    './js/store.js',
    './js/pomodoro.js',
    './manifest.json',
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
    );
});