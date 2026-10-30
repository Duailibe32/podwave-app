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
  return (
    <section className="rounded-xl bg-[#11152A]/70 border border-white/10 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            enabled ? 'bg-[#00DFFF] shadow-[0_0_8px_#00DFFF]' : 'bg-gray-500'
          }`}
          aria-hidden="true"
        />
        <span className="font-semibold text-gray-200 truncate">Avisos de status em 2º plano</span>
        {message && (
          <span role="status" className="text-[11px] text-[#A5A5B8] truncate hidden sm:inline">
            • {message}
          </span>
        )}
      </div>
      {permission === 'unsupported' ? (
        <span className="text-[11px] text-amber-300/90 font-medium">Requer HTTPS</span>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={enabled ? deactivate : activate}
          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer disabled:opacity-40 shrink-0 ${
            enabled
              ? 'bg-white/5 hover:bg-rose-500/15 border border-white/15 hover:border-rose-400/40 text-gray-300 hover:text-rose-200'
              : 'bg-[#00DFFF]/15 hover:bg-[#00DFFF]/25 border border-[#00DFFF]/40 text-[#00DFFF]'
          }`}
        >
          {busy ? 'Ativando...' : enabled ? 'Desativar' : 'Ativar avisos'}
        </button>
      )}
    </section>
  );
}
