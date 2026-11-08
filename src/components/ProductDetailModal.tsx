import React, { useState, useEffect, useRef } from 'react';
import { useCatalog } from '../context/CatalogContext';
import { Zap, X, ShieldAlert, Cpu, BatteryCharging, Droplets, Check, ShoppingBag, AlertTriangle, CheckCircle2, XCircle, HelpCircle, Layers } from 'lucide-react';
import { FlavorVariant } from '../types/catalog';
import { calculateVariantAvailability, calculateVariantsSummary } from '../utils/availability';
import { flavorColor, flavorNotes, lastUnitsLabel } from '../utils/flavorPresentation';
import { useCartFeedback } from '../hooks/useCartFeedback';

export const ProductDetailModal: React.FC = () => {
  const {
    activeModalProduct: openedProduct,
    models,
    setActiveModalProduct,
    activeSelectedFlavor: selectedFlavor,
    setActiveSelectedFlavor,
    addToCart,
    setIsCartOpen,
  } = useCatalog();

  const activeModalProduct = models?.find(product => product.id === openedProduct?.id) || openedProduct;
  const activeSelectedFlavor = activeModalProduct?.flavors.find(flavor => flavor.id === selectedFlavor?.id);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isOpen = Boolean(activeModalProduct);
  const [activeImage, setActiveImage] = useState<string>('');
  const [imageResult, setImageResult] = useState<{ url: string; ok: boolean }>();
  const currentFlavor = activeSelectedFlavor || activeModalProduct?.flavors[0];
  const { added, confirm } = useCartFeedback(currentFlavor?.id);

  useEffect(() => {
    setActiveImage('');
  }, [activeModalProduct?.id, activeSelectedFlavor?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    closeButtonRef.current?.focus({ preventScroll: true });
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [isOpen]);

  const handleDialogKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setActiveModalProduct(null);
    }
    if (event.key !== 'Tab') return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    const first = buttons[0], last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  if (!activeModalProduct) return null;

  const currentDisplayImage = activeImage || activeSelectedFlavor?.customImage || activeModalProduct.imageUrl || '/assets/images/logo.png';

  const imageFinished = imageResult?.url === currentDisplayImage;
  const imageFailed = imageFinished && !imageResult.ok;

  const handleFlavorSelect = (flavor: FlavorVariant) => {
    setActiveSelectedFlavor(flavor);
    setActiveImage('');
  };

  const imagesList = [
    activeModalProduct.imageUrl,
    ...(activeModalProduct.additionalImages || []),
  ].filter((img, idx, arr): img is string => Boolean(img && img.trim()) && arr.indexOf(img) === idx);

  // Compute live availability summary across all flavors for this model
  const availabilitySummary = calculateVariantsSummary(
    activeModalProduct.flavors,
    activeModalProduct.lowQuantityThreshold
  );

  const notes = currentFlavor && flavorNotes(currentFlavor.name);

  const selectedFlavorAvail = currentFlavor
    ? calculateVariantAvailability(
        currentFlavor.demoQuantity,
        currentFlavor.lowQuantityThreshold ?? activeModalProduct.lowQuantityThreshold
      )
    : null;

  const isFlavorSoldOut = Boolean(
    !activeModalProduct.active || !currentFlavor ||
    currentFlavor.inStock === false ||
    currentFlavor.demoQuantity === 0 ||
    selectedFlavorAvail?.status === 'esgotado'
  );

  return (
    <div className="product-detail-overlay fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div
        className="absolute inset-0"
        onClick={() => setActiveModalProduct(null)}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div role="dialog" aria-modal="true" aria-labelledby="product-detail-title" onKeyDown={handleDialogKey}
        className="product-detail-panel relative flex flex-col w-full max-w-4xl overflow-hidden rounded-2xl sm:rounded-3xl bg-[#0D1022] light:bg-white border-2 border-[#8423DA]/50 light:border-slate-300 shadow-[0_0_50px_rgba(132,35,218,0.3)] text-white light:text-slate-900 z-10 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          onClick={() => setActiveModalProduct(null)}
          className="absolute top-3 right-3 sm:top-5 sm:right-5 min-h-11 min-w-11 grid place-items-center p-2 rounded-full bg-[#181C38] light:bg-slate-100 hover:bg-[#8423DA] text-gray-300 hover:text-white transition-all cursor-pointer z-20 shadow-lg"
          type="button"
          aria-label="Fechar ficha do produto"
          title="Fechar janela (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="product-detail-scroll min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-7 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-8 items-start">
          {/* Left Column: Visual Gallery */}
          <div className="md:col-span-5 space-y-3 sm:space-y-4 w-full">
            {/* Main Product Frame */}
            <div data-loaded={imageFinished} className="product-detail-photo product-photo relative aspect-square rounded-xl sm:rounded-2xl p-4 sm:p-6 flex items-center justify-center shadow-lg border border-slate-200 overflow-hidden">
              {imageFailed ? <span className="text-xs text-slate-400">Imagem indisponível</span> : <img
                key={currentDisplayImage}
                src={currentDisplayImage}
                alt={activeModalProduct.modelName}
                onLoad={() => setImageResult({ url: currentDisplayImage, ok: true })}
                onError={() => setImageResult({ url: currentDisplayImage, ok: false })}
                className="product-photo-image w-full h-full object-contain transform hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />}

              {/* Puffs floating badge */}
              <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#080811] text-[#00DFFF] text-[11px] sm:text-xs font-bold border border-[#00DFFF]/40 shadow-md">
                <Zap className="w-3 h-3 fill-[#00DFFF] text-[#00DFFF]" />
                <span>{activeModalProduct.puffsLabel}</span>
              </div>
            </div>

            {/* Thumbnails list */}
            {imagesList.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                {imagesList.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white p-1 border-2 transition-all shrink-0 cursor-pointer overflow-hidden ${
                      currentDisplayImage === img
                        ? 'border-[#00DFFF] shadow-[0_0_10px_rgba(0,223,255,0.4)]'
                        : 'border-slate-300 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Miniatura ${idx + 1}`}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Demonstrative Availability Notice */}
            <div className="hidden sm:flex p-3 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-semibold text-gray-200 light:text-slate-800 text-[11px]">
                  Disponibilidade:
                </span>
              </div>
              <span className="text-emerald-400 font-bold text-[11px]">Pronta Entrega em Toda a Região</span>
            </div>
          </div>

          {/* Right Column: Model Info, Flavor Picker, Specs */}
          <div className="md:col-span-7 space-y-4 sm:space-y-5 w-full min-w-0">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-xs font-black uppercase tracking-widest text-[#00DFFF]">
                  {activeModalProduct.brandName}
                </span>
                <span className="text-xs text-[#A5A5B8]">&bull;</span>
                <span className="text-xs text-[#A5A5B8]">{activeModalProduct.category}</span>
                {activeModalProduct.badge && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-gradient-to-r from-[#9333EA] to-[#A855F7] text-white text-[10px] font-black uppercase shrink-0 shadow-sm">
                    {activeModalProduct.badge}
                  </span>
                )}
              </div>

              <h2 id="product-detail-title" className="font-heading text-xl sm:text-2xl md:text-3xl font-extrabold text-white light:text-slate-900 tracking-tight break-words">
                {activeModalProduct.modelName}
              </h2>

              <p className="text-xs sm:text-sm text-[#A5A5B8] light:text-slate-600 mt-2 leading-relaxed break-words">
                {activeModalProduct.description}
              </p>
            </div>

            <section aria-label="Selecione o sabor" className="space-y-2.5 pt-2 border-t border-[#8423DA]/20 light:border-slate-200">
              <h3 className="flex items-baseline gap-2 text-sm font-extrabold">
                Escolha o sabor
                <span className="text-xs text-cyan-300 light:text-cyan-800">{activeModalProduct.flavors.length} opções</span>
              </h3>
              {activeModalProduct.flavors.length === 0 && <p className="text-xs text-slate-300">Sabores sob consulta.</p>}
              <div className="grid grid-cols-2 gap-2 max-w-full">
                {activeModalProduct.flavors.map(flavor => {
                  const unavailable = flavor.inStock === false || flavor.demoQuantity === 0;
                  const scarcity = lastUnitsLabel(flavor);
                  return (
                    <button key={flavor.id} type="button" aria-pressed={currentFlavor?.id === flavor.id}
                      onClick={() => handleFlavorSelect(flavor)}
                      style={{ '--chip-color': flavorColor(flavor) } as React.CSSProperties}
                      className="flavor-detail-option min-w-0 min-h-11 flex items-start gap-1.5 sm:gap-2 rounded-xl border p-2 sm:p-2.5 text-left text-xs">
                      <span className="shrink-0 text-base" aria-hidden="true">{flavor.iconEmoji}</span>
                      <span className="min-w-0 flex-1">
                        <strong className="block [overflow-wrap:anywhere] leading-tight">{flavor.name}</strong>
                        <small className={unavailable ? 'text-rose-300' : scarcity ? 'text-amber-200' : 'text-slate-300'}>
                          {unavailable ? 'Esgotado' : scarcity || (flavor.demoQuantity == null ? 'Sob consulta' : 'Disponível')}
                        </small>
                      </span>
                      {currentFlavor?.id === flavor.id && <Check className="size-3.5 shrink-0" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
              {notes && (
                <div className="mt-3 rounded-xl border border-violet-500/25 bg-[#121633] p-3 text-white">
                  <p className="mb-2 text-xs font-bold">Perfil do sabor <span className="font-normal text-slate-300">· estimativa pelo nome</span></p>
                  <div className="grid grid-cols-3 gap-2">
                    {notes.map(note => (
                      <div key={note.label} className="min-w-0">
                        <span className="block text-[10px] text-slate-200">{note.label}</span>
                        {note.value === null ? <span className="text-[10px] text-slate-400">Sem indicação</span> : (
                          <div className="mt-1 grid grid-cols-3 gap-1" role="meter" aria-label={note.label}
                            aria-valuemin={0} aria-valuemax={3} aria-valuenow={note.value}>
                            {[1, 2, 3].map(step => <span key={step} className="h-1.5 rounded-full"
                              style={{ background: step <= note.value! ? note.color : '#313959' }} />)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Resumo de Disponibilidade do Modelo (Section 7) */}
            <div className="p-3 rounded-2xl bg-[#141838]/90 light:bg-slate-100 border border-[#8423DA]/30 light:border-slate-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-300 light:text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#00DFFF]" /> Disponibilidade das Variantes
                </span>
                <span className="text-[10px] text-[#00DFFF] font-bold">
                  {availabilitySummary.total} sabores cadastrados
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span className="font-black">{availabilitySummary.disponivel}</span>
                  <span className="text-[10px] text-emerald-300/80">disponíveis</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span className="font-black">{availabilitySummary.ultimasUnidades}</span>
                  <span className="text-[10px] text-amber-300/80">últimas un.</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
                  <XCircle className="w-3 h-3 shrink-0" />
                  <span className="font-black">{availabilitySummary.esgotado}</span>
                  <span className="text-[10px] text-rose-300/80">esgotados</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-500/10 border border-slate-500/30 text-slate-300">
                  <HelpCircle className="w-3 h-3 shrink-0" />
                  <span className="font-black">{availabilitySummary.naoInformado}</span>
                  <span className="text-[10px] text-slate-400">sem info</span>
                </div>
              </div>
            </div>

            {/* Technical Specifications Grid */}
            <div className="pt-2 border-t border-[#8423DA]/20 light:border-slate-200 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A5A5B8] light:text-slate-700 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#00DFFF]" /> Especificações Técnicas
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2 sm:p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/20 overflow-hidden">
                  <span className="text-[10px] text-[#A5A5B8] block">Puffs Nominais</span>
                  <span className="font-bold text-white light:text-slate-900 flex items-center gap-1 mt-0.5 truncate text-[11px] sm:text-xs">
                    <Zap className="w-3 h-3 text-[#00DFFF] shrink-0" />
                    {activeModalProduct.puffsLabel}
                  </span>
                </div>

                <div className="p-2 sm:p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/20 overflow-hidden">
                  <span className="text-[10px] text-[#A5A5B8] block">Bateria</span>
                  <span className="font-bold text-white light:text-slate-900 flex items-center gap-1 mt-0.5 truncate text-[11px] sm:text-xs">
                    <BatteryCharging className="w-3 h-3 text-[#00DFFF] shrink-0" />
                    {activeModalProduct.specs.battery}
                  </span>
                </div>

                <div className="p-2 sm:p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/20 overflow-hidden">
                  <span className="text-[10px] text-[#A5A5B8] block">E-Líquido</span>
                  <span className="font-bold text-white light:text-slate-900 flex items-center gap-1 mt-0.5 truncate text-[11px] sm:text-xs">
                    <Droplets className="w-3 h-3 text-[#E53CF3] shrink-0" />
                    {activeModalProduct.specs.eLiquid}
                  </span>
                </div>

                <div className="p-2 sm:p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/20 overflow-hidden">
                  <span className="text-[10px] text-[#A5A5B8] block">Nicotina</span>
                  <span className="font-bold text-white light:text-slate-900 block mt-0.5 truncate text-[11px] sm:text-xs">
                    {activeModalProduct.specs.nicotine}
                  </span>
                </div>

                <div className="p-2 sm:p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/20 overflow-hidden">
                  <span className="text-[10px] text-[#A5A5B8] block">Conector</span>
                  <span className="font-bold text-white light:text-slate-900 block mt-0.5 truncate text-[11px] sm:text-xs">
                    {activeModalProduct.specs.chargeType}
                  </span>
                </div>

                <div className="p-2 sm:p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/20 overflow-hidden">
                  <span className="text-[10px] text-[#A5A5B8] block">Resistência</span>
                  <span className="font-bold text-white light:text-slate-900 block mt-0.5 truncate text-[11px] sm:text-xs">
                    {activeModalProduct.specs.coil}
                  </span>
                </div>
              </div>
            </div>

            {/* Regulatory Warning */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-[10px] sm:text-[11px] text-amber-300 light:text-amber-800">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <p className="leading-snug">
                <strong>Aviso Legal (+18):</strong> Catálogo restrito para consulta técnica de especificações de puffs e sabores por maiores de idade.
              </p>
            </div>
          </div>
        </div>
        <div className="product-detail-actions shrink-0 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-violet-400/25 bg-[#10152b] light:bg-slate-100">
          <div className="min-w-0 flex-1" aria-live="polite">
            <p className="text-xs font-bold [overflow-wrap:anywhere]">{currentFlavor?.iconEmoji} {currentFlavor?.name || 'Sabores sob consulta'}</p>
            <p className="mt-0.5 text-sm font-black">R$ {activeModalProduct.startingPrice.toFixed(2).replace('.', ',')}</p>
          </div>
          <button type="button" onClick={() => { setActiveModalProduct(null); setIsCartOpen(true); }}
            className="min-h-11 rounded-xl border border-violet-400/30 px-3 text-xs font-bold">
            Ver sacola
          </button>
          <button type="button" disabled={isFlavorSoldOut}
            onClick={event => {
              if (currentFlavor && addToCart(activeModalProduct, currentFlavor)) confirm(event.currentTarget, currentFlavor.iconEmoji);
            }}
            className="product-detail-add min-h-11 flex items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 text-sm font-black text-slate-950 disabled:bg-slate-700 disabled:text-slate-200">
            {isFlavorSoldOut ? <XCircle className="size-4" aria-hidden="true" />
              : added ? <Check className="size-4" aria-hidden="true" /> : <ShoppingBag className="size-4" aria-hidden="true" />}
            <span aria-live="polite">{isFlavorSoldOut ? 'Sabor indisponível' : added ? 'Adicionado!' : 'Adicionar à sacola'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
