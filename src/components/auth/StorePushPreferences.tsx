import { useEffect, useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { orderPushOwner } from '../../services/orderPush';

const empty = { store: false, promotions: false };

export function StorePushPreferences() {
  const { currentUser, supabaseClient } = useCatalog();
  const userId = currentUser?.id;
  const [preferences, setPreferences] = useState<typeof empty>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    setPreferences(undefined);
    if (!userId || !supabaseClient || !('serviceWorker' in navigator)) return;
    const load = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager?.getSubscription();
        if (!subscription || orderPushOwner() !== userId) return;
        const { data, error } = await supabaseClient.rpc('podwave_store_push_preferences', { p_endpoint: subscription.endpoint });
        if (active) setPreferences(error ? undefined : data ?? undefined);
      } catch {
        if (active) setPreferences(undefined);
      }
    };
    void load();
    const timer = window.setInterval(() => { if (!busy) void load(); }, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [userId, supabaseClient, busy]);

  async function save(key: keyof typeof empty) {
    if (!preferences || !supabaseClient || orderPushOwner() !== userId) return;
    setBusy(true);
    setMessage('');
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager?.getSubscription();
      if (!subscription) throw new Error();
      const next = { ...preferences, [key]: !preferences[key] };
      const { data, error } = await supabaseClient.rpc('podwave_store_push_preferences', {
        p_endpoint: subscription.endpoint, p_store: next.store, p_promotions: next.promotions,
      });
      if (error || !data) throw new Error();
      setPreferences(data);
      setMessage('Preferência salva neste aparelho.');
    } catch {
      setMessage('Não foi possível salvar a preferência. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  if (!userId) return null;
  return (
    <section className="mt-3 space-y-2 rounded-xl border border-violet-500/30 p-3 text-sm">
      <h3 className="font-bold">Notificações da loja</h3>
      {preferences ? (
        <>
          <label className="flex min-h-10 items-center gap-2">
            <input type="checkbox" checked={preferences.store} disabled={busy} onChange={() => void save('store')} />
            Receber comunicados da loja
          </label>
          <label className="flex min-h-10 items-center gap-2">
            <input type="checkbox" checked={preferences.promotions} disabled={busy} onChange={() => void save('promotions')} />
            Receber promoções
          </label>
        </>
      ) : <p>Ative os alertas de pedido acima para cadastrar este aparelho.</p>}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
