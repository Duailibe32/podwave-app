import React, { useState } from 'react';
import {
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  AlertCircle,
  Loader2,
  Crosshair,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface GpsLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  mapsUrl: string;
  timestamp: Date;
}

interface GpsLocationSectionProps {
  onLocationCaptured?: (data: GpsLocationData) => void;
  onLocationRemoved?: () => void;
  className?: string;
}

export const GpsLocationSection: React.FC<GpsLocationSectionProps> = ({
  onLocationCaptured,
  onLocationRemoved,
  className = '',
}) => {
  const [loading, setLoading] = useState(false);
  const [locationData, setLocationData] = useState<GpsLocationData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const handleCaptureLocation = () => {
    // 1. Reset states
    setErrorMessage(null);
    setCopyError(null);

    // 2. Validate browser support
    if (!navigator || !navigator.geolocation) {
      setErrorMessage(
        'Seu navegador não oferece suporte à API nativa de geolocalização. Por favor, utilize um navegador compatível ou atualizado.'
      );
      return;
    }

    // 3. Validate HTTPS requirement in modern browsers (except localhost)
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '0.0.0.0';
    if (window.location.protocol !== 'https:' && !isLocalhost) {
      setErrorMessage(
        'A geolocalização do navegador requer uma conexão segura (HTTPS). Certifique-se de acessar o site via HTTPS.'
      );
      return;
    }

    setLoading(true);

    // 4. Capture single position (no continuous tracking, strictly privacy compliant)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

        const capturedData: GpsLocationData = {
          latitude,
          longitude,
          accuracy: Math.round(accuracy),
          mapsUrl,
          timestamp: new Date(),
        };

        setLocationData(capturedData);
        setLoading(false);
        setErrorMessage(null);

        if (onLocationCaptured) {
          onLocationCaptured(capturedData);
        }
      },
      (error) => {
        setLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrorMessage(
              'Permissão de localização negada. Se desejar usar o GPS, habilite o acesso à localização nas permissões do seu navegador e tente novamente.'
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setErrorMessage(
              'Sinal de GPS ou rede indisponível no momento. Verifique se os serviços de localização do seu aparelho estão ativados.'
            );
            break;
          case error.TIMEOUT:
            setErrorMessage(
              'Tempo limite excedido ao buscar o sinal de localização. Tente novamente em um local com melhor sinal.'
            );
            break;
          default:
            setErrorMessage(
              'Ocorreu uma falha inesperada ao tentar capturar a localização. Tente novamente.'
            );
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0, // strictly fresh location
      }
    );
  };

  const handleCopyLink = async () => {
    if (!locationData) return;
    setCopyError(null);

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(locationData.mapsUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        // Fallback for older environments
        const textArea = document.createElement('textarea');
        textArea.value = locationData.mapsUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } else {
          throw new Error('Falha no comando de cópia');
        }
      }
    } catch {
      setCopyError('Não foi possível copiar automaticamente. Selecione o link e copie manualmente.');
    }
  };

  const handleRemoveLocation = () => {
    setLocationData(null);
    setErrorMessage(null);
    setCopied(false);
    setCopyError(null);
    if (onLocationRemoved) {
      onLocationRemoved();
    }
  };

  return (
    <div className={`space-y-3 w-full ${className}`}>
      {/* Seção Header */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-200 light:text-slate-800 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#00DFFF]" />
          <span>Localização</span>
        </label>
        <span className="text-[10px] font-semibold text-[#8E95B8] light:text-slate-500">
          Opcional • GPS pontual
        </span>
      </div>

      {/* Main Container Card */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#080811] light:bg-slate-50 border border-[#8423DA]/30 light:border-slate-300 shadow-lg space-y-3">
        {/* Caso A: Nenhuma localização capturada ainda */}
        {!locationData && (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#00DFFF]/10 border border-[#00DFFF]/30 flex items-center justify-center shrink-0 mt-0.5">
                <Crosshair className="w-4 h-4 text-[#00DFFF]" />
              </div>
              <div className="min-w-0">
                <h4 className="font-heading font-bold text-xs sm:text-sm text-white light:text-slate-900 leading-snug">
                  Usar GPS pontual para referência
                </h4>
                <p className="text-[11px] text-[#8E95B8] light:text-slate-600 leading-relaxed mt-0.5">
                  Capture uma única coordenada caso queira gerar um link exato do Google Maps. Nenhum dado é salvo no navegador ou compartilhado sem o seu comando.
                </p>
              </div>
            </div>

            {/* Botão de Ação Primária: 📍 Usar minha localização atual */}
            <button
              type="button"
              onClick={handleCaptureLocation}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#007BFF] via-[#00DFFF] to-[#8423DA] hover:brightness-110 active:scale-[0.98] text-[#080811] font-heading font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,223,255,0.3)] cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed select-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#080811]" />
                  <span>Obtendo coordenadas do GPS...</span>
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 fill-current text-[#080811]" />
                  <span>📍 Usar minha localização atual</span>
                </>
              )}
            </button>

            {/* Aviso de Privacidade */}
            <div className="flex items-center gap-1.5 text-[10px] text-[#8E95B8] light:text-slate-500 pt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00DFFF] shrink-0" />
              <span>Privacidade protegida: Sem rastreamento contínuo. 100% sob seu controle.</span>
            </div>
          </div>
        )}

        {/* Caso B: Localização Capturada com Sucesso */}
        {locationData && (
          <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
            {/* Header de Sucesso */}
            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#8423DA]/20">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                </span>
                <div>
                  <h5 className="font-heading font-black text-xs sm:text-sm text-white light:text-slate-900 leading-tight">
                    Localização capturada
                  </h5>
                  <p className="text-[10px] text-emerald-400 font-medium">
                    Precisão estimada: &plusmn;{locationData.accuracy} metros
                  </p>
                </div>
              </div>

              {/* Botão de Remoção Rápida */}
              <button
                type="button"
                onClick={handleRemoveLocation}
                className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                title="Remover coordenadas capturadas"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remover</span>
              </button>
            </div>

            {/* Card de Coordenadas e Link Formatado */}
            <div className="p-3 rounded-xl bg-[#0D1022] light:bg-white border border-[#232958] light:border-slate-200 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                <span className="text-[#8E95B8] light:text-slate-500 font-mono">
                  Lat: {locationData.latitude.toFixed(6)}
                </span>
                <span className="text-[#8E95B8] light:text-slate-500 font-mono">
                  Long: {locationData.longitude.toFixed(6)}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-[#080811] light:bg-slate-100 border border-[#8423DA]/20 text-[10px] font-mono text-[#00DFFF] truncate select-all">
                {locationData.mapsUrl}
              </div>
            </div>

            {/* Grid dos 3 Botões Obrigatórios:
                1. "Abrir no Google Maps"
                2. "Copiar localização"
                3. "Remover localização"
            */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {/* Botão 1: Abrir no Google Maps */}
              <a
                href={locationData.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-[#141838] hover:bg-[#1E2452] light:bg-slate-200 light:hover:bg-slate-300 border border-[#00DFFF]/40 text-[#00DFFF] light:text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-sm active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Abrir no Google Maps</span>
              </a>

              {/* Botão 2: Copiar localização */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2.5 px-3 rounded-xl bg-[#141838] hover:bg-[#1E2452] light:bg-slate-200 light:hover:bg-slate-300 border border-[#8423DA]/40 text-white light:text-slate-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-sm active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-emerald-400 truncate">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    <span className="truncate">Copiar localização</span>
                  </>
                )}
              </button>

              {/* Botão 3: Remover localização */}
              <button
                type="button"
                onClick={handleRemoveLocation}
                className="py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-sm active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Remover localização</span>
              </button>
            </div>

            {/* Feedback de erro ao copiar link */}
            {copyError && (
              <p className="text-[10px] text-rose-400 leading-tight pt-1">
                {copyError}
              </p>
            )}
          </div>
        )}

        {/* Mensagens de Erro Tratadas */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/35 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-rose-200 font-semibold leading-snug">
                  Não foi possível obter a localização
                </p>
                <p className="text-[11px] text-rose-300/90 leading-relaxed mt-0.5">
                  {errorMessage}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCaptureLocation}
                className="py-1.5 px-3 rounded-lg bg-rose-500/30 hover:bg-rose-500/40 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Tentar novamente</span>
              </button>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="py-1.5 px-2.5 rounded-lg text-[11px] text-gray-300 hover:text-white transition-all cursor-pointer"
              >
                Ignorar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
