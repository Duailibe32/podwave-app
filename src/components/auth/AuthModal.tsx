import React, { useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { UserRole, CustomerAddress } from '../../types/catalog';
import {
  X,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  ShieldCheck,
  Crown,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalMode,
    closeAuthModal,
    loginUser,
    registerUser,
    currentUser,
  } = useCatalog();

  const [mode, setMode] = useState<'login' | 'signup'>(authModalMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneWhatsapp, setPhoneWhatsapp] = useState('');
  const [isOwnerRole, setIsOwnerRole] = useState(false);

  // Address fields for customer future purchases
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [bairro, setBairro] = useState('');
  const [complement, setComplement] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  React.useEffect(() => {
    setMode(authModalMode);
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [authModalMode, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

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

  const handleFormatCep = (val: string) => {
    const numbers = val.replace(/\D/g, '').slice(0, 8);
    if (numbers.length <= 5) {
      setCep(numbers);
    } else {
      setCep(`${numbers.slice(0, 5)}-${numbers.slice(5)}`);
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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    const res = await loginUser(email, password);
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg(res.message);
      setTimeout(() => {
        closeAuthModal();
      }, 1000);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim() || !email.trim()) {
      setErrorMsg('Por favor informe seu nome completo e e-mail.');
      return;
    }

    setIsLoading(true);

    const address: CustomerAddress | undefined = street.trim()
      ? {
          cep: cep.trim(),
          street: street.trim(),
          number: number.trim(),
          bairro: bairro.trim(),
          complement: complement.trim(),
          city: city.trim(),
          state: state.trim(),
        }
      : undefined;

    const res = await registerUser({
      email: email.trim(),
      fullName: fullName.trim(),
      phoneWhatsapp: phoneWhatsapp.trim(),
      password,
      role: isOwnerRole ? 'owner' : 'customer',
      address,
    });

    setIsLoading(false);

    if (res.success) {
      setSuccessMsg(res.message);
      setTimeout(() => {
        closeAuthModal();
      }, 1200);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleQuickDemoLogin = async (asOwner: boolean) => {
    setIsLoading(true);
    setErrorMsg(null);

    const targetEmail = asOwner ? 'duailibe32@gmail.com' : 'cliente@podwave.com';
    const res = await loginUser(targetEmail, '123456', asOwner ? 'owner' : 'customer');
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg(res.message);
      setTimeout(() => closeAuthModal(), 900);
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0D1022] border-2 border-[#8423DA]/40 shadow-2xl overflow-hidden my-auto">
        {/* Header with Neon Accent */}
        <div className="p-6 bg-gradient-to-r from-[#141838] via-[#11152A] to-[#181D3D] border-b border-[#8423DA]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#8423DA]/20 to-[#00DFFF]/20 border border-[#00DFFF]/50 flex items-center justify-center text-[#00DFFF] shadow-md shadow-[#00DFFF]/20">
              <Sparkles className="w-5 h-5 text-[#00DFFF]" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-black text-white flex items-center gap-2">
                {mode === 'login' ? 'Entrar na sua Conta' : 'Criar Nova Conta'}
              </h3>
              <p className="text-xs text-[#A5A5B8]">
                {mode === 'login'
                  ? 'Acesse seus pedidos e dados salvos da PodWave'
                  : 'Salve seus dados de entrega para agilizar compras futuras'}
              </p>
            </div>
          </div>

          <button
            onClick={closeAuthModal}
            className="p-2 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 text-gray-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#8423DA]/20 bg-[#080811]/60 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              mode === 'login'
                ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Já tenho uma Conta (Entrar)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              mode === 'signup'
                ? 'bg-gradient-to-r from-[#00DFFF] to-[#007BFF] text-[#080811] font-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Criar Conta de Cliente</span>
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ===================== TAB 1: LOGIN ===================== */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block text-gray-200 font-bold mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#00DFFF]" />
                <span>E-mail *</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                required
                className="w-full p-3 rounded-xl bg-[#141838] border border-[#8423DA]/35 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
              />
            </div>

            <div>
              <label className="block text-gray-200 font-bold mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#00DFFF]" />
                <span>Senha *</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full p-3 rounded-xl bg-[#141838] border border-[#8423DA]/35 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#8423DA]/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              <span>{isLoading ? 'Autenticando...' : 'Acessar Conta'}</span>
            </button>

            {/* Quick Demo Logins for Testing */}
            <div className="pt-3 border-t border-[#8423DA]/20 space-y-2">
              <span className="text-[10px] text-gray-400 block font-semibold text-center uppercase tracking-wider">
                Acesso Rápido para Testes
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin(true)}
                  className="p-2.5 rounded-xl bg-[#141838] hover:bg-[#8423DA]/20 border border-[#8423DA]/40 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Entrar como Dono</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin(false)}
                  className="p-2.5 rounded-xl bg-[#141838] hover:bg-[#00DFFF]/20 border border-[#00DFFF]/40 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#00DFFF]" />
                  <span>Entrar como Cliente</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ===================== TAB 2: SIGNUP ===================== */}
        {mode === 'signup' && (
          <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-200 font-bold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Silva"
                  required
                  className="w-full p-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/35 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                />
              </div>

              <div>
                <label className="block text-gray-200 font-bold mb-1">WhatsApp / Telefone</label>
                <input
                  type="tel"
                  value={phoneWhatsapp}
                  onChange={(e) => handleFormatPhone(e.target.value)}
                  placeholder="(86) 99999-9999"
                  className="w-full p-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/35 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-200 font-bold mb-1">E-mail *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  required
                  className="w-full p-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/35 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                />
              </div>

              <div>
                <label className="block text-gray-200 font-bold mb-1">Senha *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full p-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/35 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                />
              </div>
            </div>

            {/* SEÇÃO DE ENDEREÇO SALVO (PARA COMPRAS FUTURAS) */}
            <div className="p-3.5 rounded-2xl bg-[#141838]/80 border border-[#00DFFF]/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-[#00DFFF]" />
                  <span>Endereço de Entrega (Preenchimento Automático Futuro)</span>
                </span>
                <span className="text-[10px] text-gray-400">Opcional</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={cep}
                      onChange={(e) => handleFormatCep(e.target.value)}
                      placeholder="CEP (ex: 64000-000)"
                      className="w-full p-2 rounded-xl bg-[#080811] border border-white/10 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                    />
                    <button
                      type="button"
                      onClick={handleLookupCep}
                      disabled={isSearchingCep}
                      className="p-2 rounded-xl bg-[#00DFFF]/20 hover:bg-[#00DFFF]/30 text-[#00DFFF] font-bold text-xs cursor-pointer shrink-0"
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
                    placeholder="UF (PI)"
                    maxLength={2}
                    className="w-full p-2 rounded-xl bg-[#080811] border border-white/10 text-white text-xs focus:outline-none focus:border-[#00DFFF] uppercase"
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
                    className="w-full p-2 rounded-xl bg-[#080811] border border-white/10 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="Nº"
                    className="w-full p-2 rounded-xl bg-[#080811] border border-white/10 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Bairro"
                  className="w-full p-2 rounded-xl bg-[#080811] border border-white/10 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Cidade"
                  className="w-full p-2 rounded-xl bg-[#080811] border border-white/10 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                />
              </div>

              <input
                type="text"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                placeholder="Complemento / Ponto de referência (Apto, Bloco, etc)"
                className="w-full p-2 rounded-xl bg-[#080811] border border-white/10 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
              />
            </div>

            {/* Checkbox: Conta de Dono / Proprietário */}
            <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#080811] border border-[#8423DA]/30 cursor-pointer hover:border-[#00DFFF]/50 transition">
              <input
                type="checkbox"
                checked={isOwnerRole}
                onChange={(e) => setIsOwnerRole(e.target.checked)}
                className="w-4 h-4 rounded text-[#8423DA] focus:ring-[#00DFFF] cursor-pointer"
              />
              <div className="text-left">
                <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cadastrar como Proprietário / Dono da Loja</span>
                </span>
                <span className="text-[10px] text-[#A5A5B8] block">
                  Concede acesso irrestrito ao Painel Administrativo de Gestão do Catálogo.
                </span>
              </div>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#007BFF] hover:brightness-110 text-[#080811] font-black text-xs uppercase tracking-wider shadow-lg shadow-[#00DFFF]/20 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{isLoading ? 'Cadastrando...' : 'Criar Minha Conta & Salvar Dados'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
