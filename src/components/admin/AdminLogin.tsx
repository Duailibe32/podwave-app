import React, { useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { Lock, User, KeyRound, ArrowLeft, ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const { adminLogin, setCurrentView, settings } = useCatalog();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const success = adminLogin(username, password);
    if (!success) {
      setErrorMessage('Credenciais incorretas. Verifique seu login e senha.');
    }
  };

  const handleBackToCatalog = () => {
    setCurrentView('catalog');
    window.history.pushState({}, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient glowing orbs */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[300px] bg-[#8423DA]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-[300px] h-[250px] bg-[#00DFFF]/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md space-y-8">
        {/* Card Frame */}
        <div className="rounded-3xl bg-[#0D1022]/95 light:bg-white border-2 border-[#8423DA]/35 light:border-slate-200 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Logo & Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-[#11152A] p-2 border border-[#8423DA]/40 flex items-center justify-center shadow-lg">
              <img
                src="/assets/images/logo.png"
                alt="PodWave Logo Oficial"
                className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,223,255,0.4)]"
                referrerPolicy="no-referrer"
              />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8423DA]/25 border border-[#8423DA]/50 text-[#00DFFF] text-[11px] font-bold uppercase tracking-wider">
                <Lock className="w-3 h-3 text-[#FACC15]" /> Área do Proprietário
              </span>
              <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-black text-white light:text-slate-900 tracking-tight">
                Painel Administrativo
              </h2>
              <p className="mt-1 text-xs text-[#A5A5B8] light:text-slate-600">
                Acesso exclusivo para gerenciamento de catálogo, marcas, produtos e cupons promocionais.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-5 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Usuário / Login */}
            <div>
              <label className="block text-xs font-bold text-gray-200 light:text-slate-800 mb-1.5">
                Usuário / Login *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 focus:border-[#00DFFF] text-white light:text-slate-900 text-sm focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-200 light:text-slate-800">
                  Senha de Acesso *
                </label>
                <span className="text-[10px] text-gray-400">Padrão do dono: 123</span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha (123)"
                  required
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 focus:border-[#00DFFF] text-white light:text-slate-900 text-sm focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-white p-0.5 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Hint Box */}
            <div className="p-3 rounded-xl bg-[#11152A] light:bg-slate-50 border border-[#8423DA]/25 flex items-center justify-between text-[11px] text-[#A5A5B8]">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#FACC15]" />
                Login: <strong className="text-white light:text-slate-800">admin</strong> &bull; Senha: <strong className="text-[#FACC15]">123</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setUsername('admin');
                  setPassword('123');
                }}
                className="text-[10px] text-[#00DFFF] hover:underline font-bold cursor-pointer"
              >
                Preencher
              </button>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] hover:opacity-95 text-white font-heading font-black text-sm tracking-wide shadow-lg shadow-[#8423DA]/30 transition-all cursor-pointer active:scale-98"
            >
              Entrar no Painel Administrativo
            </button>
          </form>

          {/* Back to Catalog */}
          <div className="mt-5 pt-4 border-t border-[#8423DA]/20 text-center">
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
          Sessão administrativa protegida &bull; {settings.storeName}
        </p>
      </div>
    </div>
  );
};
