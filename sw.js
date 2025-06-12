self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('trike-timer-cache').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/sw.js',
        'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg'
      ]);
    })
  );
});
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});