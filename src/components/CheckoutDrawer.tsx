import React, { useState } from 'react';
import { useCatalog } from '../context/CatalogContext';
import { USB_C_ADDON } from '../data/initialData';
import { GpsLocationSection } from './GpsLocationSection';
import {
  X,
  Store,
  CreditCard,
  Send,
  AlertCircle,
  Gift,
  Ticket,
  Percent,
  Tag,
  Check
} from 'lucide-react';

interface DemoCoupon {
  code: string;
  percentage: number;
  description: string;
  minOrderValue?: number;
}

const DEMO_CHECKOUT_COUPONS: DemoCoupon[] = [
  { code: 'PODWAVE10', percentage: 10, description: '10% OFF oficial PodWave' },
  { code: 'SAOLUIS15', percentage: 15, description: '15% OFF especial São Luís' },
  { code: 'TURBO20', percentage: 20, description: '20% OFF modo Turbo Puffs' },
  { code: 'VIP25', percentage: 25, description: '25% OFF cliente VIP exclusivo', minOrderValue: 120 },
  { code: 'PRIMEIRACOMPRA', percentage: 10, description: '10% OFF primeira compra' },
];

export const CheckoutDrawer: React.FC = () => {
  const {
    cart,
    isUsbCableAdded,
    coupons,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    discountAmount,
    cartSubtotal,
    cartTotal,
    isCheckoutOpen,
    setIsCheckoutOpen,
    submitOrderViaWhatsapp,
    settings,
  } = useCatalog();

  const [fullName, setFullName] = useState('');
  const [phoneWhatsapp, setPhoneWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [isPickup, setIsPickup] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [wantsLoyaltyCard, setWantsLoyaltyCard] = useState(false);
  const [gpsMapsUrl, setGpsMapsUrl] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamic coupon input and validation
  const [couponCode, setCouponCode] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleApplyCoupon = (codeToApply?: string) => {
    const rawCode = codeToApply || couponCode;
    const trimmed = rawCode.trim().toUpperCase();

    if (!trimmed) {
      setCouponFeedback({
        success: false,
        message: 'Por favor, digite um código de cupom.',
      });
      return;
    }

    // Call unified context validation (which verifies active status, specific model, and usage limit!)
    const result = applyCoupon(trimmed);
    setCouponFeedback(result);

    if (result.success) {
      setCouponCode('');
    }
  };

  if (!isCheckoutOpen) return null;

  const handleFormatPhone = (val: string) => {
    // Basic mask (00) 00000-0000
    const numbers = val.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 2) {
      setPhoneWhatsapp(numbers);
    } else if (numbers.length <= 7) {
      setPhoneWhatsapp(`(${numbers.slice(0, 2)}) ${numbers.slice(2)}`);
    } else {
      setPhoneWhatsapp(`(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Por favor informe seu nome completo.');
      return;
    }
    if (!phoneWhatsapp.trim()) {
      setErrorMessage('Por favor informe seu telefone / WhatsApp para contato.');
      return;
    }
    if (!isPickup && !address.trim()) {
      setErrorMessage('Por favor informe o endereço de entrega ou selecione a opção de retirada no local.');
      return;
    }
    if (!paymentMethod || paymentMethod === 'Selecione...') {
      setErrorMessage('Por favor selecione a forma de pagamento desejada.');
      return;
    }

    submitOrderViaWhatsapp({
      fullName,
      phoneWhatsapp,
      address,
      isPickup,
      paymentMethod,
      notes,
      wantsLoyaltyCard,
      gpsMapsUrl,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={() => setIsCheckoutOpen(false)}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-[#0D1022] light:bg-white text-white light:text-slate-900 border-l border-[#8423DA]/30 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
          {/* HEADER */}
          <div className="p-5 border-b border-[#8423DA]/25 light:border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📝</span>
              <h2 className="font-heading text-lg font-extrabold tracking-tight">
                Finalizar Pedido
              </h2>
            </div>

            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="p-1.5 rounded-xl bg-[#181C38] light:bg-slate-100 hover:bg-[#8423DA] text-gray-300 hover:text-white transition-all cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* FORM CONTENT */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Nome Completo */}
            <div>
              <label className="block text-xs font-bold text-gray-200 light:text-slate-800 mb-1.5">
                Nome completo *
              </label>
              <input
                type="text"
                placeholder="Seu nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3.5 py-3 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 text-white light:text-slate-900 text-xs focus:outline-none focus:border-[#00DFFF]"
              />
            </div>

            {/* Telefone / WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-gray-200 light:text-slate-800 mb-1.5">
                Telefone / WhatsApp *
              </label>
              <input
                type="text"
                placeholder="(00) 00000-0000"
                value={phoneWhatsapp}
                onChange={(e) => handleFormatPhone(e.target.value)}
                required
                className="w-full px-3.5 py-3 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 text-white light:text-slate-900 text-xs font-mono focus:outline-none focus:border-[#00DFFF]"
              />
            </div>

            {/* Endereço de entrega com Localização GPS opcional */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-200 light:text-slate-800">
                Endereço de entrega
              </label>

              {/* Seção Localização GPS Autônoma e Respeitosa com Privacidade */}
              <GpsLocationSection
                onLocationCaptured={(data) => {
                  setGpsMapsUrl(data.mapsUrl);
                }}
                onLocationRemoved={() => {
                  setGpsMapsUrl(undefined);
                }}
              />

              {/* Textarea for address */}
              <div className="space-y-1">
                <textarea
                  rows={3}
                  placeholder="Condomínio, rua, número, bairro, ponto de referência (você também pode colar o link do Google Maps aqui se desejar)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={isPickup}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 text-white light:text-slate-900 text-xs focus:outline-none focus:border-[#00DFFF] disabled:opacity-40"
                />
              </div>

              {/* Checkbox: Retirar no local */}
              <label className="p-3 rounded-xl bg-[#11152A] light:bg-slate-100 border border-[#8423DA]/25 flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-200 light:text-slate-800">
                <input
                  type="checkbox"
                  checked={isPickup}
                  onChange={(e) => setIsPickup(e.target.checked)}
                  className="w-4 h-4 rounded text-[#8423DA] focus:ring-[#00DFFF] cursor-pointer"
                />
                <Store className="w-4 h-4 text-[#00DFFF]" />
                <span>🏪 Vou retirar o pedido no local (sem frete)</span>
              </label>
            </div>

            {/* Forma de Pagamento */}
            <div>
              <label className="block text-xs font-bold text-gray-200 light:text-slate-800 mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#00DFFF]" />
                Forma de pagamento *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                required
                className="w-full px-3.5 py-3 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 text-white light:text-slate-900 text-xs focus:outline-none focus:border-[#00DFFF] cursor-pointer"
              >
                <option value="">Selecione...</option>
                <option value="Pix na Entrega">Pix na Entrega (Chave na entrega)</option>
                <option value="Cartão de Crédito na Entrega">Cartão de Crédito na maquininha</option>
                <option value="Cartão de Débito na Entrega">Cartão de Débito na maquininha</option>
                <option value="Dinheiro">Dinheiro em espécie</option>
              </select>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-xs font-bold text-gray-200 light:text-slate-800 mb-1.5">
                Observações
              </label>
              <textarea
                rows={2}
                placeholder="Troco para quanto, ponto de referência, etc. (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 text-white light:text-slate-900 text-xs focus:outline-none focus:border-[#00DFFF]"
              />
            </div>

            {/* Checkbox: Cartão fidelidade */}
            <label className="p-3 rounded-xl bg-[#11152A] light:bg-slate-100 border border-[#8423DA]/25 flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-200 light:text-slate-800">
              <input
                type="checkbox"
                checked={wantsLoyaltyCard}
                onChange={(e) => setWantsLoyaltyCard(e.target.checked)}
                className="w-4 h-4 rounded text-[#8423DA] focus:ring-[#00DFFF] cursor-pointer"
              />
              <Gift className="w-4 h-4 text-[#E53CF3]" />
              <span>🎁 Quero receber o cartão fidelidade (opcional)</span>
            </label>

            {/* CAMPO DE CUPOM DE DESCONTO COM VALIDAÇÃO EM ARRAY LOCAL */}
            <div className="p-4 rounded-2xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-200 light:text-slate-800 flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-[#00DFFF]" />
                  <span>Cupom de Desconto</span>
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8423DA]/30 text-[#00DFFF] border border-[#8423DA]/40">
                  Redução % no Total
                </span>
              </div>

              {/* Input e Botão Aplicar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Percent className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Digite o cupom (ex: SAOLUIS15)"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      if (couponFeedback) setCouponFeedback(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyCoupon();
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#0D1022] light:bg-white border border-[#8423DA]/30 text-white light:text-slate-900 text-xs font-mono font-bold tracking-wider uppercase focus:outline-none focus:border-[#00DFFF]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyCoupon()}
                  disabled={!couponCode.trim()}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#007BFF] to-[#00DFFF] hover:from-[#0069d9] hover:to-[#00c8e6] text-[#080811] text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 active:scale-95"
                >
                  Aplicar
                </button>
              </div>

              {/* Mensagem de Feedback de Validação */}
              {couponFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
                    couponFeedback.success
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {couponFeedback.success ? (
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  )}
                  <span className="text-[11px] font-medium leading-tight">{couponFeedback.message}</span>
                </div>
              )}

              {/* Cupom Ativo em Destaque */}
              {appliedCoupon && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-xs text-emerald-400">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-bold">{appliedCoupon.code}</span>
                    <span className="text-[11px] text-gray-300 light:text-slate-600">
                      ({appliedCoupon.discountType === 'percent' ? `${appliedCoupon.value}% OFF` : `R$ ${appliedCoupon.value} OFF`})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      removeCoupon();
                      setCouponFeedback(null);
                    }}
                    className="text-[11px] text-rose-400 hover:text-white underline font-semibold cursor-pointer"
                  >
                    Remover
                  </button>
                </div>
              )}

              {/* Chips rápidos com cupons disponíveis */}
              <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="text-gray-400 font-medium">Cupons:</span>
                {coupons
                  .filter((c) => c.active !== false && (!c.maxUses || c.usedCount < c.maxUses))
                  .slice(0, 5)
                  .map((demo) => {
                    const isCurrent = appliedCoupon?.code.toUpperCase() === demo.code.toUpperCase();
                    const discountLabel = demo.discountType === 'percent' ? `${demo.value}%` : `R$ ${demo.value}`;
                    return (
                      <button
                        key={demo.id || demo.code}
                        type="button"
                        onClick={() => {
                          setCouponCode(demo.code);
                          handleApplyCoupon(demo.code);
                        }}
                        className={`px-2 py-0.5 rounded-lg border font-mono transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 font-bold'
                            : 'bg-[#0D1022] light:bg-slate-200 hover:bg-[#8423DA]/30 border-[#8423DA]/25 hover:border-[#00DFFF] text-[#00DFFF]'
                        }`}
                        title={`Aplicar ${discountLabel} OFF (${demo.description})`}
                      >
                        {demo.code} (-{discountLabel})
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* RESUMO DO PEDIDO */}
            <div className="pt-3 border-t border-[#8423DA]/20 space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-[#A5A5B8]">
                RESUMO DO PEDIDO
              </p>

              <div className="space-y-1.5">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-xs py-1 border-b border-[#8423DA]/10"
                  >
                    <div>
                      <span className="font-bold text-white light:text-slate-900">
                        {item.quantity}x {item.modelName}
                      </span>
                      <p className="text-[11px] text-[#A5A5B8] flex items-center gap-1">
                        <span>{item.flavorEmoji}</span> {item.flavorName}
                      </p>
                    </div>
                    <span className="font-heading font-bold text-white light:text-slate-900">
                      R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))}

                <div className="flex items-center justify-between text-xs py-1 text-gray-400">
                  <span>Subtotal itens:</span>
                  <span className="font-mono text-white light:text-slate-900">
                    R$ {cartSubtotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                {isUsbCableAdded && (
                  <div className="flex items-center justify-between text-xs py-1 text-[#00DFFF]">
                    <span>1x {USB_C_ADDON.name}</span>
                    <span className="font-bold font-mono">
                      +R$ {USB_C_ADDON.price.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}

                {appliedCoupon && (
                  <div className="flex items-center justify-between text-xs py-1 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Desconto ({appliedCoupon.code} &bull; {appliedCoupon.discountType === 'percent' ? `${appliedCoupon.value}%` : ''} OFF):
                    </span>
                    <span className="font-bold font-mono">
                      -R$ {discountAmount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-baseline justify-between border-t border-[#8423DA]/20">
                <div>
                  <span className="font-heading font-extrabold text-sm text-white light:text-slate-900 block">
                    Total
                  </span>
                  {appliedCoupon && (
                    <span className="text-[10px] text-emerald-400 font-bold">
                      Economia de R$ {discountAmount.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                </div>
                <span className="font-heading text-2xl font-black text-white light:text-slate-900">
                  R$ {cartTotal.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Green WhatsApp Submit Button matching user screenshot */}
            <button
              type="submit"
              className="w-full py-4 px-6 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-heading font-black text-sm tracking-wide shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
            >
              <Send className="w-4 h-4" />
              <span>Confirmar e Enviar no WhatsApp</span>
            </button>

            <p className="text-[10px] text-center text-[#A5A5B8] leading-tight">
              Ao confirmar, seu pedido será aberto pronto para envio direto no WhatsApp oficial{' '}
              <strong className="text-white light:text-slate-900">{settings.supportPhone}</strong>.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
