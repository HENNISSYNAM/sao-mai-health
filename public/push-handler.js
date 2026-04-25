// Push notification handlers — imported by the Workbox-generated service worker
// Workbox handles install/activate/precaching. This file handles push events only.

self.addEventListener('push', (event) => {
  let data = {
    title: '🏥 Cảnh báo sức khỏe',
    body: 'Có thông tin quan trọng về sức khỏe của bạn',
    icon: '/pwa-192.png',
    badge: '/favicon.ico',
    tag: 'health-alert',
    requireInteraction: true,
    data: {}
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload, data: payload.data || {} };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    requireInteraction: data.requireInteraction !== false,
    vibrate: [200, 100, 200, 100, 200],
    data: data.data,
    actions: [
      { action: 'open', title: 'Xem chi tiết' },
      { action: 'dismiss', title: 'Bỏ qua' }
    ]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

// Background sync — flush offline case intake records when network returns
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-health-data') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({ type: 'SYNC_OFFLINE_QUEUE' });
        }
      })
    );
  }
});
