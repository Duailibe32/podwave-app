import React, { useState, useEffect, useCallback } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import {
  HardDrive,
  Trash2,
  RefreshCw,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Image as ImageIcon,
  Check,
  Calendar,
  Zap,
  Info,
} from 'lucide-react';
import {
  getStorageDiagnostics,
  clearBrowserImageCaches,
  clearStudioDrafts,
  optimizeCatalogImages,
  StorageDiagnostics,
  formatBytes,
} from '../../services/imageStorageService';
import { ImageStorageConfig } from '../../types/catalog';
import { DEFAULT_IMAGE_STORAGE_CONFIG } from '../../data/initialData';

interface ImageStorageSettingsSectionProps {
  onNotify?: (message: string) => void;
}

export const ImageStorageSettingsSection: React.FC<ImageStorageSettingsSectionProps> = ({
  onNotify,
}) => {
  const {
    brands,
    models,
    banners,
    settings,
    updateSettings,
    replaceCatalogData,
  } = useCatalog();

  const [diagnostics, setDiagnostics] = useState<StorageDiagnostics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCleaningCache, setIsCleaningCache] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isPurgingDrafts, setIsPurgingDrafts] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'info';
    title: string;
    description: string;
  } | null>(null);

  // Configuração atual ou padrão
  const currentConfig: ImageStorageConfig = {
    ...DEFAULT_IMAGE_STORAGE_CONFIG,
    ...(settings.imageStorageConfig || {}),
  };

  const notify = (msg: string) => {
    if (onNotify) {
      onNotify(msg);
    }
  };

  const refreshDiagnostics = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const diag = await getStorageDiagnostics(brands, models, banners);
      setDiagnostics(diag);
    } catch (err) {
      console.warn('Erro ao atualizar diagnóstico de armazenamento:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [brands, models, banners]);

  useEffect(() => {
    void refreshDiagnostics();
  }, [refreshDiagnostics]);

  // Atualiza configuração de imagens
  const handleUpdateConfig = (patch: Partial<ImageStorageConfig>) => {
    const updated: ImageStorageConfig = {
      ...currentConfig,
      ...patch,
    };
    updateSettings({
      imageStorageConfig: updated,
    });
    setFeedback({
      type: 'success',
      title: 'Preferências salvas!',
      description: 'As configurações de cache e otimização de imagens foram atualizadas.',
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  // 1. Limpeza Manual do Cache do Navegador
  const handleClearBrowserCache = async () => {
    setIsCleaningCache(true);
    try {
      const res = await clearBrowserImageCaches();
      const nowIso = new Date().toISOString();
      handleUpdateConfig({ lastCacheClearedAt: nowIso });
      await refreshDiagnostics();
      setFeedback({
        type: 'success',
        title: 'Cache de imagens limpo!',
        description: `${res.message} Armazenamento do navegador desobstruído com sucesso.`,
      });
      notify('Cache de imagens do catálogo limpo com sucesso!');
    } catch (err) {
      setFeedback({
        type: 'warning',
        title: 'Aviso na limpeza',
        description: 'Não foi possível limpar todos os itens do Cache Storage. Tente recarregar a página.',
      });
    } finally {
      setIsCleaningCache(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  // 2. Otimização em Lote de Imagens do Catálogo
  const handleOptimizeCatalogImages = async () => {
    setIsOptimizing(true);
    try {
      const res = await optimizeCatalogImages(brands, models, banners, currentConfig);
      if (res.optimizedCount > 0) {
        if (replaceCatalogData) {
          replaceCatalogData(res.updatedBrands, res.updatedModels, res.updatedBanners);
        }
        await refreshDiagnostics();
        setFeedback({
          type: 'success',
          title: 'Imagens otimizadas com sucesso!',
          description: `${res.optimizedCount} imagens Base64 foram comprimidas para a resolução personalizada. Economia estimada: ${res.bytesSavedFormatted} no localStorage!`,
        });
        notify(`Otimização concluída: ${res.bytesSavedFormatted} liberados no catálogo local!`);
      } else {
        setFeedback({
          type: 'info',
          title: 'Catálogo já otimizado!',
          description: 'Todas as fotos de marcas, modelos e banners já estão leves ou usando URLs otimizadas.',
        });
        notify('Todas as imagens do catálogo já estão perfeitamente otimizadas.');
      }
    } catch (err) {
      console.error('Erro ao otimizar imagens:', err);
      setFeedback({
        type: 'warning',
        title: 'Falha na otimização',
        description: 'Ocorreu um erro durante o processamento das imagens.',
      });
    } finally {
      setIsOptimizing(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  // 3. Purgar Rascunhos do Studio
  const handlePurgeStudioDrafts = async () => {
    setIsPurgingDrafts(true);
    try {
      const res = clearStudioDrafts();
      await refreshDiagnostics();
      setFeedback({
        type: 'success',
        title: 'Rascunhos temporários removidos!',
        description: res.message,
      });
      notify(res.message);
    } catch (err) {
      console.warn('Erro ao purgar rascunhos:', err);
    } finally {
      setIsPurgingDrafts(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-[#0D1022] light:bg-white border-2 border-[#8423DA]/30 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#8423DA]/20 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8423DA] to-[#00DFFF] flex items-center justify-center text-white shadow-md">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-black text-white light:text-slate-900 flex items-center gap-2">
              <span>Gestão de Cache e Armazenamento de Imagens</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#00DFFF]/15 text-[#00DFFF] border border-[#00DFFF]/40">
                Personalizável
              </span>
            </h3>
            <p className="text-xs text-[#A5A5B8]">
              Controle o uso de memória local (LocalStorage e Cache do Navegador), evite acúmulo de dados desnecessários e personalize resoluções.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={refreshDiagnostics}
          disabled={isRefreshing}
          className="px-3.5 py-1.5 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 border border-white/10 text-xs font-bold text-gray-200 flex items-center gap-1.5 cursor-pointer transition self-start sm:self-auto disabled:opacity-50"
          title="Recalcular espaço ocupado no navegador"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#00DFFF] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Calculando...' : 'Atualizar Diagnóstico'}</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
              : feedback.type === 'warning'
              ? 'bg-amber-500/15 border-amber-400/40 text-amber-200'
              : 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : feedback.type === 'warning' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <p className="font-bold">{feedback.title}</p>
            <p className="text-[11px] opacity-90">{feedback.description}</p>
          </div>
        </div>
      )}

      {/* ===================== STORAGE GAUGE & METRICS ===================== */}
      {diagnostics && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#080811] border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Uso Atual do Armazenamento Local (LocalStorage)
              </span>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  diagnostics.healthStatus === 'healthy'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40'
                    : diagnostics.healthStatus === 'warning'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-400/40'
                    : 'bg-rose-500/15 text-rose-300 border-rose-400/40'
                }`}
              >
                {diagnostics.healthStatus === 'healthy'
                  ? '✓ Saudável'
                  : diagnostics.healthStatus === 'warning'
                  ? '⚠ Uso Moderado'
                  : '🚨 Atenção: Armazenamento Cheio'}
              </span>
            </div>

            <span className="font-mono text-xs font-bold text-white tabular-nums">
              {diagnostics.localStorageFormatted} de ~5.0 MB ({diagnostics.localStoragePercent}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                diagnostics.healthStatus === 'healthy'
                  ? 'bg-gradient-to-r from-emerald-500 to-[#00DFFF]'
                  : diagnostics.healthStatus === 'warning'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                  : 'bg-gradient-to-r from-rose-500 to-amber-500'
              }`}
              style={{ width: `${Math.max(4, diagnostics.localStoragePercent)}%` }}
            />
          </div>

          {/* Key Stat Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
            {/* Total LocalStorage */}
            <div className="p-3 rounded-xl bg-[#141838] border border-white/5 space-y-1">
              <span className="text-[10px] text-[#A5A5B8] uppercase font-bold block">
                Total LocalStorage
              </span>
              <span className="font-mono text-sm font-black text-white tabular-nums block">
                {diagnostics.localStorageFormatted}
              </span>
              <span className="text-[10px] text-gray-400">
                {diagnostics.localStoragePercent}% da cota padrão
              </span>
            </div>

            {/* Imagens em Base64 */}
            <div className="p-3 rounded-xl bg-[#141838] border border-white/5 space-y-1">
              <span className="text-[10px] text-[#00DFFF] uppercase font-bold block flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-[#00DFFF]" />
                <span>Imagens no Catálogo</span>
              </span>
              <span className="font-mono text-sm font-black text-[#00DFFF] tabular-nums block">
                {diagnostics.base64Formatted}
              </span>
              <span className="text-[10px] text-gray-400">
                {diagnostics.base64ImagesCount} de {diagnostics.totalCatalogImages} em Base64
              </span>
            </div>

            {/* Cache Storage API */}
            <div className="p-3 rounded-xl bg-[#141838] border border-white/5 space-y-1">
              <span className="text-[10px] text-purple-300 uppercase font-bold block flex items-center gap-1">
                <Layers className="w-3 h-3 text-purple-400" />
                <span>Cache Storage API</span>
              </span>
              <span className="font-mono text-sm font-black text-purple-200 tabular-nums block">
                {diagnostics.cacheStorageCachesCount} {diagnostics.cacheStorageCachesCount === 1 ? 'cache' : 'caches'}
              </span>
              <span className="text-[10px] text-gray-400">
                {diagnostics.cacheStorageCachesCount > 0 ? 'PWA / Offline ativo' : 'Sem caches retidos'}
              </span>
            </div>

            {/* Rascunhos do Studio */}
            <div className="p-3 rounded-xl bg-[#141838] border border-white/5 space-y-1">
              <span className="text-[10px] text-emerald-300 uppercase font-bold block flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Rascunhos Studio</span>
              </span>
              <span className="font-mono text-sm font-black text-emerald-200 tabular-nums block">
                {diagnostics.studioDraftsFormatted}
              </span>
              <span className="text-[10px] text-gray-400">
                {diagnostics.studioDraftsCount} rascunhos temporários
              </span>
            </div>
          </div>

          {currentConfig.lastCacheClearedAt && (
            <p className="text-[10px] text-gray-400 pt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#00DFFF]" />
              <span>
                Última limpeza manual executada em:{' '}
                <strong className="text-white">
                  {new Date(currentConfig.lastCacheClearedAt).toLocaleString('pt-BR')}
                </strong>
              </span>
            </p>
          )}
        </div>
      )}

      {/* ===================== AÇÕES MANUAIS DE LIMPEZA ===================== */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-[#00DFFF]" />
          <h4 className="font-heading font-black text-sm text-white uppercase tracking-wider">
            Ações Manuais de Limpeza e Otimização em 1 Clique
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Botão 1: Limpar Cache do Navegador */}
          <button
            type="button"
            disabled={isCleaningCache}
            onClick={handleClearBrowserCache}
            className="p-4 rounded-xl bg-[#141838] hover:bg-[#8423DA]/25 border border-cyan-500/35 hover:border-cyan-400 text-left cursor-pointer transition shadow-sm space-y-2 active:scale-[0.99] disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-cyan-300 uppercase">
                1 Clique
              </span>
            </div>
            <div>
              <p className="font-bold text-white text-xs">
                {isCleaningCache ? 'Limpando Cache...' : 'Limpar Cache de Imagens'}
              </p>
              <p className="text-[10px] text-[#A5A5B8] mt-0.5 leading-relaxed">
                Esvazia o Cache Storage do navegador e descarta cópias temporárias offline.
              </p>
            </div>
          </button>

          {/* Botão 2: Otimizar Imagens do Catálogo */}
          <button
            type="button"
            disabled={isOptimizing}
            onClick={handleOptimizeCatalogImages}
            className="p-4 rounded-xl bg-[#141838] hover:bg-[#8423DA]/25 border border-purple-500/35 hover:border-purple-400 text-left cursor-pointer transition shadow-sm space-y-2 active:scale-[0.99] disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-purple-300 uppercase">
                Otimizar Base64
              </span>
            </div>
            <div>
              <p className="font-bold text-white text-xs">
                {isOptimizing ? 'Comprimindo...' : 'Comprimir Fotos do Catálogo'}
              </p>
              <p className="text-[10px] text-[#A5A5B8] mt-0.5 leading-relaxed">
                Reduz o tamanho de imagens Base64 de modelos e marcas para desafogar o localStorage.
              </p>
            </div>
          </button>

          {/* Botão 3: Purgar Rascunhos do Studio */}
          <button
            type="button"
            disabled={isPurgingDrafts}
            onClick={handlePurgeStudioDrafts}
            className="p-4 rounded-xl bg-[#141838] hover:bg-[#8423DA]/25 border border-emerald-500/35 hover:border-emerald-400 text-left cursor-pointer transition shadow-sm space-y-2 active:scale-[0.99] disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-emerald-300 uppercase">
                Rascunhos
              </span>
            </div>
            <div>
              <p className="font-bold text-white text-xs">
                {isPurgingDrafts ? 'Purgando...' : 'Limpar Rascunhos do Studio'}
              </p>
              <p className="text-[10px] text-[#A5A5B8] mt-0.5 leading-relaxed">
                Remove versões temporárias e histórico de filtros acumulados no editor de imagens.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ===================== PERSONALIZAÇÃO DO ADMINISTRADOR ===================== */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#11152A] border border-[#8423DA]/30 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#00DFFF]" />
            <h4 className="font-heading font-black text-sm text-white uppercase tracking-wider">
              Personalização das Preferências de Armazenamento
            </h4>
          </div>
          <span className="text-[11px] text-[#A5A5B8]">
            Defina o comportamento do sistema para manter o navegador sempre leve
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* 1. Dimensão Máxima das Fotos */}
          <div className="space-y-2 p-3.5 rounded-xl bg-[#080811] border border-white/5">
            <label className="font-bold text-white flex items-center justify-between">
              <span>Dimensão Máxima para Novas Fotos:</span>
              <span className="text-[#00DFFF] font-mono">
                {currentConfig.maxImageDimension || 480}px
              </span>
            </label>
            <p className="text-[10px] text-[#A5A5B8] leading-tight">
              Fotos enviadas nos cadastros serão ajustadas para esta resolução máxima para evitar consumo excessivo de memória.
            </p>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { val: 320, label: '320px', desc: 'Compacto' },
                { val: 480, label: '480px', desc: 'Padrão' },
                { val: 640, label: '640px', desc: 'Alta Def.' },
                { val: 800, label: '800px', desc: 'Máximo' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => handleUpdateConfig({ maxImageDimension: opt.val })}
                  className={`py-2 px-1 rounded-lg text-center font-bold text-xs transition cursor-pointer border ${
                    (currentConfig.maxImageDimension || 480) === opt.val
                      ? 'bg-[#00DFFF] text-[#080811] border-[#00DFFF]'
                      : 'bg-[#141838] text-gray-300 border-white/10 hover:text-white'
                  }`}
                >
                  <span className="block">{opt.label}</span>
                  <span className="text-[9px] block opacity-80">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Qualidade de Compressão JPEG/WebP */}
          <div className="space-y-2 p-3.5 rounded-xl bg-[#080811] border border-white/5">
            <label className="font-bold text-white flex items-center justify-between">
              <span>Qualidade de Compressão:</span>
              <span className="text-emerald-300 font-mono">
                {Math.round((currentConfig.compressionQuality || 0.85) * 100)}%
              </span>
            </label>
            <p className="text-[10px] text-[#A5A5B8] leading-tight">
              Taxa de compressão utilizada ao salvar fotos. 80-85% oferece excelente nitidez com até 70% menos peso.
            </p>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[
                { val: 0.75, label: '75%', desc: 'Super Leve' },
                { val: 0.85, label: '85%', desc: 'Recomendado' },
                { val: 0.92, label: '92%', desc: 'Alta Fidelidade' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => handleUpdateConfig({ compressionQuality: opt.val })}
                  className={`py-2 px-1 rounded-lg text-center font-bold text-xs transition cursor-pointer border ${
                    Math.abs((currentConfig.compressionQuality || 0.85) - opt.val) < 0.04
                      ? 'bg-emerald-400 text-[#080811] border-emerald-400'
                      : 'bg-[#141838] text-gray-300 border-white/10 hover:text-white'
                  }`}
                >
                  <span className="block">{opt.label}</span>
                  <span className="text-[9px] block opacity-80">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Retenção de Cache do Navegador */}
          <div className="space-y-2 p-3.5 rounded-xl bg-[#080811] border border-white/5">
            <label className="font-bold text-white flex items-center justify-between">
              <span>Retenção de Cache no Navegador:</span>
              <span className="text-purple-300 font-mono">
                {currentConfig.cacheRetentionDays === 0
                  ? 'Manual'
                  : `${currentConfig.cacheRetentionDays || 15} dias`}
              </span>
            </label>
            <p className="text-[10px] text-[#A5A5B8] leading-tight">
              Tempo que o navegador mantém as imagens salvas antes de sugerir ou realizar limpeza preventiva.
            </p>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { val: 0, label: 'Manual' },
                { val: 7, label: '7 dias' },
                { val: 15, label: '15 dias' },
                { val: 30, label: '30 dias' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => handleUpdateConfig({ cacheRetentionDays: opt.val })}
                  className={`py-2 px-1 rounded-lg text-center font-bold text-xs transition cursor-pointer border ${
                    (currentConfig.cacheRetentionDays ?? 15) === opt.val
                      ? 'bg-purple-500 text-white border-purple-400'
                      : 'bg-[#141838] text-gray-300 border-white/10 hover:text-white'
                  }`}
                >
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Toggles de Limpeza Automática & Cache Storage */}
          <div className="space-y-3 p-3.5 rounded-xl bg-[#080811] border border-white/5 flex flex-col justify-center">
            {/* Toggle: Auto Clear On Startup */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={currentConfig.autoClearOnStartup === true}
                onChange={(e) =>
                  handleUpdateConfig({ autoClearOnStartup: e.target.checked })
                }
                className="mt-0.5 rounded border-white/20 bg-[#141838] text-[#00DFFF] focus:ring-0 cursor-pointer"
              />
              <div>
                <span className="font-bold text-white block">
                  Limpeza preventiva ao carregar o painel
                </span>
                <span className="text-[10px] text-[#A5A5B8] block">
                  Descarta automaticamente rascunhos temporários do Studio ao abrir o Admin.
                </span>
              </div>
            </label>

            {/* Toggle: Enable Browser Cache Storage */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={currentConfig.enableBrowserCache !== false}
                onChange={(e) =>
                  handleUpdateConfig({ enableBrowserCache: e.target.checked })
                }
                className="mt-0.5 rounded border-white/20 bg-[#141838] text-[#00DFFF] focus:ring-0 cursor-pointer"
              />
              <div>
                <span className="font-bold text-white block">
                  Permitir Cache Storage Offline do PWA
                </span>
                <span className="text-[10px] text-[#A5A5B8] block">
                  Guarda fotos para navegação offline mais veloz (desative se o dispositivo tiver pouco espaço).
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
