import React, { useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import {
  Database,
  Cloud,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
  Server,
  Key,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

const SCHEMA_SQL = `-- ==============================================================================
-- PODWAVE CATALOG - SUPABASE POSTGRESQL MIGRATION
-- Migration: 20261025000000_initial_schema.sql
-- Description: Criação da estrutura de tabelas, índices, RLS e dados iniciais
-- ==============================================================================

-- 1. TABELA DE MARCAS (BRANDS)
CREATE TABLE IF NOT EXISTS public.brands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    logo_text TEXT,
    featured BOOLEAN DEFAULT true,
    logo_url TEXT,
    country TEXT DEFAULT 'Global',
    description TEXT,
    card_color TEXT DEFAULT 'black',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA DE MODELOS / PRODUTOS (PRODUCT_MODELS)
CREATE TABLE IF NOT EXISTS public.product_models (
    id TEXT PRIMARY KEY,
    brand_id TEXT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    brand_name TEXT NOT NULL,
    model_name TEXT NOT NULL,
    puffs INTEGER NOT NULL,
    puffs_label TEXT NOT NULL,
    badge TEXT,
    starting_price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    category TEXT DEFAULT 'Descartável Premium' NOT NULL,
    description TEXT,
    battery TEXT DEFAULT '650mAh USB-C',
    e_liquid TEXT DEFAULT '16ml',
    nicotine TEXT DEFAULT '5% (50mg)',
    charge_type TEXT DEFAULT 'USB Tipo C Fast Charge',
    coil TEXT DEFAULT 'Dual Mesh Coil',
    airflow TEXT,
    low_quantity_threshold INTEGER DEFAULT 3,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE SABORES / VARIANTES (FLAVOR_VARIANTS)
CREATE TABLE IF NOT EXISTS public.flavor_variants (
    id TEXT PRIMARY KEY,
    model_id TEXT NOT NULL REFERENCES public.product_models(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color_hex TEXT DEFAULT '#9333EA' NOT NULL,
    icon_emoji TEXT DEFAULT '🍇' NOT NULL,
    in_stock BOOLEAN DEFAULT true NOT NULL,
    demo_quantity INTEGER,
    low_quantity_threshold INTEGER DEFAULT 3,
    custom_image TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELA DE BANNERS ROTATIVOS (BANNERS)
CREATE TABLE IF NOT EXISTS public.banners (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    badge TEXT,
    cta_text TEXT NOT NULL,
    cta_link TEXT NOT NULL,
    image_url TEXT NOT NULL,
    background_gradient TEXT NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABELA DE CUPONS PROMOCIONAIS (COUPONS)
CREATE TABLE IF NOT EXISTS public.coupons (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
    value NUMERIC(10, 2) NOT NULL,
    min_order_value NUMERIC(10, 2),
    applicable_model_id TEXT,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0 NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABELA DE CONFIGURAÇÕES GERAIS DA LOJA (STORE_SETTINGS)
CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY DEFAULT 'primary',
    store_name TEXT DEFAULT 'PodWave' NOT NULL,
    support_email TEXT DEFAULT 'contato@podwave.com.br',
    support_phone TEXT DEFAULT '(86) 99901-4685',
    whatsapp_number TEXT DEFAULT '5586999014685',
    legal_notice TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABELA DE LOGS DE AUDITORIA (AUDIT_LOGS)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    model_id TEXT,
    flavor_id TEXT,
    action TEXT NOT NULL,
    previous_quantity INTEGER,
    new_quantity INTEGER,
    previous_status TEXT,
    new_status TEXT,
    actor_uid TEXT,
    actor_email TEXT,
    notes TEXT
);

-- ÍNDICES PARA ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_product_models_brand_id ON public.product_models(brand_id);
CREATE INDEX IF NOT EXISTS idx_flavor_variants_model_id ON public.flavor_variants(model_id);
CREATE INDEX IF NOT EXISTS idx_flavor_variants_stock ON public.flavor_variants(in_stock);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flavor_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: LEITURA PÚBLICA PARA CLIENTES
CREATE POLICY "Public Read Brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Public Read Models" ON public.product_models FOR SELECT USING (true);
CREATE POLICY "Public Read Flavors" ON public.flavor_variants FOR SELECT USING (true);
CREATE POLICY "Public Read Banners" ON public.banners FOR SELECT USING (true);
CREATE POLICY "Public Read Coupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Public Read Settings" ON public.store_settings FOR SELECT USING (true);

-- POLÍTICAS: ADMINISTRAÇÃO TOTAL VIA ANON KEY COM CHAVE DO SUPABASE
CREATE POLICY "Admin Full Brands" ON public.brands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin Full Models" ON public.product_models FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin Full Flavors" ON public.flavor_variants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin Full Banners" ON public.banners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin Full Coupons" ON public.coupons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin Full Settings" ON public.store_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin Full AuditLogs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);`;

const SEED_SQL = `-- ==============================================================================
-- PODWAVE CATALOG - SUPABASE SEED DATA
-- Description: Dados padrão de Marcas, Modelos, Sabores, Banners e Cupons
-- ==============================================================================

-- INSERIR MARCAS
INSERT INTO public.brands (id, name, logo_text, featured, country, description, card_color)
VALUES
('ignite', 'IGNITE', 'IGNITE', true, 'USA', 'Marca global de estilo de vida premium, conhecida por seu acabamento fosco ultra-fino e alto rendimento.', 'black'),
('elfbar', 'ELFBAR', 'ELFBAR', true, 'UK', 'Líder mundial em tecnologia de vaporização compacta com modos Turbo e Smooth.', 'magenta'),
('geekbar', 'GEEK BAR', 'GEEK BAR', true, 'USA', 'Pioneira em displays inteligentes e tecnologia de bobina dupla Pulse Mesh.', 'slate'),
('oxbar', 'OXBAR', 'OXBAR', true, 'USA', 'Dispositivos de altíssima capacidade com controle de fluxo de ar e sabores intensos.', 'cyan'),
('lostmary', 'LOST MARY', 'LOST MARY', true, 'UK', 'Design anatômico ergonômico com texturas suaves e nuances aromáticas requintadas.', 'cyan'),
('fumot', 'FUMOT', 'FUMOT', true, 'Global', 'Criadora do famoso Fumot Tornado e Digital Box com iluminação RGB.', 'blue'),
('vaporesso', 'VAPORESSO', 'VAPORESSO', true, 'Global', 'Excelência em sistemas pod recarregáveis com tecnologia anti-vazamento SSS.', 'emerald')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    country = EXCLUDED.country,
    description = EXCLUDED.description;

-- INSERIR CONFIGURAÇÕES DA LOJA
INSERT INTO public.store_settings (id, store_name, support_email, support_phone, whatsapp_number, legal_notice)
VALUES (
    'primary',
    'PodWave',
    'contato@podwave.com.br',
    '(86) 99901-4685',
    '5586999014685',
    'AVISO LEGAL IMPORTANTE (+18): A venda de dispositivos eletrônicos para fumar (DEF) é estritamente proibida para menores de 18 anos conforme a legislação vigente e resoluções da ANVISA. Este catálogo possui finalidade exclusivamente demonstrativa de portfólio e especificações técnicas.'
)
ON CONFLICT (id) DO UPDATE SET 
    store_name = EXCLUDED.store_name,
    support_phone = EXCLUDED.support_phone,
    whatsapp_number = EXCLUDED.whatsapp_number;

-- INSERIR CUPONS PADRÃO
INSERT INTO public.coupons (id, code, discount_type, value, min_order_value, max_uses, used_count, description, active)
VALUES
('cupom-wave10', 'WAVE10', 'percent', 10.00, 100.00, 100, 8, '10% OFF em pedidos acima de R$ 100', true),
('cupom-vip20', 'VIP20', 'fixed', 20.00, 150.00, 50, 14, 'R$ 20,00 OFF em compras acima de R$ 150', true),
('cupom-ignite15', 'IGNITE15', 'percent', 15.00, 0.00, 30, 6, '15% de desconto especial na linha IGNITE', true)
ON CONFLICT (id) DO UPDATE SET
    discount_type = EXCLUDED.discount_type,
    value = EXCLUDED.value;`;

export const SupabaseTab: React.FC = () => {
  const {
    brands,
    models,
    banners,
    settings,
    coupons,
    supabaseUrl,
    supabaseAnonKey,
    isSupabaseConfigured,
    supabaseStatus,
    supabaseStatusMessage,
    updateSupabaseCredentials,
    testSupabase,
    syncToSupabase,
    loadFromSupabase,
    isAutoSyncEnabled,
    setIsAutoSyncEnabled,
    isAutoSyncing,
    lastSyncedAt,
  } = useCatalog();

  const [urlInput, setUrlInput] = useState(supabaseUrl);
  const [keyInput, setKeyInput] = useState(supabaseAnonKey);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingFromCloud, setIsLoadingFromCloud] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeSqlView, setActiveSqlView] = useState<'schema' | 'seed'>('schema');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const notify = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    updateSupabaseCredentials(urlInput.trim(), keyInput.trim());
    const res = await testSupabase();
    setIsSaving(false);
    if (res.success) {
      notify('Conexão com o Supabase estabelecida com sucesso!');
    } else {
      notify(`Atenção: ${res.message}`);
    }
  };

  const handleDisconnect = () => {
    if (confirm('Deseja desconectar as credenciais do Supabase desta sessão?')) {
      setUrlInput('');
      setKeyInput('');
      updateSupabaseCredentials('', '');
      notify('Credenciais do Supabase removidas.');
    }
  };

  const handlePushToSupabase = async () => {
    if (!isSupabaseConfigured) {
      alert('Por favor configure e teste a URL e Anon Key do Supabase antes de sincronizar.');
      return;
    }
    setIsSyncing(true);
    const res = await syncToSupabase();
    setIsSyncing(false);
    if (res.success) {
      notify('Catálogo sincronizado com o Supabase com sucesso!');
    } else {
      notify(`Erro ao sincronizar: ${res.message}`);
    }
  };

  const handlePullFromSupabase = async () => {
    if (!isSupabaseConfigured) {
      alert('Por favor configure o Supabase antes de carregar.');
      return;
    }
    if (confirm('Isso carregará as marcas, modelos, sabores, cupons e banners do seu banco Supabase. Deseja prosseguir?')) {
      setIsLoadingFromCloud(true);
      const ok = await loadFromSupabase();
      setIsLoadingFromCloud(false);
      if (ok) {
        notify('Catálogo atualizado com os dados do Supabase!');
      } else {
        notify('Não foi possível carregar os dados. Verifique a conexão e as tabelas.');
      }
    }
  };

  const currentSql = activeSqlView === 'schema' ? SCHEMA_SQL : SEED_SQL;

  const handleCopySql = () => {
    navigator.clipboard.writeText(currentSql);
    setCopiedSql(true);
    notify('Código SQL copiado para a Área de Transferência!');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleDownloadSql = () => {
    const filename = activeSqlView === 'schema' ? '20261025000000_initial_schema.sql' : 'seed.sql';
    const blob = new Blob([currentSql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify(`Arquivo ${filename} baixado com sucesso!`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {actionNotice && (
        <div className="fixed top-20 right-6 z-50 px-4 py-3 rounded-2xl bg-[#00DFFF] text-[#080811] font-bold text-xs shadow-2xl flex items-center gap-2 border border-white/40 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#080811]" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#141838] via-[#11152A] to-[#181D3D] border-2 border-[#00DFFF]/40 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00DFFF]/20 to-[#007BFF]/20 border border-[#00DFFF]/50 flex items-center justify-center text-[#00DFFF] shadow-lg shadow-[#00DFFF]/20">
              <Database className="w-6 h-6 text-[#00DFFF]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-heading text-xl font-black text-white tracking-wide">
                  Integração Supabase & PostgreSQL
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                  PostgreSQL Cloud
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#8423DA]/20 border border-[#8423DA]/40 text-[#00DFFF]">
                  Firebase Removido
                </span>
              </div>
              <p className="text-xs text-[#A5A5B8] mt-1">
                Conecte seu banco de dados na nuvem Supabase, sincronize dados em tempo real e execute as migrations oficiais.
              </p>
            </div>
          </div>

          {/* Real-time Status Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`px-3.5 py-2 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                supabaseStatus === 'connected'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : supabaseStatus === 'pending_migration'
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                  : supabaseStatus === 'error'
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                  : 'bg-slate-500/10 border-slate-500/40 text-slate-300'
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  supabaseStatus === 'connected'
                    ? 'bg-emerald-400 animate-pulse'
                    : supabaseStatus === 'pending_migration'
                    ? 'bg-amber-400 animate-pulse'
                    : supabaseStatus === 'error'
                    ? 'bg-rose-400'
                    : 'bg-slate-400'
                }`}
              />
              <span>
                {supabaseStatus === 'connected'
                  ? 'Supabase Conectado & Operante'
                  : supabaseStatus === 'pending_migration'
                  ? 'Conectado • Migration Pendente'
                  : supabaseStatus === 'error'
                  ? 'Erro de Conexão'
                  : 'Aguardando Credenciais'}
              </span>
            </div>
          </div>
        </div>

        {supabaseStatus === 'pending_migration' && (
          <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 block font-heading text-sm">
                  Tabelas ainda não criadas no banco de dados Supabase
                </strong>
                <p className="text-[11px] text-amber-200/90 leading-relaxed mt-0.5">
                  Seu projeto Supabase está conectado com sucesso, mas o script de criação das tabelas (migration) ainda precisa ser executado no SQL Editor.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopySql}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-[#080811] text-xs font-black shadow-lg flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition"
            >
              {copiedSql ? <Check className="w-4 h-4 text-[#080811]" /> : <Copy className="w-4 h-4 text-[#080811]" />}
              <span>Copiar SQL de Criação</span>
            </button>
          </div>
        )}

        {supabaseStatusMessage && (
          <div className="p-3 rounded-xl bg-[#080811]/60 border border-[#8423DA]/20 flex items-start gap-2 text-xs text-[#A5A5B8]">
            <Info className="w-4 h-4 text-[#00DFFF] shrink-0 mt-0.5" />
            <p className="font-mono text-[11px] leading-relaxed text-gray-300">{supabaseStatusMessage}</p>
          </div>
        )}
      </div>

      {/* TOP GRID: CREDENTIALS & QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Supabase Connection Form */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-[#0D1022] border border-[#8423DA]/30 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#8423DA]/20 pb-4">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-[#00DFFF]" />
              <h3 className="font-heading text-base font-bold text-white">
                Credenciais da API Supabase
              </h3>
            </div>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#00DFFF] hover:underline font-semibold"
            >
              <span>Abrir Painel Supabase</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <form onSubmit={handleSaveAndTest} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-200 font-bold mb-1.5 flex items-center justify-between">
                <span>URL do Projeto Supabase (Project URL) *</span>
                <span className="text-[10px] text-gray-400 font-normal">Ex: https://xyz.supabase.co</span>
              </label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://your-project-id.supabase.co"
                required
                className="w-full p-3 rounded-xl bg-[#141838] border border-[#8423DA]/35 text-white font-mono text-xs focus:outline-none focus:border-[#00DFFF] transition-all"
              />
            </div>

            <div>
              <label className="block text-gray-200 font-bold mb-1.5 flex items-center justify-between">
                <span>Chave Pública Anon (Anon Public Key) *</span>
                <span className="text-[10px] text-gray-400 font-normal">Role anon / public JWT</span>
              </label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                required
                className="w-full p-3 rounded-xl bg-[#141838] border border-[#8423DA]/35 text-white font-mono text-xs focus:outline-none focus:border-[#00DFFF] transition-all"
              />
              <p className="text-[10px] text-[#A5A5B8] mt-1.5 leading-relaxed">
                Localize em seu projeto Supabase em: <strong>Project Settings &rarr; API &rarr; Project URL e anon/public key</strong>.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#8423DA]/20">
              {isSupabaseConfigured && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3.5 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 text-xs font-semibold cursor-pointer transition"
                >
                  Desconectar
                </button>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#007BFF] hover:brightness-110 text-[#080811] text-xs font-black shadow-lg shadow-[#00DFFF]/20 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>{isSaving ? 'Testando Conexão...' : 'Salvar & Testar Conexão'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Real-time Bidirectional Sync */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0D1022] border border-[#8423DA]/30 shadow-xl flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-[#8423DA]/20 pb-3">
              <Cloud className="w-5 h-5 text-[#E53CF3]" />
              <h3 className="font-heading text-base font-bold text-white">
                Sincronização em Nuvem
              </h3>
            </div>
            <p className="text-xs text-[#A5A5B8] leading-relaxed">
              Mantenha o estado da sua loja conectado à nuvem do Supabase com 1 clique.
            </p>

            <div className="grid grid-cols-2 gap-2 text-center text-xs py-1">
              <div className="p-2 rounded-xl bg-[#141838] border border-white/5">
                <span className="text-[10px] text-gray-400 block">Marcas</span>
                <span className="font-black text-white text-sm">{brands.length}</span>
              </div>
              <div className="p-2 rounded-xl bg-[#141838] border border-white/5">
                <span className="text-[10px] text-gray-400 block">Modelos</span>
                <span className="font-black text-white text-sm">{models.length}</span>
              </div>
              <div className="p-2 rounded-xl bg-[#141838] border border-white/5">
                <span className="text-[10px] text-gray-400 block">Sabores</span>
                <span className="font-black text-white text-sm">
                  {models.reduce((acc, m) => acc + (m.flavors?.length || 0), 0)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-[#141838] border border-white/5">
                <span className="text-[10px] text-gray-400 block">Cupons</span>
                <span className="font-black text-white text-sm">{coupons.length}</span>
              </div>
            </div>

            {/* Auto-Sync Banner & Toggle */}
            <div className="p-3 rounded-2xl bg-[#141838] border border-[#00DFFF]/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#00DFFF]" />
                  <span className="font-heading font-black text-xs text-white">
                    Auto-Sync em Tempo Real
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAutoSyncEnabled}
                    onChange={(e) => setIsAutoSyncEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <p className="text-[10px] text-[#A5A5B8] leading-tight">
                {isAutoSyncEnabled
                  ? '⚡ Ativado: Cada produto, sabor, estoque ou cupom editado é gravado no Supabase automaticamente.'
                  : '⏸️ Pausado: O Supabase só é atualizado quando você clicar nos botões manuais.'}
              </p>

              {/* Live sync indicator */}
              <div className="pt-0.5 flex items-center justify-between text-[10px]">
                {isAutoSyncing ? (
                  <span className="text-[#00DFFF] font-bold flex items-center gap-1.5 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Salvando alterações no Supabase...
                  </span>
                ) : lastSyncedAt ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Sincronizado às {lastSyncedAt.toLocaleTimeString('pt-BR')}
                  </span>
                ) : (
                  <span className="text-gray-400">Aguardando edições</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#8423DA]/20">
            {/* Push button */}
            <button
              onClick={handlePushToSupabase}
              disabled={isSyncing || !isSupabaseConfigured}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#8423DA] to-[#007BFF] hover:brightness-110 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
            >
              {isSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
              <span>{isSyncing ? 'Sincronizando com Supabase...' : 'Enviar Catálogo Manualmente (Push)'}</span>
            </button>

            {/* Pull button */}
            <button
              onClick={handlePullFromSupabase}
              disabled={isLoadingFromCloud || !isSupabaseConfigured}
              className="w-full py-2.5 px-4 rounded-xl bg-[#141838] hover:bg-[#1a204a] text-gray-200 border border-[#8423DA]/30 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
            >
              {isLoadingFromCloud ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#00DFFF]" />
              ) : (
                <DownloadCloud className="w-4 h-4 text-[#00DFFF]" />
              )}
              <span>{isLoadingFromCloud ? 'Baixando Dados...' : 'Recarregar Dados do Supabase (Pull)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MIGRATIONS & SQL SECTION */}
      <div className="p-6 rounded-3xl bg-[#0D1022] border border-[#8423DA]/30 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#8423DA]/20 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#00DFFF]" />
              <h3 className="font-heading text-lg font-black text-white">
                Migrations Oficiais & Execução SQL
              </h3>
            </div>
            <p className="text-xs text-[#A5A5B8] mt-1">
              Gere e execute as tabelas e dados no SQL Editor do Supabase para inicializar seu banco PostgreSQL.
            </p>
          </div>

          {/* Action buttons: Copy & Download */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopySql}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#007BFF] text-[#080811] text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer hover:brightness-110 active:scale-95 transition"
            >
              {copiedSql ? <Check className="w-4 h-4 text-[#080811]" /> : <Copy className="w-4 h-4 text-[#080811]" />}
              <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
            </button>

            <button
              onClick={handleDownloadSql}
              className="px-3.5 py-2 rounded-xl bg-[#141838] hover:bg-[#1a204a] text-gray-200 border border-[#8423DA]/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <Download className="w-4 h-4 text-[#00DFFF]" />
              <span>Baixar .SQL</span>
            </button>
          </div>
        </div>

        {/* Step-by-step Tutorial */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-[#141838] border border-[#8423DA]/25 space-y-1">
            <div className="w-6 h-6 rounded-full bg-[#00DFFF]/20 text-[#00DFFF] flex items-center justify-center font-black text-xs mb-2">
              1
            </div>
            <h4 className="font-bold text-white">Acesse o Supabase</h4>
            <p className="text-[11px] text-[#A5A5B8] leading-relaxed">
              Entre em seu projeto no painel do Supabase (supabase.com).
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#141838] border border-[#8423DA]/25 space-y-1">
            <div className="w-6 h-6 rounded-full bg-[#00DFFF]/20 text-[#00DFFF] flex items-center justify-center font-black text-xs mb-2">
              2
            </div>
            <h4 className="font-bold text-white">Abra o SQL Editor</h4>
            <p className="text-[11px] text-[#A5A5B8] leading-relaxed">
              No menu lateral esquerdo, clique no ícone <strong>SQL Editor</strong> e crie uma <strong>New query</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#141838] border border-[#8423DA]/25 space-y-1">
            <div className="w-6 h-6 rounded-full bg-[#00DFFF]/20 text-[#00DFFF] flex items-center justify-center font-black text-xs mb-2">
              3
            </div>
            <h4 className="font-bold text-white">Cole e Execute (Run)</h4>
            <p className="text-[11px] text-[#A5A5B8] leading-relaxed">
              Cole o código SQL abaixo e clique no botão verde <strong>RUN</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#141838] border border-[#8423DA]/25 space-y-1">
            <div className="w-6 h-6 rounded-full bg-[#00DFFF]/20 text-[#00DFFF] flex items-center justify-center font-black text-xs mb-2">
              4
            </div>
            <h4 className="font-bold text-white">Sincronize</h4>
            <p className="text-[11px] text-[#A5A5B8] leading-relaxed">
              Insira a URL e Anon Key no formulário acima e sincronize com 1 clique!
            </p>
          </div>
        </div>

        {/* Tab switch for SQL files */}
        <div className="flex items-center gap-2 border-b border-[#8423DA]/20 pb-2">
          <button
            onClick={() => setActiveSqlView('schema')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSqlView === 'schema'
                ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white shadow-md'
                : 'bg-[#141838] text-gray-400 hover:text-white'
            }`}
          >
            1. Migration: 20261025000000_initial_schema.sql (Estrutura, RLS e Índices)
          </button>

          <button
            onClick={() => setActiveSqlView('seed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSqlView === 'seed'
                ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white shadow-md'
                : 'bg-[#141838] text-gray-400 hover:text-white'
            }`}
          >
            2. Seed: seed.sql (Dados Padrão da Loja)
          </button>
        </div>

        {/* Code Block Container */}
        <div className="relative rounded-2xl overflow-hidden border border-[#8423DA]/30 bg-[#080811]">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#11152A] border-b border-white/10 text-xs">
            <div className="flex items-center gap-2 text-gray-300 font-mono text-[11px]">
              <Database className="w-3.5 h-3.5 text-[#00DFFF]" />
              <span>{activeSqlView === 'schema' ? 'supabase/migrations/20261025000000_initial_schema.sql' : 'supabase/seed.sql'}</span>
            </div>
            <button
              onClick={handleCopySql}
              className="text-xs text-[#00DFFF] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Copiado!' : 'Copiar Código'}</span>
            </button>
          </div>

          <pre className="p-4 text-[11px] font-mono text-cyan-200/90 overflow-x-auto max-h-[380px] leading-relaxed selection:bg-[#00DFFF]/30">
            {currentSql}
          </pre>
        </div>
      </div>
    </div>
  );
};
