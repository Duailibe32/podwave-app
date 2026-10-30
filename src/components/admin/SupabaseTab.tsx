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

const SCHEMA_SQL = `-- ============================================================================
-- PODWAVE — MIGRATION 01: INITIAL SCHEMA & CORE CATALOG SECURITY
-- Arquivo: 20261025000000_initial_schema.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS app_security;
REVOKE ALL ON SCHEMA app_security FROM PUBLIC;
GRANT USAGE ON SCHEMA app_security TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  banner_image TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_models (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  puffs INTEGER NOT NULL CHECK (puffs >= 0),
  description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  promotional_price NUMERIC(10, 2) CHECK (promotional_price IS NULL OR promotional_price >= 0),
  image TEXT,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  in_stock BOOLEAN DEFAULT true,
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER DEFAULT 5 CHECK (low_stock_threshold >= 0),
  features TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.flavor_variants (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL REFERENCES public.product_models(id) ON DELETE CASCADE,
  flavor_name TEXT NOT NULL,
  tag TEXT,
  in_stock BOOLEAN DEFAULT true,
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER DEFAULT 3 CHECK (low_stock_threshold >= 0),
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.banners (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  button_text TEXT,
  button_link TEXT,
  image_desktop TEXT NOT NULL,
  image_mobile TEXT,
  badge_text TEXT,
  type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
  value NUMERIC(10, 2) NOT NULL CHECK (value >= 0),
  min_order_value NUMERIC(10, 2) CHECK (min_order_value IS NULL OR min_order_value >= 0),
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses >= 0),
  used_count INTEGER DEFAULT 0 CHECK (used_count >= 0),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.store_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  store_name TEXT NOT NULL DEFAULT 'PodWave',
  support_email TEXT,
  support_phone TEXT,
  whatsapp_number TEXT NOT NULL DEFAULT '5598984360626',
  legal_notice TEXT,
  owner_uid TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  details TEXT
);

CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  cpf TEXT,
  birth_date TEXT,
  default_address JSONB,
  saved_addresses JSONB DEFAULT '[]'::jsonb,
  favorite_model_ids TEXT[] DEFAULT '{}',
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'owner')),
  is_vip BOOLEAN NOT NULL DEFAULT false,
  vip_since TIMESTAMPTZ,
  vip_expires_at TIMESTAMPTZ,
  vip_plan TEXT,
  vip_status TEXT DEFAULT 'inactive' CHECK (vip_status IN ('active', 'inactive', 'expired')),
  vip_discount_custom NUMERIC(5, 2) CHECK (vip_discount_custom IS NULL OR (vip_discount_custom >= 0 AND vip_discount_custom <= 100)),
  vip_benefit_note TEXT,
  vip_Granted_by TEXT,
  vip_Updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_orders (
  id TEXT PRIMARY KEY,
  order_code TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  coupon_code TEXT,
  vip_discount_applied BOOLEAN DEFAULT false,
  vip_discount_amount NUMERIC(10, 2) DEFAULT 0 CHECK (vip_discount_amount >= 0),
  payment_method TEXT NOT NULL,
  delivery_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  whatsapp_Confirmation_Sent BOOLEAN DEFAULT false
);
`;

const BUSINESS_MANAGEMENT_SQL = `-- ============================================================================
-- PODWAVE — CONSOLIDATED PRODUCTION MIGRATION: MÓDULO "MEU NEGÓCIO" & HARDENING
-- Arquivo: 20261029000000_consolidated_financial_management_production.sql
--
-- Script SQL 100% IDEMPOTENTE e NÃO-DESTRUTIVO para o Supabase (PostgreSQL).
-- Sem uso de current_user em funções SECURITY DEFINER, proteção integral de RLS
-- nas 15 tabelas e deduplicação automática de pagamentos em JSONB.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS app_security;
REVOKE ALL ON SCHEMA app_security FROM PUBLIC;
GRANT USAGE ON SCHEMA app_security TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_security.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_role TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT cp.role INTO v_role
  FROM public.customer_profiles cp
  WHERE cp.id = v_uid::text
  LIMIT 1;

  RETURN COALESCE(v_role IN ('admin', 'owner'), FALSE);
END;
$$;

REVOKE ALL ON FUNCTION app_security.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_security.is_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_security.trg_protect_customer_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_is_admin BOOLEAN;
  v_jwt_role TEXT;
  v_priv_flag TEXT;
  v_sess_user TEXT;
BEGIN
  v_jwt_role := COALESCE(pg_catalog.current_setting('request.jwt.claim.role', true), '');
  v_priv_flag := COALESCE(pg_catalog.current_setting('app_security.allow_privileged_role_change', true), '');
  v_sess_user := session_user;

  IF v_jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF v_priv_flag = 'on'
     AND v_sess_user NOT IN ('anon', 'authenticated', 'authenticator')
     AND v_jwt_role NOT IN ('anon', 'authenticated')
     AND auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  v_caller_is_admin := app_security.is_admin();

  IF TG_OP = 'INSERT' THEN
    IF NOT v_caller_is_admin THEN
      NEW.role := 'customer';
      NEW.is_vip := false;
      NEW.vip_status := 'inactive';
      NEW.vip_plan := NULL;
      NEW.vip_since := NULL;
      NEW.vip_expires_at := NULL;
      NEW.vip_discount_custom := NULL;
      NEW.vip_benefit_note := NULL;
      NEW.vip_Granted_by := NULL;
      NEW.vip_Updated_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NOT v_caller_is_admin THEN
      IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Acesso negado: o identificador do perfil não pode ser alterado.';
      END IF;
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar o nível de permissão (role).';
      END IF;
      IF NEW.vip_discount_custom IS DISTINCT FROM OLD.vip_discount_custom
         OR NEW.is_vip IS DISTINCT FROM OLD.is_vip
         OR NEW.vip_status IS DISTINCT FROM OLD.vip_status
         OR NEW.vip_plan IS DISTINCT FROM OLD.vip_plan
         OR NEW.vip_since IS DISTINCT FROM OLD.vip_since
         OR NEW.vip_expires_at IS DISTINCT FROM OLD.vip_expires_at
         OR NEW.vip_benefit_note IS DISTINCT FROM OLD.vip_benefit_note
         OR NEW.vip_Granted_by IS DISTINCT FROM OLD.vip_Granted_by THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem conceder ou alterar benefícios VIP.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION app_security.trg_protect_customer_role() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ensure_customer_role_protection ON public.customer_profiles;
CREATE TRIGGER ensure_customer_role_protection
  BEFORE INSERT OR UPDATE ON public.customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION app_security.trg_protect_customer_role();

-- Tabelas Financeiras (Módulo Meu Negócio)
CREATE TABLE IF NOT EXISTS public.manual_sales (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT,
  customer_name TEXT NOT NULL,
  customer_contact TEXT,
  sale_origin TEXT DEFAULT 'outro',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  total NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pago',
  amount_received NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (amount_received >= 0),
  amount_pending NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (amount_pending >= 0),
  due_date TEXT,
  payment_date TEXT,
  account_channel TEXT DEFAULT 'dinheiro_caixa',
  installments JSONB DEFAULT '[]'::jsonb,
  payments JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  stock_deducted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.manual_expenses (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  expense_type TEXT DEFAULT 'variavel',
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pago',
  amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  amount_pending NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (amount_pending >= 0),
  due_date TEXT,
  payment_date TEXT,
  account_channel TEXT DEFAULT 'dinheiro_caixa',
  installments JSONB DEFAULT '[]'::jsonb,
  payments JSONB DEFAULT '[]'::jsonb,
  supplier_or_beneficiary TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.merchandise_purchases (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  supplier TEXT NOT NULL,
  supplier_contact TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  freight_or_extra_cost NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (freight_or_extra_cost >= 0),
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pago',
  amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  amount_pending NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (amount_pending >= 0),
  due_date TEXT,
  payment_date TEXT,
  account_channel TEXT DEFAULT 'pix_banco',
  installments JSONB DEFAULT '[]'::jsonb,
  payments JSONB DEFAULT '[]'::jsonb,
  stock_added BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cash_movements (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT,
  movement_type TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  account_channel TEXT NOT NULL,
  destination_channel TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.initial_cash_balances (
  id TEXT PRIMARY KEY,
  account_channel TEXT NOT NULL UNIQUE,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  reference_date TEXT NOT NULL DEFAULT '2026-01-01',
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.manual_commitments (
  id TEXT PRIMARY KEY,
  commitment_type TEXT NOT NULL,
  title TEXT NOT NULL,
  person_or_supplier TEXT NOT NULL,
  contact TEXT,
  category TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  amount_pending NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (amount_pending >= 0),
  payment_status TEXT NOT NULL DEFAULT 'pendente',
  payment_method TEXT NOT NULL,
  account_channel TEXT NOT NULL DEFAULT 'pix_banco',
  payment_date TEXT,
  installments JSONB DEFAULT '[]'::jsonb,
  payments JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.manual_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchandise_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initial_cash_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_commitments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.manual_sales, public.manual_expenses, public.merchandise_purchases, public.cash_movements, public.initial_cash_balances, public.manual_commitments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_sales, public.manual_expenses, public.merchandise_purchases, public.cash_movements, public.initial_cash_balances, public.manual_commitments TO authenticated, service_role;

DROP POLICY IF EXISTS "Admin Full Access Manual Sales" ON public.manual_sales;
CREATE POLICY "Admin Full Access Manual Sales" ON public.manual_sales FOR ALL TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());

DROP POLICY IF EXISTS "Admin Full Access Manual Expenses" ON public.manual_expenses;
CREATE POLICY "Admin Full Access Manual Expenses" ON public.manual_expenses FOR ALL TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());

DROP POLICY IF EXISTS "Admin Full Access Merchandise Purchases" ON public.merchandise_purchases;
CREATE POLICY "Admin Full Access Merchandise Purchases" ON public.merchandise_purchases FOR ALL TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());

DROP POLICY IF EXISTS "Admin Full Access Cash Movements" ON public.cash_movements;
CREATE POLICY "Admin Full Access Cash Movements" ON public.cash_movements FOR ALL TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());

DROP POLICY IF EXISTS "Admin Full Access Initial Cash Balances" ON public.initial_cash_balances;
CREATE POLICY "Admin Full Access Initial Cash Balances" ON public.initial_cash_balances FOR ALL TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());

DROP POLICY IF EXISTS "Admin Full Access Manual Commitments" ON public.manual_commitments;
CREATE POLICY "Admin Full Access Manual Commitments" ON public.manual_commitments FOR ALL TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());
`;

const RLS_TESTS_SQL = `-- ============================================================================
-- PODWAVE — BATERIA TRANSACIONAL DE TESTES DE SEGURANÇA E RLS (COM ROLLBACK)
-- ============================================================================
BEGIN;

  SET LOCAL app_security.allow_privileged_role_change = 'on';

  INSERT INTO public.customer_profiles (id, name, email, phone, role)
  VALUES
    ('00000000-0000-0000-0000-0000000000a1', 'Admin Teste', 'admin.teste.rls@podwave.local', '11999990001', 'admin'),
    ('00000000-0000-0000-0000-0000000000c1', 'Cliente 1', 'cliente1.rls@podwave.local', '11999990002', 'customer'),
    ('00000000-0000-0000-0000-0000000000c2', 'Cliente 2', 'cliente2.rls@podwave.local', '11999990003', 'customer')
  ON CONFLICT (id) DO NOTHING;

  SET LOCAL app_security.allow_privileged_role_change = 'off';

  -- Simular sessão de Cliente 1 (customer autenticado)
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.role" = 'authenticated';
  SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000c1';
  SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';

  SELECT app_security.is_admin() AS is_admin_must_be_false;
  SELECT COUNT(*) AS manual_sales_visible_to_customer_must_be_zero FROM public.manual_sales;

ROLLBACK;
`;

const CLI_GUIDE_SQL = `# ==============================================================================
# GUIA OFICIAL: SUPABASE CLI & HISTÓRICO DE MIGRATIONS
# ==============================================================================
# 1. Login no Supabase CLI:
supabase login

# 2. Vincular o projeto local ao projeto Supabase remoto:
supabase link --project-ref seu-project-id

# 3. Caso o SQL já tenha sido executado via SQL Editor (Web Console):
supabase migration repair 20261030000000 --status applied

# 4. Caso queira aplicar as migrations pelo terminal:
supabase db push

# 5. Listar status das migrations aplicadas e pendentes:
supabase migration list
`;

const SEED_SQL = `-- ============================================================================
-- PODWAVE — PRODUCTION-SAFE MINIMAL SEED
-- Arquivo: supabase/seed.sql
-- Não insere produtos fictícios, marcas, cupons ou estoque demonstrativo.
-- Usa ON CONFLICT (id) DO NOTHING para jamais sobrescrever dados reais.
-- ============================================================================

INSERT INTO public.store_settings (
  id,
  store_name,
  support_email,
  support_phone,
  whatsapp_number,
  legal_notice,
  updated_at
)
VALUES (
  'main',
  'PodWave',
  'contato@podwave.com.br',
  '(98) 98436-0626',
  '5598984360626',
  'VENDA PROIBIDA PARA MENORES DE 18 ANOS.',
  NOW()
)
ON CONFLICT (id) DO NOTHING;
`;

const RLS_ROLES_SQL = `-- ============================================================================
-- PODWAVE — MIGRATION 03: ROLE-BASED ACCESS CONTROL (RBAC) & VIP SYSTEM
-- Arquivo: 20261025000002_role_based_access_control_and_vips.sql
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS app_security;
REVOKE ALL ON SCHEMA app_security FROM PUBLIC;
GRANT USAGE ON SCHEMA app_security TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_security.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_role TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT cp.role INTO v_role
  FROM public.customer_profiles cp
  WHERE cp.id = v_uid::text
  LIMIT 1;

  RETURN COALESCE(v_role IN ('admin', 'owner'), FALSE);
END;
$$;

REVOKE ALL ON FUNCTION app_security.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_security.is_admin() TO authenticated, service_role;
`;

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
    pendingSyncCount,
    isSyncingPending,
    syncPendingFinancialData,
  } = useCatalog();

  const [urlInput, setUrlInput] = useState(supabaseUrl);
  const [keyInput, setKeyInput] = useState(supabaseAnonKey);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingFromCloud, setIsLoadingFromCloud] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeSqlView, setActiveSqlView] = useState<
    'schema' | 'seed' | 'rls_roles' | 'business_management' | 'rls_tests' | 'cli_guide'
  >('business_management');
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

  const currentSql =
    activeSqlView === 'business_management'
      ? BUSINESS_MANAGEMENT_SQL
      : activeSqlView === 'schema'
      ? SCHEMA_SQL
      : activeSqlView === 'seed'
      ? SEED_SQL
      : activeSqlView === 'rls_roles'
      ? RLS_ROLES_SQL
      : activeSqlView === 'rls_tests'
      ? RLS_TESTS_SQL
      : CLI_GUIDE_SQL;

  const handleCopySql = () => {
    navigator.clipboard.writeText(currentSql);
    setCopiedSql(true);
    notify('Código copiado para a Área de Transferência!');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleDownloadSql = () => {
    const filename =
      activeSqlView === 'business_management'
        ? '20261029000000_consolidated_financial_management_production.sql'
        : activeSqlView === 'schema'
        ? '20261025000000_initial_schema.sql'
        : activeSqlView === 'seed'
        ? 'seed.sql'
        : activeSqlView === 'rls_roles'
        ? '20261025000002_role_based_access_control_and_vips.sql'
        : activeSqlView === 'rls_tests'
        ? 'rls_security_audit_tests.sql'
        : 'supabase_cli_guide.sh';
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

      {/* PAINEL DE RESILIÊNCIA & SINCRONIZAÇÃO LOCAL (MEU NEGÓCIO) */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#10142b] to-[#151a3d] border border-cyan-500/30 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-heading text-base font-black text-white flex items-center gap-2">
                <span>Resiliência & Sincronização Local (Meu Negócio)</span>
                {pendingSyncCount === 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    100% Sincronizado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                    {pendingSyncCount} Pendente(s)
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#A5A5B8] mt-0.5">
                Rastreamento estrito de status (<code className="text-emerald-400">synced</code>, <code className="text-amber-400">pending_sync</code>, <code className="text-rose-400">sync_error</code>) com prevenção contra perdas e deduplicação automática.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={syncPendingFinancialData}
            disabled={isSyncingPending || !isSupabaseConfigured}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 hover:brightness-110 text-[#080811] text-xs font-black shadow-lg shadow-cyan-500/20 cursor-pointer active:scale-95 transition disabled:opacity-50 shrink-0"
          >
            {isSyncingPending ? (
              <RefreshCw className="w-4 h-4 animate-spin text-[#080811]" />
            ) : (
              <UploadCloud className="w-4 h-4 text-[#080811]" />
            )}
            <span>{isSyncingPending ? 'Sincronizando...' : 'Sincronizar Pendentes Agora'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-[#080811]/60 border border-white/5 space-y-1">
            <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">Identificadores Únicos</span>
            <p className="text-[11px] text-gray-300">
              Cada venda, gasto, compra, movimentação e compromisso possui UUID próprio e imutável para evitar duplicidades no upsert.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-[#080811]/60 border border-white/5 space-y-1">
            <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">Nenhum Registro Assumido</span>
            <p className="text-[11px] text-gray-300">
              Registros gravados offline permanecem como pendentes até receberem confirmação 200 OK do Supabase remoto.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-[#080811]/60 border border-white/5 space-y-1">
            <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">Isolamento Administrativo</span>
            <p className="text-[11px] text-gray-300">
              Acesso e sincronização estritamente condicionados ao papel <code className="text-cyan-300">admin</code> ou <code className="text-cyan-300">owner</code> via RLS no schema privado.
            </p>
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
        <div className="flex items-center gap-2 border-b border-[#8423DA]/20 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveSqlView('business_management')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSqlView === 'business_management'
                ? 'bg-gradient-to-r from-emerald-500 to-[#00DFFF] text-[#080811] shadow-lg font-black'
                : 'bg-[#141838] text-emerald-400 hover:text-white border border-emerald-500/30'
            }`}
          >
            ⭐ 4. Meu Negócio: Gestão Financeira Consolidada (Produção)
          </button>

          <button
            onClick={() => setActiveSqlView('schema')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSqlView === 'schema'
                ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white shadow-md'
                : 'bg-[#141838] text-gray-400 hover:text-white'
            }`}
          >
            1. Migration: initial_schema.sql (Catálogo Base)
          </button>

          <button
            onClick={() => setActiveSqlView('seed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSqlView === 'seed'
                ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white shadow-md'
                : 'bg-[#141838] text-gray-400 hover:text-white'
            }`}
          >
            2. Seed: seed.sql (Dados Iniciais)
          </button>

          <button
            onClick={() => setActiveSqlView('rls_roles')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSqlView === 'rls_roles'
                ? 'bg-gradient-to-r from-[#00DFFF] to-[#8423DA] text-white shadow-md font-black'
                : 'bg-[#141838] text-gray-400 hover:text-[#00DFFF]'
            }`}
          >
            3. Migration: RLS & Cargos (is_admin, is_vip)
          </button>

          <button
            onClick={() => setActiveSqlView('rls_tests')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSqlView === 'rls_tests'
                ? 'bg-gradient-to-r from-amber-400 to-rose-500 text-[#080811] shadow-md font-black'
                : 'bg-[#141838] text-amber-300 hover:text-white border border-amber-500/30'
            }`}
          >
            🧪 5. Bateria de Testes RLS (Auditoria)
          </button>

          <button
            onClick={() => setActiveSqlView('cli_guide')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSqlView === 'cli_guide'
                ? 'bg-gradient-to-r from-[#00DFFF] to-blue-600 text-white shadow-md font-black'
                : 'bg-[#141838] text-cyan-300 hover:text-white border border-cyan-500/30'
            }`}
          >
            💻 6. Comandos Supabase CLI
          </button>
        </div>

        {/* Code Block Container */}
        <div className="relative rounded-2xl overflow-hidden border border-[#8423DA]/30 bg-[#080811]">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#11152A] border-b border-white/10 text-xs">
            <div className="flex items-center gap-2 text-gray-300 font-mono text-[11px]">
              <Database className="w-3.5 h-3.5 text-[#00DFFF]" />
              <span>
                {activeSqlView === 'business_management'
                  ? 'supabase/migrations/20261029000000_consolidated_financial_management_production.sql'
                  : activeSqlView === 'schema'
                  ? 'supabase/migrations/20261025000000_initial_schema.sql'
                  : activeSqlView === 'seed'
                  ? 'supabase/seed.sql'
                  : activeSqlView === 'rls_roles'
                  ? 'supabase/migrations/20261025000002_role_based_access_control_and_vips.sql'
                  : activeSqlView === 'rls_tests'
                  ? 'scripts/test_rls_security_audit.sql'
                  : 'supabase/cli_workflow_commands.sh'}
              </span>
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
