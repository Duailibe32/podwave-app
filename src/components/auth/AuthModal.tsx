import React, { useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { CustomerAddress } from '../../types/catalog';
import {
  X,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  HelpCircle,
  MessageCircle,
  KeyRound,
  Send,
  ShieldCheck,
  Fingerprint,
} from 'lucide-react';
import { PasskeyBiometricLoading } from './PasskeyBiometricLoading';

type AuthModalTab = 'login' | 'otp' | 'signup';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalMode,
    closeAuthModal,
    loginUser,
    registerUser,
    signInWithGoogle,
    sendOtpCode,
    verifyOtpCode,
    resetPassword,
    signInWithPasskey,
    settings,
  } = useCatalog();

  const [mode, setMode] = useState<AuthModalTab>(authModalMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneWhatsapp, setPhoneWhatsapp] = useState('');

  // Passwordless OTP States (Magic Link / 6-digit code)
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Google OAuth Loading State
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Passkey / WebAuthn Loading State
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);

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
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  React.useEffect(() => {
    setMode(authModalMode);
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowForgotModal(false);
    setIsSendingResetEmail(false);
    setOtpStep('request');
    setOtpCode('');
  }, [authModalMode, isAuthModalOpen]);

  // Countdown timer for OTP resend cooldown
  React.useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

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
    if (raw.length !== 8) {
      setErrorMsg('Por favor informe um CEP válido com 8 dígitos.');
      return;
    }

    setIsSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setStreet(data.logradouro || '');
        setBairro(data.bairro || '');
        setCity(data.localidade || '');
        setState(data.uf || '');
      } else {
        setErrorMsg('CEP não localizado pelos Correios. Preencha manualmente.');
      }
    } catch {
      setErrorMsg('Não foi possível consultar o CEP no momento.');
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Por favor informe um e-mail válido.');
      return;
    }
    if (!password) {
      setErrorMsg('Por favor informe sua senha.');
      return;
    }

    setIsLoading(true);
    const res = await loginUser(cleanEmail, password);
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

    const cleanEmail = email.trim().toLowerCase();
    if (!fullName.trim()) {
      setErrorMsg('Por favor informe seu nome completo.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Por favor informe um e-mail válido.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('A senha precisa ter no mínimo 6 caracteres para sua segurança.');
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
      email: cleanEmail,
      fullName: fullName.trim(),
      phoneWhatsapp: phoneWhatsapp.trim(),
      password,
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

  const handlePasskeySignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsPasskeyLoading(true);
    try {
      const res = await signInWithPasskey();
      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          closeAuthModal();
        }, 900);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha ao autenticar com biometria ou Passkey.');
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsGoogleLoading(true);
    const res = await signInWithGoogle();
    setIsGoogleLoading(false);
    if (!res.success) {
      setErrorMsg(res.message);
    } else {
      setSuccessMsg(res.message);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Por favor informe um e-mail válido.');
      return;
    }

    setIsOtpSending(true);
    const res = await sendOtpCode(cleanEmail);
    setIsOtpSending(false);

    if (res.success) {
      setSuccessMsg(res.message);
      setOtpStep('verify');
      setOtpCooldown(60);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = otpCode.trim().replace(/\D/g, '');

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('E-mail inválido. Volte para a etapa anterior.');
      return;
    }

    if (cleanToken.length < 6) {
      setErrorMsg('Por favor informe o código de 6 dígitos recebido por e-mail.');
      return;
    }

    setIsOtpVerifying(true);
    const res = await verifyOtpCode(cleanEmail, cleanToken);
    setIsOtpVerifying(false);

    if (res.success) {
      setSuccessMsg(res.message);
      setTimeout(() => {
        closeAuthModal();
      }, 1000);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleSendPasswordResetEmail = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Por favor informe seu e-mail no campo acima para enviarmos o link de recuperação.');
      return;
    }
    setIsSendingResetEmail(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await resetPassword(cleanEmail);
    setIsSendingResetEmail(false);

    if (res.success) {
      setSuccessMsg(res.message);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleContactSupportForPassword = () => {
    const phone = settings.supportPhone || settings.whatsappNumber || '5586999014685';
    const cleanPhone = phone.replace(/\D/g, '');
    const text = encodeURIComponent(
      `Olá, equipe PodWave! Preciso de ajuda para redefinir minha senha de acesso com o e-mail: ${email || '[meu e-mail]'}.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0D1022] border-2 border-[#8423DA]/40 shadow-2xl overflow-hidden my-auto">
        {/* Header with Neon Accent */}
        <div className="p-6 bg-gradient-to-r from-[#141838] via-[#11152A] to-[#181D3D] border-b border-[#8423DA]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#8423DA]/20 to-[#00DFFF]/20 border border-[#00DFFF]/50 flex items-center justify-center text-[#00DFFF] shadow-md shadow-[#00DFFF]/20">
              {mode === 'otp' ? (
                <KeyRound className="w-5 h-5 text-[#00DFFF]" />
              ) : mode === 'signup' ? (
                <ShoppingBag className="w-5 h-5 text-[#00DFFF]" />
              ) : (
                <Sparkles className="w-5 h-5 text-[#00DFFF]" />
              )}
            </div>
            <div>
              <h3 className="font-heading text-lg font-black text-white flex items-center gap-2">
                {mode === 'login'
                  ? 'Entrar com Senha'
                  : mode === 'otp'
                  ? 'Entrar sem Senha (Código)'
                  : 'Criar Nova Conta'}
              </h3>
              <p className="text-xs text-[#A5A5B8]">
                {mode === 'login'
                  ? 'Acesse com suas credenciais ou Google em 1 clique'
                  : mode === 'otp'
                  ? 'Receba um código de 6 dígitos no seu e-mail (100% gratuito)'
                  : 'Salve seus dados de entrega para agilizar compras futuras'}
              </p>
            </div>
          </div>

          <button
            onClick={closeAuthModal}
            className="p-2 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 text-gray-400 hover:text-white transition cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher - 3 Opções Modernas & Intuitivas */}
        <div className="flex border-b border-[#8423DA]/20 bg-[#080811]/60 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 px-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Com Senha</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('otp');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 px-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'otp'
                ? 'bg-gradient-to-r from-[#00DFFF] to-[#007BFF] text-[#080811] font-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Sem Senha (Código)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 px-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'signup'
                ? 'bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] text-white font-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Criar Conta</span>
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

        {/* ===================== TAB 1: LOGIN COM SENHA ===================== */}
        {mode === 'login' && (
          <div className="p-6 space-y-4 text-xs">
            {/* Feedback Visual: Skeleton Loading com Ícone de Biometria */}
            {isPasskeyLoading ? (
              <PasskeyBiometricLoading
                onCancel={() => setIsPasskeyLoading(false)}
                title="Aguardando autorização biométrica..."
                description="O seu navegador está solicitando a confirmação por Face ID, digital ou chave de segurança FIDO2."
                mode="signin"
              />
            ) : (
              <button
                type="button"
                onClick={handlePasskeySignIn}
                disabled={isLoading || isGoogleLoading}
                className="w-full relative group rounded-2xl p-[1.5px] bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] hover:shadow-xl hover:shadow-[#00DFFF]/25 transition-all duration-300 active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <div className="w-full h-full py-3 px-4 rounded-[14px] bg-gradient-to-r from-[#0F132B] via-[#0C0F22] to-[#121633] group-hover:from-[#141938] group-hover:to-[#171D42] flex items-center justify-between transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8423DA]/30 to-[#00DFFF]/30 border border-[#00DFFF]/60 flex items-center justify-center text-[#00DFFF] shadow-md shadow-[#00DFFF]/20 group-hover:scale-105 group-hover:border-[#00DFFF] transition-all">
                      <Fingerprint className="w-5 h-5 text-[#00DFFF]" />
                    </div>
                    <div className="text-left">
                      <span className="block font-black text-xs text-white group-hover:text-[#00DFFF] transition-colors flex items-center gap-1.5">
                        Entrar com Face ID, Digital ou Passkey
                        <Sparkles className="w-3.5 h-3.5 text-[#00DFFF] shrink-0" />
                      </span>
                      <span className="block text-[10px] text-[#A5A5B8]">
                        Acesso biométrico rápido sem precisar digitar senha
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#00DFFF] group-hover:translate-x-1 transition-transform shrink-0" />
                </div>
              </button>
            )}

            {/* Botão de Login com Google (1 clique) */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading || isPasskeyLoading}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs flex items-center justify-center gap-3 transition shadow-lg shadow-white/5 active:scale-95 disabled:opacity-50 border border-gray-200 cursor-pointer"
            >
              {isGoogleLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-gray-600" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isGoogleLoading ? 'Conectando ao Google...' : 'Continuar com Google (1 clique)'}</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#8423DA]/25"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase font-bold tracking-wider text-[#A5A5B8]">
                ou com e-mail e senha
              </span>
              <div className="flex-grow border-t border-[#8423DA]/25"></div>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-gray-200 font-bold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#00DFFF]" />
                    <span>Senha *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] text-[#00DFFF] hover:underline cursor-pointer"
                  >
                    Esqueci minha senha
                  </button>
                </div>
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
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#8423DA]/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                <span>{isLoading ? 'Autenticando...' : 'Acessar Conta'}</span>
              </button>
            </form>

            {/* Atalho para entrar sem senha */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('otp');
                  setErrorMsg(null);
                }}
                className="text-[11px] text-[#00DFFF] hover:underline cursor-pointer font-medium inline-flex items-center gap-1"
              >
                <KeyRound className="w-3 h-3" />
                <span>Prefere entrar sem senha? Receba um código por e-mail</span>
              </button>
            </div>

            {/* Password Recovery Box */}
            {showForgotModal && (
              <div className="mt-4 p-4 rounded-2xl bg-[#141838] border border-[#00DFFF]/40 text-xs space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between text-[#00DFFF] font-bold">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    <span>Recuperação Segura de Senha</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="p-1 rounded-lg text-gray-400 hover:text-white cursor-pointer"
                    aria-label="Fechar recuperação de senha"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[#A5A5B8] leading-relaxed text-[11px]">
                  Solicite um link oficial de redefinição de senha para o seu e-mail ou fale diretamente com a equipe PodWave:
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleSendPasswordResetEmail}
                    disabled={isSendingResetEmail}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#8423DA] to-[#007BFF] hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow active:scale-95 disabled:opacity-50"
                  >
                    {isSendingResetEmail ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Mail className="w-3.5 h-3.5" />
                    )}
                    <span>{isSendingResetEmail ? 'Enviando...' : 'Enviar Link por E-mail'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleContactSupportForPassword}
                    className="py-2.5 px-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow active:scale-95"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Suporte WhatsApp</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 2: LOGIN SEM SENHA (OTP) ===================== */}
        {mode === 'otp' && (
          <div className="p-6 space-y-4 text-xs">
            {/* Feedback Visual: Skeleton Loading com Ícone de Biometria */}
            {isPasskeyLoading ? (
              <PasskeyBiometricLoading
                onCancel={() => setIsPasskeyLoading(false)}
                title="Aguardando autorização biométrica..."
                description="O seu navegador está solicitando a confirmação por Face ID, digital ou chave de segurança FIDO2."
                mode="signin"
              />
            ) : (
              <button
                type="button"
                onClick={handlePasskeySignIn}
                disabled={isOtpSending || isOtpVerifying}
                className="w-full relative group rounded-2xl p-[1.5px] bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] hover:shadow-xl hover:shadow-[#00DFFF]/25 transition-all duration-300 active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <div className="w-full h-full py-3 px-4 rounded-[14px] bg-gradient-to-r from-[#0F132B] via-[#0C0F22] to-[#121633] group-hover:from-[#141938] group-hover:to-[#171D42] flex items-center justify-between transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8423DA]/30 to-[#00DFFF]/30 border border-[#00DFFF]/60 flex items-center justify-center text-[#00DFFF] shadow-md shadow-[#00DFFF]/20 group-hover:scale-105 group-hover:border-[#00DFFF] transition-all">
                      <Fingerprint className="w-5 h-5 text-[#00DFFF]" />
                    </div>
                    <div className="text-left">
                      <span className="block font-black text-xs text-white group-hover:text-[#00DFFF] transition-colors flex items-center gap-1.5">
                        Entrar com Face ID, Digital ou Passkey
                        <Sparkles className="w-3.5 h-3.5 text-[#00DFFF] shrink-0" />
                      </span>
                      <span className="block text-[10px] text-[#A5A5B8]">
                        Entrar instantaneamente com biometria cadastrada
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#00DFFF] group-hover:translate-x-1 transition-transform shrink-0" />
                </div>
              </button>
            )}

            {/* Botão de Login com Google (1 clique) */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isOtpSending || isOtpVerifying || isPasskeyLoading}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs flex items-center justify-center gap-3 transition shadow-lg shadow-white/5 active:scale-95 disabled:opacity-50 border border-gray-200 cursor-pointer"
            >
              {isGoogleLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-gray-600" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isGoogleLoading ? 'Conectando ao Google...' : 'Continuar com Google (1 clique)'}</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#8423DA]/25"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase font-bold tracking-wider text-[#A5A5B8]">
                ou código direto por e-mail
              </span>
              <div className="flex-grow border-t border-[#8423DA]/25"></div>
            </div>

            {/* Banner de Ajuda / Vantagem do Login sem Senha */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-[#8423DA]/15 to-[#00DFFF]/15 border border-[#00DFFF]/30 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#00DFFF] shrink-0 mt-0.5" />
              <div className="text-[11px] text-gray-300 leading-relaxed">
                <span className="font-bold text-white">100% Gratuito e Seguro:</span> Sem precisar decorar ou redefinir senhas. Você recebe um código numérico de 6 dígitos no seu e-mail e entra na hora.
              </div>
            </div>

            {/* ETAPA 1: SOLICITAR CÓDIGO */}
            {otpStep === 'request' && (
              <form onSubmit={handleSendOtp} className="space-y-3.5">
                <div>
                  <label className="block text-gray-200 font-bold mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#00DFFF]" />
                    <span>Seu E-mail *</span>
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

                <button
                  type="submit"
                  disabled={isOtpSending}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00DFFF] via-[#007BFF] to-[#8423DA] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#00DFFF]/20 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
                >
                  {isOtpSending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{isOtpSending ? 'Enviando código...' : 'Enviar Código por E-mail'}</span>
                </button>
              </form>
            )}

            {/* ETAPA 2: VALIDAR CÓDIGO RECEBIDO */}
            {otpStep === 'verify' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in">
                <div className="p-3 rounded-xl bg-[#141838] border border-[#8423DA]/40 flex items-center justify-between">
                  <div className="truncate">
                    <span className="text-[10px] text-[#A5A5B8] block">Código enviado para:</span>
                    <span className="text-xs font-bold text-white truncate block">{email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep('request');
                      setOtpCode('');
                      setErrorMsg(null);
                    }}
                    className="text-[11px] text-[#00DFFF] hover:underline cursor-pointer shrink-0 font-bold ml-2"
                  >
                    Alterar
                  </button>
                </div>

                <div>
                  <label className="block text-gray-200 font-bold mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-[#00DFFF]" />
                      <span>Digite o Código de 6 Dígitos *</span>
                    </span>
                    <span className="text-[10px] text-[#A5A5B8]">Verifique entrada e spam</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                    required
                    className="w-full p-3.5 text-center font-mono text-xl tracking-[0.4em] font-black rounded-xl bg-[#141838] border-2 border-[#00DFFF]/50 text-white focus:outline-none focus:border-[#00DFFF] shadow-inner"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isOtpVerifying || otpCode.length < 6}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#007BFF] hover:brightness-110 text-[#080811] font-black text-xs uppercase tracking-wider shadow-lg shadow-[#00DFFF]/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
                >
                  {isOtpVerifying ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{isOtpVerifying ? 'Validando...' : 'Acessar Minha Conta'}</span>
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep('request');
                      setErrorMsg(null);
                    }}
                    className="text-[11px] text-gray-400 hover:text-white cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Voltar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={isOtpSending || otpCooldown > 0}
                    className="text-[11px] text-[#00DFFF] hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline font-medium"
                  >
                    {otpCooldown > 0
                      ? `Reenviar código em ${otpCooldown}s`
                      : 'Reenviar código'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ===================== TAB 3: SIGNUP ===================== */}
        {mode === 'signup' && (
          <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
            {/* Botão de Registro / Login com Google (1 clique) */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs flex items-center justify-center gap-3 transition shadow-lg shadow-white/5 active:scale-95 disabled:opacity-50 border border-gray-200 cursor-pointer"
            >
              {isGoogleLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-gray-600" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isGoogleLoading ? 'Conectando ao Google...' : 'Cadastrar ou Entrar com Google (1 clique)'}</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#8423DA]/25"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase font-bold tracking-wider text-[#A5A5B8]">
                ou preencher cadastro manual
              </span>
              <div className="flex-grow border-t border-[#8423DA]/25"></div>
            </div>
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
                <label className="block text-gray-200 font-bold mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#00DFFF]" />
                  <span>WhatsApp / Telefone</span>
                </label>
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
                <label className="block text-gray-200 font-bold mb-1">Senha (Mínimo 6 caracteres) *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
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
                      title="Buscar CEP no ViaCEP"
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#007BFF] hover:brightness-110 text-[#080811] font-black text-xs uppercase tracking-wider shadow-lg shadow-[#00DFFF]/20 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
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
