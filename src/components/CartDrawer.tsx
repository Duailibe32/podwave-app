import React, { useState } from 'react';
import { useCatalog } from '../context/CatalogContext';
import { USB_C_ADDON } from '../data/initialData';
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
} from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    removeFromCart,
    updateCartQuantity,
    isUsbCableAdded,
    toggleUsbCable,
    cablePrice,
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
  } = useCatalog();

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
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex h-dvh w-full max-w-md">
        <div className="min-w-0 w-full max-w-full bg-[#0D1022] light:bg-white text-white light:text-slate-900 border-l border-[#8423DA]/30 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
          {/* HEADER */}
          <div className="p-5 border-b border-[#8423DA]/25 light:border-slate-200 flex items-center justify-between">
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
              className="p-1.5 rounded-xl bg-[#181C38] light:bg-slate-100 hover:bg-[#8423DA] text-gray-300 hover:text-white transition-all cursor-pointer"
              title="Fechar carrinho"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* MAIN SCROLLABLE CONTENT */}
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-5">
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
                          <h4 className="font-heading font-bold text-sm truncate text-white light:text-slate-900">
                            {item.modelName}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-gray-400 hover:text-rose-400 p-1 transition-colors cursor-pointer"
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
                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[#8423DA]/15">
                          <span className="font-heading font-bold text-sm text-white light:text-slate-900">
                            R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                          </span>

                          <div className="flex items-center gap-2 bg-[#0D1022] light:bg-white rounded-lg p-1 border border-[#8423DA]/30">
                            <button
                              onClick={() => updateCartQuantity(item.id, -1)}
                              className="w-6 h-6 rounded flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#8423DA]/40 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold font-mono px-1">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateCartQuantity(item.id, 1)}
                              className="w-6 h-6 rounded flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#8423DA]/40 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* UPSELL: CABO USB-C 1M TURBO */}
                <div
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isUsbCableAdded
                      ? 'bg-[#182048] border-[#00DFFF] shadow-[0_0_15px_rgba(0,223,255,0.25)]'
                      : 'bg-[#111634] light:bg-slate-50 border-[#8423DA]/35 hover:border-[#00DFFF]/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8423DA] to-[#007BFF] flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                        <Zap className="w-4 h-4 text-[#00DFFF] fill-[#00DFFF]" />
                      </div>
                      <div className="text-xs">
                        <p className="font-medium text-gray-200 light:text-slate-800">
                          Levar um <strong className="text-white light:text-slate-900">Cabo USB tipo C 1m TURBO</strong> {USB_C_ADDON.description}
                        </p>
                        <p className="font-heading font-bold text-white light:text-slate-900 mt-0.5">
                          R$ {USB_C_ADDON.price.toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleUsbCable()}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                        isUsbCableAdded
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-gradient-to-r from-[#007BFF] to-[#00DFFF] text-[#080811] shadow-sm hover:scale-105'
                      }`}
                      title={isUsbCableAdded ? 'Remover cabo turbo' : 'Adicionar cabo turbo'}
                    >
                      {isUsbCableAdded ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4 stroke-[3]" />}
                    </button>
                  </div>
                </div>

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

                {/* FREE SHIPPING PROGRESS BAR */}
                <div className="p-3.5 rounded-2xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/20 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Truck className="w-4 h-4 text-[#00DFFF] flex-shrink-0" />
                    {freeShippingRemaining > 0 ? (
                      <p className="text-gray-300 light:text-slate-700">
                        Faltam <strong className="text-[#00DFFF]">R$ {freeShippingRemaining.toFixed(2).replace('.', ',')}</strong> para o frete grátis
                      </p>
                    ) : (
                      <p className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Parabéns! Você atingiu Frete Grátis
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

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-400">
                    <span>Sugestões:</span>
                    {coupons
                      .filter((c) => c.active !== false && (!c.maxUses || c.usedCount < c.maxUses))
                      .slice(0, 4)
                      .map((c) => (
                        <button
                          key={c.id || c.code}
                          type="button"
                          onClick={() => setCouponCode(c.code)}
                          className="px-1.5 py-0.5 rounded bg-[#181C38] text-[#00DFFF] hover:underline font-mono"
                          title={c.description}
                        >
                          {c.code}
                        </button>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* FOOTER & CHECKOUT CTA */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-[#8423DA]/25 light:border-slate-200 bg-[#0B0E20] light:bg-slate-50 space-y-3">
              <div className="space-y-1.5 text-xs text-[#A5A5B8]">
                <div className="flex justify-between">
                  <span>Subtotal produtos:</span>
                  <span className="font-mono text-white light:text-slate-900">
                    R$ {cartSubtotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                {isUsbCableAdded && (
                  <div className="flex justify-between text-[#00DFFF]">
                    <span>Cabo Turbo USB-C:</span>
                    <span className="font-mono">+R$ {cablePrice.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}

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
                    <span className="font-mono">-R$ {(discountAmount - vipDiscountAmount > 0 ? discountAmount - vipDiscountAmount : discountAmount).toFixed(2).replace('.', ',')}</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-2 border-t border-[#8423DA]/20">
                  <span className="font-heading font-extrabold text-base text-white light:text-slate-900">
                    Total
                  </span>
                  <span className="font-heading text-2xl font-black text-white light:text-slate-900">
                    R$ {cartTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

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

