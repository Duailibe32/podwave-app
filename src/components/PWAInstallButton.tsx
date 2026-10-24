import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { 
  Download, 
  Smartphone, 
  Share2, 
  PlusSquare, 
  X, 
  CheckCircle2, 
  Copy, 
  Check, 
  Laptop, 
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Zap,
  WifiOff
} from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'floating' | 'banner' | 'drawer';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, platform, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>(platform);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccessToast, setInstallSuccessToast] = useState(false);

  // Sync activeTab with detected platform on mount or change
  useEffect(() => {
    setActiveTab(platform);
  }, [platform]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isModalOpen]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleDirectInstall = async () => {
    setIsInstalling(true);
    const result = await install();
    setIsInstalling(false);

    if (result === 'accepted') {
      setIsModalOpen(false);
      setInstallSuccessToast(true);
      setTimeout(() => setInstallSuccessToast(false), 5000);
    } else if (result === 'unavailable') {
      // Prompt not armed yet by browser, keep modal open on the specific platform tab
      setActiveTab(platform);
    }
  };

  const handleCopyLink = () => {
    const appUrl = window.location.origin || window.location.href;
    navigator.clipboard.writeText(appUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleNativeShare = async () => {
    const appUrl = window.location.origin || window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PodWave — Catálogo Digital',
          text: 'Acesse o catálogo digital oficial da PodWave direto pelo aplicativo!',
          url: appUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <>
      {/* 1. Header Variant */}
      {variant === 'header' && (
        <button
          onClick={handleOpenModal}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#8423DA]/30 to-[#007BFF]/30 hover:from-[#8423DA] hover:to-[#007BFF] border border-[#00DFFF]/40 text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(0,223,255,0.2)] hover:shadow-[0_0_20px_rgba(0,223,255,0.4)] cursor-pointer active:scale-95 shrink-0"
          title="Instalar App PodWave no celular ou computador"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#00DFFF] animate-pulse" />
          <span className="hidden sm:inline">Instalar App</span>
          <span className="sm:hidden text-[11px]">App</span>
          {isInstalled && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" title="Instalado" />
          )}
        </button>
      )}

      {/* 2. Floating Variant */}
      {variant === 'floating' && (
        <button
          onClick={handleOpenModal}
          className="group flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#0D1022]/95 hover:bg-[#141838] border border-[#00DFFF]/60 text-white text-xs font-bold shadow-[0_4px_25px_rgba(0,223,255,0.3)] backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Opções de Instalação do App PodWave"
        >
          <Download className="w-4 h-4 text-[#00DFFF] group-hover:animate-bounce" />
          <span>Instalar App</span>
          {isInstalled ? (
            <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              Instalado
            </span>
          ) : (
            <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-[#00DFFF]/20 text-[#00DFFF] border border-[#00DFFF]/40">
              PWA
            </span>
          )}
        </button>
      )}

      {/* 3. Banner Variant */}
      {variant === 'banner' && (
        <button
          onClick={handleOpenModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] text-white text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(0,223,255,0.4)] hover:brightness-110 transition-all cursor-pointer active:scale-95"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>Baixar Catálogo no Aparelho</span>
        </button>
      )}

      {/* 4. Drawer Variant */}
      {variant === 'drawer' && (
        <button
          onClick={handleOpenModal}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-[#141838] hover:bg-[#1c224e] border border-[#00DFFF]/30 text-white text-xs font-bold transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-[#00DFFF]" />
            <span>Instalar Aplicativo PodWave</span>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-[#00DFFF]/20 text-[#00DFFF]">
            Opções
          </span>
        </button>
      )}

      {/* ===================== MODAL DE OPÇÕES DE INSTALAÇÃO PWA (PORTAL TO BODY) ===================== */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          {/* Backdrop Click Outside */}
          <div
            className="fixed inset-0 bg-transparent"
            onClick={() => setIsModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0D1022] light:bg-white border-2 border-[#8423DA]/50 p-5 sm:p-6 shadow-[0_0_60px_rgba(132,35,218,0.4)] space-y-5 text-white light:text-slate-900 my-auto animate-in zoom-in-95 duration-200 z-10">
            {/* Header with App Logo and Close */}
            <div className="flex items-start justify-between gap-3 border-b border-[#8423DA]/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8423DA] to-[#00DFFF] p-0.5 shadow-lg shadow-[#00DFFF]/20 shrink-0">
                  <div className="w-full h-full rounded-[14px] bg-[#080811] flex items-center justify-center overflow-hidden">
                    <img src="/assets/images/logo.png" alt="PodWave Logo" className="w-8 h-8 object-contain" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-base sm:text-lg font-black tracking-tight text-white light:text-slate-900">
                      PodWave App
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-gradient-to-r from-[#8423DA] to-[#00DFFF] text-white">
                      PWA
                    </span>
                  </div>
                  <p className="text-[11px] text-[#A5A5B8]">
                    Catálogo oficial para instalar na tela do celular ou PC
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-[#141838] hover:bg-[#8423DA] text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status if already running installed */}
            {isInstalled && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-emerald-400">Você já está usando o app instalado!</p>
                  <p className="text-[11px] text-[#A5A5B8]">O PodWave já está configurado na tela inicial do seu dispositivo.</p>
                </div>
              </div>
            )}

            {/* Direct Install Button (If browser prompt is available) */}
            {isInstallable && !isInstalled && (
              <div className="space-y-2">
                <button
                  onClick={handleDirectInstall}
                  disabled={isInstalling}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#00DFFF] via-[#007BFF] to-[#8423DA] hover:brightness-110 active:scale-98 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(0,223,255,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5 stroke-[2.5]" />
                  <span>{isInstalling ? 'Instalando...' : 'Instalar Aplicativo Agora (1 Clique)'}</span>
                </button>
                <p className="text-center text-[10px] text-[#A5A5B8]">
                  Clique acima para abrir a caixa de instalação oficial do seu navegador.
                </p>
              </div>
            )}

            {/* Benefit Bullets */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/20 space-y-1">
                <Zap className="w-4 h-4 text-[#00DFFF] mx-auto" />
                <p className="text-[10px] font-bold text-white light:text-slate-800">100% Rápido</p>
                <p className="text-[9px] text-[#A5A5B8]">Sem barras</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/20 space-y-1">
                <WifiOff className="w-4 h-4 text-[#E53CF3] mx-auto" />
                <p className="text-[10px] font-bold text-white light:text-slate-800">Modo Offline</p>
                <p className="text-[9px] text-[#A5A5B8]">Cache rápido</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/20 space-y-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto" />
                <p className="text-[10px] font-bold text-white light:text-slate-800">Leve e Seguro</p>
                <p className="text-[9px] text-[#A5A5B8]">Sem app store</p>
              </div>
            </div>

            {/* Platform Selector Tabs */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-300 light:text-slate-700">Selecione seu aparelho:</span>
                <span className="text-[10px] text-[#00DFFF] font-bold">
                  Detectado: {platform === 'ios' ? 'iPhone/iPad' : platform === 'android' ? 'Android' : 'Computador'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#141838] light:bg-slate-200 border border-[#8423DA]/25">
                <button
                  type="button"
                  onClick={() => setActiveTab('android')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'android'
                      ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('ios')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'ios'
                      ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>iPhone/iOS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('desktop')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'desktop'
                      ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Computador</span>
                </button>
              </div>
            </div>

            {/* Step-by-Step Instructions by Platform */}
            <div className="p-4 rounded-2xl bg-[#11152A] light:bg-slate-50 border border-[#8423DA]/30 space-y-3 text-xs">
              {activeTab === 'android' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs pb-1 border-b border-[#8423DA]/20">
                    <Smartphone className="w-4 h-4" />
                    <span>Como instalar no Android (Google Chrome):</span>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#00DFFF]/20 text-[#00DFFF] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="text-gray-200 light:text-slate-700 leading-snug">
                      Abra o site no navegador <strong>Google Chrome</strong> ou <strong>Samsung Internet</strong>.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#8423DA]/30 text-[#E53CF3] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="text-gray-200 light:text-slate-700 leading-snug">
                      Toque no menu de <strong>três pontinhos (⋮)</strong> no canto superior direito da tela.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="text-gray-200 light:text-slate-700 leading-snug">
                      Toque na opção <strong className="text-[#00DFFF]">"Instalar aplicativo"</strong> ou <strong className="text-[#00DFFF]">"Adicionar à tela inicial"</strong> e confirme em <strong>Instalar</strong>.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'ios' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#00DFFF] font-bold text-xs pb-1 border-b border-[#8423DA]/20">
                    <Share2 className="w-4 h-4" />
                    <span>Como instalar no iPhone ou iPad (Safari):</span>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#00DFFF]/20 text-[#00DFFF] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="text-gray-200 light:text-slate-700 leading-snug">
                      Certifique-se de estar aberto no navegador <strong>Safari</strong> (se estiver no WhatsApp ou Instagram, copie o link e cole no Safari).
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#8423DA]/30 text-[#E53CF3] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="text-gray-200 light:text-slate-700 leading-snug">
                      Toque no botão <strong className="text-white light:text-slate-900 inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5 text-[#00DFFF]" /> Compartilhar</strong> (ícone do quadrado com seta para cima na barra inferior).
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="text-gray-200 light:text-slate-700 leading-snug">
                      Role para baixo e selecione <strong className="text-[#00DFFF] inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5" /> Adicionar à Tela de Início</strong>. Em seguida, toque em <strong className="text-white">Adicionar</strong> no canto superior.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'desktop' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#E53CF3] font-bold text-xs pb-1 border-b border-[#8423DA]/20">
                    <Laptop className="w-4 h-4" />
                    <span>Como instalar no Computador (Windows / Mac / Linux):</span>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#00DFFF]/20 text-[#00DFFF] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="text-gray-200 light:text-slate-700 leading-snug">
                      Acesse pelo <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong> ou <strong>Brave</strong>.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#8423DA]/30 text-[#E53CF3] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="text-gray-200 light:text-slate-700 leading-snug">
                      Localize o ícone de computador com seta para baixo <strong className="text-[#00DFFF]">(Instalar)</strong> na <strong>barra de endereços</strong> à direita do link.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="text-gray-200 light:text-slate-700 leading-snug">
                      Ou clique nos <strong>3 pontinhos (⋮)</strong> no canto superior $\rightarrow$ <strong>Salvar e Compartilhar</strong> $\rightarrow$ <strong>Instalar PodWave</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Utility Actions: Copy Link & Share */}
            <div className="pt-1 flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-[#141838] hover:bg-[#1c224e] border border-[#8423DA]/30 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Link Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#00DFFF]" />
                    <span>Copiar Link do App</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#8423DA] to-[#007BFF] hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Share2 className="w-4 h-4 text-white" />
                <span>Compartilhar App</span>
              </button>
            </div>

            <div className="text-center pt-1 border-t border-[#8423DA]/15">
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer py-1"
              >
                Fechar janela
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Success Notification */}
      {installSuccessToast && typeof document !== 'undefined' && createPortal(
        <div className="fixed top-6 right-6 z-[9999] flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3.5 text-xs font-bold text-white shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <div>
            <p className="font-extrabold">PodWave Instalado!</p>
            <p className="text-[10px] text-emerald-100">O ícone já está disponível na sua tela inicial.</p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
