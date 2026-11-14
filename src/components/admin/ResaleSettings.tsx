import { useEffect, useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';

export function ResaleSettings({ section }: { section: 'prices' | 'accounts' }) {
  const { models, allUsers, supabaseClient, resalePrices, reloadResalePrices } = useCatalog();
  const [modelId, setModelId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [approved, setApproved] = useState<string[]>([]);
  const [prices, setPrices] = useState<{ min_quantity: string; unit_price: string }[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (section !== 'accounts' || !supabaseClient) return;
    let active = true;
    void supabaseClient.rpc('podwave_reseller_admin', { p_customer: null, p_approved: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setMessage(error.message);
        else setApproved(data ?? []);
      });
    return () => { active = false; };
  }, [section, supabaseClient]);

  function selectModel(id: string) {
    setModelId(id);
    setMessage('');
    setPrices(resalePrices.filter(price => price.model_id === id).map(price => ({
      min_quantity: String(price.min_quantity), unit_price: String(price.unit_price),
    })));
  }

  async function save() {
    if (!supabaseClient) return;
    setBusy(true);
    setMessage('');
    try {
      if (section === 'prices') {
        const { error } = await supabaseClient.rpc('podwave_save_reseller_prices', {
          p_model: modelId,
          p_prices: prices.map(price => ({
            min_quantity: Number(price.min_quantity),
            unit_price: Number(price.unit_price.replace(',', '.')),
          })),
        });
        if (error) throw error;
        await reloadResalePrices();
      } else {
        const { data, error } = await supabaseClient.rpc('podwave_reseller_admin', {
          p_customer: customerId, p_approved: !approved.includes(customerId),
        });
        if (error) throw error;
        setApproved(data ?? []);
      }
      setMessage('Alterações salvas.');
    } catch (error) {
      setMessage(error && typeof error === 'object' && 'message' in error
        ? String(error.message) : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  }

  const control = 'min-h-11 rounded-lg border border-slate-500 bg-[#141838] px-3 py-2 text-white';
  return (
    <section className="space-y-3 rounded-2xl border border-violet-500/30 p-4">
      <h3 className="font-bold">{section === 'prices' ? 'Tabela de preços para revenda' : 'Revendedores autorizados'}</h3>
      {section === 'prices' ? (
        <>
          <select aria-label="Modelo" className={control + ' w-full'} value={modelId} onChange={event => selectModel(event.target.value)} disabled={busy}>
            <option value="">Selecione o modelo</option>
            {models.map(model => <option key={model.id} value={model.id}>{model.brandName} {model.modelName}</option>)}
          </select>
          {modelId && (
            <form className="space-y-3" onSubmit={event => { event.preventDefault(); void save(); }}>
              <fieldset disabled={busy} className="space-y-3">
                {prices.map((price, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                    <label className="min-w-0 text-xs">A partir de
                      <input className={control + ' w-full'} type="number" min="6" max="999999" required value={price.min_quantity}
                        onChange={event => setPrices(prices.map((row, i) => i === index ? { ...row, min_quantity: event.target.value } : row))} />
                    </label>
                    <label className="min-w-0 text-xs">Preço unitário (R$)
                      <input className={control + ' w-full'} inputMode="decimal" required value={price.unit_price}
                        onChange={event => setPrices(prices.map((row, i) => i === index ? { ...row, unit_price: event.target.value } : row))} />
                    </label>
                    <button type="button" className="min-h-11 px-2 text-sm text-rose-400" onClick={() => setPrices(prices.filter((_, i) => i !== index))}>Remover</button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={control} onClick={() => setPrices([...prices, { min_quantity: '', unit_price: '' }])}>Adicionar faixa</button>
                  <button type="submit" className={control}>Salvar tabela</button>
                </div>
              </fieldset>
            </form>
          )}
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <select aria-label="Conta do cliente" className={control + ' max-w-full'} value={customerId} onChange={event => setCustomerId(event.target.value)} disabled={busy}>
            <option value="">Selecione uma conta</option>
            {allUsers.map(user => <option key={user.id} value={user.id}>{user.fullName} · {user.email}{approved.includes(user.id) ? ' · Revendedor' : ''}</option>)}
          </select>
          <button type="button" className={control} disabled={busy || !customerId} onClick={() => void save()}>
            {approved.includes(customerId) ? 'Revogar acesso' : 'Aprovar revendedor'}
          </button>
        </div>
      )}
      {message && <p role="status" className="text-sm">{message}</p>}
    </section>
  );
}
