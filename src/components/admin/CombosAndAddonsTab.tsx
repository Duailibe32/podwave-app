import React, { useState, useEffect } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import {
  DEFAULT_PROGRESSIVE_DISCOUNT_CONFIG,
  DEFAULT_COMPLEMENTARY_ADDONS,
} from '../../data/initialData';
import { ProgressiveDiscountConfig, ComplementaryAddonItem } from '../../types/catalog';
import { savePromotionsConfigToSupabase, logSupabaseAuditEvent } from '../../services/supabase';
import {
  Flame,
  Layers,
  Truck,
  Sparkles,
  Check,
  RotateCcw,
  Eye,
  Zap,
  Shield,
  CheckCircle2,
  Percent,
  DollarSign,
  Plus,
  Database,
  Link2,
  Package,
} from 'lucide-react';

interface CombosAndAddonsTabProps {
  onNotify?: (msg: string) => void;
}

export const CombosAndAddonsTab: React.FC<CombosAndAddonsTabProps> = ({ onNotify }) => {
  const { settings, updateSettings, models, addActivityLog } = useCatalog();

  const [progForm, setProgForm] = useState<ProgressiveDiscountConfig>(() => {
    const base: ProgressiveDiscountConfig = {
      ...DEFAULT_PROGRESSIVE_DISCOUNT_CONFIG,
      tier2DiscountType: 'percent',
      tier2DiscountPercent: 5,
      tier3DiscountType: 'percent',
      tier3DiscountPercent: 10,
      ...(settings.progressiveDiscountConfig || {}),
    };
    if (base.tier2DiscountPercent === undefined || base.tier2Label === 'Frete Grátis ✓') {
      base.tier2DiscountPercent = 5;
      base.tier2Label = '5% OFF ✓';
      base.tier2FreeShipping = false;
    }
    return base;
  });

  const [addonsForm, setAddonsForm] = useState<ComplementaryAddonItem[]>(() => {
    const existing = settings.complementaryAddons;
    if (Array.isArray(existing) && existing.length > 0) {
      return DEFAULT_COMPLEMENTARY_ADDONS.map((def, idx) => {
        const found = existing.find((item) => item.id === def.id) || existing[idx];
        const isLegacyThird =
          idx === 2 &&
          found &&
          (found.name === 'Protetor Higiênico de Bocal' ||
            found.name === 'Capinha de Silicone Protetora');
        const merged = found && !isLegacyThird ? { ...def, ...found } : { ...def };
        return {
          ...merged,
          applicableModelId: merged.applicableModelId || 'all',
          applicableModelIds:
            Array.isArray(merged.applicableModelIds) && merged.applicableModelIds.length > 0
              ? merged.applicableModelIds
              : merged.applicableModelId && merged.applicableModelId !== 'all'
              ? [merged.applicableModelId]
              : ['all'],
        };
      });
    }
    return DEFAULT_COMPLEMENTARY_ADDONS.map((item) => ({
      ...item,
      applicableModelId: item.applicableModelId || 'all',
      applicableModelIds: item.applicableModelIds || ['all'],
    }));
  });

  const [previewPodsCount, setPreviewPodsCount] = useState<number>(2);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [isSavingSupabase, setIsSavingSupabase] = useState<boolean>(false);

  useEffect(() => {
    if (settings.progressiveDiscountConfig) {
      const nextProg: ProgressiveDiscountConfig = {
        ...DEFAULT_PROGRESSIVE_DISCOUNT_CONFIG,
        tier2DiscountType: 'percent',
        tier2DiscountPercent: 5,
        tier3DiscountType: 'percent',
        ...settings.progressiveDiscountConfig,
      };
      if (nextProg.tier2DiscountPercent === undefined || nextProg.tier2Label === 'Frete Grátis ✓') {
        nextProg.tier2DiscountPercent = 5;
        nextProg.tier2Label = '5% OFF ✓';
        nextProg.tier2FreeShipping = false;
      }
      setProgForm(nextProg);
    }
    if (Array.isArray(settings.complementaryAddons) && settings.complementaryAddons.length > 0) {
      setAddonsForm(
        DEFAULT_COMPLEMENTARY_ADDONS.map((def, idx) => {
          const found =
            settings.complementaryAddons!.find((item) => item.id === def.id) ||
            settings.complementaryAddons![idx];
          const isLegacyThird =
            idx === 2 &&
            found &&
            (found.name === 'Protetor Higiênico de Bocal' ||
              found.name === 'Capinha de Silicone Protetora');
          const merged = found && !isLegacyThird ? { ...def, ...found } : { ...def };
          return {
            ...merged,
            applicableModelId: merged.applicableModelId || 'all',
            applicableModelIds:
              Array.isArray(merged.applicableModelIds) && merged.applicableModelIds.length > 0
                ? merged.applicableModelIds
                : merged.applicableModelId && merged.applicableModelId !== 'all'
                ? [merged.applicableModelId]
                : ['all'],
          };
        })
      );
    }
  }, [settings.progressiveDiscountConfig, settings.complementaryAddons]);

  const handleAddonChange = (
    index: number,
    field: keyof ComplementaryAddonItem,
    value: string | number | boolean | string[]
  ) => {
    setAddonsForm((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleToggleLinkedModel = (addonIndex: number, modelId: string) => {
    setAddonsForm((prev) =>
      prev.map((addon, idx) => {
        if (idx !== addonIndex) return addon;

        if (modelId === 'all') {
          return {
            ...addon,
            applicableModelId: 'all',
            applicableModelIds: ['all'],
            applicableModelName: 'Todos os produtos do catálogo',
          };
        }

        const currentIds = (addon.applicableModelIds || ['all']).filter((id) => id !== 'all');
        const exists = currentIds.includes(modelId);
        const nextIds = exists
          ? currentIds.filter((id) => id !== modelId)
          : [...currentIds, modelId];

        if (nextIds.length === 0) {
          return {
            ...addon,
            applicableModelId: 'all',
            applicableModelIds: ['all'],
            applicableModelName: 'Todos os produtos do catálogo',
          };
        }

        const linkedNames = models
          .filter((m) => nextIds.includes(m.id))
          .map((m) => m.modelName)
          .join(', ');

        return {
          ...addon,
          applicableModelId: nextIds[0],
          applicableModelIds: nextIds,
          applicableModelName: linkedNames,
        };
      })
    );
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSupabase(true);

    const tier2Type = progForm.tier2DiscountType === 'fixed' ? 'fixed' : 'percent';
    const tier2MaxVal = tier2Type === 'percent' ? 90 : 500;
    const discountType = progForm.tier3DiscountType === 'fixed' ? 'fixed' : 'percent';
    const maxVal = discountType === 'percent' ? 90 : 500;
    const minOrderStamp = Math.max(
      0,
      Number(progForm.minOrderForLoyaltyStamp ?? progForm.freeShippingGoalValue) || 100
    );

    const normalizedProg: ProgressiveDiscountConfig = {
      ...progForm,
      tier2MinUnits: Math.max(1, Number(progForm.tier2MinUnits) || 2),
      tier2DiscountType: tier2Type,
      tier2DiscountPercent: Math.max(0, Math.min(tier2MaxVal, Number(progForm.tier2DiscountPercent ?? 5))),
      tier2FreeShipping: false,
      tier3MinUnits: Math.max(
        Math.max(1, Number(progForm.tier2MinUnits) || 2),
        Number(progForm.tier3MinUnits) || 3
      ),
      tier3DiscountType: discountType,
      tier3DiscountPercent: Math.max(0, Math.min(maxVal, Number(progForm.tier3DiscountPercent) || 0)),
      freeShippingGoalValue: minOrderStamp,
      minOrderForLoyaltyStamp: minOrderStamp,
    };

    const normalizedAddons: ComplementaryAddonItem[] = addonsForm.map((a) => {
      const cleanIds =
        Array.isArray(a.applicableModelIds) && a.applicableModelIds.length > 0
          ? a.applicableModelIds
          : a.applicableModelId
          ? [a.applicableModelId]
          : ['all'];
      const isAll = cleanIds.includes('all');
      const linkedNames = isAll
        ? 'Todos os produtos do catálogo'
        : models
            .filter((m) => cleanIds.includes(m.id))
            .map((m) => m.modelName)
            .join(', ');

      return {
        ...a,
        name: a.name.trim() || 'Acessório PodWave',
        description: a.description.trim() || '',
        price: Math.max(0, Number(a.price) || 0),
        applicableModelId: isAll ? 'all' : cleanIds[0],
        applicableModelIds: isAll ? ['all'] : cleanIds,
        applicableModelName: linkedNames,
      };
    });

    updateSettings({
      progressiveDiscountConfig: normalizedProg,
      complementaryAddons: normalizedAddons,
    });

    const dbRes = await savePromotionsConfigToSupabase(normalizedProg, normalizedAddons);
    setIsSavingSupabase(false);

    addActivityLog({
      action: 'CONFIGURACAO_ALTERADA',
      actionLabel: 'Promoções Atualizadas (Desconto Progressivo & Compre Junto)',
      entity: 'settings',
      entityName: 'Aba Promoções',
      details: `Desconto Progressivo: Nível 2 (${normalizedProg.tier2MinUnits} un. = ${
        normalizedProg.tier2DiscountType === 'fixed'
          ? `R$ ${(normalizedProg.tier2DiscountPercent || 5).toFixed(2)}`
          : `${normalizedProg.tier2DiscountPercent ?? 5}%`
      } OFF) / Nível 3 (${normalizedProg.tier3MinUnits}+ un. = ${
        normalizedProg.tier3DiscountType === 'fixed'
          ? `R$ ${normalizedProg.tier3DiscountPercent.toFixed(2)}`
          : `${normalizedProg.tier3DiscountPercent}%`
      } OFF) | Compra Mínima Selo: R$ ${minOrderStamp.toFixed(2)}. Compre Junto: ${normalizedAddons
        .map((a) => `${a.name} (${a.applicableModelName || 'Todos'})`)
        .join(' | ')}.`,
      status: 'sucesso',
    });

    void logSupabaseAuditEvent(
      'UPDATE_PROMOTIONS',
      'Promoções & Compre Junto',
      `Regras de Desconto Progressivo e vínculos de Compre Junto salvos no banco.`
    );

    const msg = dbRes.success
      ? 'Regras de "Desconto Progressivo" (Nível 2: 5%, Nível 3: 10%, Compra Mínima Selo) e "Compre Junto" salvos no Supabase!'
      : 'Configurações de "Desconto Progressivo" e "Compre Junto" salvas e aplicadas ao catálogo!';
    setSavedBanner(msg);
    if (onNotify) onNotify(msg);
    setTimeout(() => setSavedBanner(null), 5000);
  };

  const handleRestoreDefaults = async () => {
    const defProg: ProgressiveDiscountConfig = {
      ...DEFAULT_PROGRESSIVE_DISCOUNT_CONFIG,
      tier2DiscountType: 'percent',
      tier2DiscountPercent: 5,
      tier3DiscountType: 'percent',
      tier3DiscountPercent: 10,
    };
    const defAddons: ComplementaryAddonItem[] = DEFAULT_COMPLEMENTARY_ADDONS.map((item) => ({
      ...item,
      applicableModelId: 'all',
      applicableModelIds: ['all'],
      applicableModelName: 'Todos os produtos do catálogo',
    }));
    setProgForm(defProg);
    setAddonsForm(defAddons);
    updateSettings({
      progressiveDiscountConfig: defProg,
      complementaryAddons: defAddons,
    });
    await savePromotionsConfigToSupabase(defProg, defAddons);
    const msg = 'Valores padrão de Desconto Progressivo (5% / 10%) e Compre Junto (Powerbank Chaveiro) restaurados!';
    setSavedBanner(msg);
    if (onNotify) onNotify(msg);
    setTimeout(() => setSavedBanner(null), 4000);
  };

  const tier2Min = Math.max(1, Number(progForm.tier2MinUnits) || 2);
  const tier2Val = Math.max(0, Number(progForm.tier2DiscountPercent ?? 5));
  const isTier2Fixed = progForm.tier2DiscountType === 'fixed';
  const formattedTier2Discount = isTier2Fixed
    ? `R$ ${tier2Val.toFixed(2).replace('.', ',')} OFF`
    : `${tier2Val}% OFF`;

  const tier3Min = Math.max(tier2Min, Number(progForm.tier3MinUnits) || 3);
  const tier3Val = Math.max(0, Number(progForm.tier3DiscountPercent) || 10);
  const isFixedDiscount = progForm.tier3DiscountType === 'fixed';
  const formattedTier3Discount = isFixedDiscount
    ? `R$ ${tier3Val.toFixed(2).replace('.', ',')} OFF`
    : `${tier3Val}% OFF`;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Principal */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#141838] via-[#11152A] to-[#181D3D] border-2 border-[#00DFFF]/35 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[11px] font-black uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Aba Promoções • Carrinho & Checkout</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold">
              <Database className="w-3 h-3 text-emerald-400" />
              <span>Persistência no Banco de Dados (Supabase)</span>
            </div>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-black text-white">
            Promoções: Desconto Progressivo & Compre Junto
          </h2>
          <p className="text-xs sm:text-sm text-[#A5A5B8] max-w-2xl">
            Edite as regras do <strong>Desconto Progressivo</strong> (quantidade mínima e valor/porcentagem do desconto) e gerencie os itens do <strong>Compre Junto</strong> vinculando acessórios recomendados a produtos principais no banco de dados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void handleRestoreDefaults()}
            className="px-3.5 py-2.5 rounded-xl bg-[#181D3D] hover:bg-rose-500/20 border border-white/15 hover:border-rose-400/40 text-xs font-bold text-gray-200 flex items-center gap-1.5 cursor-pointer transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#00DFFF]" />
            <span>Restaurar Padrões</span>
          </button>

          <button
            type="button"
            disabled={isSavingSupabase}
            onClick={(e) => void handleSaveAll(e)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#007BFF] hover:brightness-110 text-[#080811] font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#00DFFF]/20 active:scale-95 transition disabled:opacity-60"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{isSavingSupabase ? 'Salvando no Banco...' : 'Salvar Promoções no Banco'}</span>
          </button>
        </div>
      </div>

      {savedBanner && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-400/50 text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedBanner}</span>
        </div>
      )}

      <form onSubmit={(e) => void handleSaveAll(e)} className="space-y-8">
        {/* =====================================================================
            SEÇÃO 1: DESCONTO PROGRESSIVO • LEVE MAIS, PAGUE MENOS
           ===================================================================== */}
        <div className="p-6 rounded-3xl bg-[#0D1022] border-2 border-[#8423DA]/35 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#8423DA]/25 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                <Flame className="w-5 h-5 fill-amber-400" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-black text-white">
                  1. Regras do Desconto Progressivo • Leve Mais, Pague Menos
                </h3>
                <p className="text-xs text-[#A5A5B8]">
                  Defina a quantidade mínima de unidades e o valor do desconto (em % ou R$ fixo) além da meta de frete grátis.
                </p>
              </div>
            </div>

            <label className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#141838] border border-[#00DFFF]/35 cursor-pointer">
              <input
                type="checkbox"
                checked={progForm.enabled !== false}
                onChange={(e) => setProgForm({ ...progForm, enabled: e.target.checked })}
                className="w-4 h-4 rounded accent-[#00DFFF] cursor-pointer"
              />
              <span className="text-xs font-black text-white">
                {progForm.enabled !== false ? 'Regra Ativa no Carrinho' : 'Regra Oculta'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Formulário de Configuração */}
            <div className="lg:col-span-7 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-200 mb-1">
                    Título do Card no Carrinho
                  </label>
                  <input
                    type="text"
                    value={progForm.title}
                    onChange={(e) => setProgForm({ ...progForm, title: e.target.value })}
                    placeholder="Desconto Progressivo • Leve Mais, Pague Menos"
                    className="w-full p-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/35 text-white font-bold focus:outline-none focus:border-[#00DFFF]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-200 mb-1">
                    Compra Mínima p/ Pontuar 1 Selo (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={progForm.minOrderForLoyaltyStamp ?? progForm.freeShippingGoalValue}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setProgForm({
                        ...progForm,
                        freeShippingGoalValue: val,
                        minOrderForLoyaltyStamp: val,
                      });
                    }}
                    className="w-full p-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/35 text-[#00DFFF] font-mono font-black focus:outline-none focus:border-[#00DFFF]"
                  />
                </div>
              </div>

              {/* Níveis 1, 2 e 3 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Nível 1 */}
                <div className="p-3.5 rounded-2xl bg-[#141838] border border-[#00DFFF]/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-[#00DFFF]/15 text-[#00DFFF]">
                      Nível 1 (1 Pod)
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-300 font-semibold mb-1">
                      Rótulo do Nível 1
                    </label>
                    <input
                      type="text"
                      value={progForm.tier1Label}
                      onChange={(e) => setProgForm({ ...progForm, tier1Label: e.target.value })}
                      placeholder="Catálogo"
                      className="w-full p-2 rounded-xl bg-[#0D1022] border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#00DFFF]"
                    />
                  </div>
                </div>

                {/* Nível 2 (Desconto 5%) */}
                <div className="p-3.5 rounded-2xl bg-[#141838] border border-emerald-400/35 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      Nível 2 (Desconto)
                    </span>
                    <div className="flex items-center gap-1 bg-[#0D1022] p-0.5 rounded-lg border border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          const val = progForm.tier2DiscountPercent ?? 5;
                          setProgForm({
                            ...progForm,
                            tier2DiscountType: 'percent',
                            tier2Label: `${val}% OFF ✓`,
                          });
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black cursor-pointer ${
                          progForm.tier2DiscountType !== 'fixed'
                            ? 'bg-emerald-400 text-[#080811]'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const val = progForm.tier2DiscountPercent ?? 5;
                          setProgForm({
                            ...progForm,
                            tier2DiscountType: 'fixed',
                            tier2Label: `R$ ${val} OFF ✓`,
                          });
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black cursor-pointer ${
                          progForm.tier2DiscountType === 'fixed'
                            ? 'bg-emerald-400 text-[#080811]'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        R$
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-300 font-semibold mb-1">
                        Qtd. Mínima
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={progForm.tier2MinUnits}
                        onChange={(e) =>
                          setProgForm({
                            ...progForm,
                            tier2MinUnits: Math.max(1, parseInt(e.target.value, 10) || 2),
                          })
                        }
                        className="w-full p-2 rounded-xl bg-[#0D1022] border border-white/10 text-emerald-300 font-mono font-black text-xs focus:outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-300 font-semibold mb-1">
                        {isTier2Fixed ? 'Valor (R$)' : 'Desconto (%)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={isTier2Fixed ? 500 : 90}
                        step={isTier2Fixed ? '0.5' : '1'}
                        value={progForm.tier2DiscountPercent ?? 5}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          setProgForm({
                            ...progForm,
                            tier2DiscountPercent: val,
                            tier2Label: isTier2Fixed
                              ? `R$ ${val} OFF ✓`
                              : `${val}% OFF ✓`,
                          });
                        }}
                        className="w-full p-2 rounded-xl bg-[#0D1022] border border-white/10 text-emerald-300 font-mono font-black text-xs focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-300 font-semibold mb-1">
                      Rótulo do Nível 2
                    </label>
                    <input
                      type="text"
                      value={progForm.tier2Label}
                      onChange={(e) => setProgForm({ ...progForm, tier2Label: e.target.value })}
                      placeholder="5% OFF ✓"
                      className="w-full p-2 rounded-xl bg-[#0D1022] border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {/* Nível 3 */}
                <div className="p-3.5 rounded-2xl bg-[#141838] border border-amber-400/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      Nível 3 (Desconto)
                    </span>
                    <div className="flex items-center gap-1 bg-[#0D1022] p-0.5 rounded-lg border border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          const val = progForm.tier3DiscountPercent || 10;
                          setProgForm({
                            ...progForm,
                            tier3DiscountType: 'percent',
                            tier3Label: `${val}% OFF Total 🔥`,
                          });
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black cursor-pointer ${
                          progForm.tier3DiscountType !== 'fixed'
                            ? 'bg-amber-400 text-[#080811]'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const val = progForm.tier3DiscountPercent || 15;
                          setProgForm({
                            ...progForm,
                            tier3DiscountType: 'fixed',
                            tier3Label: `R$ ${val} OFF Total 🔥`,
                          });
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black cursor-pointer ${
                          progForm.tier3DiscountType === 'fixed'
                            ? 'bg-amber-400 text-[#080811]'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        R$
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-300 font-semibold mb-1">
                        Qtd. Mínima
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="30"
                        value={progForm.tier3MinUnits}
                        onChange={(e) =>
                          setProgForm({
                            ...progForm,
                            tier3MinUnits: Math.max(2, parseInt(e.target.value, 10) || 3),
                          })
                        }
                        className="w-full p-2 rounded-xl bg-[#0D1022] border border-white/10 text-amber-300 font-mono font-black text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-300 font-semibold mb-1">
                        {isFixedDiscount ? 'Valor (R$)' : 'Desconto (%)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={isFixedDiscount ? 500 : 90}
                        step={isFixedDiscount ? '0.5' : '1'}
                        value={progForm.tier3DiscountPercent}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          setProgForm({
                            ...progForm,
                            tier3DiscountPercent: val,
                            tier3Label: isFixedDiscount
                              ? `R$ ${val} OFF Total 🔥`
                              : `${val}% OFF Total 🔥`,
                          });
                        }}
                        className="w-full p-2 rounded-xl bg-[#0D1022] border border-white/10 text-amber-300 font-mono font-black text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-300 font-semibold mb-1">
                      Rótulo do Nível 3
                    </label>
                    <input
                      type="text"
                      value={progForm.tier3Label}
                      onChange={(e) => setProgForm({ ...progForm, tier3Label: e.target.value })}
                      placeholder="10% OFF Total 🔥"
                      className="w-full p-2 rounded-xl bg-[#0D1022] border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Prévia Interativa em Tempo Real */}
            <div className="lg:col-span-5 p-4 rounded-2xl bg-[#080811] border border-[#00DFFF]/30 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#00DFFF]" />
                  <span>Prévia no Carrinho do Cliente</span>
                </span>
                <div className="flex items-center gap-1">
                  {[1, tier2Min, tier3Min].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setPreviewPodsCount(qty)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition ${
                        previewPodsCount === qty
                          ? 'bg-[#00DFFF] text-[#080811]'
                          : 'bg-[#141838] text-gray-300 hover:text-white'
                      }`}
                    >
                      Simular {qty} {qty === 1 ? 'Pod' : 'Pods'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#121636] to-[#0D1022] border border-[#00DFFF]/35 space-y-2.5 shadow-md">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold flex items-center gap-1.5 text-white">
                    <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>{progForm.title || 'Desconto Progressivo • Leve Mais, Pague Menos'}</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#00DFFF] px-2 py-0.5 rounded-full bg-[#00DFFF]/10 border border-[#00DFFF]/30">
                    {previewPodsCount} {previewPodsCount === 1 ? 'Pod' : 'Pods'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                  <div
                    className={`p-2 rounded-xl border transition-all ${
                      previewPodsCount >= 1
                        ? 'bg-[#00DFFF]/15 border-[#00DFFF] text-white font-bold'
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    <span className="block font-mono text-[9px] text-[#00DFFF]">1 POD</span>
                    <span>{progForm.tier1Label || 'Catálogo'}</span>
                  </div>
                  <div
                    className={`p-2 rounded-xl border transition-all ${
                      previewPodsCount >= tier2Min
                        ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    <span className="block font-mono text-[9px] text-emerald-400">
                      {tier2Min} PODS
                    </span>
                    <span>{progForm.tier2Label || `${formattedTier2Discount} ✓`}</span>
                  </div>
                  <div
                    className={`p-2 rounded-xl border transition-all ${
                      previewPodsCount >= tier3Min
                        ? 'bg-amber-400/20 border-amber-300 text-amber-200 font-bold shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    <span className="block font-mono text-[9px] text-amber-300">
                      {tier3Min}+ PODS
                    </span>
                    <span>{progForm.tier3Label || `${formattedTier3Discount} Total 🔥`}</span>
                  </div>
                </div>

                <div className="text-[11px] leading-snug">
                  {previewPodsCount < tier2Min && (
                    <p className="text-cyan-200 font-medium flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#00DFFF] shrink-0" />
                      <span>
                        Falta{tier2Min - previewPodsCount > 1 ? 'm' : ''}{' '}
                        <strong>
                          apenas {tier2Min - previewPodsCount} pod
                          {tier2Min - previewPodsCount > 1 ? 's' : ''}
                        </strong>{' '}
                        para você destravar <strong>{progForm.tier2Label || `${formattedTier2Discount} ✓`}</strong>!
                      </span>
                    </p>
                  )}
                  {previewPodsCount >= tier2Min && previewPodsCount < tier3Min && (
                    <p className="text-emerald-300 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        <strong>{progForm.tier2Label || `${formattedTier2Discount} ativado!`}</strong> Adicione +
                        {tier3Min - previewPodsCount} pod para ganhar{' '}
                        <strong>{formattedTier3Discount} em todos os pods</strong>!
                      </span>
                    </p>
                  )}
                  {previewPodsCount >= tier3Min && (
                    <p className="text-amber-300 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        Super Combo {tier3Min}+ Ativado:{' '}
                        <strong>
                          {formattedTier3Discount} automático
                        </strong>{' '}
                        garantido em todos os pods!
                      </span>
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-emerald-300">
                  <span>🎁 Compra Mínima p/ Pontuar 1 Selo:</span>
                  <span className="font-mono font-black text-[#00DFFF]">
                    R$ {Number(progForm.minOrderForLoyaltyStamp ?? progForm.freeShippingGoalValue ?? 100).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            SEÇÃO 2: COMPRE JUNTO • ACESSÓRIOS RECOMENDADOS E VÍNCULO A PRODUTOS
           ===================================================================== */}
        <div className="p-6 rounded-3xl bg-[#0D1022] border-2 border-[#00DFFF]/30 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#8423DA]/25 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00DFFF]/15 border border-[#00DFFF]/40 flex items-center justify-center text-[#00DFFF]">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-black text-white">
                  2. Compre Junto • Acessórios Recomendados & Vínculo de Produtos
                </h3>
                <p className="text-xs text-[#A5A5B8]">
                  Configure preço, nome e vincule cada acessório recomendado a <strong>produtos principais específicos</strong> (ou exiba para todo o catálogo).
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {addonsForm.map((addon, idx) => {
              const borderAccent =
                idx === 0
                  ? 'border-[#00DFFF]/40'
                  : idx === 1
                  ? 'border-[#E53CF3]/40'
                  : 'border-emerald-400/40';
              const badgeColor =
                idx === 0
                  ? 'bg-[#00DFFF]/15 text-[#00DFFF]'
                  : idx === 1
                  ? 'bg-[#E53CF3]/15 text-[#E53CF3]'
                  : 'bg-emerald-500/15 text-emerald-300';

              const selectedModelIds =
                Array.isArray(addon.applicableModelIds) && addon.applicableModelIds.length > 0
                  ? addon.applicableModelIds
                  : addon.applicableModelId
                  ? [addon.applicableModelId]
                  : ['all'];
              const isAllProducts = selectedModelIds.includes('all');

              return (
                <div
                  key={addon.id}
                  className={`p-5 rounded-2xl bg-[#141838] border ${borderAccent} space-y-4 flex flex-col justify-between shadow-lg ${
                    addon.active === false ? 'opacity-60' : ''
                  }`}
                >
                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${badgeColor}`}
                      >
                        Acessório #{idx + 1}
                      </span>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addon.active !== false}
                          onChange={(e) => handleAddonChange(idx, 'active', e.target.checked)}
                          className="w-4 h-4 rounded accent-emerald-400 cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-gray-200">
                          {addon.active !== false ? 'Ativo' : 'Oculto'}
                        </span>
                      </label>
                    </div>

                    {/* Prévia compacta do Card */}
                    <div className="p-3 rounded-xl bg-[#0B0E20] border border-white/10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#8423DA] to-[#007BFF] flex items-center justify-center text-white shrink-0 text-sm">
                          {addon.icon ||
                            (idx === 0 ? (
                              <Zap className="w-4 h-4" />
                            ) : idx === 2 ? (
                              <Shield className="w-4 h-4" />
                            ) : (
                              '📿'
                            ))}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white text-xs truncate">
                            {addon.name || 'Nome do Acessório'}
                          </p>
                          <p className="text-[10px] text-[#A5A5B8] truncate">
                            {addon.description || 'Descrição curta'}
                          </p>
                          <p className="font-heading font-black text-[#00DFFF] text-xs mt-0.5">
                            R$ {Number(addon.price || 0).toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                      </div>
                      <span className="w-6 h-6 rounded-full bg-[#00DFFF] text-[#080811] flex items-center justify-center shrink-0">
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-200 mb-1">
                        Nome do Acessório *
                      </label>
                      <input
                        type="text"
                        value={addon.name}
                        onChange={(e) => handleAddonChange(idx, 'name', e.target.value)}
                        placeholder="Ex: Cabo USB tipo C 1m TURBO"
                        required
                        className="w-full p-2.5 rounded-xl bg-[#0D1022] border border-white/15 text-white font-bold focus:outline-none focus:border-[#00DFFF]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-200 mb-1">
                        Descrição / Especificações do Acessório
                      </label>
                      <textarea
                        rows={3}
                        value={addon.description}
                        onChange={(e) => handleAddonChange(idx, 'description', e.target.value)}
                        placeholder="Ex: Carregador ANJGG Portátil Chaveiro 1500mAh – Type-C & Type Lightning..."
                        className="w-full p-2.5 rounded-xl bg-[#0D1022] border border-white/15 text-gray-200 text-xs focus:outline-none focus:border-[#00DFFF] resize-y"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-gray-200 mb-1 flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-emerald-400" />
                          <span>Preço (R$) *</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.50"
                          value={addon.price}
                          onChange={(e) =>
                            handleAddonChange(idx, 'price', parseFloat(e.target.value) || 0)
                          }
                          required
                          className="w-full p-2.5 rounded-xl bg-[#0D1022] border border-white/15 text-emerald-300 font-mono font-black focus:outline-none focus:border-[#00DFFF]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-gray-200 mb-1">
                          Emoji / Ícone
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          value={addon.icon}
                          onChange={(e) => handleAddonChange(idx, 'icon', e.target.value)}
                          placeholder="🔌"
                          className="w-full p-2.5 rounded-xl bg-[#0D1022] border border-white/15 text-center text-base focus:outline-none focus:border-[#00DFFF]"
                        />
                      </div>
                    </div>

                    {/* VÍNCULO A PRODUTOS PRINCIPAIS (COMPRE JUNTO) */}
                    <div className="p-3 rounded-xl bg-[#0D1022] border border-[#8423DA]/35 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#00DFFF] flex items-center gap-1.5 text-[11px]">
                          <Link2 className="w-3.5 h-3.5 text-[#00DFFF]" />
                          <span>Vincular a Produto Principal</span>
                        </label>
                        <span className="text-[10px] font-mono text-gray-400">
                          {isAllProducts ? 'Global' : `${selectedModelIds.length} vinculado(s)`}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                        <button
                          type="button"
                          onClick={() => handleToggleLinkedModel(idx, 'all')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                            isAllProducts
                              ? 'bg-[#00DFFF]/20 border-[#00DFFF] text-[#00DFFF]'
                              : 'bg-[#141838] border-white/10 text-gray-400 hover:text-white'
                          }`}
                        >
                          <span>🌐 Todos os Produtos</span>
                        </button>

                        {models.map((m) => {
                          const isLinked = !isAllProducts && selectedModelIds.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleToggleLinkedModel(idx, m.id)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition cursor-pointer flex items-center gap-1 ${
                                isLinked
                                  ? 'bg-[#8423DA]/35 border-[#00DFFF] text-white font-bold shadow-sm'
                                  : 'bg-[#141838] border-white/10 text-gray-300 hover:border-[#8423DA]/50'
                              }`}
                              title={`Recomendar ${addon.name} quando ${m.modelName} estiver no carrinho`}
                            >
                              <Package className="w-2.5 h-2.5 text-[#00DFFF] shrink-0" />
                              <span className="truncate max-w-[130px]">{m.modelName}</span>
                            </button>
                          );
                        })}
                      </div>

                      <p className="text-[10px] text-[#A5A5B8] leading-snug">
                        {isAllProducts
                          ? 'Recomendado para qualquer produto adicionado ao carrinho.'
                          : `Recomendado quando o carrinho contém: ${
                              addon.applicableModelName || 'produtos selecionados'
                            }.`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-[#8423DA]/25 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#A5A5B8]">
              As regras de Desconto Progressivo e os vínculos do Compre Junto são salvos no banco de dados Supabase e refletem em tempo real na sacola.
            </p>
            <button
              type="submit"
              disabled={isSavingSupabase}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-[#00DFFF]/20 active:scale-95 transition disabled:opacity-60"
            >
              {isSavingSupabase
                ? 'Sincronizando com o Banco...'
                : 'Salvar Promoções no Banco de Dados'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
