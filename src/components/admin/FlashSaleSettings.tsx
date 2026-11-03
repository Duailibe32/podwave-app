import React, { useEffect, useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import type { FlashSale } from '../../types/catalog';
import { DEFAULT_PROGRESSIVE_DISCOUNT_CONFIG } from '../../data/initialData';
import { savePromotionsConfigToSupabase } from '../../services/supabase';
import { FLASH_SALE_MAX_MS, getActiveFlashSale } from '../../utils/flashSale';

function localDateTime(iso: string) {
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
}

export function FlashSaleSettings() {
  const { settings, models, updateSettings } = useCatalog();
  const saved = settings.progressiveDiscountConfig?.flashSale;
  const [modelId, setModelId] = useState(saved?.modelId || '');
  const [flavorId, setFlavorId] = useState(saved?.flavorId || '');
  const [percent, setPercent] = useState(saved?.percent ?? 10);
  const [end, setEnd] = useState(() => localDateTime(saved?.endsAt || new Date(Date.now() + FLASH_SALE_MAX_MS).toISOString()));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    setModelId(saved?.modelId || ''); setFlavorId(saved?.flavorId || ''); setPercent(saved?.percent ?? 10);
    setEnd(localDateTime(saved?.endsAt || new Date(Date.now() + FLASH_SALE_MAX_MS).toISOString()));
  }, [saved]);
  const model = models.find(model => model.id === modelId);
  const stock = (item: typeof models[number]) => item.flavors.reduce((total, flavor) => total + (flavor.inStock !== false && Number.isFinite(flavor.demoQuantity) ? Math.max(0, flavor.demoQuantity || 0) : 0), 0);
  const options = models.filter(model => model.active).slice().sort((a, b) => stock(b) - stock(a));
  const active = getActiveFlashSale(saved, models);
  const persist = async (offer: FlashSale) => {
    setBusy(true); setFeedback(null);
    const config = { ...DEFAULT_PROGRESSIVE_DISCOUNT_CONFIG, ...settings.progressiveDiscountConfig, flashSale: offer };
    try {
      const result = await savePromotionsConfigToSupabase(config, settings.complementaryAddons);
      if (!result.success) throw new Error(result.error || 'Confira a conexão e tente novamente.');
      updateSettings({ progressiveDiscountConfig: config }, { persistPromotions: false });
      setFeedback({ ok: true, text: offer.enabled ? 'Oferta salva no banco. O término é fixo e não reinicia ao atualizar a loja.' : 'Oferta desativada no banco.' });
    } catch (error) {
      setFeedback({ ok: false, text: `Não foi possível salvar. A oferta anterior foi mantida. ${error instanceof Error ? error.message : ''}` });
    } finally { setBusy(false); }
  };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const now = Date.now(), ends = new Date(end).getTime();
    const offer: FlashSale = { enabled: true, modelId, flavorId: flavorId || undefined, percent, startsAt: new Date(now).toISOString(), endsAt: Number.isFinite(ends) ? new Date(ends).toISOString() : '' };
    if (!getActiveFlashSale(offer, models, now)) {
      setFeedback({ ok: false, text: 'Selecione um modelo/sabor com estoque informado, desconto maior que 0 e até 100%, e término no futuro em até 24 horas.' });
      return;
    }
    void persist(offer);
  };
  const field = 'w-full min-w-0 max-w-full min-h-11 rounded-xl bg-[#141838] border border-white/20 px-3 py-2 text-base text-white';
  return <section aria-label="Configurar Oferta Relâmpago" className="rounded-3xl border border-amber-400/40 bg-[#0D1022] p-4 sm:p-6 space-y-4">
    <div><h3 className="text-lg font-bold text-amber-300">⚡ Oferta Relâmpago do Dia</h3><p className="text-xs text-gray-300 mt-1">Um modelo ou sabor por vez, por até 24 horas. Os modelos com mais estoque aparecem primeiro.</p></div>
    <p className="text-sm">{active ? `Ativa: ${active.model.modelName}${active.flavor ? ` • ${active.flavor.name}` : ''} (${active.sale.percent}% OFF)` : 'Nenhuma oferta disponível no momento (inativa, encerrada ou sem estoque).'}</p>
    <form onSubmit={save} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="space-y-1 block text-sm">Modelo<select aria-label="Modelo da oferta" className={field} value={modelId} required disabled={busy} onChange={event => { setModelId(event.target.value); setFlavorId(''); }}><option value="">Selecione o modelo</option>{options.map(model => <option key={model.id} value={model.id}>{model.modelName} ({stock(model)} un.)</option>)}</select></label>
        <label className="space-y-1 block text-sm">Sabor<select aria-label="Sabor da oferta" className={field} value={flavorId} disabled={busy || !model} onChange={event => setFlavorId(event.target.value)}><option value="">Todos os sabores disponíveis</option>{model?.flavors.map(flavor => <option key={flavor.id} value={flavor.id}>{flavor.name} ({flavor.inStock === false ? 0 : flavor.demoQuantity ?? 'não informado'} un.)</option>)}</select></label>
        <label className="space-y-1 block text-sm">Desconto (%)<input aria-label="Desconto da oferta (%)" className={field} type="number" min="0.01" max="100" step="0.01" required disabled={busy} value={percent} onChange={event => setPercent(Number(event.target.value))} /></label>
        <label className="space-y-1 block text-sm">Termina em (horário deste aparelho)<input aria-label="Término da oferta" className={field} type="datetime-local" required disabled={busy} value={end} onChange={event => setEnd(event.target.value)} /></label>
      </div>
      <button type="button" disabled={busy} onClick={() => setEnd(localDateTime(new Date(Date.now() + FLASH_SALE_MAX_MS).toISOString()))} className="min-h-11 px-3 text-sm text-amber-200 underline">Definir término em 24 horas</button>
      <p className="text-xs text-gray-400">Começa ao salvar. O maior desconto entre Oferta, VIP, combo ou cupom será aplicado. Frete grátis permanece separado.</p>
      {model && Number.isFinite(percent) && percent > 0 && percent <= 100 && <p className="text-sm text-amber-200">Preço aproximado na oferta: R$ {(Math.round(Math.round(model.startingPrice * 100) * (100 - percent) / 100) / 100).toFixed(2).replace('.', ',')} por unidade elegível. O desconto é arredondado no total dos itens elegíveis.</p>}
      <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-amber-300 text-slate-950 font-bold px-5 disabled:opacity-50">{busy ? 'Salvando oferta…' : 'Salvar e ativar oferta'}</button><button type="button" disabled={busy || !saved?.enabled} onClick={() => saved && void persist({ ...saved, enabled: false })} className="min-h-11 rounded-xl border border-white/30 px-4 disabled:opacity-40">Desativar oferta</button></div>
    </form>
    {feedback && <p role={feedback.ok ? 'status' : 'alert'} className={`text-sm p-3 rounded-xl ${feedback.ok ? 'bg-emerald-500/10 text-emerald-200' : 'bg-rose-500/10 text-rose-200'}`}>{feedback.text}</p>}
  </section>;
}
