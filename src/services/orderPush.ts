import type { SupabaseClient } from '@supabase/supabase-js';

const OWNER_KEY = 'podwave_order_push_owner';
const lockDevice = <T,>(action: () => Promise<T>) =>
  navigator.locks ? navigator.locks.request(OWNER_KEY, action) : action();

export function orderPushOwner() {
  try { return localStorage.getItem(OWNER_KEY); } catch { return null; }
}

export async function removeOrderPush(client?: SupabaseClient | null, ownerId?: string) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  await lockDevice(async () => {
    if (ownerId && orderPushOwner() && orderPushOwner() !== ownerId) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager?.getSubscription();
      if (sub) {
        const removed = await sub.unsubscribe();
        if (client) await client.rpc('podwave_remove_order_push', { p_endpoint: sub.endpoint })
          .abortSignal(AbortSignal.timeout(3000));
        if (!removed && !client) return;
      }
      const notices = await reg?.getNotifications() || [];
      notices.filter(notice => notice.data?.type === 'podwave-order').forEach(notice => notice.close());
      localStorage.removeItem(OWNER_KEY);
    } catch {
      // Expired subscriptions are also removed by the server.
    }
  });
}

export async function registerOrderPush(client: SupabaseClient, ownerId: string, stillActive: () => boolean, orderIds?: string[]) {
  const key = import.meta.env.VITE_ORDER_PUSH_PUBLIC_KEY?.trim();
  if (!key || !('serviceWorker' in navigator)) return false;
  return lockDevice(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg?.active || !reg.pushManager || !stillActive()) return false;
      const publicKey = Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
      let sub = await reg.pushManager.getSubscription();
      const currentKey = sub?.options.applicationServerKey;
      if (sub && (orderPushOwner() !== ownerId || !currentKey
        || publicKey.toString() !== new Uint8Array(currentKey).toString())) {
        await sub.unsubscribe();
        sub = null;
      }
      if (!stillActive()) return false;
      sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey });
      if (!stillActive()) { await sub.unsubscribe(); return false; }
      localStorage.setItem(OWNER_KEY, ownerId);
      const keys = sub.toJSON().keys || {};
      const device = { p_endpoint: sub.endpoint, p_p256dh: keys.p256dh, p_auth: keys.auth };
      let { data, error } = await client.rpc('podwave_register_order_push_scope', {
        ...device, p_order_ids: orderIds ?? null,
      }).abortSignal(AbortSignal.timeout(5000));
      if (!orderIds && (error?.code === 'PGRST202' || error?.code === '42883')) {
        ({ data, error } = await client.rpc('podwave_register_order_push', device)
          .abortSignal(AbortSignal.timeout(5000)));
      }
      if (!stillActive()) { await sub.unsubscribe(); return false; }
      return !error && data === true;
    } catch {
      return false;
    }
  });
}
