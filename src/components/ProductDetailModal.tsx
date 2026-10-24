import React, { useState, useEffect } from 'react';
import { useCatalog } from '../context/CatalogContext';
import { Zap, X, ShieldAlert, Cpu, BatteryCharging, Droplets, Check, ShoppingBag, AlertTriangle, CheckCircle2, XCircle, HelpCircle, Layers } from 'lucide-react';
import { FlavorVariant } from '../types/catalog';
import { calculateVariantAvailability, calculateVariantsSummary } from '../utils/availability';

export const ProductDetailModal: React.FC = () => {
  const {
    activeModalProduct,
    setActiveModalProduct,
    activeSelectedFlavor,
    setActiveSelectedFlavor,
    addToCart,
    setIsCartOpen,
  } = useCatalog();

  const [activeImage, setActiveImage] = useState<string>('');

  useEffect(() => {
    if (activeModalProduct) {
      setActiveImage(activeModalProduct.imageUrl);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [activeModalProduct]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveModalProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveModalProduct]);

  if (!activeModalProduct) return null;

  const currentDisplayImage = activeImage || activeModalProduct.imageUrl || '/assets/images/logo.png';

  const handleFlavorSelect = (flavor: FlavorVariant) => {
    setActiveSelectedFlavor(flavor);
    if (flavor.customImage) {
      setActiveImage(flavor.customImage);
    }
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

  const currentFlavor = activeSelectedFlavor || activeModalProduct.flavors[0];

  const selectedFlavorAvail = currentFlavor
    ? calculateVariantAvailability(
        currentFlavor.demoQuantity,
        currentFlavor.lowQuantityThreshold ?? activeModalProduct.lowQuantityThreshold
      )
    : null;

  const isFlavorSoldOut = Boolean(
    !currentFlavor ||
    currentFlavor.inStock === false ||
    currentFlavor.demoQuantity === 0 ||
    selectedFlavorAvail?.status === 'esgotado'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div
        className="absolute inset-0"
        onClick={() => setActiveModalProduct(null)}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-[#0D1022] light:bg-white border-2 border-[#8423DA]/50 light:border-slate-300 shadow-[0_0_50px_rgba(132,35,218,0.3)] text-white light:text-slate-900 z-10 p-4 sm:p-7 md:p-8 animate-in zoom-in-95 duration-200 overflow-x-hidden">
        {/* Close Button */}
        <button
          onClick={() => setActiveModalProduct(null)}
          className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2 rounded-full bg-[#181C38] light:bg-slate-100 hover:bg-[#8423DA] text-gray-300 hover:text-white transition-all cursor-pointer z-20 shadow-lg"
          title="Fechar janela (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-8 items-start">
          {/* Left Column: Visual Gallery */}
          <div className="md:col-span-5 space-y-3 sm:space-y-4 w-full">
            {/* Main Product Frame */}
            <div className="relative aspect-square rounded-xl sm:rounded-2xl bg-white p-4 sm:p-6 flex items-center justify-center shadow-lg border border-slate-200 overflow-hidden">
              <img
                src={currentDisplayImage}
                alt={activeModalProduct.modelName}
                className="w-full h-full object-contain transform hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />

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
            <div className="p-3 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 flex items-center justify-between text-xs">
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

              <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-extrabold text-white light:text-slate-900 tracking-tight break-words">
                {activeModalProduct.modelName}
              </h2>

              <p className="text-xs sm:text-sm text-[#A5A5B8] light:text-slate-600 mt-2 leading-relaxed break-words">
                {activeModalProduct.description}
              </p>
            </div>

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

            {/* Interactive Flavor Selector (Section 5 & 6) */}
            <div className="space-y-2.5 pt-2 border-t border-[#8423DA]/20 light:border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="text-xs font-bold text-gray-300 light:text-slate-800 flex items-center gap-1.5">
                  <span>Selecione o Sabor / Variante:</span>
                  <span className="text-[#00DFFF] font-semibold">
                    ({activeModalProduct.flavors.length} opções)
                  </span>
                </label>

                {activeSelectedFlavor && (
                  <span className="text-xs font-bold text-[#00DFFF] truncate max-w-full">
                    Ativo: {activeSelectedFlavor.iconEmoji} {activeSelectedFlavor.name}
                  </span>
                )}
              </div>

              {/* Flavor Buttons with Status & Quantities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-full">
                {activeModalProduct.flavors.map((flavor) => {
                  const isSelected = activeSelectedFlavor?.id === flavor.id;
                  const threshold = flavor.lowQuantityThreshold ?? activeModalProduct.lowQuantityThreshold ?? 3;
                  const avail = calculateVariantAvailability(flavor.demoQuantity, threshold);

                  return (
                    <button
                      key={flavor.id}
                      onClick={() => handleFlavorSelect(flavor)}
                      className={`flex items-center justify-between gap-2 p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer border text-left ${
                        isSelected
                          ? 'bg-[#1D2248] light:bg-slate-200 border-[#00DFFF] text-white light:text-slate-900 shadow-[0_0_15px_rgba(0,223,255,0.35)] ring-1 ring-[#00DFFF]/50 scale-[1.01]'
                          : 'bg-[#121633] light:bg-slate-100 border-[#8423DA]/25 light:border-slate-300 text-gray-300 light:text-slate-700 hover:border-[#8423DA]/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{flavor.iconEmoji}</span>
                        <div className="min-w-0">
                          <p className="font-bold text-white light:text-slate-900 truncate text-[11px] sm:text-xs">
                            {flavor.name}
                          </p>
                          <p className={`text-[10px] font-semibold ${avail.badgeText} flex items-center gap-1 mt-0.5`}>
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: avail.colorHex }}
                            />
                            <span>{avail.quantityText}</span>
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1">
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase border ${avail.badgeBg} ${avail.badgeBorder} ${avail.badgeText}`}
                        >
                          {avail.badgeLabel}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#00DFFF] shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Flavor Detail Box */}
              {selectedFlavorAvail && activeSelectedFlavor && (
                <div className={`mt-2 p-3 rounded-xl border flex items-center justify-between text-xs ${selectedFlavorAvail.badgeBg} ${selectedFlavorAvail.badgeBorder}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{activeSelectedFlavor.iconEmoji}</span>
                    <div>
                      <p className="font-bold text-white light:text-slate-900 text-xs">
                        {activeSelectedFlavor.name}
                      </p>
                      <p className={`text-[11px] font-medium ${selectedFlavorAvail.badgeText}`}>
                        {selectedFlavorAvail.quantityText}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${selectedFlavorAvail.badgeBg} ${selectedFlavorAvail.badgeText} border ${selectedFlavorAvail.badgeBorder}`}>
                    {selectedFlavorAvail.label}
                  </span>
                </div>
              )}
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

            {/* Price tag & Call to action info */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#11152A] to-[#181D3D] light:from-slate-100 light:to-slate-200 border border-[#8423DA]/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#A5A5B8] leading-none">
                  A PARTIR DE
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <p className="font-heading text-xl sm:text-2xl font-black text-white light:text-slate-900 tracking-tight">
                    <span className="text-xs mr-1 text-[#00DFFF]">R$</span>
                    {activeModalProduct.startingPrice.toFixed(2).replace('.', ',')}
                  </p>
                  {isFlavorSoldOut && (
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-rose-400" /> Sabor Esgotado
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isFlavorSoldOut}
                  onClick={() => {
                    if (isFlavorSoldOut || !currentFlavor) return;
                    addToCart(activeModalProduct, currentFlavor);
                    setActiveModalProduct(null);
                    setIsCartOpen(true);
                  }}
                  className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    isFlavorSoldOut
                      ? 'bg-rose-500/15 border border-rose-500/40 text-rose-300 cursor-not-allowed opacity-85 shadow-none'
                      : 'bg-gradient-to-r from-[#10B981] to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer active:scale-95'
                  }`}
                  title={isFlavorSoldOut ? 'Este sabor está esgotado no momento e não pode ser adicionado' : 'Adicionar ao Carrinho'}
                >
                  {isFlavorSoldOut ? (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Sabor Esgotado</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Adicionar ao Carrinho ⚡</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setActiveModalProduct(null)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#1F2650] light:bg-slate-300 hover:bg-[#8423DA] text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Fechar
                </button>
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
      </div>
    </div>
  );
};
