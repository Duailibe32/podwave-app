/* Service Worker com suporte completo a Web Push API, Alertas de Status de Pedido ('Pedido a caminho', 'Entregue', etc.) e Cliques de Notificação */

const STATUS_DEFAULT_COPY = {
  recebido: {
    title: '🌊 Pedido Recebido • PodWave',
    body: 'Recebemos seu pedido! Em instantes nossa equipe vai confirmar e iniciar a separação.',
  },
  confirmado: {
    title: '✅ Pedido Confirmado • PodWave',
    body: 'Seu pedido foi confirmado e reservado no estoque. Preparação iniciada!',
  },
  em_separacao: {
    title: '📦 Pedido em Separação • PodWave',
    body: 'Nossa equipe já está conferindo e embalando seus produtos com agilidade.',
  },
  enviado: {
    title: '🛵 Pedido a caminho! • PodWave',
    body: 'Prepare-se! Seu pedido saiu para entrega expressa (10 a 20 min) e já está a caminho.',
  },
  entregue: {
    title: '🎉 Pedido Entregue! • PodWave',
    body: 'Entrega confirmada com sucesso! Aproveite sua sessão PodWave.',
  },
  cancelado: {
    title: '⚠️ Atualização no Pedido • PodWave',
    body: 'O status do seu pedido foi alterado para cancelado. Toque para conferir os detalhes.',
  },
};

function buildOrderNotificationOptions(payload = {}) {
  const statusKey = payload.status && STATUS_DEFAULT_COPY[payload.status] ? payload.status : null;
  const fallback = statusKey ? STATUS_DEFAULT_COPY[statusKey] : null;
  const refText = payload.referenceId ? ` (#${String(payload.referenceId).replace(/^#/, '')})` : '';

  const title =
    payload.title ||
    (fallback ? `${fallback.title.replace(' • PodWave', '')}${refText} • PodWave` : 'PodWave — Atualização de Pedido');

  const body =
    payload.body ||
    (fallback ? fallback.body : 'O status do seu pedido mudou. Toque para acompanhar em tempo real.');

  const isUrgentStatus = statusKey === 'enviado' || statusKey === 'entregue';

  return {
    title,
    options: {
      body,
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/apple-touch-icon.png',
      tag: payload.tag || (payload.orderId ? `podwave-order-${payload.orderId}-${statusKey || 'update'}` : 'podwave-webpush-notification'),
      renotify: false,
      data: {
        url: payload.url || '/?orders=1',
        type: payload.type || 'podwave-order',
        orderId: payload.orderId || null,
        referenceId: payload.referenceId || null,
        status: statusKey,
        ownerId: payload.ownerId || null,
        timestamp: Date.now(),
        ...(payload.data || {}),
      },
      vibrate: payload.vibrate || (isUrgentStatus ? [250, 100, 250, 100, 300] : [200, 100, 200]),
      requireInteraction:
        typeof payload.requireInteraction === 'boolean' ? payload.requireInteraction : isUrgentStatus,
      actions: payload.actions || [
        { action: 'open-orders', title: 'Acompanhar Pedido' },
      ],
    },
  };
}

// 1. Escuta por mensagens Web Push remotas (PushManager / Servidor Web Push)
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { title: 'PodWave Notificação', body: event.data.text() };
    }
  }

  const { title, options } = buildOrderNotificationOptions(payload);
  event.waitUntil((async () => {
    const show = async () => {
      if ((await self.registration.getNotifications({ tag: options.tag })).length) return;
      await self.registration.showNotification(title, options);
    };
    if (self.navigator.locks) await self.navigator.locks.request(options.tag, show);
    else await show();
  })());
});

// 3. Gerenciamento do clique na notificação: foca na janela existente ou abre nova guia em Meus Pedidos
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const isOrderNotif =
    notifData.type === 'podwave-order' || event.action === 'open-orders';

  let targetUrl = isOrderNotif ? '/?orders=1' : '/';
  if (!isOrderNotif && notifData.url) {
    try {
      const candidate = new URL(notifData.url, self.location.origin);
      if (candidate.origin === self.location.origin) targetUrl = candidate.href;
    } catch {
      /* Use local homepage for invalid notification URLs */
    }
  }

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Procura uma janela já aberta com a mesma origem
      for (const client of windows) {
        const url = new URL(client.url);
        if (url.origin === self.location.origin) {
          await client.focus();
          if (isOrderNotif) {
            client.postMessage({
              type: 'podwave:open-orders',
              orderId: notifData.orderId || null,
              status: notifData.status || null,
            });
          } else if (targetUrl) {
            const resolvedTarget = new URL(targetUrl, self.location.origin).href;
            if (client.url !== resolvedTarget) {
              await client.navigate(resolvedTarget);
            }
          }
          return;
        }
      }

      // Se nenhuma janela aberta, abre uma nova
      const destination = new URL(targetUrl, self.location.origin).href;
      await self.clients.openWindow(destination);
    })()
  );
});
