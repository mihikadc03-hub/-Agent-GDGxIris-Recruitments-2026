self.importScripts('https://cdn.jsdelivr.net/npm/idb@7/build/umd.js');

const dbPromise = idb.openDB('pulseboard-db', 1, {
  upgrade(db) {
    db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true });
  }
});

self.addEventListener('push', async (event) => {
  const data = event.data ? event.data.json() : { title: 'New Notification', body: 'No content' };
  
  const db = await dbPromise;
  await db.add('notifications', {
    ...data,
    read: false,
    timestamp: data.timestamp || Date.now()
  });

  const options = {
    body: data.body,
    icon: '/vite.svg',
    data: { url: data.url }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});
