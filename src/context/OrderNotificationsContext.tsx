import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Bell, BellOff, BellRing, CheckCircle2, Send, Truck } from 'lucide-react';
import { useCatalog } from './CatalogContext';
import { useToast } from './ToastContext';
import { getSupabaseClient } from '../services/supabase';
import { orderPushOwner, registerOrderPush, removeOrderPush } from '../services/orderPush';
import { CatalogOrderStatus } from '../types/catalog';

const LAST_NOTIFIED_STATUS_KEY = 'podwave_order_last_notified_status_v1';
export const ORDER_STATUS_PUSH_CHANNEL = 'podwave_order_status_push';
export const ORDER_STATUS_CHANGED_EVENT = 'podwave:order-status-changed';

export interface OrderStatusPushEventPayload {
  orderId: string;
  referenceId?: string;
  customerId?: string;
  fromStatus?: CatalogOrderStatus;
  toStatus: CatalogOrderStatus;
  deliveryType?: 'delivery' | 'pickup';
}

const preferenceKey = (id: string) => 'podwave_order_notifications:' + id;

const isNotificationSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window;

const getCurrentPermission = (): NotificationPermission | 'unsupported' =>
  isNotificationSupported() ? Notification.permission : 'unsupported';

export function buildOrderPushNotificationCopy(
  status: CatalogOrderStatus | string,
  referenceId?: string,
  deliveryType?: 'delivery' | 'pickup'
): { title: string; body: string; urgent: boolean } {
  const cleanRef = referenceId ? `#${String(referenceId).replace(/^#/, '')}` : '';
  const refBadge = cleanRef ? ` (${cleanRef})` : '';

  switch (status) {
    case 'recebido':
      return {
        title: `🌊 Pedido Recebido!${refBadge}`,
        body: 'Recebemos seu pedido na PodWave! Em instantes vamos confirmar e separar seus produtos.',
        urgent: false,
      };
    case 'confirmado':
      return {
        title: `✅ Pedido Confirmado!${refBadge}`,
        body: 'Seu pedido foi aceito e reservado no estoque. Já vai entrar em separação!',
        urgent: false,
      };
    case 'em_separacao':
      return {
        title: `📦 Pedido em Separação!${refBadge}`,
        body: 'Nossa equipe já está conferindo e embalando seus produtos com agilidade.',
        urgent: false,
      };
    case 'enviado':
      if (deliveryType === 'pickup') {
        return {
          title: `🏪 Pronto para Retirada!${refBadge}`,
          body: 'Seu pedido já está separado e pronto para retirada imediata no ponto combinado!',
          urgent: true,
        };
      }
      return {
        title: `🛵 Pedido a caminho!${refBadge}`,
        body: 'Prepare-se! Seu pedido saiu para entrega expressa (10 a 20 min) e já está a caminho.',
        urgent: true,
      };
    case 'entregue':
      return {
        title: `🎉 Pedido Entregue!${refBadge}`,
        body: 'Entrega confirmada com sucesso! Aproveite sua sessão PodWave.',
        urgent: true,
      };
    case 'cancelado':
      return {
        title: `⚠️ Pedido Cancelado${refBadge}`,
        body: 'O status do seu pedido foi alterado para cancelado. Toque para conferir os detalhes.',
        urgent: false,
      };
    default:
      return {
        title: `🔔 Atualização do Pedido${refBadge}`,
        body: 'O status do seu pedido mudou. Toque para acompanhar em tempo real.',
        urgent: false,
      };
  }
}

function readStoredNotifiedMap(userId: string): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(LAST_NOTIFIED_STATUS_KEY + ':' + userId);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStoredNotifiedMap(userId: string, map: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(LAST_NOTIFIED_STATUS_KEY + ':' + userId, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
}

interface OrderNotificationsContextValue {
  enabled: boolean;
  busy: boolean;
  permission: NotificationPermission | 'unsupported';
  message: string;
  hasPushSubscription: boolean;
  activate: (orderId?: string) => Promise<void>;
  isEnabledForOrder: (orderId: string) => boolean;
  deactivate: () => void;
  sendTestOrderNotification: (sampleStatus?: CatalogOrderStatus) => Promise<void>;
}

const Context = createContext<OrderNotificationsContextValue>({
  enabled: false,
  busy: false,
  permission: getCurrentPermission(),
  message: '',
  hasPushSubscription: false,
  activate: async () => {},
  isEnabledForOrder: () => false,
  deactivate: () => {},
  sendTestOrderNotification: async () => {},
});

export function useOrderNotifications() {
  return useContext(Context);
}

export function OrderNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, allCatalogOrders, supabaseClient, openProfileModal } = useCatalog();
  const { info: notifyInfo, success: notifySuccess } = useToast();
  const userId = currentUser?.id;

  const [enabledUser, setEnabledUser] = useState<string | undefined>();
  const enabled = Boolean(userId && enabledUser === userId);
  const activeUserRef = useRef(userId);
  activeUserRef.current = userId;
  const [busy, setBusy] = useState(false);
  const [permissionState, setPermission] = useState<NotificationPermission | 'unsupported'>(
    getCurrentPermission
  );
  const [message, setMessage] = useState('');
  const [hasPushSubscription, setHasPushSubscription] = useState(false);
  const [scope, setScope] = useState<{ userId: string; ids: string[] }>();
  const orderIds = scope?.userId === userId ? scope?.ids : undefined;
  const isEnabledForOrder = useCallback(
    (orderId: string) => enabled && (!orderIds || orderIds.includes(orderId)),
    [enabled, orderIds]
  );

  const knownStatusesRef = useRef<Map<string, string>>(new Map());
  const initializedRef = useRef(false);

  useEffect(() => {
    knownStatusesRef.current.clear();
    initializedRef.current = false;
    setHasPushSubscription(false);
    try {
      const preference = userId ? localStorage.getItem(preferenceKey(userId)) : null;
      const stored = preference && preference !== 'on' ? JSON.parse(preference) : null;
      const ids = Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string' && id.length > 0).slice(-50) : [];
      setScope(userId && ids.length ? { userId, ids } : undefined);
      setEnabledUser((preference === 'on' || ids.length > 0) && getCurrentPermission() === 'granted' ? userId : undefined);
    } catch {
      setScope(undefined);
      setEnabledUser(undefined);
    }
    setMessage('');
  }, [userId]);

  // Atualiza estado de permissão quando a janela ganha foco
  useEffect(() => {
    const update = () => {
      const perm = getCurrentPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setEnabledUser(undefined);
      }
    };
    window.addEventListener('focus', update);
    return () => window.removeEventListener('focus', update);
  }, []);

  useEffect(() => {
    const owner = orderPushOwner();
    if (owner && owner !== userId) void removeOrderPush(undefined, owner);
  }, [userId]);

  useEffect(() => {
    if (!userId || !enabled || permissionState !== 'granted') return;
    const client = supabaseClient || getSupabaseClient();
    if (!client || !('serviceWorker' in navigator)) return;
    let active = true;
    let registering = false;
    const connect = async () => {
      if (registering) return;
      registering = true;
      try {
        const registered = await registerOrderPush(client, userId, () => active && activeUserRef.current === userId, orderIds);
        if (active) setHasPushSubscription(registered);
      } finally {
        registering = false;
      }
    };
    void connect();
    navigator.serviceWorker.addEventListener('controllerchange', connect);
    return () => {
      active = false;
      navigator.serviceWorker.removeEventListener('controllerchange', connect);
    };
  }, [enabled, userId, permissionState, supabaseClient, orderIds]);

  // Dispara a notificação nativa via Service Worker (Push API) ou Notification API fallback
  const dispatchBrowserOrderNotification = useCallback(
    async (params: {
      orderId: string;
      referenceId?: string;
      status: CatalogOrderStatus | string;
      deliveryType?: 'delivery' | 'pickup';
      isTest?: boolean;
    }) => {
      if (!userId || !isNotificationSupported() || Notification.permission !== 'granted') return false;

      const copy = buildOrderPushNotificationCopy(
        params.status,
        params.referenceId,
        params.deliveryType
      );
      const tag = params.isTest
        ? `podwave-order-test-${params.status}-${Date.now()}`
        : `podwave-order-${params.orderId}-${params.status}`;

      const payload = {
        title: copy.title,
        body: copy.body,
        icon: '/pwa-192x192.png',
        badge: '/apple-touch-icon.png',
        tag,
        orderId: params.orderId,
        referenceId: params.referenceId,
        status: params.status,
        ownerId: userId,
        url: '/?orders=1',
        vibrate: copy.urgent ? [250, 100, 250, 100, 300] : [200, 100, 200],
        requireInteraction: copy.urgent,
      };

      const display = async () => {
        try {
          const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
          if (activeUserRef.current !== userId) return false;
          if (reg?.active && 'showNotification' in reg) {
            if (!params.isTest && (await reg.getNotifications({ tag })).length) return true;
            if (activeUserRef.current !== userId) return false;
            await reg.showNotification(copy.title, {
              body: copy.body,
              icon: payload.icon,
              badge: payload.badge,
              tag: payload.tag,
              data: {
                type: 'podwave-order',
                ownerId: payload.ownerId,
                orderId: params.orderId,
                referenceId: params.referenceId,
                status: params.status,
                url: '/?orders=1',
              },
              vibrate: payload.vibrate,
              requireInteraction: payload.requireInteraction,
              actions: [{ action: 'open-orders', title: 'Acompanhar Pedido' }],
            } as NotificationOptions);

            return true;
          }

          // Fallback direto para API Notification do navegador
          const directNotif = new Notification(copy.title, {
            body: copy.body,
            icon: payload.icon,
            badge: payload.badge,
            tag: payload.tag,
          });
          directNotif.onclick = () => {
            window.focus();
            openProfileModal('orders');
            directNotif.close();
          };
          return true;
        } catch {
          return false;
        }
      };
      return !params.isTest && navigator.locks
        ? navigator.locks.request(tag, display)
        : display();
    },
    [userId, openProfileModal]
  );

  // Ativar notificações Push do navegador
  const activate = async (orderId?: string) => {
    if (busy || !userId) return;
    if (!isNotificationSupported()) {
      setMessage(
        'Este navegador não suporta notificações Web Push. No iPhone/iPad, adicione o app à Tela de Início primeiro.'
      );
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        setMessage(
          'Permissão não concedida. Desbloqueie o ícone de sino/cadeado na barra de endereço do navegador.'
        );
        return;
      }

      if (activeUserRef.current !== userId) return;

      const selected = orderId && (!enabled || orderIds)
        ? Array.from(new Set([...(orderIds || []), orderId])).slice(-50)
        : undefined;
      setScope(selected ? { userId, ids: selected } : undefined);
      setHasPushSubscription(false);
      try {
        localStorage.setItem(preferenceKey(userId), selected ? JSON.stringify(selected) : 'on');
      } catch {
        // Alerts can still work in the current tab.
      }

      setEnabledUser(userId);
      setMessage('Alertas ativados enquanto a loja estiver aberta.');
      notifySuccess('Alertas de pedido ativados neste navegador.');

    } catch {
      setMessage('Não foi possível ativar os alertas neste navegador.');
    } finally {
      setBusy(false);
    }
  };

  const deactivate = () => {
    try {
      if (userId) localStorage.removeItem(preferenceKey(userId));
    } catch {
      // ignore
    }
    setEnabledUser(undefined);
    setScope(undefined);
    setHasPushSubscription(false);
    void removeOrderPush(supabaseClient || getSupabaseClient(), userId);
    setMessage('Alertas de pedido desativados neste dispositivo.');
    notifyInfo('Alertas Push de status do pedido foram desativados.');
  };

  const sendTestOrderNotification = async (sampleStatus: CatalogOrderStatus = 'enviado') => {
    if (!isNotificationSupported()) {
      setMessage('Notificações não suportadas neste navegador.');
      return;
    }
    if (getCurrentPermission() !== 'granted') {
      await activate();
      if (getCurrentPermission() !== 'granted') return;
    }
    const ok = await dispatchBrowserOrderNotification({
      orderId: 'test-order',
      referenceId: 'PW-2026',
      status: sampleStatus,
      deliveryType: 'delivery',
      isTest: true,
    });
    const copy = buildOrderPushNotificationCopy(sampleStatus, 'PW-2026', 'delivery');
    if (ok) {
      setMessage(`Alerta enviado: "${copy.title}"`);
      notifyInfo(`${copy.title} — ${copy.body}`);
    } else {
      setMessage('Não foi possível exibir a notificação de teste.');
    }
  };

  // Observa mudanças de status nos pedidos locais/compartilhados (allCatalogOrders e currentUser.orderHistory)
  useEffect(() => {
    if (!userId || !enabled || permissionState !== 'granted') return;

    const storedMap = readStoredNotifiedMap(userId);
    const relevantOrders = [
      ...(currentUser?.orderHistory || []),
      ...(allCatalogOrders || []),
    ].filter(order => order.customerId === userId && isEnabledForOrder(order.id));

    const seenIds = new Set<string>();
    for (const order of relevantOrders) {
      if (!order?.id || !order?.status || seenIds.has(order.id)) continue;
      seenIds.add(order.id);

      const prevStatus = knownStatusesRef.current.get(order.id) || storedMap[order.id];
      knownStatusesRef.current.set(order.id, order.status);

      if (initializedRef.current && prevStatus && prevStatus !== order.status) {
        storedMap[order.id] = order.status;
        writeStoredNotifiedMap(userId, storedMap);

        const copy = buildOrderPushNotificationCopy(
          order.status,
          order.referenceId,
          order.deliveryType
        );
        notifyInfo(`${copy.title}: ${copy.body}`);
        void dispatchBrowserOrderNotification({
          orderId: order.id,
          referenceId: order.referenceId,
          status: order.status,
          deliveryType: order.deliveryType,
        });
      } else if (!storedMap[order.id]) {
        storedMap[order.id] = order.status;
      }
    }

    writeStoredNotifiedMap(userId, storedMap);
    initializedRef.current = true;
  }, [
    allCatalogOrders,
    currentUser?.orderHistory,
    userId,
    enabled,
    permissionState,
    dispatchBrowserOrderNotification,
    notifyInfo,
    isEnabledForOrder,
  ]);

  // Escuta eventos instantâneos (BroadcastChannel entre abas e CustomEvent na mesma janela)
  useEffect(() => {
    if (!userId || !enabled || permissionState !== 'granted') return;

    const handleStatusEvent = (payload?: OrderStatusPushEventPayload) => {
      if (!payload?.orderId || !payload?.toStatus || !isEnabledForOrder(payload.orderId)) return;
      if (activeUserRef.current !== userId || payload.customerId !== userId) return;

      const storedMap = readStoredNotifiedMap(userId);
      if (storedMap[payload.orderId] === payload.toStatus) return;

      storedMap[payload.orderId] = payload.toStatus;
      knownStatusesRef.current.set(payload.orderId, payload.toStatus);
      writeStoredNotifiedMap(userId, storedMap);

      const copy = buildOrderPushNotificationCopy(
        payload.toStatus,
        payload.referenceId,
        payload.deliveryType
      );
      notifyInfo(`${copy.title}: ${copy.body}`);
      void dispatchBrowserOrderNotification({
        orderId: payload.orderId,
        referenceId: payload.referenceId,
        status: payload.toStatus,
        deliveryType: payload.deliveryType,
      });
    };

    const onCustomEvent = (e: Event) => {
      const custom = e as CustomEvent<OrderStatusPushEventPayload>;
      handleStatusEvent(custom.detail);
    };

    window.addEventListener(ORDER_STATUS_CHANGED_EVENT, onCustomEvent);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel(ORDER_STATUS_PUSH_CHANNEL);
        bc.onmessage = (ev) => {
          handleStatusEvent(ev.data as OrderStatusPushEventPayload);
        };
      } catch {
        bc = null;
      }
    }

    return () => {
      window.removeEventListener(ORDER_STATUS_CHANGED_EVENT, onCustomEvent);
      if (bc) bc.close();
    };
  }, [enabled, permissionState, userId, dispatchBrowserOrderNotification, notifyInfo, isEnabledForOrder]);

  // Escuta Supabase Realtime + Polling em segundo plano para pedidos do cliente autenticado
  useEffect(() => {
    if (!userId || !enabled || permissionState !== 'granted' || !isNotificationSupported()) return;
    const client = supabaseClient || getSupabaseClient();
    if (!client) return;

    let alive = true;
    let loading = false;
    let supabaseInitialized = false;

    const observeSupabaseRow = async (row: {
      id?: unknown;
      status?: unknown;
      customer_id?: unknown;
      order_code?: unknown;
      delivery_info?: unknown;
    }) => {
      if (
        !alive || activeUserRef.current !== userId ||
        typeof row.id !== 'string' ||
        typeof row.status !== 'string' ||
        row.customer_id !== userId || !isEnabledForOrder(row.id)
      ) {
        return;
      }

      const storedMap = readStoredNotifiedMap(userId);
      const before = knownStatusesRef.current.get(row.id) || storedMap[row.id];
      knownStatusesRef.current.set(row.id, row.status);
      storedMap[row.id] = row.status;
      writeStoredNotifiedMap(userId, storedMap);

      if (!supabaseInitialized || !before || before === row.status) return;

      const info =
        row.delivery_info && typeof row.delivery_info === 'object'
          ? (row.delivery_info as Record<string, unknown>)
          : {};
      const referenceId =
        typeof row.order_code === 'string'
          ? row.order_code
          : typeof info.referenceId === 'string'
          ? info.referenceId
          : row.id;
      const deliveryType = info.deliveryType === 'pickup' ? 'pickup' : 'delivery';

      const copy = buildOrderPushNotificationCopy(row.status, referenceId, deliveryType);
      notifyInfo(`${copy.title}: ${copy.body}`);
      await dispatchBrowserOrderNotification({
        orderId: row.id,
        referenceId,
        status: row.status,
        deliveryType,
      });
    };

    const refreshFromSupabase = async () => {
      if (!alive || loading) return;
      loading = true;
      try {
        const query = client.from('customer_orders')
          .select('id,status,customer_id,order_code,delivery_info').eq('customer_id', userId);
        const { data, error } = await (orderIds ? query.in('id', orderIds) : query);
        if (error || !alive) return;
        for (const row of data || []) {
          await observeSupabaseRow(row);
        }
        supabaseInitialized = true;
      } catch {
        // silent retry on next interval
      } finally {
        loading = false;
      }
    };

    void refreshFromSupabase();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshFromSupabase();
    };
    const timer = window.setInterval(onVisible, 60000);
    document.addEventListener('visibilitychange', onVisible);

    let channel: ReturnType<typeof client.channel> | undefined;
    if (/^[a-zA-Z0-9_-]+$/.test(userId)) {
      channel = client
        .channel(`order-notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'customer_orders',
            filter: `customer_id=eq.${userId}`,
          },
          (payload) => {
            if (payload?.new) {
              void observeSupabaseRow(payload.new as Record<string, unknown>);
            } else {
              void refreshFromSupabase();
            }
          }
        )
        .subscribe();
    }

    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      if (channel) void client.removeChannel(channel);
    };
  }, [userId, enabled, permissionState, supabaseClient, dispatchBrowserOrderNotification, notifyInfo, isEnabledForOrder, orderIds]);

  // Abre modal de pedidos ao clicar na notificação do Service Worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const openOrders = () => {
      openProfileModal('orders');
    };
    const receive = (event: MessageEvent) => {
      if (event.data?.type === 'podwave:open-orders') openOrders();
    };
    navigator.serviceWorker.addEventListener('message', receive);
    const url = new URL(window.location.href);
    if (url.searchParams.get('orders') === '1') {
      url.searchParams.delete('orders');
      window.history.replaceState(
        window.history.state,
        '',
        url.pathname + url.search + url.hash
      );
      openOrders();
    }
    return () => navigator.serviceWorker.removeEventListener('message', receive);
  }, [openProfileModal]);

  return (
    <Context.Provider
      value={{
        enabled,
        busy,
        permission: permissionState,
        message,
        hasPushSubscription,
        activate,
        isEnabledForOrder,
        deactivate,
        sendTestOrderNotification,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function OrderNotificationSettings({ compact = false }: { compact?: boolean }) {
  const {
    enabled,
    busy,
    permission,
    message,
    hasPushSubscription,
    activate,
    deactivate,
    sendTestOrderNotification,
  } = useContext(Context);

  return (
    <section
      aria-label="Configurações de notificações push do pedido"
      className={`rounded-2xl border transition-all ${
        enabled
          ? 'bg-gradient-to-r from-[#0D152C] via-[#111836] to-[#0D152C] border-[#00DFFF]/40 shadow-[0_0_20px_rgba(0,223,255,0.1)]'
          : 'bg-[#11152A]/85 border-[#8423DA]/30'
      } ${compact ? 'p-3 space-y-2' : 'p-3.5 sm:p-4 space-y-2.5'} text-xs`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
              enabled
                ? 'bg-[#00DFFF]/15 border-[#00DFFF]/50 text-[#00DFFF]'
                : 'bg-white/5 border-white/10 text-gray-400'
            }`}
          >
            {enabled ? (
              <BellRing className="w-4 h-4 animate-pulse" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-heading font-extrabold text-white text-xs">
                Alertas Push do Pedido (Navegador)
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  enabled
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 border-white/15 text-gray-400'
                }`}
              >
                {enabled ? 'Ativo' : 'Desativado'}
              </span>
            </div>
            <p className="text-[11px] text-[#A5A5B8] leading-snug mt-0.5">
              {hasPushSubscription
                ? 'Este aparelho está inscrito para receber avisos de pedidos com a loja fechada.'
                : 'Acompanhe mudanças no pedido enquanto a loja estiver aberta.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {permission === 'unsupported' ? (
            <span className="text-[11px] text-amber-300/90 font-medium px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
              Indisponível neste navegador
            </span>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={enabled ? deactivate : () => void activate()}
              className={`rounded-xl px-3 py-2 text-[11px] font-heading font-extrabold transition cursor-pointer disabled:opacity-40 flex items-center gap-1.5 ${
                enabled
                  ? 'bg-white/5 hover:bg-rose-500/15 border border-white/15 hover:border-rose-400/40 text-gray-300 hover:text-rose-200'
                  : 'bg-gradient-to-r from-[#8423DA] to-[#00DFFF] text-white shadow-md hover:brightness-110'
              }`}
            >
              {busy ? (
                <span>Ativando...</span>
              ) : enabled ? (
                <>
                  <BellOff className="w-3.5 h-3.5" />
                  <span>Desativar</span>
                </>
              ) : (
                <>
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Ativar Alertas Push</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Botões rápidos para testar como o alerta aparece no celular/PC */}
      {enabled && (
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] text-[#A5A5B8] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Simular alerta no seu aparelho:</span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => void sendTestOrderNotification('enviado')}
              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
            >
              <Truck className="w-3 h-3" />
              <span>Testar "Pedido a caminho"</span>
            </button>
            <button
              type="button"
              onClick={() => void sendTestOrderNotification('entregue')}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
            >
              <Send className="w-3 h-3" />
              <span>Testar "Entregue"</span>
            </button>
          </div>
        </div>
      )}

      {message && (
        <p role="status" className="text-[11px] text-[#00DFFF] font-medium pt-0.5">
          {message}
        </p>
      )}
    </section>
  );
}
