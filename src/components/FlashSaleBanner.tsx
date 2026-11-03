import React, { useEffect, useState } from 'react';
import { useCatalog } from '../context/CatalogContext';
import { formatFlashCountdown, getActiveFlashSale } from '../utils/flashSale';
import { Zap } from 'lucide-react';

export function FlashSaleBanner() {
  const { settings, models, setActiveModalProduct, setActiveSelectedFlavor } = useCatalog();
  const [, tick] = useState(0);
  const active = getActiveFlashSale(settings.progressiveDiscountConfig?.flashSale, models);
  const deadline = active?.endsAt;
  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => tick(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  if (!active) return null;
  return <section aria-label="Oferta Relâmpago" className="border-y border-amber-400/30 bg-[#201527] text-white">
    <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex items-center gap-1 text-xs font-bold text-amber-300"><Zap className="w-4 h-4 shrink-0" /> OFERTA RELÂMPAGO · {active.sale.percent}% OFF</p>
        <p className="text-sm font-bold break-words">{active.model.modelName}{active.flavor ? ` • ${active.flavor.name}` : ' • Todos os sabores disponíveis'}</p>
        <p className="text-xs text-gray-300">Aplicamos o maior desconto, sem acumular.</p>
      </div>
      <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3">
        <div><p className="text-[10px] uppercase text-gray-300">Termina em</p><time dateTime={active.sale.endsAt} aria-live="off" className="font-mono font-bold text-xl tabular-nums text-amber-200">{formatFlashCountdown(active.endsAt - Date.now())}</time></div>
        <button type="button" onClick={() => { setActiveSelectedFlavor(active.flavor || null); setActiveModalProduct(active.model); }} className="min-h-11 px-4 rounded-xl bg-amber-300 text-slate-950 font-bold text-sm shrink-0">Ver oferta</button>
      </div>
    </div>
  </section>;
}
