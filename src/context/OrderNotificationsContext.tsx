import React, { createContext, useContext, useEffect, useState } from 'react';
import { useCatalog } from './CatalogContext';
import { getSupabaseClient } from '../services/supabase';

const preferenceKey = (id: string) => `podwave_order_notifications:${id}`;
const supported = () => typeof window !== 'undefined' && window.isSecureContext && 'Notification' in window && 'serviceWorker' in navigator;
const permission = () => supported() ? Notification.permission : 'unsupported';
const Context = createContext({ enabled:false, busy:false, permission:permission(), message:'', activate:async () => {}, deactivate:() => {} });

export function OrderNotificationsProvider({children}: {children: React.ReactNode}) {
  const { currentUser, supabaseClient, openProfileModal } = useCatalog();
  const userId = currentUser?.id;
  const [preference,setPreference] = useState<{userId?: string;enabled: boolean}>({enabled:false});
  const enabled = Boolean(userId && preference.userId === userId && preference.enabled);
  const [busy,setBusy] = useState(false);
  const [permissionState,setPermission] = useState(permission);
  const [message,setMessage] = useState('');
  useEffect(() => {
    try { setPreference({userId,enabled:Boolean(userId && localStorage.getItem(preferenceKey(userId)) === 'on')}); }
    catch { setPreference({userId,enabled:false}); }
    setMessage('');
  },[userId]);
  useEffect(() => {
    const update = () => setPermission(permission());
    window.addEventListener('focus',update);
    return () => window.removeEventListener('focus',update);
  },[]);

  const activate = async () => {
    if (!userId || busy) return;
    if (!supported()) {setMessage('Este navegador não oferece notificações aqui. Abra o site publicado por HTTPS; em alguns celulares, instale o PWA primeiro.');return;}
    setBusy(true); setMessage('');
    try {
      // Permission is requested only from the user's explicit button click.
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {setMessage('Permissão não concedida. Você pode ajustar as notificações nas configurações do navegador.');return;}
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration?.active) {setMessage('O aplicativo ainda está sendo preparado. Recarregue o site publicado e tente novamente.');return;}
      localStorage.setItem(preferenceKey(userId),'on'); setPreference({userId,enabled:true});
      setMessage('Avisos ativados para esta conta neste dispositivo.');
    } catch {setMessage('Não foi possível ativar os avisos neste navegador.');}
    finally {setBusy(false);}
  };
  const deactivate = () => {
    if (userId) {try {localStorage.removeItem(preferenceKey(userId));} catch { /* Session preference still changes. */ }}
    setPreference({userId,enabled:false}); setMessage('Avisos desativados neste aplicativo. A permissão do navegador pode continuar concedida.');
  };

  useEffect(() => {
    if (!userId || !enabled || permissionState !== 'granted' || !supported()) return;
    const client = supabaseClient || getSupabaseClient();
    if (!client) {setMessage('Conecte o aplicativo ao banco para acompanhar os pedidos.');return;}
    let alive=true, loading=false, initialized=false;
    const statuses = new Map<string,string>();
    const observe = async (row: {id?: unknown;status?: unknown;customer_id?: unknown}) => {
      if (!alive || typeof row.id !== 'string' || typeof row.status !== 'string' || row.customer_id !== userId) return;
      const before = statuses.get(row.id);
      statuses.set(row.id,row.status);
      if (!initialized || !before || before === row.status || document.visibilityState !== 'hidden') return;
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!alive || !registration?.active || Notification.permission !== 'granted') return;
        // No names, products, amounts or order numbers on the lock screen.
        await registration.showNotification('Atualização de pedido',{
          body:'O status de um dos seus pedidos mudou. Abra o aplicativo para consultar.',
          icon:'/pwa-192x192.png',tag:`podwave-order:${userId}:${row.id}`,
          data:{type:'podwave-order',ownerId:userId,url:'/?orders=1'},
        });
      } catch {if (alive) setMessage('O navegador não conseguiu exibir um aviso. Confira seus pedidos no aplicativo.');}
    };
    const refresh = async () => {
      if (!alive || loading) return;
      loading=true;
      try {
        const {data,error} = await client.from('customer_orders').select('id,status,customer_id').eq('customer_id',userId);
        if (error) {if(alive)setMessage('Não foi possível acompanhar os pedidos. Confira a conexão e suas permissões.');return;}
        if (!alive) return;
        for (const row of data || []) await observe(row);
        initialized=true;
      } catch {if(alive)setMessage('A conexão foi interrompida. Os avisos serão retomados quando ela voltar.');}
      finally {loading=false;}
    };
    // A normal read remains available even if this table is not enabled in Realtime.
    void refresh();
    const timer = window.setInterval(() => void refresh(),60000);
    const onVisible = () => void refresh();
    document.addEventListener('visibilitychange',onVisible);
    let channel: ReturnType<typeof client.channel> | undefined;
    if (/^[a-zA-Z0-9_-]+$/.test(userId)) {
      channel = client.channel(`order-notifications:${userId}`).on('postgres_changes',{
        event:'UPDATE',schema:'public',table:'customer_orders',filter:`customer_id=eq.${userId}`,
      },() => void refresh()).subscribe();
    }
    return () => {
      alive=false; window.clearInterval(timer); document.removeEventListener('visibilitychange',onVisible);
      if(channel) void client.removeChannel(channel);
      void navigator.serviceWorker.getRegistration().then(async registration => {
        const notifications = await registration?.getNotifications();
        for(const notification of notifications || []) if(notification.data?.ownerId===userId) notification.close();
      }).catch(() => {});
    };
  },[userId,enabled,permissionState,supabaseClient]);

  useEffect(() => {
    if (!userId || !('serviceWorker' in navigator)) return;
    const openOrders = () => {openProfileModal();window.dispatchEvent(new Event('podwave:open-orders'));};
    const receive = (event: MessageEvent) => {if(event.data?.type==='podwave:open-orders')openOrders();};
    navigator.serviceWorker.addEventListener('message',receive);
    const url = new URL(window.location.href);
    if(url.searchParams.get('orders')==='1') {
      url.searchParams.delete('orders');window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
      openOrders();
    }
    return () => navigator.serviceWorker.removeEventListener('message',receive);
  },[userId,openProfileModal]);
  return <Context.Provider value={{enabled,busy,permission:permissionState,message,activate,deactivate}}>{children}</Context.Provider>;
}

export function OrderNotificationSettings() {
  const {enabled,busy,permission,message,activate,deactivate}=useContext(Context);
  return <section className="rounded-xl border border-white/10 p-3 space-y-2 text-sm">
    <h3 className="font-bold">Avisos de pedidos</h3>
    <p className="text-xs text-gray-400">Avise-me quando o status mudar com o aplicativo aberto em segundo plano. Se o sistema suspender ou fechar o aplicativo, o aviso pode não chegar.</p>
    {permission==='unsupported' ? <p className="text-xs text-amber-300">Indisponível nesta prévia ou navegador. Use o site publicado por HTTPS.</p> : <button type="button" disabled={busy} onClick={enabled ? deactivate : activate} className="rounded-lg border border-cyan-500/30 px-3 py-2 text-cyan-300 disabled:opacity-40">{busy ? 'Ativando...' : enabled ? 'Desativar avisos' : 'Ativar avisos'}</button>}
    {message && <p role="status" className="text-xs text-gray-300">{message}</p>}
  </section>;
}
