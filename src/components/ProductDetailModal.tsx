import React, { useState, useEffect } from 'react';
import { useCatalog } from '../context/CatalogContext';
import { Zap, X, ShieldAlert, Cpu, BatteryCharging, Droplets, Check, ShoppingBag } from 'lucide-react';
import { FlavorVariant } from '../types/catalog';

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
              <span className="text-emerald-400 font-bold text-[11px]">Pronta Entrega em São Luís</span>
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

            {/* Interactive Flavor Selector */}
            <div className="space-y-2 pt-2 border-t border-[#8423DA]/20 light:border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="text-xs font-bold text-gray-300 light:text-slate-800 flex items-center gap-1.5">
                  <span>Sabores Disponíveis:</span>
                  <span className="text-[#00DFFF] font-semibold">
                    ({activeModalProduct.flavors.length} opções)
                  </span>
                </label>

                {activeSelectedFlavor && (
                  <span className="text-xs font-bold text-[#00DFFF] truncate max-w-full">
                    Sabor: {activeSelectedFlavor.name}
                  </span>
                )}
              </div>

              {/* Flavor Pill Buttons */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2 max-w-full">
                {activeModalProduct.flavors.map((flavor) => {
                  const isSelected = activeSelectedFlavor?.id === flavor.id;
                  return (
                    <button
                      key={flavor.id}
                      onClick={() => handleFlavorSelect(flavor)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-[11px] sm:text-xs font-medium transition-all cursor-pointer border max-w-full truncate ${
                        isSelected
                          ? 'bg-[#1D2248] light:bg-slate-200 border-[#00DFFF] text-white light:text-slate-900 shadow-[0_0_12px_rgba(0,223,255,0.4)] scale-102'
                          : 'bg-[#121633] light:bg-slate-100 border-[#8423DA]/25 light:border-slate-300 text-gray-300 light:text-slate-700 hover:border-[#8423DA]/60'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: flavor.colorHex }}
                      />
                      <span className="shrink-0">{flavor.iconEmoji}</span>
                      <span className="truncate">{flavor.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#00DFFF] shrink-0" />}
                    </button>
                  );
                })}
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

            {/* Price tag & Call to action info */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#11152A] to-[#181D3D] light:from-slate-100 light:to-slate-200 border border-[#8423DA]/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#A5A5B8] leading-none">
                  A PARTIR DE
                </p>
                <p className="font-heading text-xl sm:text-2xl font-black text-white light:text-slate-900 tracking-tight">
                  <span className="text-xs mr-1 text-[#00DFFF]">R$</span>
                  {activeModalProduct.startingPrice.toFixed(2).replace('.', ',')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const flavor = activeSelectedFlavor || activeModalProduct.flavors[0];
                    addToCart(activeModalProduct, flavor);
                    setActiveModalProduct(null);
                    setIsCartOpen(true);
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Adicionar ao Carrinho ⚡</span>
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
