import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share2, PlusSquare, X, CheckCircle2 } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'floating' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isSuccessToast, setIsSuccessToast] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setIsSuccessToast(true);
        setTimeout(() => setIsSuccessToast(false), 4000);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // General instructions modal if browser doesn't trigger prompt yet
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      {variant === 'header' && (
        <button
          onClick={handleInstallClick}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#8423DA]/30 to-[#007BFF]/30 hover:from-[#8423DA] hover:to-[#007BFF] border border-[#00DFFF]/40 text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(0,223,255,0.2)] hover:shadow-[0_0_20px_rgba(0,223,255,0.4)] cursor-pointer"
          title="Instalar catálogo no seu celular ou computador"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#00DFFF]" />
          <span>Instalar App</span>
        </button>
      )}

      {variant === 'floating' && (
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#0D1022]/95 hover:bg-[#141838] border border-[#00DFFF]/50 text-white text-xs font-bold shadow-xl backdrop-blur-md transition-all hover:scale-105 cursor-pointer"
          title="Instalar App PodWave"
        >
          <Download className="w-4 h-4 text-[#00DFFF]" />
          <span>Instalar App</span>
        </button>
      )}

      {variant === 'banner' && (
        <button
          onClick={handleInstallClick}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white text-xs font-black uppercase tracking-wider shadow-lg hover:brightness-110 transition cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Baixar Catálogo App</span>
        </button>
      )}

      {/* iOS or Manual Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-[#0D1022] light:bg-white border-2 border-[#8423DA]/50 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#8423DA]/30 border border-[#8423DA] flex items-center justify-center text-[#00DFFF]">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="font-heading text-base font-bold text-white light:text-slate-900">
                  Instalar Catálogo PodWave
                </h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1.5 rounded-lg bg-[#181C38] text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#A5A5B8] leading-relaxed">
              Adicione o catálogo oficial da <strong>PodWave</strong> à tela inicial do seu celular para acesso instantâneo em tela cheia e consulta offline rápida:
            </p>

            <div className="space-y-3 bg-[#11152A] light:bg-slate-100 p-4 rounded-2xl border border-[#8423DA]/20 text-xs">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#00DFFF]/20 text-[#00DFFF] font-black text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <p className="text-gray-200 light:text-slate-700">
                  No navegador (Safari no iPhone ou Chrome no Android), toque no botão <strong className="text-white light:text-slate-900">Compartilhar</strong> ou no menu de 3 pontinhos.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#8423DA]/30 text-[#E53CF3] font-black text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <p className="text-gray-200 light:text-slate-700">
                  Role para baixo e selecione <strong className="text-[#00DFFF] inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5" /> Adicionar à Tela de Início</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">
                  3
                </span>
                <p className="text-gray-200 light:text-slate-700">
                  Confirme em <strong>Adicionar</strong>. O ícone da PodWave aparecerá junto aos seus outros aplicativos!
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {isSuccessToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-2xl">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>Aplicativo PodWave instalado com sucesso!</span>
        </div>
      )}
    </>
  );
};
