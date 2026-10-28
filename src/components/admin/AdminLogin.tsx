import React, { useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { 
  Lock, 
  User, 
  KeyRound, 
  ArrowLeft, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  LogIn, 
  ShieldAlert, 
  Check, 
  Copy,
  RefreshCw
} from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const { 
    adminLogin, 
    loginWithGoogle, 
    currentUser, 
    isOwner, 
    isAdmin,
    isAuthChecking, 
    authErrorMessage, 
    setCurrentView, 
    settings 
  } = useCatalog();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!username.trim()) {
      setLocalError('Por favor informe o usuário ou e-mail do proprietário.');
      return;
    }
    if (!password) {
      setLocalError('Por favor informe a senha de acesso administrativo.');
      return;
    }

    setIsSubmitting(true);
    const success = await adminLogin(username.trim(), password);
    setIsSubmitting(false);

    if (!success) {
      setLocalError('Credenciais administrativas inválidas. Acesso exclusivo para o proprietário autorizado.');
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setIsSubmitting(true);
    const success = await loginWithGoogle();
    setIsSubmitting(false);
    if (!success) {
      setLocalError('A conta Google selecionada não possui autorização de proprietário neste sistema.');
    }
  };

  const handleBackToCatalog = () => {
    setCurrentView('catalog');
    window.history.pushState({}, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyCurrentUid = () => {
    if (currentUser?.id) {
      navigator.clipboard.writeText(currentUser.id);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient glowing orbs with project neon palette */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[300px] bg-[#8423DA]/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-[300px] h-[250px] bg-[#00DFFF]/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md space-y-6">
        {/* Card Frame */}
        <div className="rounded-3xl bg-[#0D1022]/95 border-2 border-[#8423DA]/40 p-6 sm:p-8 shadow-[0_0_50px_rgba(132,35,218,0.25)] backdrop-blur-xl">
          {/* Logo & Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-[#11152A] p-2 border border-[#00DFFF]/40 flex items-center justify-center shadow-lg shadow-[#00DFFF]/10">
              <img
                src="/assets/images/logo.png"
                alt="PodWave Logo Oficial"
                className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,223,255,0.4)]"
                referrerPolicy="no-referrer"
              />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8423DA]/25 border border-[#8423DA]/50 text-[#00DFFF] text-[11px] font-black uppercase tracking-wider">
                <Lock className="w-3 h-3 text-[#00DFFF]" /> Área do Proprietário (OWNER)
              </span>
              <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-black text-white tracking-tight">
                Painel do Proprietário
              </h2>
              <p className="mt-1 text-xs text-[#A5A5B8] leading-relaxed">
                Acesso exclusivo para gerenciamento de catálogo, disponibilidade de estoque e configurações.
              </p>
            </div>
          </div>

          {/* Unauthorized Common User Alert */}
          {currentUser && !isAdmin && (
            <div className="mt-5 p-4 rounded-2xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-200 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Acesso Não Autorizado</span>
              </div>
              <p className="text-[11px] text-rose-300/90 leading-relaxed">
                A conta <strong>{currentUser.email || currentUser.fullName}</strong> está autenticada como Cliente e não possui privilégios de Administrador ou Dono.
              </p>
              <div className="pt-2 flex items-center justify-between border-t border-rose-500/20 text-[10px]">
                <span className="text-gray-400 font-mono truncate max-w-[180px]">ID: {currentUser.id}</span>
                <button
                  type="button"
                  onClick={copyCurrentUid}
                  className="text-[#00DFFF] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                >
                  {copiedUid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUid ? 'Copiado!' : 'Copiar UID'}</span>
                </button>
              </div>
            </div>
          )}

          {/* General Error Message */}
          {(localError || authErrorMessage) && (
            <div className="mt-5 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{localError || authErrorMessage}</span>
            </div>
          )}

          {/* Primary Owner Access: Google Authentication */}
          <div className="mt-6 space-y-3">
            <button
              type="button"
              disabled={isAuthChecking || isSubmitting}
              onClick={handleGoogleSignIn}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#00DFFF] via-[#007BFF] to-[#8423DA] hover:opacity-95 text-[#080811] font-heading font-black text-sm tracking-wide shadow-lg shadow-[#00DFFF]/20 transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#080811]" />
              ) : (
                <LogIn className="w-4 h-4 text-[#080811]" />
              )}
              <span>Entrar com Conta Google Autorizada</span>
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-[#8423DA]/25"></div>
              <span className="flex-shrink mx-3 text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                ou credenciais administrativas
              </span>
              <div className="flex-grow border-t border-[#8423DA]/25"></div>
            </div>
          </div>

          {/* Form Login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Usuário / Login */}
            <div>
              <label className="block text-xs font-bold text-gray-200 mb-1.5">
                Usuário ou E-mail do Administrador *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin@podwave.com"
                  required
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#141838] border border-[#8423DA]/30 focus:border-[#00DFFF] text-white text-sm focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-xs font-bold text-gray-200 mb-1.5">
                Senha Administrativa *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha de acesso"
                  required
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#141838] border border-[#8423DA]/30 focus:border-[#00DFFF] text-white text-sm focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-white p-0.5 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl bg-[#181C38] hover:bg-[#8423DA] border border-[#8423DA]/40 text-white font-heading font-black text-sm tracking-wide shadow-lg transition-all cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isSubmitting ? 'Verificando autorização...' : 'Acessar Painel do Proprietário'}
            </button>
          </form>

          {/* Back to Catalog */}
          <div className="mt-4 pt-3 border-t border-[#8423DA]/20 text-center">
            <button
              type="button"
              onClick={handleBackToCatalog}
              className="inline-flex items-center gap-2 text-xs text-[#A5A5B8] hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Catálogo de Produtos</span>
            </button>
          </div>
        </div>

        {/* Security badge footer */}
        <p className="text-center text-[11px] text-gray-500">
          Autenticação administrativa restrita &bull; {settings.storeName}
        </p>
      </div>
    </div>
  );
};
