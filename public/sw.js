const SERVICE_WORKER_VERSION = '1.0.3';
const CACHE_NAME = `avoska-v${SERVICE_WORKER_VERSION}`;

// При установке — пропускаем ожидание, сразу активируемся
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// При активации — удаляем ВСЕ старые кэши (главное исправление)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => clients.claim())
    );
});

self.addEventListener('push', function (event) {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/logo.png',
            badge: '/logo.png',
            tag: 'new-message',
            renotify: true,
            data: {
                url: data.url
            },
            vibrate: [100, 50, 100],
            actions: [
                {
                    action: 'open',
                    title: 'Открыть'
                }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});
