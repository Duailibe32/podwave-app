import React, { useState, useEffect, useRef } from 'react';
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
  ShieldCheck,
  Zap,
  WifiOff,
  MoreVertical,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'floating' | 'banner' | 'drawer' | 'smart-banner';
}

const SMART_BANNER_DISMISSED_KEY = 'podwave_pwa_banner_dismissed_v2';

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isInAppBrowser, platform, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>(platform);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccessToast, setInstallSuccessToast] = useState(false);
  const [guideHighlight, setGuideHighlight] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem(SMART_BANNER_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const instructionsRef = useRef<HTMLDivElement | null>(null);

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
    setActiveTab(platform);
    setGuideHighlight(false);
    setIsModalOpen(true);
  };

  const handleDismissSmartBanner = () => {
    setBannerDismissed(true);
    try {
      sessionStorage.setItem(SMART_BANNER_DISMISSED_KEY, '1');
    } catch {
      // Ignore storage restrictions
    }
  };

  const handlePrimaryInstallAction = async () => {
    setIsInstalling(true);
    const result = await install();
    setIsInstalling(false);

    if (result === 'accepted') {
      setIsModalOpen(false);
      setInstallSuccessToast(true);
      setTimeout(() => setInstallSuccessToast(false), 5000);
    } else if (result === 'unavailable') {
      // Browser requires manual "Add to Home Screen" action (e.g., iOS Safari or Android menu)
      setActiveTab(platform);
      setGuideHighlight(true);
      if (!isModalOpen) {
        setIsModalOpen(true);
      }
      setTimeout(() => {
        instructionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
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

  // Hide smart banner if already installed as standalone PWA or dismissed
  if (variant === 'smart-banner' && (isInstalled || bannerDismissed)) {
    return null;
  }

  return (
    <>
      {/* 1. Header Variant */}
      {variant === 'header' && !isInstalled && (
        <button
          type="button"
          onClick={handleOpenModal}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] hover:brightness-110 border border-[#00DFFF]/50 text-white text-xs font-extrabold transition-all shadow-[0_0_15px_rgba(0,223,255,0.28)] cursor-pointer active:scale-95 shrink-0"
          title="Adicionar PodWave à Tela de Início"
        >
          <PlusSquare className="w-3.5 h-3.5 text-white shrink-0" />
          <span className="hidden md:inline">Adicionar à Tela de Início</span>
          <span className="md:hidden text-[11px] font-black">Baixar App</span>
        </button>
      )}

      {/* 2. Floating Variant */}
      {variant === 'floating' && !isInstalled && (
        <button
          type="button"
          onClick={handleOpenModal}
          className="group flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#0D1022]/95 hover:bg-[#141838] border border-[#00DFFF]/60 text-white text-xs font-bold shadow-[0_4px_25px_rgba(0,223,255,0.3)] backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Adicionar à Tela de Início"
        >
          <PlusSquare className="w-4 h-4 text-[#00DFFF] group-hover:animate-bounce" />
          <span>Adicionar à Tela de Início</span>
        </button>
      )}

      {/* 3. Banner Variant (Mobile Menu / Drawer) */}
      {variant === 'banner' && (
        <button
          type="button"
          onClick={handleOpenModal}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] text-white text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(0,223,255,0.35)] hover:brightness-110 transition-all cursor-pointer active:scale-95"
        >
          <PlusSquare className="w-4 h-4 stroke-[2.5]" />
          <span>Adicionar à Tela de Início (App)</span>
        </button>
      )}

      {/* 4. Drawer Variant */}
      {variant === 'drawer' && (
        <button
          type="button"
          onClick={handleOpenModal}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-[#141838] hover:bg-[#1c224e] border border-[#00DFFF]/35 text-white text-xs font-bold transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <PlusSquare className="w-4 h-4 text-[#00DFFF]" />
            <span>Adicionar à Tela de Início</span>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-[#00DFFF]/20 text-[#00DFFF]">
            Instalar
          </span>
        </button>
      )}

      {/* 5. Smart Banner Variant (Bottom Install Bar for Mobile & Desktop) */}
      {variant === 'smart-banner' && (
        <div className="fixed bottom-4 left-3 right-20 sm:left-6 sm:right-auto sm:max-w-md z-40 animate-in slide-in-from-bottom-4 duration-300">
          <div className="relative w-full rounded-2xl bg-gradient-to-r from-[#0F1329]/95 via-[#131836]/95 to-[#0D1022]/95 border border-[#00DFFF]/45 p-3 sm:p-3.5 shadow-[0_8px_32px_rgba(0,223,255,0.22)] backdrop-blur-xl flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8423DA] to-[#00DFFF] p-0.5 shrink-0 shadow-md">
                <div className="w-full h-full rounded-[10px] bg-[#080811] flex items-center justify-center overflow-hidden">
                  <img
                    src="/assets/images/logo.png"
                    alt="PodWave App"
                    className="w-7 h-7 object-contain"
                  />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-heading font-black text-xs text-white truncate">
                    App PodWave Oficial
                  </p>
                  <Sparkles className="w-3 h-3 text-[#00DFFF] shrink-0" />
                </div>
                <p className="text-[10px] text-[#B8B9CC] truncate">
                  Adicione à tela de início para acesso em 1 toque
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={isInstallable ? handlePrimaryInstallAction : handleOpenModal}
                disabled={isInstalling}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#007BFF] text-[#080811] font-black text-[11px] whitespace-nowrap shadow-md hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center gap-1"
              >
                <PlusSquare className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isInstalling ? 'Abrindo...' : 'Adicionar'}</span>
              </button>
              <button
                type="button"
                onClick={handleDismissSmartBanner}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                aria-label="Fechar aviso de instalação"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL DE OPÇÕES DE INSTALAÇÃO PWA (PORTAL TO BODY) ===================== */}
      {isModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto overflow-x-hidden">
            {/* Backdrop Click Outside */}
            <div
              className="fixed inset-0 bg-transparent"
              onClick={() => setIsModalOpen(false)}
              aria-hidden="true"
            />
            <div className="relative w-full max-w-md max-h-[92dvh] overflow-y-auto overflow-x-hidden rounded-3xl bg-[#0D1022] light:bg-white border-2 border-[#8423DA]/50 p-5 sm:p-6 shadow-[0_0_60px_rgba(132,35,218,0.4)] space-y-4 text-white light:text-slate-900 my-auto animate-in zoom-in-95 duration-200 z-10">
              {/* Header with App Logo and Close */}
              <div className="flex items-start justify-between gap-3 border-b border-[#8423DA]/20 pb-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8423DA] to-[#00DFFF] p-0.5 shadow-lg shadow-[#00DFFF]/20 shrink-0">
                    <div className="w-full h-full rounded-[14px] bg-[#080811] flex items-center justify-center overflow-hidden">
                      <img
                        src="/assets/images/logo.png"
                        alt="PodWave Logo"
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading text-base sm:text-lg font-black tracking-tight text-white light:text-slate-900">
                        Adicionar à Tela de Início
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-gradient-to-r from-[#8423DA] to-[#00DFFF] text-white">
                        APP OFICIAL
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A5A5B8]">
                      Tenha o catálogo PodWave direto na tela inicial do seu aparelho
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl bg-[#141838] hover:bg-[#8423DA] text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status if already running installed */}
              {isInstalled ? (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-emerald-400">
                      Você já está usando o app instalado!
                    </p>
                    <p className="text-[11px] text-[#A5A5B8]">
                      O PodWave já está configurado na tela de início do seu dispositivo.
                    </p>
                  </div>
                </div>
              ) : (
                /* Primary Action Button — Always Visible! */
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handlePrimaryInstallAction}
                    disabled={isInstalling}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#00DFFF] via-[#007BFF] to-[#8423DA] hover:brightness-110 active:scale-98 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(0,223,255,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isInstallable ? (
                      <>
                        <Download className="w-5 h-5 stroke-[2.5] shrink-0" />
                        <span>
                          {isInstalling
                            ? 'Abrindo instalador...'
                            : 'Adicionar à Tela de Início (1 Clique)'}
                        </span>
                      </>
                    ) : (
                      <>
                        <PlusSquare className="w-5 h-5 stroke-[2.5] shrink-0" />
                        <span>
                          {platform === 'ios'
                            ? 'Adicionar à Tela de Início no iPhone'
                            : 'Adicionar à Tela de Início Agora'}
                        </span>
                      </>
                    )}
                  </button>
                  <p className="text-center text-[11px] text-[#A5A5B8]">
                    {isInstallable
                      ? 'Toque no botão acima para confirmar a instalação automática no seu aparelho.'
                      : platform === 'ios'
                      ? 'No iPhone/Safari, a Apple exige tocar em Compartilhar → Adicionar à Tela de Início (veja abaixo).'
                      : 'Toque acima ou siga os 3 passos rápidos abaixo no menu do seu navegador.'}
                  </p>
                </div>
              )}

              {/* Warning if opened inside WhatsApp / Instagram in-app browser */}
              {isInAppBrowser && (
                <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/50 text-amber-200 text-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-300">
                        Você abriu pelo navegador interno do WhatsApp/Instagram
                      </p>
                      <p className="text-[11px] text-amber-100/90 mt-0.5 leading-relaxed">
                        Para aparecer o botão de <strong>Adicionar à Tela de Início</strong>, toque nos{' '}
                        <strong>3 pontinhos</strong> no canto superior e escolha{' '}
                        <strong>"Abrir no Chrome / Abrir no Safari"</strong>, ou copie o link abaixo:
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full py-2 px-3 rounded-xl bg-amber-400 text-[#080811] font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Link Copiado! Cole no Chrome/Safari' : 'Copiar Link para Abrir no Chrome/Safari'}</span>
                  </button>
                </div>
              )}

              {/* Benefit Bullets */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/20 space-y-1">
                  <Zap className="w-4 h-4 text-[#00DFFF] mx-auto" />
                  <p className="text-[10px] font-bold text-white light:text-slate-800">100% Rápido</p>
                  <p className="text-[9px] text-[#A5A5B8]">Direto na tela</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/20 space-y-1">
                  <WifiOff className="w-4 h-4 text-[#E53CF3] mx-auto" />
                  <p className="text-[10px] font-bold text-white light:text-slate-800">Modo Offline</p>
                  <p className="text-[9px] text-[#A5A5B8]">Cache inteligente</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/20 space-y-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto" />
                  <p className="text-[10px] font-bold text-white light:text-slate-800">Sem Ocupar</p>
                  <p className="text-[9px] text-[#A5A5B8]">Zero memória</p>
                </div>
              </div>

              {/* Platform Selector Tabs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-300 light:text-slate-700">
                    Passo a passo para seu aparelho:
                  </span>
                  <span className="text-[10px] text-[#00DFFF] font-bold">
                    Detectado:{' '}
                    {platform === 'ios'
                      ? 'iPhone / iPad'
                      : platform === 'android'
                      ? 'Android'
                      : 'Computador'}
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
                    <Smartphone className="w-3.5 h-3.5 shrink-0" />
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
                    <Share2 className="w-3.5 h-3.5 shrink-0" />
                    <span>iPhone</span>
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
                    <Laptop className="w-3.5 h-3.5 shrink-0" />
                    <span>PC</span>
                  </button>
                </div>
              </div>

              {/* Step-by-Step Instructions by Platform */}
              <div
                ref={instructionsRef}
                className={`p-4 rounded-2xl bg-[#11152A] light:bg-slate-50 border transition-all space-y-3 text-xs ${
                  guideHighlight
                    ? 'border-[#00DFFF] ring-2 ring-[#00DFFF]/40 shadow-[0_0_25px_rgba(0,223,255,0.25)]'
                    : 'border-[#8423DA]/30'
                }`}
              >
                {guideHighlight && (
                  <div className="p-2.5 rounded-xl bg-[#00DFFF]/15 border border-[#00DFFF]/40 text-[#00DFFF] text-[11px] font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>
                      Siga estes 3 passos rápidos no navegador para concluir a adição à tela de início:
                    </span>
                  </div>
                )}

                {activeTab === 'android' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs pb-1 border-b border-[#8423DA]/20">
                      <Smartphone className="w-4 h-4 shrink-0" />
                      <span>Como adicionar à tela de início no Android:</span>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#00DFFF]/20 text-[#00DFFF] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <p className="text-gray-200 light:text-slate-700 leading-snug">
                        Toque no ícone de{' '}
                        <strong className="text-white inline-flex items-center gap-0.5">
                          <MoreVertical className="w-3.5 h-3.5 text-[#00DFFF] inline" /> três pontinhos
                        </strong>{' '}
                        no canto superior direito do Chrome (ou barra inferior no Samsung Internet).
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#8423DA]/30 text-[#E53CF3] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <p className="text-gray-200 light:text-slate-700 leading-snug">
                        Toque em{' '}
                        <strong className="text-[#00DFFF]">"Adicionar à tela inicial"</strong> ou{' '}
                        <strong className="text-[#00DFFF]">"Instalar aplicativo"</strong>.
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <p className="text-gray-200 light:text-slate-700 leading-snug">
                        Confirme tocando em <strong>Instalar / Adicionar</strong> e o ícone da PodWave aparecerá junto aos seus apps!
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'ios' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[#00DFFF] font-bold text-xs pb-1 border-b border-[#8423DA]/20">
                      <Share2 className="w-4 h-4 shrink-0" />
                      <span>Como adicionar à tela de início no iPhone (Safari):</span>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#00DFFF]/20 text-[#00DFFF] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <p className="text-gray-200 light:text-slate-700 leading-snug">
                        Na barra do <strong>Safari</strong>, toque no botão{' '}
                        <strong className="text-white inline-flex items-center gap-1">
                          <Share2 className="w-3.5 h-3.5 text-[#00DFFF]" /> Compartilhar
                        </strong>{' '}
                        (quadrado com seta para cima).
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#8423DA]/30 text-[#E53CF3] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <p className="text-gray-200 light:text-slate-700 leading-snug">
                        Role a lista para baixo e toque em{' '}
                        <strong className="text-[#00DFFF] inline-flex items-center gap-1">
                          <PlusSquare className="w-3.5 h-3.5" /> Adicionar à Tela de Início
                        </strong>
                        .
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <p className="text-gray-200 light:text-slate-700 leading-snug">
                        Toque em <strong className="text-emerald-400">Adicionar</strong> no canto superior direito da tela.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'desktop' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[#E53CF3] font-bold text-xs pb-1 border-b border-[#8423DA]/20">
                      <Laptop className="w-4 h-4 shrink-0" />
                      <span>Como instalar no Computador (Chrome / Edge):</span>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#00DFFF]/20 text-[#00DFFF] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <p className="text-gray-200 light:text-slate-700 leading-snug">
                        Clique no ícone de <strong className="text-[#00DFFF]">Instalar PodWave</strong> (computador com seta) no lado direito da barra de endereço.
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#8423DA]/30 text-[#E53CF3] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <p className="text-gray-200 light:text-slate-700 leading-snug">
                        Ou clique nos <strong>3 pontinhos (⋮)</strong> $\rightarrow$ <strong>Salvar e compartilhar</strong> $\rightarrow$ <strong>Instalar página como aplicativo</strong>.
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
            </div>
          </div>,
          document.body
        )}

      {/* Success Notification */}
      {installSuccessToast &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed top-6 right-6 z-[9999] flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3.5 text-xs font-bold text-white shadow-2xl animate-in slide-in-from-top-4 duration-300">
            <CheckCircle2 className="w-5 h-5 text-white" />
            <div>
              <p className="font-extrabold">PodWave Adicionado à Tela de Início!</p>
              <p className="text-[10px] text-emerald-100">
                O aplicativo já está disponível na tela inicial do seu aparelho.
              </p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
