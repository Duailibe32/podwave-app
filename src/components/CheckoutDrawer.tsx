import React, { useState, useEffect } from 'react';
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
  Check,
  LogIn,
  UserCheck,
  Sparkles,
} from 'lucide-react';

import { OrderRecordPreviewModal } from './OrderRecordPreviewModal';
import { getUserLoyaltyCard } from '../utils/loyaltyCard';

export const CheckoutDrawer: React.FC = () => {
  const {
    cart,
    isUsbCableAdded,
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
    isCheckoutOpen,
    setIsCheckoutOpen,
    submitOrderViaWhatsapp,
    settings,
    currentUser,
    openAuthModal,
    openProfileModal,
    updateCustomerProfile,
    recordCustomerOrder,
  } = useCatalog();

  const currentLoyalty = currentUser
    ? getUserLoyaltyCard(currentUser, settings.loyaltyGoalStamps || 10, settings.loyaltyDefaultReward)
    : null;

  const [fullName, setFullName] = useState('');
  const [phoneWhatsapp, setPhoneWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [bairro, setBairro] = useState('');
  const [city, setCity] = useState('');
  const [numberAndComplement, setNumberAndComplement] = useState('');
  const [referencePoint, setReferencePoint] = useState('');
  const [cep, setCep] = useState('');
  const [isPickup, setIsPickup] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [wantsLoyaltyCard, setWantsLoyaltyCard] = useState(false);
  const [gpsMapsUrl, setGpsMapsUrl] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [saveAddressToAccount, setSaveAddressToAccount] = useState(true);

  // Pre-fill fields automatically from logged-in customer profile
  useEffect(() => {
    if (currentUser && isCheckoutOpen) {
      if (currentUser.fullName) {
        setFullName(currentUser.fullName);
      }
      if (currentUser.phoneWhatsapp) {
        setPhoneWhatsapp(currentUser.phoneWhatsapp);
      }
      if (currentUser.address) {
        if (currentUser.address.street) {
          setAddress(currentUser.address.street);
        }
        const numComp = [currentUser.address.number, currentUser.address.complement].filter(Boolean).join(' - ');
        if (numComp) {
          setNumberAndComplement(numComp);
        }
        if (currentUser.address.bairro) {
          setBairro(currentUser.address.bairro);
        }
        const cityState = [currentUser.address.city, currentUser.address.state].filter(Boolean).join(' - ');
        if (cityState) {
          setCity(cityState);
        }
        if (currentUser.address.referencePoint) {
          setReferencePoint(currentUser.address.referencePoint);
        }
        if (currentUser.address.cep) {
          setCep(currentUser.address.cep);
        }
      }
    }
  }, [currentUser, isCheckoutOpen]);

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

    // Salvar pedido no histórico do cliente e atualizar dados para compras futuras
    if (currentUser) {
      const addressSummary = isPickup
        ? 'Retirada no Local'
        : `${address}${numberAndComplement ? `, ${numberAndComplement}` : ''}${bairro ? ` - ${bairro}` : ''}${city ? ` (${city})` : ''}`;

      recordCustomerOrder({
        referenceId: `PW-${Date.now().toString().slice(-6)}`,
        subtotal: cartSubtotal,
        discount: discountAmount,
        total: cartTotal,
        paymentMethod,
        deliveryType: isPickup ? 'pickup' : 'delivery',
        addressSummary,
        items: cart,
      });

      if (saveAddressToAccount && !isPickup) {
        updateCustomerProfile({
          fullName,
          phoneWhatsapp,
          address: {
            street: address,
            number: numberAndComplement,
            bairro,
            city,
            referencePoint,
            cep: cep || currentUser.address?.cep,
          },
        });
      }
    }

    submitOrderViaWhatsapp({
      fullName,
      phoneWhatsapp,
      address,
      bairro: bairro.trim() || undefined,
      city: city.trim() || undefined,
      numberAndComplement: numberAndComplement.trim() || undefined,
      referencePoint: referencePoint.trim() || undefined,
      isPickup,
      paymentMethod,
      notes,
      wantsLoyaltyCard,
      loyaltyStampsSnapshot: currentLoyalty?.stamps,
      loyaltyGoalSnapshot: currentLoyalty?.goal,
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

            {/* Smart Customer Account Banner */}
            {currentUser ? (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/40 via-[#141838] to-[#11152A] border border-[#8423DA]/50 flex items-center justify-between text-xs shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#8423DA] to-[#00DFFF] flex items-center justify-center text-sm shadow">
                    {currentUser.role === 'owner' ? '👑' : '👤'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-bold">{currentUser.fullName}</span>
                      <span className="text-[10px] bg-purple-500/20 text-[#00DFFF] px-2 py-0.5 rounded-full border border-purple-500/30 font-semibold">
                        {currentUser.role === 'owner' ? 'Proprietário' : 'Cliente PodWave'}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5 font-medium">
                      <Check className="w-3 h-3 text-emerald-400" /> Dados e endereço preenchidos automaticamente
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-[#141838] border border-[#8423DA]/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#8423DA]/20 border border-[#8423DA]/40 flex items-center justify-center text-[#00DFFF]">
                    <LogIn className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-xs">Deseja salvar seus dados?</p>
                    <p className="text-[11px] text-[#A5A5B8]">Faça login para salvar seus dados e agilizar compras futuras.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="px-3 py-1.5 rounded-xl bg-[#8423DA] hover:bg-[#9d3aef] text-white text-xs font-bold cursor-pointer transition-colors shadow shrink-0"
                >
                  Entrar
                </button>
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

              {/* Detailed Address inputs for administrative attendance record */}
              {!isPickup && (
                <div className="space-y-2.5 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[11px] text-gray-300 font-semibold mb-1">
                      Rua / Avenida / Logradouro *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Av. dos Holandeses, Rua das Palmeiras"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required={!isPickup}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-gray-300 font-semibold mb-1">
                        Número e Complemento
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 104, Bloco B, Apt 302"
                        value={numberAndComplement}
                        onChange={(e) => setNumberAndComplement(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-300 font-semibold mb-1">
                        Bairro
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Calhau, Renascença, Cohama"
                        value={bairro}
                        onChange={(e) => setBairro(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-gray-300 font-semibold mb-1">
                        Cidade
                      </label>
                      <input
                        type="text"
                        placeholder="Sua cidade"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-300 font-semibold mb-1">
                        Ponto de Referência
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Próximo à praça ou farmácia"
                        value={referencePoint}
                        onChange={(e) => setReferencePoint(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Checkbox: Retirar no local */}
              <label className="p-3 rounded-xl bg-[#11152A] border border-[#8423DA]/25 flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-200">
                <input
                  type="checkbox"
                  checked={isPickup}
                  onChange={(e) => setIsPickup(e.target.checked)}
                  className="w-4 h-4 rounded text-[#8423DA] focus:ring-[#00DFFF] cursor-pointer"
                />
                <Store className="w-4 h-4 text-[#00DFFF]" />
                <span>🏪 Vou retirar o pedido no local (sem taxa de entrega)</span>
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

            {/* Cartão Fidelidade Digital */}
            <div className="p-3.5 rounded-2xl bg-[#11152A] light:bg-slate-100 border border-[#8423DA]/30 space-y-2">
              <label className="flex items-center justify-between gap-2.5 cursor-pointer text-xs font-semibold text-gray-200 light:text-slate-800">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={wantsLoyaltyCard}
                    onChange={(e) => setWantsLoyaltyCard(e.target.checked)}
                    className="w-4 h-4 rounded text-[#8423DA] focus:ring-[#00DFFF] cursor-pointer"
                  />
                  <Gift className="w-4 h-4 text-[#E53CF3] shrink-0" />
                  <span>🎁 Solicitar selo no Cartão Fidelidade Digital</span>
                </div>
                {currentLoyalty && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCheckoutOpen(false);
                      openProfileModal();
                    }}
                    className="px-2 py-0.5 rounded-full bg-[#8423DA]/25 border border-[#00DFFF]/40 text-[#00DFFF] font-mono font-bold text-[10px] shrink-0 hover:bg-[#8423DA]/40 transition cursor-pointer"
                    title="Ver meu Cartão Fidelidade Digital"
                  >
                    {currentLoyalty.stamps}/{currentLoyalty.goal} selos
                  </button>
                )}
              </label>
              {currentLoyalty && (
                <div className="pl-6 text-[11px] text-[#A5A5B8] flex items-center justify-between">
                  <span>
                    {currentLoyalty.stamps >= currentLoyalty.goal
                      ? '🎉 Seu cartão está completo! Avise no WhatsApp para resgatar seu prêmio.'
                      : `Você possui ${currentLoyalty.stamps} de ${currentLoyalty.goal} selos acumulados na sua conta.`}
                  </span>
                </div>
              )}
            </div>

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
                    placeholder="Digite o cupom (ex: PODWAVE15)"
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

                {isVip && vipDiscountAmount > 0 && (
                  <div className="flex items-center justify-between text-xs py-1 text-amber-300 bg-amber-400/10 px-2 py-1 rounded-lg border border-amber-400/30">
                    <span className="flex items-center gap-1 font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Desconto Cliente VIP ({vipDiscountRate}% OFF):
                    </span>
                    <span className="font-bold font-mono">
                      -R$ {vipDiscountAmount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}

                {appliedCoupon && (
                  <div className="flex items-center justify-between text-xs py-1 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Cupom ({appliedCoupon.code} &bull; {appliedCoupon.discountType === 'percent' ? `${appliedCoupon.value}%` : ''} OFF):
                    </span>
                    <span className="font-bold font-mono">
                      -R$ {(discountAmount - vipDiscountAmount > 0 ? discountAmount - vipDiscountAmount : discountAmount).toFixed(2).replace('.', ',')}
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

            {/* Salvar dados de entrega na conta */}
            {currentUser && !isPickup && (
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 p-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/25">
                <input
                  type="checkbox"
                  checked={saveAddressToAccount}
                  onChange={(e) => setSaveAddressToAccount(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#8423DA] bg-[#0D1022] border-[#8423DA]/40 cursor-pointer"
                />
                <span className="text-[11px] text-gray-200">
                  Salvar ou atualizar este endereço na minha conta para compras futuras
                </span>
              </label>
            )}

            {/* Visualizar Registro / Ficha Administrativa (PodWave 2.0) */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="w-full py-3 px-4 rounded-xl bg-[#141838] hover:bg-[#1a204a] text-[#00DFFF] hover:text-white border border-[#8423DA]/50 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>📄 Visualizar Ficha / Registro Administrativo</span>
              </button>

              {/* Green WhatsApp Submit Button matching user screenshot */}
              <button
                type="submit"
                className="w-full py-4 px-6 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-heading font-black text-sm tracking-wide shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
              >
                <Send className="w-4 h-4" />
                <span>Confirmar e Enviar no WhatsApp</span>
              </button>
            </div>

            <p className="text-[10px] text-center text-[#A5A5B8] leading-tight">
              Ao confirmar, seu pedido será aberto pronto para envio direto no WhatsApp oficial{' '}
              <strong className="text-white">{settings.supportPhone}</strong>.
            </p>
          </form>
        </div>
      </div>

      {/* MODAL: Visualizar Ficha de Atendimento & Copiar Registro */}
      <OrderRecordPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onEdit={() => setIsPreviewOpen(false)}
        form={{
          fullName,
          phoneWhatsapp,
          address,
          bairro: bairro.trim() || undefined,
          city: city.trim() || undefined,
          numberAndComplement: numberAndComplement.trim() || undefined,
          referencePoint: referencePoint.trim() || undefined,
          isPickup,
          paymentMethod,
          notes,
          wantsLoyaltyCard,
          gpsMapsUrl,
        }}
      />
    </div>
  );
};
