import React, { useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { CustomerAddress } from '../../types/catalog';
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
} from 'lucide-react';

export const CustomerProfileModal: React.FC = () => {
  const {
    currentUser,
    isOwner,
    isProfileModalOpen,
    closeProfileModal,
    logoutUser,
    updateCustomerProfile,
    setCurrentView,
  } = useCatalog();

  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');
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
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

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

  if (!isProfileModalOpen || !currentUser) return null;

  const handleFormatPhone = (val: string) => {
    const numbers = val.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 2) {
      setPhoneWhatsapp(numbers);
    } else if (numbers.length <= 7) {
      setPhoneWhatsapp(`(${numbers.slice(0, 2)}) ${numbers.slice(2)}`);
    } else {
      setPhoneWhatsapp(`(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`);
    }
  };

  const handleLookupCep = async () => {
    const raw = cep.replace(/\D/g, '');
    if (raw.length !== 8) return;

    setIsSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setStreet(data.logradouro || '');
        setBairro(data.bairro || '');
        setCity(data.localidade || '');
        setState(data.uf || '');
      }
    } catch {
      // ignore
    } finally {
      setIsSearchingCep(false);
    }
  };

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

  const orders = currentUser.orderHistory || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#0D1022] border-2 border-[#8423DA]/40 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[85vh]">
        {/* User Hero Banner */}
        <div className="p-6 bg-gradient-to-r from-[#141838] via-[#11152A] to-[#181D3D] border-b border-[#8423DA]/30 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#8423DA] to-[#007BFF] p-0.5 shadow-lg shadow-[#8423DA]/30 shrink-0">
              <div className="w-full h-full rounded-[14px] bg-[#0D1022] flex items-center justify-center font-heading font-black text-white text-lg">
                {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading text-base font-black text-white">
                  {currentUser.fullName || 'Minha Conta'}
                </h3>
                {isOwner ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-400/20 border border-amber-400/50 text-amber-300 text-[10px] font-black flex items-center gap-1 shadow-sm">
                    <Crown className="w-3 h-3 text-amber-400" />
                    Proprietário
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#00DFFF]/15 border border-[#00DFFF]/40 text-[#00DFFF] text-[10px] font-bold">
                    Cliente VIP PodWave
                  </span>
                )}
              </div>
              <p className="text-xs text-[#A5A5B8] flex items-center gap-1 mt-0.5">
                <Mail className="w-3 h-3 text-gray-400" />
                <span>{currentUser.email}</span>
              </p>
            </div>
          </div>

          <button
            onClick={closeProfileModal}
            className="p-2 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 text-gray-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Owner Quick Access Shortcut */}
        {isOwner && (
          <div className="px-6 py-2.5 bg-gradient-to-r from-amber-500/10 via-[#8423DA]/10 to-[#00DFFF]/10 border-b border-[#8423DA]/25 flex items-center justify-between text-xs">
            <span className="text-amber-200 text-[11px] font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Você tem permissão de Dono para gerenciar a loja
            </span>
            <button
              type="button"
              onClick={() => {
                closeProfileModal();
                setCurrentView('admin');
                window.history.pushState({}, '', '/admin');
              }}
              className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#080811] text-[11px] font-black hover:brightness-110 cursor-pointer transition shadow-md"
            >
              Abrir Painel Admin &rarr;
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-[#8423DA]/20 bg-[#080811]/60 p-1.5 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Dados de Entrega Salvos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Histórico de Pedidos ({orders.length})</span>
          </button>
        </div>

        {/* Feedback message */}
        {feedbackMsg && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Body Container */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* ===================== TAB 1: PROFILE & DELIVERY ADDRESS ===================== */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
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

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={cep}
                        onChange={(e) => setCep(e.target.value)}
                        placeholder="CEP (ex: 64000-000)"
                        className="w-full p-2 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                      />
                      <button
                        type="button"
                        onClick={handleLookupCep}
                        disabled={isSearchingCep}
                        className="p-2 rounded-xl bg-[#00DFFF]/20 text-[#00DFFF] hover:bg-[#00DFFF]/30 text-xs font-bold cursor-pointer shrink-0"
                        title="Buscar CEP"
                      >
                        {isSearchingCep ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      placeholder="UF"
                      maxLength={2}
                      className="w-full p-2 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF] uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Rua / Avenida"
                      className="w-full p-2 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
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
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    placeholder="Bairro"
                    className="w-full p-2 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                  />
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Cidade"
                    className="w-full p-2 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                  />
                </div>

                <input
                  type="text"
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

          {/* ===================== TAB 2: ORDER HISTORY ===================== */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-[#141838] border border-[#8423DA]/40 flex items-center justify-center mx-auto text-[#A5A5B8]">
                    <ShoppingBag className="w-7 h-7 text-[#00DFFF]" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-white text-sm">
                      Nenhum pedido finalizado ainda
                    </h4>
                    <p className="text-xs text-[#A5A5B8] max-w-sm mx-auto mt-1">
                      Assim que você enviar um pedido pelo WhatsApp, ele ficará registrado aqui com todos os itens, sabores e comprovantes.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 rounded-2xl bg-[#141838] border border-[#8423DA]/30 shadow-md space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
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
                        </div>

                        <span className="font-heading font-black text-emerald-400 text-sm">
                          R$ {order.total.toFixed(2).replace('.', ',')}
                        </span>
                      </div>

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

                      {/* Delivery summary */}
                      {order.addressSummary && (
                        <p className="text-[10px] text-[#A5A5B8] pt-1 border-t border-white/5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#00DFFF] shrink-0" />
                          <span className="truncate">{order.addressSummary}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#080811] border-t border-[#8423DA]/20 flex items-center justify-between shrink-0">
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
