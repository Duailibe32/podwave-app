-- ============================================================================
-- PODWAVE — MIGRATION 04: MANUAL FINANCIAL & BUSINESS MANAGEMENT SCHEMA
-- Arquivo: 20261028000000_manual_management_schema.sql
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS app_security;

REVOKE ALL ON SCHEMA app_security FROM PUBLIC;
GRANT USAGE ON SCHEMA app_security TO authenticated, service_role;

-- 1. FUNÇÃO DE VERIFICAÇÃO ADMINISTRATIVA NO SCHEMA PRIVADO
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

-- 2. TABELAS DO MÓDULO "MEU NEGÓCIO"

-- 2.1 Minhas Vendas (manual_sales)
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_manual_sales_items_array CHECK (jsonb_typeof(items) = 'array'),
  CONSTRAINT chk_manual_sales_installments_array CHECK (installments IS NULL OR jsonb_typeof(installments) = 'array'),
  CONSTRAINT chk_manual_sales_payments_array CHECK (payments IS NULL OR jsonb_typeof(payments) = 'array')
);

ALTER TABLE public.manual_sales
  ADD COLUMN IF NOT EXISTS due_date TEXT,
  ADD COLUMN IF NOT EXISTS payment_date TEXT,
  ADD COLUMN IF NOT EXISTS account_channel TEXT DEFAULT 'dinheiro_caixa',
  ADD COLUMN IF NOT EXISTS installments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]'::jsonb;

-- 2.2 Meus Gastos (manual_expenses)
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_manual_expenses_installments_array CHECK (installments IS NULL OR jsonb_typeof(installments) = 'array'),
  CONSTRAINT chk_manual_expenses_payments_array CHECK (payments IS NULL OR jsonb_typeof(payments) = 'array')
);

ALTER TABLE public.manual_expenses
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_pending NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_date TEXT,
  ADD COLUMN IF NOT EXISTS payment_date TEXT,
  ADD COLUMN IF NOT EXISTS account_channel TEXT DEFAULT 'dinheiro_caixa',
  ADD COLUMN IF NOT EXISTS installments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]'::jsonb;

-- 2.3 Compras de Mercadorias (merchandise_purchases)
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_merchandise_purchases_items_array CHECK (jsonb_typeof(items) = 'array'),
  CONSTRAINT chk_merchandise_purchases_installments_array CHECK (installments IS NULL OR jsonb_typeof(installments) = 'array'),
  CONSTRAINT chk_merchandise_purchases_payments_array CHECK (payments IS NULL OR jsonb_typeof(payments) = 'array')
);

ALTER TABLE public.merchandise_purchases
  ADD COLUMN IF NOT EXISTS due_date TEXT,
  ADD COLUMN IF NOT EXISTS payment_date TEXT,
  ADD COLUMN IF NOT EXISTS account_channel TEXT DEFAULT 'pix_banco',
  ADD COLUMN IF NOT EXISTS installments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]'::jsonb;

-- 2.4 Movimentações Manuais do Fluxo de Caixa (cash_movements)
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

-- 2.5 Saldos Iniciais por Canal Financeiro (initial_cash_balances)
CREATE TABLE IF NOT EXISTS public.initial_cash_balances (
  id TEXT PRIMARY KEY,
  account_channel TEXT NOT NULL UNIQUE,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  reference_date TEXT NOT NULL DEFAULT '2026-01-01',
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.6 Compromissos e Contas Pendentes Avulsas (manual_commitments)
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_manual_commitments_installments_array CHECK (installments IS NULL OR jsonb_typeof(installments) = 'array'),
  CONSTRAINT chk_manual_commitments_payments_array CHECK (payments IS NULL OR jsonb_typeof(payments) = 'array')
);

-- 3. DEDUPLICAÇÃO DE PAGAMENTOS E PARCELAS EM JSONB (PREVENÇÃO DE DUPLICIDADE)
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

-- 4. ÍNDICES DE PERFORMANCE FINANCEIRA
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

-- 5. HABILITAR RLS E REVOGAR ACESSO PÚBLICO/ANÔNIMO
ALTER TABLE public.manual_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchandise_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initial_cash_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_commitments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.manual_sales FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.manual_expenses FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.merchandise_purchases FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.cash_movements FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.initial_cash_balances FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.manual_commitments FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_sales TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_expenses TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchandise_purchases TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_movements TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.initial_cash_balances TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_commitments TO authenticated, service_role;

-- 6. POLÍTICAS RLS (RESTRITAS EXCLUSIVAMENTE A ADMIN E OWNER)
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
