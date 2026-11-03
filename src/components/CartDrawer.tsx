import React, { useState } from 'react';
import { useCatalog } from '../context/CatalogContext';
import { USB_C_ADDON, LANYARD_ADDON, SILICONE_COVER_ADDON, DEFAULT_PROGRESSIVE_DISCOUNT_CONFIG, DEFAULT_COMPLEMENTARY_ADDONS } from '../data/initialData';
import {
  X,
  Trash2,
  Plus,
  Minus,
  Truck,
  Ticket,
  Zap,
  ShoppingBag,
  Check,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Flame,
  Shield,
  Layers,
} from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    reorderFeedback,
    clearReorderFeedback,
    removeFromCart,
    updateCartQuantity,
    isUsbCableAdded,
    toggleUsbCable,
    cablePrice,
    isLanyardAdded,
    toggleLanyard,
    lanyardPrice,
    isSiliconeCoverAdded,
    toggleSiliconeCover,
    siliconeCoverPrice,
    totalPodUnits,
    progressiveDiscountAmount,
    isProgressiveFreeShipping,
    coupons,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    discountAmount,
    isVip,
    vipDiscountAmount,
    vipDiscountRate,
    cartSubtotal,
    cartTotal,
    freeShippingGoal,
    freeShippingRemaining,
    isCartOpen,
    setIsCartOpen,
    setIsCheckoutOpen,
    settings,
  } = useCatalog();

  const progCfg = {
    ...DEFAULT_PROGRESSIVE_DISCOUNT_CONFIG,
    ...(settings.progressiveDiscountConfig || {}),
  };
  const tier2Min = Math.max(1, Number(progCfg.tier2MinUnits) || 2);
  const tier2Percent = Math.max(0, Number(progCfg.tier2DiscountPercent ?? 5));
  const formattedTier2Discount =
    progCfg.tier2DiscountType === 'fixed'
      ? `R$ ${tier2Percent.toFixed(2).replace('.', ',')} OFF`
      : `${tier2Percent}% OFF`;
  const tier3Min = Math.max(tier2Min, Number(progCfg.tier3MinUnits) || 3);
  const tier3Percent = Math.max(0, Number(progCfg.tier3DiscountPercent ?? 10));
  const formattedTier3Discount =
    progCfg.tier3DiscountType === 'fixed'
      ? `R$ ${tier3Percent.toFixed(2).replace('.', ',')} OFF`
      : `${tier3Percent}% OFF`;

  const configuredAddons =
    settings.complementaryAddons && settings.complementaryAddons.length > 0
      ? settings.complementaryAddons
      : DEFAULT_COMPLEMENTARY_ADDONS;

  const isAddonApplicableToCart = (
    addon: typeof configuredAddons[0],
    isAlreadyAdded: boolean
  ): { visible: boolean; matchedModelName?: string } => {
    if (addon.active === false) return { visible: false };
    const linkedIds =
      Array.isArray(addon.applicableModelIds) && addon.applicableModelIds.length > 0
        ? addon.applicableModelIds
        : addon.applicableModelId
        ? [addon.applicableModelId]
        : ['all'];
    if (linkedIds.includes('all') || linkedIds.length === 0) {
      return { visible: true };
    }
    const matchedItem = cart.find((item) => linkedIds.includes(item.modelId));
    if (matchedItem) {
      return { visible: true, matchedModelName: matchedItem.modelName };
    }
    return { visible: isAlreadyAdded };
  };

  const usbAddon = configuredAddons.find((a) => a.id === USB_C_ADDON.id) || configuredAddons[0] || USB_C_ADDON;
  const lanyardAddon = configuredAddons.find((a) => a.id === LANYARD_ADDON.id) || configuredAddons[1] || LANYARD_ADDON;
  const siliconeAddon = configuredAddons.find((a) => a.id === SILICONE_COVER_ADDON.id) || configuredAddons[2] || SILICONE_COVER_ADDON;

  const usbMatch = isAddonApplicableToCart(usbAddon, isUsbCableAdded);
  const lanyardMatch = isAddonApplicableToCart(lanyardAddon, isLanyardAdded);
  const siliconeMatch = isAddonApplicableToCart(siliconeAddon, isSiliconeCoverAdded);

  const hasAnyActiveAddon =
    usbMatch.visible || lanyardMatch.visible || siliconeMatch.visible;

  const [couponCode, setCouponCode] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ success: boolean; message: string } | null>(null);

  if (!isCartOpen) return null;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    const res = applyCoupon(couponCode);
    setCouponFeedback(res);
    if (res.success) {
      setCouponCode('');
    }
    setTimeout(() => setCouponFeedback(null), 4000);
  };

  const freeShippingProgress = Math.min(
    100,
    Math.round(((freeShippingGoal - freeShippingRemaining) / freeShippingGoal) * 100)
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="Seu carrinho" className="mobile-cart fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex h-dvh w-full max-w-md overflow-hidden">
        <div className="min-w-0 w-full max-w-full overflow-hidden bg-[#0D1022] light:bg-white text-white light:text-slate-900 border-l border-[#8423DA]/30 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
          {/* HEADER */}
          <div className="p-4 sm:p-5 shrink-0 border-b border-[#8423DA]/25 light:border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-[#00DFFF]" />
              <h2 className="font-heading text-lg font-extrabold tracking-tight">
                Seu Carrinho
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#181C38] text-[#00DFFF] font-bold">
                {cart.reduce((a, b) => a + b.quantity, 0)} {cart.reduce((a, b) => a + b.quantity, 0) === 1 ? 'item' : 'itens'}
              </span>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="min-h-11 min-w-11 flex items-center justify-center p-1.5 rounded-xl bg-[#181C38] light:bg-slate-100 hover:bg-[#8423DA] text-gray-300 hover:text-white transition-all cursor-pointer"
              title="Fechar carrinho"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* MAIN SCROLLABLE CONTENT */}
          <div className="min-h-0 min-w-0 w-full max-w-full flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:p-5 space-y-5">
            {reorderFeedback && <div role="status" className="p-3 rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-xs text-cyan-100 space-y-2">
              <div className="flex items-center justify-between gap-2"><strong>{reorderFeedback.addedUnits} {reorderFeedback.addedUnits === 1 ? 'unidade adicionada' : 'unidades adicionadas'} do pedido anterior</strong><button type="button" aria-label="Dispensar aviso de recompra" onClick={clearReorderFeedback} className="min-h-11 min-w-11 flex items-center justify-center shrink-0"><X className="w-4 h-4" /></button></div>
              <p>Preços atuais aplicados. Revise acessórios, cupom e frete na finalização.</p>
              {reorderFeedback.warnings.length > 0 && <div className="space-y-1 text-amber-200"><p className="font-bold">Itens que ficaram de fora:</p>{reorderFeedback.warnings.map((message, index) => <p key={index}>{message}</p>)}</div>}
            </div>}
            {/* Empty State */}
            {cart.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#181C38] mx-auto flex items-center justify-center text-gray-400">
                  <ShoppingBag className="w-8 h-8 opacity-60" />
                </div>
                <h3 className="font-heading font-bold text-base">Seu carrinho está vazio</h3>
                <p className="text-xs text-[#A5A5B8] max-w-xs mx-auto">
                  Adicione pods, sabores e acessórios para visualizar sua sacola e finalizar o pedido via WhatsApp.
                </p>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    const el = document.getElementById('catalogo');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Explorar Catálogo ⚡
                </button>
              </div>
            ) : (
              <>
                {/* ITEMS LIST */}
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/20 flex items-center gap-3.5 shadow-sm"
                    >
                      {/* Product Thumbnail in White Box */}
                      <div className="w-14 h-14 rounded-xl bg-white p-1 flex items-center justify-center flex-shrink-0 shadow-inner">
                        <img
                          src={item.imageUrl || '/assets/images/logo.png'}
                          alt={item.modelName}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* Info & Flavor */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-heading font-bold text-sm line-clamp-2 break-words text-white light:text-slate-900">
                            {item.modelName}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="min-h-11 min-w-11 shrink-0 flex items-center justify-center text-gray-400 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                            title="Remover do carrinho"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Flavor Tag */}
                        <div className="flex items-center gap-1.5 text-xs text-[#A5A5B8] light:text-slate-600 mt-0.5 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                            style={{ backgroundColor: item.flavorColor }}
                          />
                          <span>{item.flavorEmoji}</span>
                          <span className="truncate font-medium">{item.flavorName}</span>
                        </div>

                        {/* Price & Quantity Stepper */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-1.5 border-t border-[#8423DA]/15">
                          <span className="font-heading font-bold text-sm text-white light:text-slate-900">
                            R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                          </span>

                          <div className="flex items-center gap-2 bg-[#0D1022] light:bg-white rounded-lg p-1 border border-[#8423DA]/30">
                            <button
                              aria-label={`Diminuir quantidade de ${item.modelName}`}
                              onClick={() => updateCartQuantity(item.id, -1)}
                              className="min-w-11 min-h-11 rounded-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#8423DA]/40 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold font-mono px-1">
                              {item.quantity}
                            </span>
                            <button
                              aria-label={`Aumentar quantidade de ${item.modelName}`}
                              onClick={() => updateCartQuantity(item.id, 1)}
                              className="min-w-11 min-h-11 rounded-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#8423DA]/40 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* COMBO & DESCONTO PROGRESSIVO */}
                {progCfg.enabled !== false && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#121636] to-[#0D1022] border border-[#00DFFF]/35 space-y-2.5 shadow-md">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold flex items-center gap-1.5 text-white">
                        <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span>{progCfg.title || 'Desconto Progressivo • Leve Mais, Pague Menos'}</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold text-[#00DFFF] px-2 py-0.5 rounded-full bg-[#00DFFF]/10 border border-[#00DFFF]/30">
                        {totalPodUnits} {totalPodUnits === 1 ? 'Pod' : 'Pods'}
                      </span>
                    </div>

                    {/* Stepper Visual */}
                    <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                      <div className={`p-2 rounded-xl border transition-all ${totalPodUnits >= 1 ? 'bg-[#00DFFF]/15 border-[#00DFFF] text-white font-bold' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                        <span className="block font-mono text-[9px] text-[#00DFFF]">1 POD</span>
                        <span>{progCfg.tier1Label || 'Catálogo'}</span>
                      </div>
                      <div className={`p-2 rounded-xl border transition-all ${totalPodUnits >= tier2Min ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                        <span className="block font-mono text-[9px] text-emerald-400">{tier2Min} PODS</span>
                        <span>{progCfg.tier2Label || `${formattedTier2Discount} ✓`}</span>
                      </div>
                      <div className={`p-2 rounded-xl border transition-all ${totalPodUnits >= tier3Min ? 'bg-amber-400/20 border-amber-300 text-amber-200 font-bold shadow-[0_0_12px_rgba(251,191,36,0.25)]' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                        <span className="block font-mono text-[9px] text-amber-300">{tier3Min}+ PODS</span>
                        <span>{progCfg.tier3Label || `${formattedTier3Discount} Total 🔥`}</span>
                      </div>
                    </div>

                    {/* Dynamic Alert Banner */}
                    <div className="text-[11px] leading-snug">
                      {totalPodUnits === 0 && (
                        <p className="text-gray-300">Adicione pods ao carrinho para desbloquear descontos progressivos automáticos (5% e 10% OFF).</p>
                      )}
                      {totalPodUnits > 0 && totalPodUnits < tier2Min && (
                        <p className="text-cyan-200 font-medium flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#00DFFF] shrink-0" />
                          <span>
                            Falta{tier2Min - totalPodUnits > 1 ? 'm' : ''}{' '}
                            <strong>apenas {tier2Min - totalPodUnits} pod{tier2Min - totalPodUnits > 1 ? 's' : ''}</strong> para você destravar <strong>{progCfg.tier2Label || formattedTier2Discount}</strong> em todos os pods!
                          </span>
                        </p>
                      )}
                      {totalPodUnits >= tier2Min && totalPodUnits < tier3Min && (
                        <p className="text-emerald-300 font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>
                            <strong>{progCfg.tier2Label || `${formattedTier2Discount} ativado!`}</strong> Adicione +{tier3Min - totalPodUnits} pod{tier3Min - totalPodUnits > 1 ? 's' : ''} de qualquer marca para subir para <strong>{formattedTier3Discount} em todos os pods</strong>!
                          </span>
                        </p>
                      )}
                      {totalPodUnits >= tier3Min && (
                        <p className="text-amber-300 font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            Super Combo {tier3Min}+ Ativado: <strong>{formattedTier3Discount} automático</strong> garantido em todos os pods!
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* COMPRE JUNTO: PRODUTOS COMPLEMENTARES */}
                {hasAnyActiveAddon && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#00DFFF]" />
                        <span>Compre Junto • Acessórios Recomendados</span>
                      </span>
                      <span className="text-[10px] text-[#A5A5B8]">Adicione em 1 clique</span>
                    </div>

                    {/* 1. Cabo Turbo USB-C */}
                    {usbMatch.visible && (
                      <div
                        className={`p-3 rounded-2xl border transition-all ${
                          isUsbCableAdded
                            ? 'bg-[#182048] border-[#00DFFF] shadow-[0_0_15px_rgba(0,223,255,0.2)]'
                            : 'bg-[#111634] border-[#8423DA]/30 hover:border-[#00DFFF]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#8423DA] to-[#007BFF] flex items-center justify-center text-white shrink-0 shadow-sm text-sm">
                              {usbAddon.icon || <Zap className="w-4 h-4 text-[#00DFFF] fill-[#00DFFF]" />}
                            </div>
                            <div className="text-xs min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-white truncate">{usbAddon.name}</p>
                                {usbMatch.matchedModelName && (
                                  <span className="px-1.5 py-0.2 rounded bg-[#00DFFF]/15 border border-[#00DFFF]/40 text-[9px] font-bold text-[#00DFFF]">
                                    Ideal p/ {usbMatch.matchedModelName}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-[#A5A5B8] truncate">{usbAddon.description}</p>
                              <p className="font-heading font-black text-[#00DFFF] mt-0.5">
                                R$ {Number(usbAddon.price || 0).toFixed(2).replace('.', ',')}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleUsbCable()}
                            className={`min-w-11 min-h-11 w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              isUsbCableAdded
                                ? 'bg-emerald-500 text-white shadow-md'
                                : 'bg-gradient-to-r from-[#007BFF] to-[#00DFFF] text-[#080811] shadow-sm hover:scale-105'
                            }`}
                            title={isUsbCableAdded ? `Remover ${usbAddon.name}` : `Adicionar ${usbAddon.name}`}
                          >
                            {isUsbCableAdded ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 2. Cordão Anti-Queda PodWave */}
                    {lanyardMatch.visible && (
                      <div
                        className={`p-3 rounded-2xl border transition-all ${
                          isLanyardAdded
                            ? 'bg-[#251538] border-[#E53CF3] shadow-[0_0_15px_rgba(229,60,243,0.2)]'
                            : 'bg-[#111634] border-[#8423DA]/30 hover:border-[#E53CF3]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#8423DA] to-[#E53CF3] flex items-center justify-center text-white shrink-0 shadow-sm text-sm">
                              {lanyardAddon.icon || '📿'}
                            </div>
                            <div className="text-xs min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-white truncate">{lanyardAddon.name}</p>
                                {lanyardMatch.matchedModelName && (
                                  <span className="px-1.5 py-0.2 rounded bg-[#E53CF3]/15 border border-[#E53CF3]/40 text-[9px] font-bold text-[#E53CF3]">
                                    Ideal p/ {lanyardMatch.matchedModelName}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-[#A5A5B8] truncate">{lanyardAddon.description}</p>
                              <p className="font-heading font-black text-[#E53CF3] mt-0.5">
                                R$ {Number(lanyardAddon.price || 0).toFixed(2).replace('.', ',')}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleLanyard()}
                            className={`min-w-11 min-h-11 w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              isLanyardAdded
                                ? 'bg-emerald-500 text-white shadow-md'
                                : 'bg-gradient-to-r from-[#8423DA] to-[#E53CF3] text-white shadow-sm hover:scale-105'
                            }`}
                            title={isLanyardAdded ? `Remover ${lanyardAddon.name}` : `Adicionar ${lanyardAddon.name}`}
                          >
                            {isLanyardAdded ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 3. Protetor Higiênico de Bocal */}
                    {siliconeMatch.visible && (
                      <div
                        className={`p-3 rounded-2xl border transition-all ${
                          isSiliconeCoverAdded
                            ? 'bg-[#122825] border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                            : 'bg-[#111634] border-[#8423DA]/30 hover:border-emerald-400/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-400 flex items-center justify-center text-white shrink-0 shadow-sm text-sm">
                              {siliconeAddon.icon || <Shield className="w-4 h-4 text-white" />}
                            </div>
                            <div className="text-xs min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-white leading-snug">{siliconeAddon.name}</p>
                                {siliconeMatch.matchedModelName && (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 border border-emerald-400/40 text-[9px] font-bold text-emerald-300">
                                    Ideal p/ {siliconeMatch.matchedModelName}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-[#A5A5B8] line-clamp-2 leading-relaxed mt-0.5">{siliconeAddon.description}</p>
                              <p className="font-heading font-black text-emerald-300 mt-0.5">
                                R$ {Number(siliconeAddon.price || 0).toFixed(2).replace('.', ',')}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleSiliconeCover()}
                            className={`min-w-11 min-h-11 w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              isSiliconeCoverAdded
                                ? 'bg-emerald-500 text-white shadow-md'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-400 text-[#080811] shadow-sm hover:scale-105'
                            }`}
                            title={isSiliconeCoverAdded ? `Remover ${siliconeAddon.name}` : `Adicionar ${siliconeAddon.name}`}
                          >
                            {isSiliconeCoverAdded ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* "Adicionar um novo produto" button */}
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    const el = document.getElementById('catalogo');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#141838] light:bg-slate-100 hover:bg-[#1D2248] text-xs font-bold text-gray-300 light:text-slate-700 hover:text-white border border-[#8423DA]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#00DFFF]" />
                  <span>Adicionar um novo produto</span>
                </button>

                {/* COMPRA MÍNIMA PARA PONTUAR SELO FIDELIDADE PROGRESS BAR */}
                <div className="p-3.5 rounded-2xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/20 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Sparkles className="w-4 h-4 text-[#00DFFF] flex-shrink-0" />
                    {freeShippingRemaining > 0 ? (
                      <p className="text-gray-300 light:text-slate-700">
                        Faltam <strong className="text-[#00DFFF]">R$ {freeShippingRemaining.toFixed(2).replace('.', ',')}</strong> para atingir a compra mínima (R$ {freeShippingGoal.toFixed(2).replace('.', ',')}) e <strong>pontuar +1 Selo Fidelidade</strong>
                      </p>
                    ) : (
                      <p className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Parabéns! Sua compra já garante +1 Selo no Cartão Fidelidade 🎁
                      </p>
                    )}
                  </div>

                  <div className="w-full h-2 rounded-full bg-[#0D1022] light:bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#007BFF] via-[#00DFFF] to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${freeShippingProgress}%` }}
                    />
                  </div>
                </div>

                {/* COUPON SECTION */}
                <div className="space-y-2">
                  <form onSubmit={handleApplyCoupon} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Ticket className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Digite seu cupom"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 text-xs text-white light:text-slate-900 uppercase font-bold focus:outline-none focus:border-[#00DFFF]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#007BFF] to-[#00DFFF] hover:from-[#0069d9] hover:to-[#00c8e6] text-[#080811] font-black text-xs transition-all shadow-md cursor-pointer"
                    >
                      Aplicar
                    </button>
                  </form>

                  {/* Feedback Message */}
                  {couponFeedback && (
                    <p
                      className={`text-[11px] font-semibold ${
                        couponFeedback.success ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {couponFeedback.message}
                    </p>
                  )}

                  {/* Applied coupon badge */}
                  {appliedCoupon && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs">
                      <span>
                        Cupom <strong>{appliedCoupon.code}</strong> ativo ({appliedCoupon.description})
                      </span>
                      <button
                        onClick={removeCoupon}
                        className="text-rose-400 hover:text-white text-[11px] underline ml-2 cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* FOOTER & CHECKOUT CTA */}
          {cart.length > 0 && (
            <div className="mobile-cart-footer shrink-0 p-4 sm:p-5 border-t border-[#8423DA]/25 light:border-slate-200 bg-[#0B0E20] light:bg-slate-50 space-y-2">
              <details className="mobile-price-details">
                <summary className="min-h-11 flex items-center cursor-pointer text-sm font-semibold text-gray-200 light:text-slate-700">Ver detalhes dos valores</summary>
                <div className="max-h-[25dvh] overflow-y-auto overscroll-contain space-y-2 text-sm text-[#A5A5B8] pb-3">
                <div className="flex justify-between">
                  <span>Subtotal produtos:</span>
                  <span className="font-mono text-white light:text-slate-900">
                    R$ {cartSubtotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                {isUsbCableAdded && usbAddon.active !== false && (
                  <div className="flex justify-between text-[#00DFFF]">
                    <span>{usbAddon.name}:</span>
                    <span className="font-mono">+R$ {cablePrice.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}

                {isLanyardAdded && lanyardAddon.active !== false && (
                  <div className="flex justify-between text-[#E53CF3]">
                    <span>{lanyardAddon.name}:</span>
                    <span className="font-mono">+R$ {lanyardPrice.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}

                {isSiliconeCoverAdded && siliconeAddon.active !== false && (
                  <div className="flex justify-between text-emerald-300">
                    <span>{siliconeAddon.name}:</span>
                    <span className="font-mono">+R$ {siliconeCoverPrice.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}

                {progressiveDiscountAmount > 0 && (
                  <div className="flex justify-between text-amber-300 font-bold bg-amber-400/10 px-2 py-1 rounded-lg border border-amber-400/25">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>
                        Combo {totalPodUnits >= tier3Min ? `${tier3Min}+` : `${tier2Min}`} Pods ({totalPodUnits >= tier3Min ? formattedTier3Discount : formattedTier2Discount}):
                      </span>
                    </span>
                    <span className="font-mono">-R$ {progressiveDiscountAmount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}

                <p className="text-xs text-gray-400">Descontos em produtos não são cumulativos: aplicamos somente o maior benefício. Frete grátis é separado.</p>

                {isVip && vipDiscountAmount > 0 && (
                  <div className="flex justify-between text-amber-300 font-bold">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Desconto Cliente VIP ({vipDiscountRate}%):</span>
                    </span>
                    <span className="font-mono">-R$ {vipDiscountAmount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Cupom ({appliedCoupon.code}):</span>
                    <span className="font-mono">{appliedCoupon.discountType === 'free_shipping' ? 'Isenção na entrega' : Math.max(0, discountAmount - vipDiscountAmount - progressiveDiscountAmount) > 0 ? `-R$ ${Math.max(0, discountAmount - vipDiscountAmount - progressiveDiscountAmount).toFixed(2).replace('.', ',')}` : 'Maior benefício já aplicado'}</span>
                  </div>
                )}

                </div>
              </details>
              <div className="space-y-1.5 text-sm text-[#A5A5B8]">
                <div className="flex justify-between items-baseline pt-2 border-t border-[#8423DA]/20">
                  <span className="font-heading font-extrabold text-base text-white light:text-slate-900">
                    Total
                  </span>
                  <span className="font-heading text-2xl font-black text-white light:text-slate-900">
                    R$ {cartTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              <p className="text-xs text-emerald-300 mb-2">{isProgressiveFreeShipping
                ? 'Frete grátis por promoção. Retirada sempre sem taxa.'
                : 'A taxa de entrega será exibida na finalização. Retirada sem taxa.'}</p>
              {/* Green checkout button matching image_466b4232.png */}
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  setIsCheckoutOpen(true);
                }}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-heading font-black text-sm tracking-wide shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Finalizar Pedido</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

