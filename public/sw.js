const SERVICE_WORKER_VERSION = '1.0.1';

self.addEventListener('push', function (event) {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/logo.png',
            badge: '/logo.png',
            tag: 'new-message', // Group notifications
            renotify: true, // Vibrate on new notification with same tag
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

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});
