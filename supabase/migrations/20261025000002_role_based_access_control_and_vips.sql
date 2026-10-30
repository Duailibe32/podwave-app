-- ============================================================================
-- PODWAVE — MIGRATION 03: ROLE-BASED ACCESS CONTROL (RBAC) & VIP SYSTEM
-- Arquivo: 20261025000002_role_based_access_control_and_vips.sql
-- ============================================================================

-- 1. SCHEMA PRIVADO DE SEGURANÇA
CREATE SCHEMA IF NOT EXISTS app_security;

REVOKE ALL ON SCHEMA app_security FROM PUBLIC;
GRANT USAGE ON SCHEMA app_security TO authenticated, service_role;

-- 2. COLUNAS DE CONTROLE DE ACESSO E VIP EM customer_profiles
ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vip_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vip_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vip_plan TEXT,
  ADD COLUMN IF NOT EXISTS vip_status TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS vip_discount_custom NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS vip_benefit_note TEXT,
  ADD COLUMN IF NOT EXISTS vip_Granted_by TEXT,
  ADD COLUMN IF NOT EXISTS vip_Updated_at TIMESTAMPTZ;

-- Garantir CHECK constraints em customer_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_customer_profiles_role_valid' AND conrelid = 'public.customer_profiles'::regclass
  ) THEN
    ALTER TABLE public.customer_profiles
      ADD CONSTRAINT chk_customer_profiles_role_valid CHECK (role IN ('customer', 'admin', 'owner'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_customer_profiles_vip_discount_range' AND conrelid = 'public.customer_profiles'::regclass
  ) THEN
    ALTER TABLE public.customer_profiles
      ADD CONSTRAINT chk_customer_profiles_vip_discount_range CHECK (
        vip_discount_custom IS NULL OR (vip_discount_custom >= 0 AND vip_discount_custom <= 100)
      );
  END IF;
END $$;

-- 3. COLUNAS DE DESCONTO VIP EM customer_orders
ALTER TABLE public.customer_orders
  ADD COLUMN IF NOT EXISTS vip_discount_applied BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS vip_discount_amount NUMERIC(10, 2) DEFAULT 0;

-- 4. COLUNA owner_uid EM store_settings
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS owner_uid TEXT;

-- 5. REMOÇÃO DE FUNÇÕES SECURITY DEFINER DESNECESSÁRIAS DO SCHEMA PUBLIC
DROP FUNCTION IF EXISTS public.is_vip() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.protect_customer_role_and_vip() CASCADE;

-- 6. FUNÇÕES SEGURAS NO SCHEMA PRIVADO app_security
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

-- 7. TRIGGER DE PROTEÇÃO DE PAPEL E VIP (SEM USO DE current_user)
-- NUNCA utiliza current_user (pois em SECURITY DEFINER current_user retorna o owner da função!).
-- Autoriza alterações de role/VIP SOMENTE quando:
--   (a) O usuário autenticado na aplicação já é admin/owner (app_security.is_admin() = true), OU
--   (b) A requisição usa a chave secreta service_role, OU
--   (c) Operação administrativa manual no Supabase SQL Editor com flag local explícita:
--       SET LOCAL app_security.allow_privileged_role_change = 'on';
--       combinada com session_user fora do PostgREST ('anon', 'authenticated', 'authenticator') e auth.uid() IS NULL.
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

  -- 1. Operação via service_role
  IF v_jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 2. Operação manual autorizada no Supabase SQL Editor (exige flag transacional local + sessão privilegiada real)
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
      -- Todo cadastro público recebe obrigatoriamente 'customer', mesmo se não houver nenhum admin no banco
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

-- 8. TRIGGER DE IMUTABILIDADE DE AUDIT_LOGS
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

-- 9. HABILITAR RLS E CONFIGURAR GRANT / REVOKE ESTRITOS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flavor_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.brands, public.product_models, public.flavor_variants, public.banners, public.coupons FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.brands, public.product_models, public.flavor_variants, public.banners, public.coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.brands, public.product_models, public.flavor_variants, public.banners, public.coupons TO authenticated;

-- Proteger owner_uid de store_settings contra leitura anônima
REVOKE ALL ON public.store_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, store_name, support_email, support_phone, whatsapp_number, legal_notice, updated_at) ON public.store_settings TO anon, authenticated;
GRANT SELECT (owner_uid) ON public.store_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.store_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_settings TO service_role;

-- Audit Logs: apenas SELECT e INSERT para authenticated (filtrados por RLS admin), sem UPDATE ou DELETE
REVOKE ALL ON public.audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated, service_role;

-- Customer Profiles & Orders: apenas authenticated (filtrados por RLS próprio usuário ou admin)
REVOKE ALL ON public.customer_profiles, public.customer_orders FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_profiles, public.customer_orders TO authenticated, service_role;

-- 10. REMOÇÃO DE TODAS AS POLÍTICAS PERMISSIVAS LEGADAS E RECRIAÇÃO SEGURA

-- 10.1 Brands
DROP POLICY IF EXISTS "Public Write Brands" ON public.brands;
DROP POLICY IF EXISTS "Public Read Brands" ON public.brands;
DROP POLICY IF EXISTS "Admin Insert Brands" ON public.brands;
DROP POLICY IF EXISTS "Admin Update Brands" ON public.brands;
DROP POLICY IF EXISTS "Admin Delete Brands" ON public.brands;

CREATE POLICY "Public Read Brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Admin Insert Brands" ON public.brands FOR INSERT TO authenticated WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Update Brands" ON public.brands FOR UPDATE TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Delete Brands" ON public.brands FOR DELETE TO authenticated USING (app_security.is_admin());

-- 10.2 Product Models
DROP POLICY IF EXISTS "Public Write Models" ON public.product_models;
DROP POLICY IF EXISTS "Public Read Models" ON public.product_models;
DROP POLICY IF EXISTS "Admin Insert Models" ON public.product_models;
DROP POLICY IF EXISTS "Admin Update Models" ON public.product_models;
DROP POLICY IF EXISTS "Admin Delete Models" ON public.product_models;

CREATE POLICY "Public Read Models" ON public.product_models FOR SELECT USING (true);
CREATE POLICY "Admin Insert Models" ON public.product_models FOR INSERT TO authenticated WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Update Models" ON public.product_models FOR UPDATE TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Delete Models" ON public.product_models FOR DELETE TO authenticated USING (app_security.is_admin());

-- 10.3 Flavor Variants
DROP POLICY IF EXISTS "Public Write Flavors" ON public.flavor_variants;
DROP POLICY IF EXISTS "Public Read Flavors" ON public.flavor_variants;
DROP POLICY IF EXISTS "Admin Insert Flavors" ON public.flavor_variants;
DROP POLICY IF EXISTS "Admin Update Flavors" ON public.flavor_variants;
DROP POLICY IF EXISTS "Admin Delete Flavors" ON public.flavor_variants;

CREATE POLICY "Public Read Flavors" ON public.flavor_variants FOR SELECT USING (true);
CREATE POLICY "Admin Insert Flavors" ON public.flavor_variants FOR INSERT TO authenticated WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Update Flavors" ON public.flavor_variants FOR UPDATE TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Delete Flavors" ON public.flavor_variants FOR DELETE TO authenticated USING (app_security.is_admin());

-- 10.4 Banners
DROP POLICY IF EXISTS "Public Write Banners" ON public.banners;
DROP POLICY IF EXISTS "Public Read Banners" ON public.banners;
DROP POLICY IF EXISTS "Admin Insert Banners" ON public.banners;
DROP POLICY IF EXISTS "Admin Update Banners" ON public.banners;
DROP POLICY IF EXISTS "Admin Delete Banners" ON public.banners;

CREATE POLICY "Public Read Banners" ON public.banners FOR SELECT USING (true);
CREATE POLICY "Admin Insert Banners" ON public.banners FOR INSERT TO authenticated WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Update Banners" ON public.banners FOR UPDATE TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Delete Banners" ON public.banners FOR DELETE TO authenticated USING (app_security.is_admin());

-- 10.5 Coupons
DROP POLICY IF EXISTS "Public Write Coupons" ON public.coupons;
DROP POLICY IF EXISTS "Public Read Coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admin Insert Coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admin Update Coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admin Delete Coupons" ON public.coupons;

CREATE POLICY "Public Read Coupons" ON public.coupons FOR SELECT USING (is_active = true OR app_security.is_admin());
CREATE POLICY "Admin Insert Coupons" ON public.coupons FOR INSERT TO authenticated WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Update Coupons" ON public.coupons FOR UPDATE TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Delete Coupons" ON public.coupons FOR DELETE TO authenticated USING (app_security.is_admin());

-- 10.6 Store Settings
DROP POLICY IF EXISTS "Public Write Settings" ON public.store_settings;
DROP POLICY IF EXISTS "Public Read Settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admin Insert Settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admin Update Settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admin Delete Settings" ON public.store_settings;

CREATE POLICY "Public Read Settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Admin Insert Settings" ON public.store_settings FOR INSERT TO authenticated WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Update Settings" ON public.store_settings FOR UPDATE TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Delete Settings" ON public.store_settings FOR DELETE TO authenticated USING (app_security.is_admin());

-- 10.7 Audit Logs (Remove "Public Read Audit" e corrige "Admin Insert Audit" para exigir app_security.is_admin())
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

-- 10.8 Customer Profiles
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

-- 10.9 Customer Orders
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

-- Remove wrapper público legado caso exista
DROP FUNCTION IF EXISTS public.is_admin();
