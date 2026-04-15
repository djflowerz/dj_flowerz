// public/sw.js
const CACHE_NAME = 'dj-flowerz-v1';

// 1. Install & Cache (Optional - focus on Push for now)
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// 2. Handle Push Notifications
self.addEventListener('push', event => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'New update from DJ Flowerz Marketplace',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/badge-96x96.png',
      image: data.image || null,
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      },
      actions: data.actions || [],
      tag: data.tag || 'marketplace-alert',
      renotify: true
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'DJ Flowerz', options)
    );
  } catch (e) {
    console.error('Push handle error:', e);
  }
});

// 3. Handle Notification Click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const targetUrl = event.notification.data.url;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If a window is already open at the target URL, focus it
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
