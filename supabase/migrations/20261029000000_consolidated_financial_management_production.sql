-- ============================================================================
-- PODWAVE — CONSOLIDATED PRODUCTION MIGRATION: MÓDULO "MEU NEGÓCIO" & HARDENING
-- Arquivo: 20261029000000_consolidated_financial_management_production.sql
--
-- Script SQL 100% IDEMPOTENTE e NÃO-DESTRUTIVO para o Supabase (PostgreSQL).
-- Não utiliza current_user na trigger SECURITY DEFINER, protege todas as 15
-- tabelas (catálogo, perfis, pedidos, auditoria e financeiro) e deduplica
-- pagamentos em JSONB automaticamente.
-- ============================================================================

-- 1. SCHEMA PRIVADO DE SEGURANÇA (NÃO EXPOSTO NA API REST DO SUPABASE)
CREATE SCHEMA IF NOT EXISTS app_security;

REVOKE ALL ON SCHEMA app_security FROM PUBLIC;
GRANT USAGE ON SCHEMA app_security TO authenticated, service_role;

-- 2. FUNÇÕES SEGURAS NO SCHEMA PRIVADO app_security
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

CREATE OR REPLACE FUNCTION app_security.is_vip()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_is_vip BOOLEAN;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT (
    cp.is_vip = true
    AND cp.vip_status = 'active'
    AND (cp.vip_expires_at IS NULL OR cp.vip_expires_at > NOW())
  ) INTO v_is_vip
  FROM public.customer_profiles cp
  WHERE cp.id = v_uid::text
  LIMIT 1;

  RETURN COALESCE(v_is_vip, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION app_security.get_user_role()
RETURNS TEXT
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
    RETURN 'anonymous';
  END IF;

  SELECT cp.role INTO v_role
  FROM public.customer_profiles cp
  WHERE cp.id = v_uid::text
  LIMIT 1;

  RETURN COALESCE(v_role, 'customer');
END;
$$;

REVOKE ALL ON FUNCTION app_security.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_security.is_vip() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_security.get_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_security.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_security.is_vip() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_security.get_user_role() TO authenticated, service_role;

-- Remover funções SECURITY DEFINER desnecessárias do schema public
DROP FUNCTION IF EXISTS public.is_vip() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.protect_customer_role_and_vip() CASCADE;

-- 3. PROTEÇÃO CONTRA ESCALAÇÃO DE PRIVILÉGIOS (SEM USO DE current_user)
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

  -- 1. Operação via service_role (backend administrativo autenticado com chave secreta)
  IF v_jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 2. Operação administrativa manual no Supabase SQL Editor (exige flag local explícita na transação + sessão fora do PostgREST)
  IF v_priv_flag = 'on'
     AND v_sess_user NOT IN ('anon', 'authenticated', 'authenticator')
     AND v_jwt_role NOT IN ('anon', 'authenticated')
     AND auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- 3. Verifica se o usuário autenticado atual já possui role 'admin' ou 'owner'
  v_caller_is_admin := app_security.is_admin();

  IF TG_OP = 'INSERT' THEN
    IF NOT v_caller_is_admin THEN
      -- Todo cadastro público recebe obrigatoriamente 'customer', mesmo quando não houver nenhum admin no banco
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

DROP TRIGGER IF EXISTS trg_protect_customer_role_and_vip ON public.customer_profiles;
DROP TRIGGER IF EXISTS ensure_customer_role_protection ON public.customer_profiles;
CREATE TRIGGER ensure_customer_role_protection
  BEFORE INSERT OR UPDATE ON public.customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION app_security.trg_protect_customer_role();

-- 4. IMUTABILIDADE DE AUDIT_LOGS
CREATE OR REPLACE FUNCTION app_security.trg_immutable_audit_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Operação negada: registros de auditoria (audit_logs) são imutáveis e não permitem UPDATE ou DELETE.';
END;
$$;

REVOKE ALL ON FUNCTION app_security.trg_immutable_audit_logs() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ensure_immutable_audit_logs ON public.audit_logs;
CREATE TRIGGER ensure_immutable_audit_logs
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION app_security.trg_immutable_audit_logs();

-- 5. CRIAÇÃO E ATUALIZAÇÃO DAS 6 TABELAS DO MÓDULO "MEU NEGÓCIO"

-- 5.1 Minhas Vendas (manual_sales)
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

ALTER TABLE public.manual_sales
  ADD COLUMN IF NOT EXISTS due_date TEXT,
  ADD COLUMN IF NOT EXISTS payment_date TEXT,
  ADD COLUMN IF NOT EXISTS account_channel TEXT DEFAULT 'dinheiro_caixa',
  ADD COLUMN IF NOT EXISTS installments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]'::jsonb;

-- 5.2 Meus Gastos (manual_expenses)
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

ALTER TABLE public.manual_expenses
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_pending NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_date TEXT,
  ADD COLUMN IF NOT EXISTS payment_date TEXT,
  ADD COLUMN IF NOT EXISTS account_channel TEXT DEFAULT 'dinheiro_caixa',
  ADD COLUMN IF NOT EXISTS installments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]'::jsonb;

-- 5.3 Compras de Mercadorias (merchandise_purchases)
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

ALTER TABLE public.merchandise_purchases
  ADD COLUMN IF NOT EXISTS due_date TEXT,
  ADD COLUMN IF NOT EXISTS payment_date TEXT,
  ADD COLUMN IF NOT EXISTS account_channel TEXT DEFAULT 'pix_banco',
  ADD COLUMN IF NOT EXISTS installments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]'::jsonb;

-- 5.4 Movimentações Manuais do Fluxo de Caixa (cash_movements)
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

-- 5.5 Saldos Iniciais por Canal Financeiro (initial_cash_balances)
CREATE TABLE IF NOT EXISTS public.initial_cash_balances (
  id TEXT PRIMARY KEY,
  account_channel TEXT NOT NULL UNIQUE,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  reference_date TEXT NOT NULL DEFAULT '2026-01-01',
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.6 Compromissos e Contas Pendentes Avulsas (manual_commitments)
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

-- 6. DEDUPLICAÇÃO DE PAGAMENTOS E PARCELAS EM JSONB
CREATE OR REPLACE FUNCTION app_security.deduplicate_jsonb_by_id(p_arr JSONB)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT CASE
    WHEN p_arr IS NULL OR jsonb_typeof(p_arr) <> 'array' OR jsonb_array_length(p_arr) <= 1 THEN COALESCE(p_arr, '[]'::jsonb)
    ELSE (
      SELECT COALESCE(jsonb_agg(elem ORDER BY first_ord), '[]'::jsonb)
      FROM (
        SELECT DISTINCT ON (COALESCE(elem->>'id', md5(elem::text)))
          elem,
          ord AS first_ord
        FROM jsonb_array_elements(p_arr) WITH ORDINALITY AS t(elem, ord)
        ORDER BY COALESCE(elem->>'id', md5(elem::text)), ord DESC
      ) sub
    )
  END;
$$;

CREATE OR REPLACE FUNCTION app_security.trg_deduplicate_financial_payments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_security, pg_temp
AS $$
BEGIN
  IF NEW.payments IS NOT NULL AND jsonb_typeof(NEW.payments) = 'array' THEN
    NEW.payments := app_security.deduplicate_jsonb_by_id(NEW.payments);
  END IF;
  IF NEW.installments IS NOT NULL AND jsonb_typeof(NEW.installments) = 'array' THEN
    NEW.installments := app_security.deduplicate_jsonb_by_id(NEW.installments);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION app_security.deduplicate_jsonb_by_id(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_security.trg_deduplicate_financial_payments() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS ensure_unique_payments_manual_sales ON public.manual_sales;
CREATE TRIGGER ensure_unique_payments_manual_sales
  BEFORE INSERT OR UPDATE ON public.manual_sales
  FOR EACH ROW EXECUTE FUNCTION app_security.trg_deduplicate_financial_payments();

DROP TRIGGER IF EXISTS ensure_unique_payments_manual_expenses ON public.manual_expenses;
CREATE TRIGGER ensure_unique_payments_manual_expenses
  BEFORE INSERT OR UPDATE ON public.manual_expenses
  FOR EACH ROW EXECUTE FUNCTION app_security.trg_deduplicate_financial_payments();

DROP TRIGGER IF EXISTS ensure_unique_payments_merchandise_purchases ON public.merchandise_purchases;
CREATE TRIGGER ensure_unique_payments_merchandise_purchases
  BEFORE INSERT OR UPDATE ON public.merchandise_purchases
  FOR EACH ROW EXECUTE FUNCTION app_security.trg_deduplicate_financial_payments();

DROP TRIGGER IF EXISTS ensure_unique_payments_manual_commitments ON public.manual_commitments;
CREATE TRIGGER ensure_unique_payments_manual_commitments
  BEFORE INSERT OR UPDATE ON public.manual_commitments
  FOR EACH ROW EXECUTE FUNCTION app_security.trg_deduplicate_financial_payments();

-- 7. ÍNDICES DE PERFORMANCE FINANCEIRA
CREATE INDEX IF NOT EXISTS idx_manual_sales_date ON public.manual_sales(date DESC);
CREATE INDEX IF NOT EXISTS idx_manual_sales_payment_status ON public.manual_sales(payment_status);
CREATE INDEX IF NOT EXISTS idx_manual_sales_due_date ON public.manual_sales(due_date);

CREATE INDEX IF NOT EXISTS idx_manual_expenses_date ON public.manual_expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_manual_expenses_payment_status ON public.manual_expenses(payment_status);
CREATE INDEX IF NOT EXISTS idx_manual_expenses_due_date ON public.manual_expenses(due_date);

CREATE INDEX IF NOT EXISTS idx_merchandise_purchases_date ON public.merchandise_purchases(date DESC);
CREATE INDEX IF NOT EXISTS idx_merchandise_purchases_payment_status ON public.merchandise_purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_merchandise_purchases_due_date ON public.merchandise_purchases(due_date);

CREATE INDEX IF NOT EXISTS idx_cash_movements_date ON public.cash_movements(date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_movements_account_channel ON public.cash_movements(account_channel);

CREATE INDEX IF NOT EXISTS idx_manual_commitments_due_date ON public.manual_commitments(due_date ASC);
CREATE INDEX IF NOT EXISTS idx_manual_commitments_payment_status ON public.manual_commitments(payment_status);
CREATE INDEX IF NOT EXISTS idx_manual_commitments_type ON public.manual_commitments(commitment_type);

-- 8. HABILITAR RLS E REVOGAR ACESSOS INDEVIDOS EM TODAS AS 15 TABELAS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flavor_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchandise_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initial_cash_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_commitments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.brands, public.product_models, public.flavor_variants, public.banners, public.coupons FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.brands, public.product_models, public.flavor_variants, public.banners, public.coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.brands, public.product_models, public.flavor_variants, public.banners, public.coupons TO authenticated;

REVOKE ALL ON public.store_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, store_name, support_email, support_phone, whatsapp_number, legal_notice, updated_at) ON public.store_settings TO anon, authenticated;
GRANT SELECT (owner_uid) ON public.store_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.store_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_settings TO service_role;

REVOKE ALL ON public.audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated, service_role;

REVOKE ALL ON public.customer_profiles, public.customer_orders FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_profiles, public.customer_orders TO authenticated, service_role;

REVOKE ALL ON public.manual_sales, public.manual_expenses, public.merchandise_purchases, public.cash_movements, public.initial_cash_balances, public.manual_commitments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_sales, public.manual_expenses, public.merchandise_purchases, public.cash_movements, public.initial_cash_balances, public.manual_commitments TO authenticated, service_role;

-- 9. POLÍTICAS RLS DE CATÁLOGO, PERFIS, PEDIDOS, AUDITORIA E FINANCEIRO

-- 9.1 Brands
DROP POLICY IF EXISTS "Public Write Brands" ON public.brands;
DROP POLICY IF EXISTS "Public Read Brands" ON public.brands;
DROP POLICY IF EXISTS "Admin Insert Brands" ON public.brands;
DROP POLICY IF EXISTS "Admin Update Brands" ON public.brands;
DROP POLICY IF EXISTS "Admin Delete Brands" ON public.brands;

CREATE POLICY "Public Read Brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Admin Insert Brands" ON public.brands FOR INSERT TO authenticated WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Update Brands" ON public.brands FOR UPDATE TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Delete Brands" ON public.brands FOR DELETE TO authenticated USING (app_security.is_admin());

-- 9.2 Product Models
DROP POLICY IF EXISTS "Public Write Models" ON public.product_models;
DROP POLICY IF EXISTS "Public Read Models" ON public.product_models;
DROP POLICY IF EXISTS "Admin Insert Models" ON public.product_models;
DROP POLICY IF EXISTS "Admin Update Models" ON public.product_models;
DROP POLICY IF EXISTS "Admin Delete Models" ON public.product_models;

CREATE POLICY "Public Read Models" ON public.product_models FOR SELECT USING (true);
CREATE POLICY "Admin Insert Models" ON public.product_models FOR INSERT TO authenticated WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Update Models" ON public.product_models FOR UPDATE TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Delete Models" ON public.product_models FOR DELETE TO authenticated USING (app_security.is_admin());

-- 9.3 Flavor Variants
DROP POLICY IF EXISTS "Public Write Flavors" ON public.flavor_variants;
DROP POLICY IF EXISTS "Public Read Flavors" ON public.flavor_variants;
DROP POLICY IF EXISTS "Admin Insert Flavors" ON public.flavor_variants;
DROP POLICY IF EXISTS "Admin Update Flavors" ON public.flavor_variants;
DROP POLICY IF EXISTS "Admin Delete Flavors" ON public.flavor_variants;

CREATE POLICY "Public Read Flavors" ON public.flavor_variants FOR SELECT USING (true);
CREATE POLICY "Admin Insert Flavors" ON public.flavor_variants FOR INSERT TO authenticated WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Update Flavors" ON public.flavor_variants FOR UPDATE TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Delete Flavors" ON public.flavor_variants FOR DELETE TO authenticated USING (app_security.is_admin());

-- 9.4 Banners
DROP POLICY IF EXISTS "Public Write Banners" ON public.banners;
DROP POLICY IF EXISTS "Public Read Banners" ON public.banners;
DROP POLICY IF EXISTS "Admin Insert Banners" ON public.banners;
DROP POLICY IF EXISTS "Admin Update Banners" ON public.banners;
DROP POLICY IF EXISTS "Admin Delete Banners" ON public.banners;

CREATE POLICY "Public Read Banners" ON public.banners FOR SELECT USING (true);
CREATE POLICY "Admin Insert Banners" ON public.banners FOR INSERT TO authenticated WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Update Banners" ON public.banners FOR UPDATE TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Delete Banners" ON public.banners FOR DELETE TO authenticated USING (app_security.is_admin());

-- 9.5 Coupons
DROP POLICY IF EXISTS "Public Write Coupons" ON public.coupons;
DROP POLICY IF EXISTS "Public Read Coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admin Insert Coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admin Update Coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admin Delete Coupons" ON public.coupons;

CREATE POLICY "Public Read Coupons" ON public.coupons FOR SELECT USING (is_active = true OR app_security.is_admin());
CREATE POLICY "Admin Insert Coupons" ON public.coupons FOR INSERT TO authenticated WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Update Coupons" ON public.coupons FOR UPDATE TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Delete Coupons" ON public.coupons FOR DELETE TO authenticated USING (app_security.is_admin());

-- 9.6 Store Settings
DROP POLICY IF EXISTS "Public Write Settings" ON public.store_settings;
DROP POLICY IF EXISTS "Public Read Settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admin Insert Settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admin Update Settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admin Delete Settings" ON public.store_settings;

CREATE POLICY "Public Read Settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Admin Insert Settings" ON public.store_settings FOR INSERT TO authenticated WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Update Settings" ON public.store_settings FOR UPDATE TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Delete Settings" ON public.store_settings FOR DELETE TO authenticated USING (app_security.is_admin());

-- 9.7 Audit Logs
DROP POLICY IF EXISTS "Public Read Audit" ON public.audit_logs;
DROP POLICY IF EXISTS "Public Write Audit" ON public.audit_logs;
DROP POLICY IF EXISTS "Admin Read Audit" ON public.audit_logs;
DROP POLICY IF EXISTS "Admin Insert Audit" ON public.audit_logs;

CREATE POLICY "Admin Read Audit" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (app_security.is_admin());

CREATE POLICY "Admin Insert Audit" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (app_security.is_admin());

-- 9.8 Customer Profiles
DROP POLICY IF EXISTS "Public Read Customer Profiles" ON public.customer_profiles;
DROP POLICY IF EXISTS "Public Write Customer Profiles" ON public.customer_profiles;
DROP POLICY IF EXISTS "Public Update Customer Profiles" ON public.customer_profiles;
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.customer_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Users can update own profile or admins update all" ON public.customer_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.customer_profiles;

CREATE POLICY "Users can view own profile or admins view all" ON public.customer_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid()::text OR app_security.is_admin());

CREATE POLICY "Users can insert own profile" ON public.customer_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid()::text OR app_security.is_admin());

CREATE POLICY "Users can update own profile or admins update all" ON public.customer_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid()::text OR app_security.is_admin())
  WITH CHECK (id = auth.uid()::text OR app_security.is_admin());

CREATE POLICY "Admins can delete profiles" ON public.customer_profiles
  FOR DELETE TO authenticated
  USING (app_security.is_admin());

-- 9.9 Customer Orders
DROP POLICY IF EXISTS "Public Read Customer Orders" ON public.customer_orders;
DROP POLICY IF EXISTS "Public Write Customer Orders" ON public.customer_orders;
DROP POLICY IF EXISTS "Users can view own orders or admins view all" ON public.customer_orders;
DROP POLICY IF EXISTS "Users can insert own orders or admins insert" ON public.customer_orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.customer_orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.customer_orders;

CREATE POLICY "Users can view own orders or admins view all" ON public.customer_orders
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid()::text OR app_security.is_admin());

CREATE POLICY "Users can insert own orders or admins insert" ON public.customer_orders
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid()::text OR app_security.is_admin());

CREATE POLICY "Admins can update orders" ON public.customer_orders
  FOR UPDATE TO authenticated
  USING (app_security.is_admin())
  WITH CHECK (app_security.is_admin());

CREATE POLICY "Admins can delete orders" ON public.customer_orders
  FOR DELETE TO authenticated
  USING (app_security.is_admin());

-- 9.10 Tabelas Financeiras (Módulo Meu Negócio)
DROP POLICY IF EXISTS "Admin Full Access Manual Sales" ON public.manual_sales;
CREATE POLICY "Admin Full Access Manual Sales" ON public.manual_sales
  FOR ALL TO authenticated
  USING (app_security.is_admin())
  WITH CHECK (app_security.is_admin());

DROP POLICY IF EXISTS "Admin Full Access Manual Expenses" ON public.manual_expenses;
CREATE POLICY "Admin Full Access Manual Expenses" ON public.manual_expenses
  FOR ALL TO authenticated
  USING (app_security.is_admin())
  WITH CHECK (app_security.is_admin());

DROP POLICY IF EXISTS "Admin Full Access Merchandise Purchases" ON public.merchandise_purchases;
CREATE POLICY "Admin Full Access Merchandise Purchases" ON public.merchandise_purchases
  FOR ALL TO authenticated
  USING (app_security.is_admin())
  WITH CHECK (app_security.is_admin());

DROP POLICY IF EXISTS "Admin Full Access Cash Movements" ON public.cash_movements;
CREATE POLICY "Admin Full Access Cash Movements" ON public.cash_movements
  FOR ALL TO authenticated
  USING (app_security.is_admin())
  WITH CHECK (app_security.is_admin());

DROP POLICY IF EXISTS "Admin Full Access Initial Cash Balances" ON public.initial_cash_balances;
CREATE POLICY "Admin Full Access Initial Cash Balances" ON public.initial_cash_balances
  FOR ALL TO authenticated
  USING (app_security.is_admin())
  WITH CHECK (app_security.is_admin());

DROP POLICY IF EXISTS "Admin Full Access Manual Commitments" ON public.manual_commitments;
CREATE POLICY "Admin Full Access Manual Commitments" ON public.manual_commitments
  FOR ALL TO authenticated
  USING (app_security.is_admin())
  WITH CHECK (app_security.is_admin());

DROP FUNCTION IF EXISTS public.is_admin();
