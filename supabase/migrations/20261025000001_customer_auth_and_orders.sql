-- ============================================================================
-- PODWAVE — MIGRATION 02: CUSTOMER AUTHENTICATION & ORDERS
-- Arquivo: 20261025000001_customer_auth_and_orders.sql
-- Idempotente: compatível com execução sequencial após 20261025000000
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS app_security;
REVOKE ALL ON SCHEMA app_security FROM PUBLIC;
GRANT USAGE ON SCHEMA app_security TO authenticated, service_role;

-- 1. GARANTIA DAS TABELAS DE PERFIS E PEDIDOS
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

-- 2. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_customer_orders_customer_id ON public.customer_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_email ON public.customer_profiles(email);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_role ON public.customer_profiles(role);

-- 3. FUNÇÃO DE VERIFICAÇÃO ADMINISTRATIVA
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

-- 4. HABILITAÇÃO DE RLS E PRIVILÉGIOS ESTRITOS
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.customer_profiles, public.customer_orders FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_profiles, public.customer_orders TO authenticated, service_role;

-- 5. REMOÇÃO DE QUALQUER POLÍTICA PÚBLICA LEGADA E CRIAÇÃO DE POLÍTICAS SEGURAS
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
