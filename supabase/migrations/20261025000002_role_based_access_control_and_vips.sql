-- ==============================================================================
-- PODWAVE CATALOG - SUPABASE MIGRATION: RLS ROLE-BASED ACCESS CONTROL & VIPS
-- Migration: 20261025000002_role_based_access_control_and_vips.sql
-- Description:
--   1. Atualiza constraint de roles em public.customer_profiles para suportar
--      'admin', 'owner', 'vip' e 'customer'.
--   2. Adiciona funções de verificação de permissão no PostgreSQL (is_admin, is_vip, get_user_role).
--   3. Aplica políticas RLS rigorosas:
--      - Apenas admins/owners podem modificar catálogo (product_models, brands, flavor_variants, banners, coupons, store_settings).
--      - Leitura pública do catálogo mantida para exibição aos clientes.
--      - Visualização de todos os perfis e edição de roles restrita a admins.
--      - Clientes e VIPs podem consultar e editar apenas seus próprios dados.
-- ==============================================================================

-- 1. ATUALIZAR CONSTRAINT DE ROLE NA TABELA customer_profiles
ALTER TABLE public.customer_profiles 
    DROP CONSTRAINT IF EXISTS customer_profiles_role_check;

ALTER TABLE public.customer_profiles 
    ADD CONSTRAINT customer_profiles_role_check 
    CHECK (role IN ('customer', 'vip', 'admin', 'owner'));

-- Adicionar coluna de desconto VIP personalizado se não existir
ALTER TABLE public.customer_profiles
    ADD COLUMN IF NOT EXISTS vip_discount_custom NUMERIC(5, 2) DEFAULT NULL;

-- Adicionar configuração de desconto VIP padrão na tabela store_settings se não existir
ALTER TABLE public.store_settings
    ADD COLUMN IF NOT EXISTS vip_discount_percent NUMERIC(5, 2) DEFAULT 10.00;

-- 2. FUNÇÃO SECURITY DEFINER: is_admin()
-- Verifica com segurança se o usuário autenticado atual (auth.uid()) possui role 'admin' ou 'owner'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Se não houver sessão autenticada, não é admin
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 
    FROM public.customer_profiles
    WHERE id = auth.uid()::text
      AND role IN ('admin', 'owner')
  );
END;
$$;

-- 3. FUNÇÃO SECURITY DEFINER: is_vip()
-- Verifica se o usuário autenticado atual é um cliente VIP
CREATE OR REPLACE FUNCTION public.is_vip()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 
    FROM public.customer_profiles
    WHERE id = auth.uid()::text
      AND role = 'vip'
  );
END;
$$;

-- 4. FUNÇÃO SECURITY DEFINER: get_user_role()
-- Retorna o cargo (role) do usuário conectado
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  current_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 'anon';
  END IF;

  SELECT role INTO current_role
  FROM public.customer_profiles
  WHERE id = auth.uid()::text;

  RETURN COALESCE(current_role, 'customer');
END;
$$;

-- Permissões de execução para os papéis do Supabase
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_vip() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO anon, authenticated, service_role;

-- 5. ATUALIZAÇÃO DAS POLÍTICAS DE RLS PARA O CATÁLOGO (APENAS ADMIN PODE MODIFICAR)

-- PRODUCT_MODELS
ALTER TABLE public.product_models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Models" ON public.product_models;
DROP POLICY IF EXISTS "Admin Write Models" ON public.product_models;
DROP POLICY IF EXISTS "Admin Mutate Models" ON public.product_models;
DROP POLICY IF EXISTS "Public Read Product Models" ON public.product_models;
DROP POLICY IF EXISTS "Admin Insert Product Models" ON public.product_models;
DROP POLICY IF EXISTS "Admin Update Product Models" ON public.product_models;
DROP POLICY IF EXISTS "Admin Delete Product Models" ON public.product_models;

CREATE POLICY "Public Read Product Models" 
  ON public.product_models FOR SELECT 
  USING (true);

CREATE POLICY "Admin Insert Product Models" 
  ON public.product_models FOR INSERT 
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin Update Product Models" 
  ON public.product_models FOR UPDATE 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin Delete Product Models" 
  ON public.product_models FOR DELETE 
  USING (public.is_admin());

-- BRANDS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Brands" ON public.brands;
DROP POLICY IF EXISTS "Admin Write Brands" ON public.brands;
DROP POLICY IF EXISTS "Admin Insert Brands" ON public.brands;
DROP POLICY IF EXISTS "Admin Update Brands" ON public.brands;
DROP POLICY IF EXISTS "Admin Delete Brands" ON public.brands;

CREATE POLICY "Public Read Brands" 
  ON public.brands FOR SELECT 
  USING (true);

CREATE POLICY "Admin Insert Brands" 
  ON public.brands FOR INSERT 
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin Update Brands" 
  ON public.brands FOR UPDATE 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin Delete Brands" 
  ON public.brands FOR DELETE 
  USING (public.is_admin());

-- FLAVOR_VARIANTS
ALTER TABLE public.flavor_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Flavors" ON public.flavor_variants;
DROP POLICY IF EXISTS "Admin Write Flavors" ON public.flavor_variants;
DROP POLICY IF EXISTS "Admin Insert Flavors" ON public.flavor_variants;
DROP POLICY IF EXISTS "Admin Update Flavors" ON public.flavor_variants;
DROP POLICY IF EXISTS "Admin Delete Flavors" ON public.flavor_variants;

CREATE POLICY "Public Read Flavors" 
  ON public.flavor_variants FOR SELECT 
  USING (true);

CREATE POLICY "Admin Insert Flavors" 
  ON public.flavor_variants FOR INSERT 
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin Update Flavors" 
  ON public.flavor_variants FOR UPDATE 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin Delete Flavors" 
  ON public.flavor_variants FOR DELETE 
  USING (public.is_admin());

-- BANNERS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Banners" ON public.banners;
DROP POLICY IF EXISTS "Admin Write Banners" ON public.banners;
DROP POLICY IF EXISTS "Admin Insert Banners" ON public.banners;
DROP POLICY IF EXISTS "Admin Update Banners" ON public.banners;
DROP POLICY IF EXISTS "Admin Delete Banners" ON public.banners;

CREATE POLICY "Public Read Banners" 
  ON public.banners FOR SELECT 
  USING (true);

CREATE POLICY "Admin Insert Banners" 
  ON public.banners FOR INSERT 
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin Update Banners" 
  ON public.banners FOR UPDATE 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin Delete Banners" 
  ON public.banners FOR DELETE 
  USING (public.is_admin());

-- COUPONS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admin Write Coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admin Insert Coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admin Update Coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admin Delete Coupons" ON public.coupons;

CREATE POLICY "Public Read Coupons" 
  ON public.coupons FOR SELECT 
  USING (true);

CREATE POLICY "Admin Insert Coupons" 
  ON public.coupons FOR INSERT 
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin Update Coupons" 
  ON public.coupons FOR UPDATE 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin Delete Coupons" 
  ON public.coupons FOR DELETE 
  USING (public.is_admin());

-- STORE_SETTINGS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admin Write Settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admin Insert Settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admin Update Settings" ON public.store_settings;

CREATE POLICY "Public Read Settings" 
  ON public.store_settings FOR SELECT 
  USING (true);

CREATE POLICY "Admin Insert Settings" 
  ON public.store_settings FOR INSERT 
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin Update Settings" 
  ON public.store_settings FOR UPDATE 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- AUDIT_LOGS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Read Audit" ON public.audit_logs;
DROP POLICY IF EXISTS "Admin Write Audit" ON public.audit_logs;
DROP POLICY IF EXISTS "Admin Insert Audit" ON public.audit_logs;

CREATE POLICY "Admin Read Audit" 
  ON public.audit_logs FOR SELECT 
  USING (public.is_admin());

CREATE POLICY "Admin Insert Audit" 
  ON public.audit_logs FOR INSERT 
  WITH CHECK (true);

-- 6. POLÍTICAS DE RLS PARA CUSTOMER_PROFILES
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Customer Profiles" ON public.customer_profiles;
DROP POLICY IF EXISTS "Public Write Customer Profiles" ON public.customer_profiles;
DROP POLICY IF EXISTS "Users can read own or admin read all" ON public.customer_profiles;
DROP POLICY IF EXISTS "Users can insert own or admin insert" ON public.customer_profiles;
DROP POLICY IF EXISTS "Users can update own or admin update all" ON public.customer_profiles;
DROP POLICY IF EXISTS "Admin delete customer profiles" ON public.customer_profiles;

-- Usuários podem ler seu próprio perfil; Administradores podem ler todos os perfis
CREATE POLICY "Users can read own or admin read all" 
  ON public.customer_profiles FOR SELECT 
  USING (
    id = auth.uid()::text 
    OR public.is_admin()
  );

-- Inserção: usuário ao cadastrar-se ou administrador
CREATE POLICY "Users can insert own or admin insert" 
  ON public.customer_profiles FOR INSERT 
  WITH CHECK (
    id = auth.uid()::text 
    OR public.is_admin()
  );

-- Atualização: usuário pode atualizar seus dados pessoais ou administrador pode atualizar qualquer campo (inclusive cargos)
CREATE POLICY "Users can update own or admin update all" 
  ON public.customer_profiles FOR UPDATE 
  USING (
    id = auth.uid()::text 
    OR public.is_admin()
  )
  WITH CHECK (
    id = auth.uid()::text 
    OR public.is_admin()
  );

-- Exclusão: apenas administradores
CREATE POLICY "Admin delete customer profiles" 
  ON public.customer_profiles FOR DELETE 
  USING (public.is_admin());

-- 7. GARANTIR QUE OS E-MAILS DE PROPRIETÁRIO TENHAM O CARGO 'owner'
UPDATE public.customer_profiles
SET role = 'owner'
WHERE email IN ('duailibe32@gmail.com', 'proprietario@podwave.com', 'admin@podwave.com');
