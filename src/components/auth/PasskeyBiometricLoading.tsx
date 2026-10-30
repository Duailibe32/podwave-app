import React from 'react';
import { Fingerprint, Smartphone, Laptop, ShieldCheck, X, Sparkles } from 'lucide-react';

interface PasskeyBiometricLoadingProps {
  onCancel?: () => void;
  title?: string;
  description?: string;
  mode?: 'signin' | 'register';
}

export const PasskeyBiometricLoading: React.FC<PasskeyBiometricLoadingProps> = ({
  onCancel,
  title = 'Aguardando autorização biométrica...',
  description,
  mode = 'signin',
}) => {
  // Detect current platform to display contextual biometric hints
  const [deviceHint, setDeviceHint] = React.useState<string>('Use Face ID, digital ou PIN');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || '';
      if (/iPhone|iPad|iPod/i.test(ua)) {
        setDeviceHint('Olhe para a câmera (Face ID) ou toque no Touch ID');
      } else if (/Macintosh/i.test(ua)) {
        setDeviceHint('Toque o dedo no sensor Touch ID do teclado');
      } else if (/Android/i.test(ua)) {
        setDeviceHint('Encoste seu dedo no leitor de impressão digital ou use seu PIN');
      } else if (/Windows/i.test(ua)) {
        setDeviceHint('Confirme via Windows Hello (rosto, digital ou PIN)');
      }
    }
  }, []);

  return (
    <div className="relative w-full rounded-2xl bg-gradient-to-b from-[#141838] via-[#0F132B] to-[#0A0D1E] border-2 border-[#00DFFF]/50 p-5 shadow-2xl shadow-[#00DFFF]/15 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Background Neon Scanner Grid Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#8423DA]/20 via-transparent to-transparent pointer-events-none" />

      {/* Close/Cancel Button in top right */}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-3 right-3 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer z-10"
          title="Cancelar autenticação"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Main Biometric Pulse Radar Container */}
      <div className="flex flex-col items-center text-center relative z-10 py-2">
        {/* Animated Biometric Scanner Icon with concentric glowing pulse rings */}
        <div className="relative flex items-center justify-center my-2">
          {/* Outer Ripple 1 */}
          <div className="absolute w-24 h-24 rounded-full bg-[#00DFFF]/15 animate-ping duration-1000" />
          {/* Outer Ripple 2 */}
          <div className="absolute w-20 h-20 rounded-full border border-[#00DFFF]/30 animate-pulse duration-700" />
          {/* Middle Glowing Disc */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8423DA] via-[#007BFF] to-[#00DFFF] p-[2px] shadow-lg shadow-[#00DFFF]/30">
            <div className="w-full h-full rounded-[14px] bg-[#0A0D1D] flex items-center justify-center relative overflow-hidden">
              {/* Laser Scanning Line Animation */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#00DFFF] to-transparent shadow-[0_0_8px_#00DFFF] animate-bounce" />
              <Fingerprint className="w-8 h-8 text-[#00DFFF] animate-pulse" />
            </div>
          </div>
        </div>

        {/* Dynamic Titles */}
        <h4 className="font-heading font-black text-white text-sm mt-3 flex items-center gap-1.5">
          <span>{title}</span>
          <Sparkles className="w-3.5 h-3.5 text-[#00DFFF] animate-spin" />
        </h4>

        <p className="text-xs text-[#00DFFF] font-semibold mt-1">
          {deviceHint}
        </p>

        <p className="text-[11px] text-[#A5A5B8] max-w-xs mt-1 leading-relaxed">
          {description ||
            (mode === 'signin'
              ? 'O seu navegador abriu uma janela do sistema para autenticar com segurança via WebAuthn.'
              : 'Confirme sua identidade no dispositivo para registrar esta nova chave de acesso.')}
        </p>
      </div>

      {/* Skeleton Loading Bars Section */}
      <div className="mt-4 pt-4 border-t border-[#8423DA]/25 space-y-2.5 relative z-10">
        <div className="flex items-center justify-between text-[10px] text-[#A5A5B8]">
          <span className="flex items-center gap-1 font-mono">
            <span className="w-2 h-2 rounded-full bg-[#00DFFF] animate-ping" />
            Validando token FIDO2 / WebAuthn...
          </span>
          <span className="text-cyan-400 font-mono text-[9px]">SUPABASE AUTH</span>
        </div>

        {/* Shimmering Skeleton Line 1 */}
        <div className="h-2.5 w-full bg-[#141838] rounded-full overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00DFFF]/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
        </div>

        {/* Shimmering Skeleton Line 2 */}
        <div className="flex gap-2">
          <div className="h-2 w-3/5 bg-[#141838] rounded-full overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#8423DA]/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite_200ms]" />
          </div>
          <div className="h-2 w-2/5 bg-[#141838] rounded-full overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00DFFF]/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite_400ms]" />
          </div>
        </div>

        {/* Security badge at bottom */}
        <div className="pt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hardware Enclave protegido</span>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-[11px] text-gray-400 hover:text-white underline cursor-pointer transition"
            >
              Cancelar e usar senha
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
