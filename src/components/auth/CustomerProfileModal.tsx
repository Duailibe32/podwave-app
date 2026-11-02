import React, { useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { formatCep, formatBrazilianPhone } from "../../utils/customerInputs";
import { useCepLookup } from "../../hooks/useCepLookup";
import { CustomerAddress, PasskeyItem } from '../../types/catalog';
import { OrderNotificationSettings } from '../../context/OrderNotificationsContext';
import { OrderStatusTimeline } from '../OrderStatusTimeline';
import {
  getUserLoyaltyCard,
  getRedeemedRewardsHistory,
} from '../../utils/loyaltyCard';
import { DigitalLoyaltyCard } from '../ui/DigitalLoyaltyCard';
import { fetchCustomerOrdersFromSupabase } from '../../services/supabase';
import {
  X,
  User,
  MapPin,
  ShoppingBag,
  LogOut,
  Save,
  Crown,
  Sparkles,
  Phone,
  Mail,
  Search,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Gift,
  Trophy,
  History,
  Calendar,
  MessageCircle,
  AlertCircle,
  Fingerprint,
  Smartphone,
  Laptop,
  Trash2,
  Edit3,
  Plus,
  ShieldAlert,
  KeyRound,
  Check,
} from 'lucide-react';
import { PasskeyBiometricLoading } from './PasskeyBiometricLoading';

export const CustomerProfileModal: React.FC = () => {
  const {
    currentUser,
    isOwner,
    isAdmin,
    isVip,
    settings,
    isProfileModalOpen,
    closeProfileModal,
    logoutUser,
    updateCustomerProfile,
    setCurrentView,
    registerPasskey,
    listPasskeys,
    updatePasskeyName,
    deletePasskey,
    checkPasskeySupport,
  } = useCatalog();

  const [activeTab, setActiveTab] = useState<'profile' | 'loyalty' | 'orders' | 'security'>('profile');
  React.useEffect(() => {
    const openOrders = () => setActiveTab('orders');
    const openLoyalty = () => setActiveTab('loyalty');
    window.addEventListener('podwave:open-orders',openOrders);
    window.addEventListener('podwave:open-loyalty',openLoyalty);
    return () => {
      window.removeEventListener('podwave:open-orders',openOrders);
      window.removeEventListener('podwave:open-loyalty',openLoyalty);
    };
  },[]);
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [phoneWhatsapp, setPhoneWhatsapp] = useState(currentUser?.phoneWhatsapp || '');
  const [cpf, setCpf] = useState(currentUser?.cpf || '');

  // Address
  const [cep, setCep] = useState(currentUser?.address?.cep || '');
  const [street, setStreet] = useState(currentUser?.address?.street || '');
  const [number, setNumber] = useState(currentUser?.address?.number || '');
  const [bairro, setBairro] = useState(currentUser?.address?.bairro || '');
  const [complement, setComplement] = useState(currentUser?.address?.complement || '');
  const [city, setCity] = useState(currentUser?.address?.city || '');
  const [state, setState] = useState(currentUser?.address?.state || '');


  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isLoadingCustomerOrders, setIsLoadingCustomerOrders] = useState(false);
  const [customerOrdersError, setCustomerOrdersError] = useState<string | null>(null);
  const [remoteOrders, setRemoteOrders] = useState(currentUser?.orderHistory || []);
  const activeOrdersReqRef = React.useRef(0);

  const loadAuthenticatedOrders = React.useCallback(async () => {
    if (!currentUser?.id) return;
    const reqId = ++activeOrdersReqRef.current;
    const targetUserId = currentUser.id;
    setIsLoadingCustomerOrders(true);
    setCustomerOrdersError(null);
    try {
      const fetched = await fetchCustomerOrdersFromSupabase(targetUserId);
      if (reqId !== activeOrdersReqRef.current) return;
      if (fetched && fetched.length > 0) {
        setRemoteOrders(fetched);
      } else {
        setRemoteOrders(currentUser.orderHistory || []);
      }
    } catch {
      if (reqId !== activeOrdersReqRef.current) return;
      setCustomerOrdersError(
        'Não foi possível sincronizar seus pedidos com o banco no momento. Verifique sua conexão e tente novamente.'
      );
    } finally {
      if (reqId === activeOrdersReqRef.current) {
        setIsLoadingCustomerOrders(false);
      }
    }
  }, [currentUser?.id, currentUser?.orderHistory]);

  React.useEffect(() => {
    if (isProfileModalOpen && activeTab === 'orders' && currentUser?.id) {
      loadAuthenticatedOrders();
    }
  }, [isProfileModalOpen, activeTab, currentUser?.id, loadAuthenticatedOrders]);

  // Passkey / WebAuthn States & Handlers
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [isLoadingPasskeys, setIsLoadingPasskeys] = useState(false);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [passkeyFeedback, setPasskeyFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isPasskeySupported, setIsPasskeySupported] = useState<boolean | null>(null);
  const [editingPasskeyId, setEditingPasskeyId] = useState<string | null>(null);
  const [editingPasskeyName, setEditingPasskeyName] = useState('');
  const [isRenamingPasskey, setIsRenamingPasskey] = useState(false);
  const [deletingPasskeyId, setDeletingPasskeyId] = useState<string | null>(null);
  const [isDeletingPasskey, setIsDeletingPasskey] = useState(false);

  const loadPasskeys = React.useCallback(async () => {
    setIsLoadingPasskeys(true);
    setPasskeyFeedback(null);
    try {
      const res = await listPasskeys();
      setPasskeys(res.passkeys || []);
    } catch {
      // errors handled by service/context
    } finally {
      setIsLoadingPasskeys(false);
    }
  }, [listPasskeys]);

  React.useEffect(() => {
    if (isProfileModalOpen && activeTab === 'security') {
      checkPasskeySupport().then((res) => setIsPasskeySupported(res.supported));
      loadPasskeys();
    }
  }, [isProfileModalOpen, activeTab, checkPasskeySupport, loadPasskeys]);

  const handleRegisterPasskey = async () => {
    setIsRegisteringPasskey(true);
    setPasskeyFeedback(null);
    try {
      const res = await registerPasskey();
      if (res.success) {
        setPasskeyFeedback({ type: 'success', msg: res.message });
        await loadPasskeys();
      } else {
        setPasskeyFeedback({ type: 'error', msg: res.message });
      }
    } catch (err: any) {
      setPasskeyFeedback({
        type: 'error',
        msg: err?.message || 'Falha ao cadastrar Passkey no dispositivo.',
      });
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  const handleStartRename = (pk: PasskeyItem) => {
    setEditingPasskeyId(pk.id);
    setEditingPasskeyName(pk.friendlyName || '');
  };

  const handleSaveRename = async () => {
    if (!editingPasskeyId) return;
    setIsRenamingPasskey(true);
    try {
      const res = await updatePasskeyName(editingPasskeyId, editingPasskeyName.trim());
      if (res.success) {
        setEditingPasskeyId(null);
        setEditingPasskeyName('');
        await loadPasskeys();
      } else {
        setPasskeyFeedback({ type: 'error', msg: res.message });
      }
    } finally {
      setIsRenamingPasskey(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingPasskeyId) return;
    setIsDeletingPasskey(true);
    try {
      const res = await deletePasskey(deletingPasskeyId);
      if (res.success) {
        setDeletingPasskeyId(null);
        await loadPasskeys();
      } else {
        setPasskeyFeedback({ type: 'error', msg: res.message });
      }
    } finally {
      setIsDeletingPasskey(false);
    }
  };

  React.useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName || '');
      setPhoneWhatsapp(currentUser.phoneWhatsapp || '');
      setCpf(currentUser.cpf || '');
      setCep(currentUser.address?.cep || '');
      setStreet(currentUser.address?.street || '');
      setNumber(currentUser.address?.number || '');
      setBairro(currentUser.address?.bairro || '');
      setComplement(currentUser.address?.complement || '');
      setCity(currentUser.address?.city || '');
      setState(currentUser.address?.state || '');
    }
  }, [currentUser]);

  React.useEffect(() => {
    if (!isProfileModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        closeProfileModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProfileModalOpen, isSaving, closeProfileModal]);

  const orders = React.useMemo(() => {
    if (!currentUser) return [];
    const base = currentUser.orderHistory || [];
    const map = new Map<string, (typeof base)[number]>();
    for (const o of remoteOrders) {
      if (!o.customerId || o.customerId === currentUser.id) {
        map.set(o.id, o);
      }
    }
    for (const o of base) {
      if (!o.customerId || o.customerId === currentUser.id) {
        const existing = map.get(o.id);
        if (!existing || (o.version || 1) >= (existing.version || 1)) {
          map.set(o.id, o);
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [currentUser, remoteOrders]);

  const { isSearchingCep, cepMessage, handleLookupCep } = useCepLookup(cep, (found) => {
    setStreet((current) => current === street ? found.street || current : current);
    setBairro((current) => current === bairro ? found.bairro || current : current);
    setCity((current) => current === city ? found.city : current);
    setState((current) => current === state ? found.state : current);
  }, isProfileModalOpen && activeTab === 'profile');

  if (!isProfileModalOpen || !currentUser) return null;

  const handleFormatPhone = (val: string) => setPhoneWhatsapp(formatBrazilianPhone(val));

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedbackMsg(null);

    const address: CustomerAddress = {
      cep: cep.trim(),
      street: street.trim(),
      number: number.trim(),
      bairro: bairro.trim(),
      complement: complement.trim(),
      city: city.trim(),
      state: state.trim(),
    };

    const ok = await updateCustomerProfile({
      fullName: fullName.trim(),
      phoneWhatsapp: phoneWhatsapp.trim(),
      cpf: cpf.trim(),
      address,
    });

    setIsSaving(false);
    if (ok) {
      setFeedbackMsg('Dados e endereço salvos para compras futuras!');
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  const loyaltyCard = getUserLoyaltyCard(
    currentUser,
    settings.loyaltyGoalStamps || 10,
    settings.loyaltyDefaultReward
  );
  const redeemedRewards = getRedeemedRewardsHistory(loyaltyCard);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto overflow-x-hidden animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-profile-modal-title"
    >
      <div className="relative w-full max-w-xl rounded-2xl sm:rounded-3xl bg-[#0D1022] border-2 border-[#8423DA]/40 shadow-2xl overflow-hidden overflow-x-hidden my-auto flex flex-col max-h-[94dvh] sm:max-h-[88vh]">
        {/* User Hero Banner */}
        <div className="p-3.5 sm:p-6 bg-gradient-to-r from-[#141838] via-[#11152A] to-[#181D3D] border-b border-[#8423DA]/30 flex items-start sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-[#8423DA] to-[#007BFF] p-0.5 shadow-lg shadow-[#8423DA]/30 shrink-0">
              <div className="w-full h-full rounded-[14px] bg-[#0D1022] flex items-center justify-center font-heading font-black text-white text-base sm:text-lg">
                {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 id="customer-profile-modal-title" className="font-heading text-sm sm:text-base font-black text-white mr-0.5 truncate max-w-[180px] sm:max-w-none">
                  {currentUser.fullName || 'Minha Conta'}
                </h3>
                {isOwner ? (
                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-400/20 border border-amber-400/50 text-amber-300 text-[10px] font-black flex items-center gap-1 shadow-sm">
                    <Crown className="w-3 h-3 text-amber-400" />
                    Proprietário
                  </span>
                ) : currentUser.role === 'admin' ? (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/50 text-purple-300 text-[10px] font-black flex items-center gap-1 shadow-sm">
                    <ShieldCheck className="w-3 h-3 text-purple-400" />
                    Administrador
                  </span>
                ) : isVip ? (
                  <span className="px-2 py-0.5 rounded-full bg-[#00DFFF]/15 border border-[#00DFFF]/40 text-[#00DFFF] text-[10px] font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#00DFFF]" />
                    Cliente VIP ({currentUser.vipDiscountCustom || settings.vipDiscountPercent || 10}% OFF)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[#A5A5B8] text-[10px] font-bold">
                    Cliente PodWave
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap mt-1">
                <p className="text-[11px] sm:text-xs text-[#A5A5B8] flex items-center gap-1 min-w-0">
                  <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                  <span className="truncate max-w-[190px] sm:max-w-none">{currentUser.email}</span>
                </p>
                <span className="text-[10px] font-bold text-[#00DFFF] flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>
                    {loyaltyCard.stamps}/{loyaltyCard.goal} selos • {redeemedRewards.length}{' '}
                    {redeemedRewards.length === 1 ? 'prêmio' : 'prêmios'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={closeProfileModal}
            aria-label="Fechar perfil"
            className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] p-2 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 text-gray-300 hover:text-white transition cursor-pointer flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DFFF]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin Quick Access Shortcut */}
        {isAdmin && (
          <div className="px-3.5 sm:px-6 py-2 bg-gradient-to-r from-amber-500/10 via-[#8423DA]/10 to-[#00DFFF]/10 border-b border-[#8423DA]/25 flex items-center justify-between gap-2 flex-wrap text-xs shrink-0">
            <span className="text-amber-200 text-[11px] font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{isOwner ? 'Permissão de Dono da loja' : 'Permissão de Administrador'}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                closeProfileModal();
                setCurrentView('admin');
                window.history.pushState({}, '', '/admin');
              }}
              className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#080811] text-[11px] font-black hover:brightness-110 cursor-pointer transition shadow-md shrink-0"
            >
              Abrir Painel Admin &rarr;
            </button>
          </div>
        )}

        {/* Tab Switcher - Grade 2x2 no Celular (todas as 4 abas sempre visíveis) e 4 colunas no Desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#8423DA]/20 bg-[#080811]/75 p-1.5 sm:p-2 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`min-w-0 min-h-[42px] py-2 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white shadow-md'
                : 'bg-[#141838]/50 sm:bg-transparent text-gray-300 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Dados de Entrega</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('loyalty')}
            className={`min-w-0 min-h-[42px] py-2 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'loyalty'
                ? 'bg-gradient-to-r from-[#8423DA] via-[#E53CF3] to-[#00DFFF] text-white shadow-md'
                : 'bg-[#141838]/50 sm:bg-transparent text-gray-300 hover:text-white'
            }`}
          >
            <Gift className="w-3.5 h-3.5 shrink-0 text-[#00DFFF]" />
            <span className="truncate">
              Fidelidade ({loyaltyCard.stamps}/{loyaltyCard.goal})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`min-w-0 min-h-[42px] py-2 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white shadow-md'
                : 'bg-[#141838]/50 sm:bg-transparent text-gray-300 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Pedidos ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`min-w-0 min-h-[42px] py-2 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'security'
                ? 'bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] text-white shadow-md'
                : 'bg-[#141838]/60 sm:bg-transparent text-[#00DFFF] sm:text-gray-300 hover:text-white border border-[#00DFFF]/25 sm:border-transparent'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5 shrink-0 text-[#00DFFF]" />
            <span className="truncate">Segurança & Face ID</span>
          </button>
        </div>

        {/* Feedback message */}
        {feedbackMsg && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Body Container */}
        <div className="w-full max-w-full p-4 sm:p-6 overflow-y-auto overflow-x-hidden flex-1">
          {/* ===================== TAB: DIGITAL LOYALTY CARD, BADGES, TIERS & HISTORY ===================== */}
          {activeTab === 'loyalty' && (
            <div className="space-y-5 text-xs animate-in fade-in duration-200">
              <DigitalLoyaltyCard
                customerName={currentUser.fullName}
                customerEmail={currentUser.email}
                card={loyaltyCard}
                interactive={false}
              />

              {/* ===================== SEÇÃO: HISTÓRICO DE FIDELIDADE (DATAS E PRÊMIOS RESGATADOS) ===================== */}
              <div className="p-4 rounded-2xl bg-[#121633] border border-[#00DFFF]/35 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#00DFFF] flex items-center gap-1">
                      <History className="w-3.5 h-3.5 text-amber-400" />
                      <span>Transparência & Progresso • Histórico de Fidelidade</span>
                    </span>
                    <h5 className="font-heading font-black text-white text-sm mt-0.5">
                      Histórico de Fidelidade & Prêmios Já Resgatados
                    </h5>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300 font-mono font-black text-xs flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {redeemedRewards.length}{' '}
                      {redeemedRewards.length === 1 ? 'Prêmio Resgatado' : 'Prêmios Resgatados'}
                    </span>
                  </span>
                </div>

                {/* Resumo numérico rápido do histórico */}
                <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#080811]/80 border border-white/10 text-center">
                    <span className="text-[10px] text-[#A5A5B8] block">Prêmios Resgatados</span>
                    <span className="font-heading font-black text-base text-amber-300">
                      {redeemedRewards.length}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#080811]/80 border border-white/10 text-center">
                    <span className="text-[10px] text-[#A5A5B8] block">Ciclo Atual</span>
                    <span className="font-heading font-black text-base text-[#00DFFF]">
                      {loyaltyCard.stamps}/{loyaltyCard.goal}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#080811]/80 border border-white/10 text-center">
                    <span className="text-[10px] text-[#A5A5B8] block">Cartões Concluídos</span>
                    <span className="font-heading font-black text-base text-emerald-300">
                      {loyaltyCard.completedCards || 0}
                    </span>
                  </div>
                </div>

                {/* Lista de Prêmios Já Resgatados pelo Usuário */}
                <div className="space-y-2">
                  <h6 className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-amber-400" />
                    <span>Prêmios Já Resgatados por Você</span>
                  </h6>

                  {redeemedRewards.length === 0 ? (
                    <div className="p-3.5 rounded-xl bg-[#080811]/80 border border-dashed border-white/15 space-y-1.5">
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#00DFFF] shrink-0" />
                        <span>Você ainda não realizou resgates de prêmios completos</span>
                      </p>
                      <p className="text-[11px] text-[#A5A5B8] leading-relaxed">
                        Você está com{' '}
                        <strong className="text-[#00DFFF]">
                          {loyaltyCard.stamps} de {loyaltyCard.goal} selos
                        </strong>{' '}
                        no ciclo atual. Assim que completar a cartela e resgatar sua recompensa (
                        <strong className="text-amber-200">{loyaltyCard.rewardDescription}</strong>
                        ), a data e os detalhes do prêmio ficarão registrados aqui permanentemente!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {redeemedRewards.map((reward) => (
                        <div
                          key={reward.id}
                          className="p-3 rounded-xl bg-gradient-to-r from-amber-950/35 via-[#141838] to-[#0D1022] border border-amber-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/60 text-amber-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                <Trophy className="w-3 h-3 text-amber-300" />
                                {reward.cycleNumber}º Prêmio Resgatado
                              </span>
                              <span className="text-[10px] font-mono text-[#00DFFF] flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(reward.date).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })}{' '}
                                às{' '}
                                {new Date(reward.date).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            <p className="text-xs font-extrabold text-white">
                              🎁 {reward.rewardTitle}
                            </p>

                            {reward.note && (
                              <p className="text-[11px] text-gray-300">
                                Obs: {reward.note}
                                {reward.updatedBy ? ` • Validado por ${reward.updatedBy}` : ''}
                              </p>
                            )}
                          </div>

                          <div className="sm:text-right shrink-0">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase">
                              <CheckCircle2 className="w-3 h-3" />
                              Entregue ({reward.stampsRedeemed} selos)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Linha do Tempo de Selos e Movimentações */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <h6 className="text-[11px] font-extrabold uppercase tracking-wider text-[#A5A5B8] flex items-center justify-between">
                    <span>Registro Cronológico de Selos e Validações</span>
                    {loyaltyCard.history && loyaltyCard.history.length > 0 && (
                      <span className="text-[10px] font-mono text-[#00DFFF]">
                        {loyaltyCard.history.length}{' '}
                        {loyaltyCard.history.length === 1 ? 'registro' : 'registros'}
                      </span>
                    )}
                  </h6>

                  {!loyaltyCard.history || loyaltyCard.history.length === 0 ? (
                    <p className="text-[11px] text-gray-400 italic py-2">
                      Nenhuma movimentação de selos registrada ainda. Seus selos aparecerão aqui com data e horário a cada compra validada.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {loyaltyCard.history.slice(0, 15).map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl bg-[#080811]/85 border border-white/10 flex items-center justify-between gap-2 text-[11px]"
                        >
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-white">
                                {item.action === 'redeem_reward'
                                  ? `🏆 Prêmio Resgatado${item.rewardTitle ? `: ${item.rewardTitle}` : ''}`
                                  : item.action === 'reset_card'
                                  ? '🔄 Novo Ciclo Iniciado'
                                  : item.delta > 0
                                  ? `➕ +${item.delta} selo(s) validado(s)`
                                  : item.delta < 0
                                  ? `➖ ${item.delta} selo(s) ajustado(s)`
                                  : `Ajuste de selos`}
                              </span>
                              {item.note && (
                                <span className="text-gray-300">— {item.note}</span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                              <span>
                                {new Date(item.date).toLocaleDateString('pt-BR')} às{' '}
                                {new Date(item.date).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {item.updatedBy && <span>• por {item.updatedBy}</span>}
                            </div>
                          </div>
                          <span className="font-mono font-bold text-[#00DFFF] shrink-0">
                            {item.stampsAfter}/{loyaltyCard.goal}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#141838] border border-[#8423DA]/30 space-y-1.5">
                <h5 className="font-heading font-bold text-white text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#00DFFF]" />
                  <span>Como funciona o Cartão Fidelidade PodWave?</span>
                </h5>
                <p className="text-[11px] text-[#A5A5B8] leading-relaxed">
                  A cada pedido confirmado e entregue, nossa equipe adiciona <strong className="text-white">+1 selo</strong> diretamente ao seu perfil. Ao completar <strong className="text-[#00DFFF]">{loyaltyCard.goal} selos</strong>, você desbloqueia sua recompensa especial e registra seu prêmio no histórico!
                </p>
              </div>
            </div>
          )}
          {/* ===================== TAB 1: PROFILE & DELIVERY ADDRESS ===================== */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="customer-address-form w-full max-w-full overflow-x-hidden space-y-4 text-xs">
              {/* Atalho Rápido para Configurar Face ID / Biometria */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-[#141838] via-[#10142D] to-[#161B3A] border border-[#00DFFF]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8423DA]/30 to-[#00DFFF]/30 border border-[#00DFFF]/50 flex items-center justify-center text-[#00DFFF] shrink-0">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-heading font-black text-white text-xs block">
                      Login Rápido com Face ID / Digital
                    </span>
                    <span className="text-[11px] text-[#A5A5B8] block">
                      {passkeys.length > 0
                        ? `${passkeys.length} ${passkeys.length === 1 ? 'dispositivo biométrico ativo' : 'dispositivos biométricos ativos'}`
                        : 'Cadastre a biometria deste celular ou PC para entrar sem senha'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('security')}
                  className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#8423DA] to-[#00DFFF] text-white font-black text-[11px] hover:brightness-110 transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-md"
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  <span>{passkeys.length > 0 ? 'Gerenciar Passkeys' : 'Ativar Face ID / Digital'}</span>
                </button>
              </div>

              <div className="space-y-1">
                <h4 className="font-heading text-sm font-bold text-white flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#00DFFF]" />
                  <span>Informações de Contato</span>
                </h4>
                <p className="text-[11px] text-[#A5A5B8]">
                  Estes dados serão preenchidos automaticamente na finalização das suas compras.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Nome Completo</label>
                  <input
type="text"
                    autoComplete="name" name="fullName" aria-label="Nome completo"
                value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white font-bold text-xs focus:outline-none focus:border-[#00DFFF]"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1">WhatsApp / Telefone</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    name="phone"
                    aria-label="Telefone / WhatsApp"
                    value={phoneWhatsapp}
                    onChange={(e) => handleFormatPhone(e.target.value)}
                    placeholder="(86) 99999-9999"
                    className="w-full p-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                  />
                </div>
              </div>

              {/* ENDEREÇO DE ENTREGA */}
              <div className="pt-2 border-t border-[#8423DA]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading text-sm font-bold text-white flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#00DFFF]" />
                    <span>Endereço de Entrega Cadastrado</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2">
                  <div className="min-[420px]:col-span-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="shipping postal-code"
                        name="postalCode"
                        maxLength={9}
                        aria-label="CEP"
                        value={cep}
                        onChange={(e) => setCep(formatCep(e.target.value))}
                        placeholder="CEP (ex: 64000-000)"
                        className="w-full p-2 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                      />
                      <button
                        type="button"
                        onClick={handleLookupCep}
                      aria-label="Buscar endereço pelo CEP"
                        disabled={isSearchingCep}
                        className="min-h-11 min-w-11 p-2 rounded-xl bg-[#00DFFF]/20 text-[#00DFFF] hover:bg-[#00DFFF]/30 text-xs font-bold cursor-pointer shrink-0"
                        aria-busy={isSearchingCep}
                      title="Buscar CEP"
                      >
                        {isSearchingCep ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <input
                      type="text"
                      autoComplete="shipping address-level1"
                      name="state"
                      aria-label="Estado"
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      placeholder="UF"
                      maxLength={2}
                      className="w-full p-2 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF] uppercase"
                    />
                  </div>
                </div>

              <p role="status" aria-live="polite" className="text-[11px] text-[#A5A5B8] break-words">{cepMessage || 'Ao buscar, apenas o CEP é consultado no ViaCEP. Você também pode preencher manualmente.'}</p>

                <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2">
                  <div className="min-[420px]:col-span-2">
                    <input
                      type="text"
                      autoComplete="shipping address-line1"
                      name="street"
                      aria-label="Rua / Avenida"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Rua / Avenida"
                      className="w-full p-2 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      autoComplete="off"
                      name="addressNumber"
                      aria-label="Número do endereço"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="Número"
                      className="w-full p-2 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    autoComplete="shipping address-level3"
                    name="bairro"
                    aria-label="Bairro"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    placeholder="Bairro"
                    className="w-full p-2 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                  />
                  <input
                    type="text"
                    autoComplete="shipping address-level2"
                    name="city"
                    aria-label="Cidade"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Cidade"
                    className="w-full p-2 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                  />
                </div>

                <input
                  type="text"
                  autoComplete="shipping address-line2"
                  name="addressComplement"
                  aria-label="Complemento"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Complemento / Ponto de Referência"
                  className="w-full p-2 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                />
              </div>

              <div className="pt-3 border-t border-[#8423DA]/20 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#007BFF] text-[#080811] font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-lg cursor-pointer transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Dados para Próximas Compras'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ===================== TAB 2: ORDER HISTORY (MEUS PEDIDOS — FASE 3) ===================== */}
          {activeTab === 'orders' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="font-heading text-sm font-black text-white flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-[#00DFFF]" />
                    <span>Meus Pedidos ({orders.length})</span>
                  </h4>
                  <p className="text-[11px] text-[#A5A5B8]">
                    Acompanhe em tempo real cada etapa do seu pedido na PodWave.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadAuthenticatedOrders}
                  disabled={isLoadingCustomerOrders}
                  className="px-3 py-1.5 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 border border-[#8423DA]/40 text-xs font-bold text-gray-200 flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#00DFFF] ${isLoadingCustomerOrders ? 'animate-spin' : ''}`} />
                  <span>Atualizar</span>
                </button>
              </div>

              <OrderNotificationSettings />

              {/* Error State with Retry (Never disguise error as empty list) */}
              {customerOrdersError && (
                <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-200">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{customerOrdersError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={loadAuthenticatedOrders}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/25 hover:bg-rose-500/40 border border-rose-400/50 text-white font-bold shrink-0 cursor-pointer"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              {isLoadingCustomerOrders && orders.length === 0 ? (
                <div className="py-10 text-center space-y-2 text-xs text-gray-300">
                  <RefreshCw className="w-6 h-6 text-[#00DFFF] animate-spin mx-auto" />
                  <p className="font-bold">Consultando seus pedidos registrados...</p>
                </div>
              ) : orders.length === 0 && !customerOrdersError ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-[#141838] border border-[#8423DA]/40 flex items-center justify-center mx-auto text-[#A5A5B8]">
                    <ShoppingBag className="w-7 h-7 text-[#00DFFF]" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-white text-sm">
                      Nenhum pedido registrado para esta conta
                    </h4>
                    <p className="text-xs text-[#C4C6D8] max-w-sm mx-auto mt-1">
                      Seus pedidos vinculados à sua conta autenticada aparecerão listados aqui assim que forem registrados e confirmados no sistema.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {orders.map((order) => {
                    const storePhone = (settings.whatsappNumber || '5586999014685').replace(/\D/g, '');
                    const customerOrderMsg = `Olá! Gostaria de falar sobre o meu pedido *${order.referenceId}* na ${settings.storeName || 'PodWave'}.`;
                    const storeWaUrl = `https://wa.me/${storePhone}?text=${encodeURIComponent(customerOrderMsg)}`;

                    return (
                      <div
                        key={order.id}
                        className="p-4 rounded-2xl bg-[#141838] border border-[#8423DA]/30 shadow-md space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-[#00DFFF] px-2 py-0.5 rounded bg-[#00DFFF]/10 border border-[#00DFFF]/30">
                              {order.referenceId}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {order.loyaltyStampGranted && (
                              <span className="px-2 py-0.5 rounded-full bg-[#E53CF3]/20 border border-[#E53CF3]/40 text-[#E53CF3] text-[10px] font-black">
                                ★ +1 Selo Fidelidade Creditado
                              </span>
                            )}
                          </div>

                          <span className="font-heading font-black text-emerald-400 text-sm">
                            R$ {order.total.toFixed(2).replace('.', ',')}
                          </span>
                        </div>

                        <OrderStatusTimeline
                          status={order.status}
                          cancelReason={order.cancelReason}
                          statusHistory={order.statusHistory}
                        />

                        {/* Items */}
                        <div className="space-y-1.5 pt-1 border-t border-white/5">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px] text-gray-300">
                              <span className="truncate max-w-[280px]">
                                {item.quantity}x [{item.brandName}] {item.modelName} — {item.flavorName} {item.flavorEmoji}
                              </span>
                              <span className="font-mono text-gray-400 shrink-0">
                                R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Financial & Payment Breakdown */}
                        <div className="pt-2 border-t border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] text-gray-300">
                          <div>
                            <span className="text-gray-400 block">Pagamento:</span>
                            <strong className="text-white">
                              {order.paymentMethod || 'PIX'}{' '}
                              {order.paymentStatus ? `(${order.paymentStatus.toUpperCase()})` : ''}
                            </strong>
                          </div>
                          <div>
                            <span className="text-gray-400 block">Modalidade:</span>
                            <strong className="text-white">
                              {order.deliveryType === 'pickup' ? 'Retirada no Local' : 'Entrega / Delivery'}
                            </strong>
                          </div>
                          <div>
                            <span className="text-gray-400 block">Subtotal / Desconto:</span>
                            <strong className="text-white">
                              R$ {(order.subtotal ?? order.total).toFixed(2).replace('.', ',')}
                              {order.discount ? ` (-R$ ${order.discount.toFixed(2).replace('.', ',')})` : ''}
                            </strong>
                          </div>
                        </div>

                        {/* Delivery summary & WhatsApp support button */}
                        <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          {order.addressSummary ? (
                            <p className="text-[10px] text-[#A5A5B8] flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#00DFFF] shrink-0" />
                              <span className="truncate max-w-[280px]">{order.addressSummary}</span>
                            </p>
                          ) : (
                            <span />
                          )}

                          <a
                            href={storeWaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold transition shrink-0"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Falar no WhatsApp sobre este pedido</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===================== TAB: SEGURANÇA & PASSKEYS (WEBAUTHN) ===================== */}
          {activeTab === 'security' && (
            <div className="space-y-5 text-xs animate-in fade-in duration-200">
              {/* Header Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#141838] to-[#0D1022] border border-[#8423DA]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#8423DA]/30 to-[#00DFFF]/30 border border-[#00DFFF]/50 flex items-center justify-center text-[#00DFFF]">
                      <Fingerprint className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-heading font-black text-white text-sm">
                        Minhas Passkeys (Face ID & Biometria)
                      </h4>
                      <p className="text-[11px] text-[#A5A5B8]">
                        Autenticação moderna sem senhas vinculada ao seu dispositivo
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={loadPasskeys}
                    disabled={isLoadingPasskeys}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition cursor-pointer"
                    title="Atualizar lista de Passkeys"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPasskeys ? 'animate-spin text-[#00DFFF]' : ''}`} />
                  </button>
                </div>

                {/* Platform Support Status Badge */}
                {isPasskeySupported === false && (
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-200 text-[11px] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Este navegador ou dispositivo não possui suporte completo a WebAuthn biométrico ou está operando fora de contexto HTTPS seguro.
                    </span>
                  </div>
                )}
              </div>

              {/* Passkey Feedback Banner */}
              {passkeyFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    passkeyFeedback.type === 'success'
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/15 border border-rose-500/40 text-rose-300'
                  }`}
                >
                  {passkeyFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{passkeyFeedback.msg}</span>
                </div>
              )}

              {/* Feedback Visual: Skeleton Loading ao Cadastrar Passkey */}
              {isRegisteringPasskey ? (
                <PasskeyBiometricLoading
                  onCancel={() => setIsRegisteringPasskey(false)}
                  title="Cadastrando biometria no aparelho..."
                  description="Confirme sua identidade via Face ID, digital ou PIN no seu dispositivo para concluir o registro."
                  mode="register"
                />
              ) : (
                /* Action Button: Cadastrar uma Passkey neste dispositivo */
                <div className="p-4 rounded-2xl bg-[#090C1B] border border-[#00DFFF]/30 shadow-lg space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#00DFFF]" />
                        Novo Acesso Biométrico
                      </h5>
                      <p className="text-[11px] text-[#A5A5B8] mt-0.5">
                        Vincule este smartphone ou computador à sua conta PodWave
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRegisterPasskey}
                      disabled={isPasskeySupported === false}
                      className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] hover:brightness-110 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#8423DA]/25 transition cursor-pointer disabled:opacity-50"
                    >
                      <Fingerprint className="w-4 h-4 text-[#00DFFF]" />
                      <span>Cadastrar uma Passkey neste dispositivo</span>
                    </button>
                  </div>
                </div>
              )}

              {/* List of Registered Passkeys */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs uppercase tracking-wider text-[11px]">
                    Dispositivos Cadastrados ({passkeys.length})
                  </span>
                  <span className="text-[10px] text-[#A5A5B8]">
                    Gerenciado com segurança via Supabase WebAuthn
                  </span>
                </div>

                {isLoadingPasskeys ? (
                  <div className="p-8 rounded-2xl bg-[#141838]/40 border border-[#8423DA]/20 flex flex-col items-center justify-center gap-2 text-center">
                    <RefreshCw className="w-5 h-5 animate-spin text-[#00DFFF]" />
                    <p className="text-gray-400 text-xs">Carregando suas chaves cadastradas...</p>
                  </div>
                ) : passkeys.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#141838]/30 border border-dashed border-[#8423DA]/30 flex flex-col items-center justify-center text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400">
                      <Fingerprint className="w-6 h-6 text-[#A5A5B8]" />
                    </div>
                    <p className="text-white font-bold text-xs">Nenhuma Passkey cadastrada ainda</p>
                    <p className="text-[11px] text-[#A5A5B8] max-w-sm">
                      Clique no botão acima para registrar seu Face ID, Touch ID, impressão digital ou chave de segurança para login instantâneo.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {passkeys.map((pk) => {
                      const isEditing = editingPasskeyId === pk.id;
                      const isDeleting = deletingPasskeyId === pk.id;

                      const isMobile =
                        pk.friendlyName?.toLowerCase().includes('iphone') ||
                        pk.friendlyName?.toLowerCase().includes('android') ||
                        pk.friendlyName?.toLowerCase().includes('celular') ||
                        pk.friendlyName?.toLowerCase().includes('face id');

                      return (
                        <div
                          key={pk.id}
                          className="p-3.5 rounded-2xl bg-[#141838]/60 border border-[#8423DA]/30 hover:border-[#00DFFF]/40 transition space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8423DA]/20 to-[#00DFFF]/20 border border-[#00DFFF]/30 flex items-center justify-center text-[#00DFFF] shrink-0">
                                {isMobile ? (
                                  <Smartphone className="w-4 h-4" />
                                ) : (
                                  <Laptop className="w-4 h-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={editingPasskeyName}
                                      onChange={(e) => setEditingPasskeyName(e.target.value)}
                                      placeholder="Nome do dispositivo"
                                      className="p-1.5 rounded-lg bg-[#0D1022] border border-[#00DFFF]/50 text-white text-xs focus:outline-none"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={handleSaveRename}
                                      disabled={isRenamingPasskey}
                                      className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition cursor-pointer"
                                      title="Salvar nome"
                                    >
                                      {isRenamingPasskey ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Check className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingPasskeyId(null)}
                                      className="p-1.5 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 transition cursor-pointer"
                                      title="Cancelar"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-white text-xs truncate">
                                      {pk.friendlyName || 'Dispositivo Biométrico'}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => handleStartRename(pk)}
                                      className="p-1 text-gray-400 hover:text-[#00DFFF] transition cursor-pointer"
                                      title="Renomear Passkey"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                                <p className="text-[10px] text-[#A5A5B8] flex items-center gap-2 mt-0.5">
                                  <span>Cadastrado em: {new Date(pk.createdAt).toLocaleDateString('pt-BR')}</span>
                                  {pk.lastUsedAt && (
                                    <>
                                      <span>•</span>
                                      <span>Último uso: {new Date(pk.lastUsedAt).toLocaleDateString('pt-BR')}</span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Delete Action with Confirmation */}
                            <div>
                              {isDeleting ? (
                                <div className="flex items-center gap-1.5 bg-rose-500/10 p-1.5 rounded-xl border border-rose-500/30">
                                  <span className="text-[10px] text-rose-300 font-bold hidden sm:inline">
                                    Confirmar exclusão?
                                  </span>
                                  <button
                                    type="button"
                                    onClick={handleConfirmDelete}
                                    disabled={isDeletingPasskey}
                                    className="px-2 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold transition cursor-pointer flex items-center gap-1"
                                  >
                                    {isDeletingPasskey ? (
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3 h-3" />
                                    )}
                                    <span>Sim</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingPasskeyId(null)}
                                    className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-[10px] transition cursor-pointer"
                                  >
                                    Não
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeletingPasskeyId(pk.id)}
                                  className="p-2 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                  title="Remover esta Passkey"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Informative Guidance & Security Explanation */}
              <div className="p-4 rounded-2xl bg-[#080811]/70 border border-[#8423DA]/20 text-[11px] text-[#A5A5B8] space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-[#00DFFF]" />
                  <span>Como funciona a segurança por Passkey no PodWave?</span>
                </div>
                <p className="leading-relaxed">
                  As Passkeys utilizam a tecnologia oficial <strong>WebAuthn FIDO2</strong>. Sua chave privada fica protegida pelo hardware de segurança do seu próprio aparelho (chip Secure Enclave da Apple ou TPM do Windows/Android).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[10px]">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <strong className="text-white block mb-0.5">iPhone, iPad & Mac</strong>
                    <span>Use Face ID ou Touch ID. Suas chaves sincronizam com o iCloud com criptografia de ponta a ponta.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <strong className="text-white block mb-0.5">Android & Windows</strong>
                    <span>Use leitor de impressão digital, reconhecimento biométrico ou Windows Hello integrado ao sistema operacional.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-[#080811] border-t border-[#8423DA]/20 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              logoutUser();
              closeProfileModal();
            }}
            className="px-3.5 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair da Conta</span>
          </button>

          <button
            type="button"
            onClick={closeProfileModal}
            className="px-4 py-2 rounded-xl bg-[#141838] text-gray-300 hover:text-white text-xs font-bold cursor-pointer transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

