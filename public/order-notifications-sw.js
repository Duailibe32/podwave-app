/* Imported by the existing Workbox worker. No promotional or remote push messages. */
self.addEventListener('notificationclick', event => {
  if (event.notification.data?.type !== 'podwave-order') return;
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows) {
      const url = new URL(client.url);
      if(url.origin === self.location.origin) {
        await client.focus();
        client.postMessage({type:'podwave:open-orders'});
        return;
      }
    }
    await self.clients.openWindow(new URL('/?orders=1',self.location.origin).href);
  })());
});
