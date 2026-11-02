/* Service Worker com suporte completo a Web Push API, Pedidos e Cliques de Notificação */

// 1. Escuta por mensagens Web Push remotas (PushManager / Servidor Web Push)
self.addEventListener('push', event => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { title: 'PodWave Notificação', body: event.data.text() };
    }
  }

  const title = payload.title || 'PodWave — Catálogo Oficial';
  const options = {
    body: payload.body || 'Nova notificação e novidades em pods descartáveis.',
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/apple-touch-icon.png',
    tag: payload.tag || 'podwave-webpush-notification',
    data: {
      url: payload.url || '/',
      type: payload.type || 'podwave-webpush',
      timestamp: Date.now(),
      ...payload.data,
    },
    vibrate: payload.vibrate || [200, 100, 200],
    requireInteraction: payload.requireInteraction || false,
    actions: payload.actions || [
      { action: 'open', title: 'Abrir Catálogo' }
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 2. Escuta mensagens internas via postMessage da aplicação (para testes imediatos pelo Admin)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_TEST_NOTIFICATION') {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title || 'PodWave — Teste Push', {
        icon: '/pwa-192x192.png',
        badge: '/apple-touch-icon.png',
        vibrate: [200, 100, 200],
        ...options,
        data: {
          url: options?.data?.url || '/',
          type: options?.data?.type || 'podwave-admin-test',
          ...options?.data,
        },
      })
    );
  }
});

// 3. Gerenciamento do clique na notificação: foca na janela existente ou abre nova guia
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const isOrderNotif = notifData.type === 'podwave-order';
  const targetUrl = notifData.url || (isOrderNotif ? '/?orders=1' : '/');

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    
    // Procura uma janela já aberta com a mesma origem
    for (const client of windows) {
      const url = new URL(client.url);
      if (url.origin === self.location.origin) {
        await client.focus();
        if (isOrderNotif) {
          client.postMessage({ type: 'podwave:open-orders' });
        } else if (targetUrl) {
          const resolvedTarget = new URL(targetUrl, self.location.origin).href;
          if (client.url !== resolvedTarget) {
            client.navigate(resolvedTarget);
          }
        }
        return;
      }
    }

    // Se nenhuma janela aberta, abre uma nova
    const destination = new URL(targetUrl, self.location.origin).href;
    await self.clients.openWindow(destination);
  })());
});
