const APP_SHELL_CACHE = 'app-shell-v1';
const AUDIO_CACHE = 'audio-cache';

const appShellFiles = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json'
];

// Tahap Install: Simpan "kerangka" aplikasi ke cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(APP_SHELL_CACHE)
            .then(cache => cache.addAll(appShellFiles))
    );
});

// Tahap Fetch: Intersep semua permintaan jaringan
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Jika ini adalah permintaan untuk audio dari Google Drive
    if (url.hostname.includes('google.com')) {
        event.respondWith(
            caches.open(AUDIO_CACHE).then(cache => {
                return cache.match(event.request).then(response => {
                    // Jika ada di cache, berikan dari cache (offline)
                    if (response) {
                        return response;
                    }
                    // Jika tidak, ambil dari jaringan (online), dan jangan simpan
                    return fetch(event.request);
                });
            })
        );
    } else {
        // Untuk file lain (HTML, CSS, JS), coba cache dulu baru jaringan
        event.respondWith(
            caches.match(event.request)
                .then(response => response || fetch(event.request))
        );
    }
});