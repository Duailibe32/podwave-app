-- ============================================================================
-- PODWAVE — MIGRATION 01: INITIAL SCHEMA & CORE CATALOG SECURITY
-- Arquivo: 20261025000000_initial_schema.sql
-- ============================================================================

-- 1. EXTENSÕES (OPCIONAIS — POSTGRESQL 13+ JÁ POSSUI gen_random_uuid() NATIVO)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2. SCHEMA PRIVADO DE SEGURANÇA (NÃO EXPOSTO NA API REST DO SUPABASE)
CREATE SCHEMA IF NOT EXISTS app_security;

REVOKE ALL ON SCHEMA app_security FROM PUBLIC;
GRANT USAGE ON SCHEMA app_security TO authenticated, service_role;

-- 3. TABELAS DE CATÁLOGO E OPERAÇÃO

-- 3.1 Brands (Marcas)
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

-- 3.2 Product Models (Modelos de Produtos)
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

-- 3.3 Flavor Variants (Sabores / Variantes)
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

-- 3.4 Banners
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

-- 3.5 Coupons (Cupons)
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

-- 3.6 Store Settings (Configurações da Loja)
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

-- 3.7 Audit Logs (Logs de Auditoria Imutáveis)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  details TEXT
);

-- 3.8 Customer Profiles (Perfis de Clientes e Controle de Acesso)
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

-- 3.9 Customer Orders (Pedidos de Clientes)
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

-- 4. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_product_models_brand_id ON public.product_models(brand_id);
CREATE INDEX IF NOT EXISTS idx_flavor_variants_model_id ON public.flavor_variants(model_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_customer_orders_customer_id ON public.customer_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_email ON public.customer_profiles(email);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_role ON public.customer_profiles(role);

-- 5. FUNÇÃO DE VERIFICAÇÃO ADMINISTRATIVA NO SCHEMA PRIVADO
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

REVOKE ALL ON FUNCTION app_security.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_security.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION app_security.is_admin() TO authenticated, service_role;

-- 6. TRIGGER DE IMUTABILIDADE DE AUDIT_LOGS
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

-- 7. TRIGGER DE PROTEÇÃO DE PAPEL E CAMPOS VIP (SEM USO DE current_user)
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

  -- 2. Operação manual explícita no Supabase SQL Editor (exige flag transacional local + sessão fora do PostgREST)
  IF v_priv_flag = 'on'
     AND v_sess_user NOT IN ('anon', 'authenticated', 'authenticator')
     AND v_jwt_role NOT IN ('anon', 'authenticated')
     AND auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- 3. Verifica se o usuário autenticado atual já possui role 'admin' ou 'owner' no banco
  v_caller_is_admin := app_security.is_admin();

  IF TG_OP = 'INSERT' THEN
    IF NOT v_caller_is_admin THEN
      -- Todo cadastro público ou de usuário comum recebe obrigatoriamente 'customer' e sem VIP
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

-- 8. HABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flavor_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

-- 9. PRIVILÉGIOS DE TABELAS E COLUNAS (GRANT / REVOKE)

-- Catálogo público: leitura pública, escrita apenas autenticada (filtrada por RLS admin)
REVOKE ALL ON public.brands, public.product_models, public.flavor_variants, public.banners, public.coupons FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.brands, public.product_models, public.flavor_variants, public.banners, public.coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.brands, public.product_models, public.flavor_variants, public.banners, public.coupons TO authenticated;

-- Store Settings: proteger owner_uid de leitura pública usando GRANT em nível de coluna
REVOKE ALL ON public.store_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, store_name, support_email, support_phone, whatsapp_number, legal_notice, updated_at) ON public.store_settings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_settings TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.store_settings TO authenticated;
GRANT SELECT (owner_uid) ON public.store_settings TO authenticated;

-- Audit Logs: sem acesso anon, sem UPDATE/DELETE para ninguém
REVOKE ALL ON public.audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO service_role;

-- Customer Profiles & Customer Orders: zero acesso anônimo
REVOKE ALL ON public.customer_profiles, public.customer_orders FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_profiles, public.customer_orders TO authenticated, service_role;

-- 10. POLÍTICAS RLS (COM DROP IF EXISTS PARA IDEMPOTÊNCIA)

-- 10.1 Brands
DROP POLICY IF EXISTS "Public Read Brands" ON public.brands;
DROP POLICY IF EXISTS "Public Write Brands" ON public.brands;
DROP POLICY IF EXISTS "Admin Insert Brands" ON public.brands;
DROP POLICY IF EXISTS "Admin Update Brands" ON public.brands;
DROP POLICY IF EXISTS "Admin Delete Brands" ON public.brands;

CREATE POLICY "Public Read Brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Admin Insert Brands" ON public.brands FOR INSERT TO authenticated WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Update Brands" ON public.brands FOR UPDATE TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Delete Brands" ON public.brands FOR DELETE TO authenticated USING (app_security.is_admin());

-- 10.2 Product Models
DROP POLICY IF EXISTS "Public Read Models" ON public.product_models;
DROP POLICY IF EXISTS "Public Write Models" ON public.product_models;
DROP POLICY IF EXISTS "Admin Insert Models" ON public.product_models;
DROP POLICY IF EXISTS "Admin Update Models" ON public.product_models;
DROP POLICY IF EXISTS "Admin Delete Models" ON public.product_models;

CREATE POLICY "Public Read Models" ON public.product_models FOR SELECT USING (true);
CREATE POLICY "Admin Insert Models" ON public.product_models FOR INSERT TO authenticated WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Update Models" ON public.product_models FOR UPDATE TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Delete Models" ON public.product_models FOR DELETE TO authenticated USING (app_security.is_admin());

-- 10.3 Flavor Variants
DROP POLICY IF EXISTS "Public Read Flavors" ON public.flavor_variants;
DROP POLICY IF EXISTS "Public Write Flavors" ON public.flavor_variants;
DROP POLICY IF EXISTS "Admin Insert Flavors" ON public.flavor_variants;
DROP POLICY IF EXISTS "Admin Update Flavors" ON public.flavor_variants;
DROP POLICY IF EXISTS "Admin Delete Flavors" ON public.flavor_variants;

CREATE POLICY "Public Read Flavors" ON public.flavor_variants FOR SELECT USING (true);
CREATE POLICY "Admin Insert Flavors" ON public.flavor_variants FOR INSERT TO authenticated WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Update Flavors" ON public.flavor_variants FOR UPDATE TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Delete Flavors" ON public.flavor_variants FOR DELETE TO authenticated USING (app_security.is_admin());

-- 10.4 Banners
DROP POLICY IF EXISTS "Public Read Banners" ON public.banners;
DROP POLICY IF EXISTS "Public Write Banners" ON public.banners;
DROP POLICY IF EXISTS "Admin Insert Banners" ON public.banners;
DROP POLICY IF EXISTS "Admin Update Banners" ON public.banners;
DROP POLICY IF EXISTS "Admin Delete Banners" ON public.banners;

CREATE POLICY "Public Read Banners" ON public.banners FOR SELECT USING (true);
CREATE POLICY "Admin Insert Banners" ON public.banners FOR INSERT TO authenticated WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Update Banners" ON public.banners FOR UPDATE TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Delete Banners" ON public.banners FOR DELETE TO authenticated USING (app_security.is_admin());

-- 10.5 Coupons (público lê apenas cupons ativos; admin lê e gerencia todos)
DROP POLICY IF EXISTS "Public Read Coupons" ON public.coupons;
DROP POLICY IF EXISTS "Public Write Coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admin Insert Coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admin Update Coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admin Delete Coupons" ON public.coupons;

CREATE POLICY "Public Read Coupons" ON public.coupons FOR SELECT USING (is_active = true OR app_security.is_admin());
CREATE POLICY "Admin Insert Coupons" ON public.coupons FOR INSERT TO authenticated WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Update Coupons" ON public.coupons FOR UPDATE TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Delete Coupons" ON public.coupons FOR DELETE TO authenticated USING (app_security.is_admin());

-- 10.6 Store Settings
DROP POLICY IF EXISTS "Public Read Settings" ON public.store_settings;
DROP POLICY IF EXISTS "Public Write Settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admin Insert Settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admin Update Settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admin Delete Settings" ON public.store_settings;

CREATE POLICY "Public Read Settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Admin Insert Settings" ON public.store_settings FOR INSERT TO authenticated WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Update Settings" ON public.store_settings FOR UPDATE TO authenticated USING (app_security.is_admin()) WITH CHECK (app_security.is_admin());
CREATE POLICY "Admin Delete Settings" ON public.store_settings FOR DELETE TO authenticated USING (app_security.is_admin());

-- 10.7 Audit Logs (Restrito exclusivamente a administradores, imutável)
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
