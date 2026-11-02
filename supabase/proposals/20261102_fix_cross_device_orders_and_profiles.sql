-- ============================================================================
-- PODWAVE — REPARO DE PEDIDOS ENTRE APARELHOS (CELULAR ↔ PC) E PERFIS
-- Arquivo: supabase/proposals/20261102_fix_cross_device_orders_and_profiles.sql
--
-- O QUE ESTE SCRIPT RESOLVE (100% IDEMPOTENTE E SEM APAGAR NENHUM REGISTRO):
-- 1. Corrige a função de trigger app_security.podwave_guard_profile_permissions()
--    removendo expressões inválidas (pg_catalog.coalesce / pg_catalog.nullif / current_user)
--    que impediam novas contas secundárias de criarem seu perfil em customer_profiles.
-- 2. Sincroniza automaticamente em public.customer_profiles qualquer conta já
--    criada em auth.users (como a sua conta secundária do celular) que tenha
--    ficado sem perfil devido ao bloqueio anterior da trigger.
-- 3. Garante que public.customer_orders possua todas as colunas esperadas pelo
--    catálogo (order_code, delivery_info, coupon_code, vip_discount_applied,
--    vip_discount_amount) e permissões GRANT + políticas RLS para que clientes
--    autenticados no celular consigam inserir pedidos e o Admin no PC visualize
--    todos em tempo real.
-- ============================================================================

BEGIN;

-- 1. Garantir colunas necessárias em public.customer_profiles e public.customer_orders
ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS vip_benefit_note TEXT,
  ADD COLUMN IF NOT EXISTS address_cep TEXT,
  ADD COLUMN IF NOT EXISTS address_street TEXT,
  ADD COLUMN IF NOT EXISTS address_number TEXT,
  ADD COLUMN IF NOT EXISTS address_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS address_complement TEXT,
  ADD COLUMN IF NOT EXISTS address_city TEXT,
  ADD COLUMN IF NOT EXISTS address_state TEXT;

ALTER TABLE public.customer_orders
  ADD COLUMN IF NOT EXISTS order_code TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_info JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS vip_discount_applied BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS vip_discount_amount NUMERIC(10, 2) DEFAULT 0;

-- 2. Reparar a trigger function app_security.podwave_guard_profile_permissions()
--    (caso exista no banco) sem usar pg_catalog.coalesce, pg_catalog.nullif ou current_user
DO $$
BEGIN
  IF to_regnamespace('app_security') IS NOT NULL
     AND to_regprocedure('app_security.is_podwave_finance_owner()') IS NOT NULL
     AND to_regprocedure('public.is_admin()') IS NOT NULL THEN

    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION app_security.podwave_guard_profile_permissions()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = pg_catalog, public, pg_temp
      AS $function$
      DECLARE
        v_uid text := COALESCE(auth.uid()::text, '');
        v_jwt_role text := COALESCE(
          NULLIF(pg_catalog.current_setting('request.jwt.claim.role', true), ''),
          (NULLIF(pg_catalog.current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
          ''
        );
        v_is_service boolean := (
          v_jwt_role = 'service_role'
          OR (
            auth.uid() IS NULL
            AND session_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin')
            AND v_jwt_role NOT IN ('anon', 'authenticated')
          )
        );
        v_is_owner boolean := app_security.is_podwave_finance_owner();
        v_is_admin boolean := (v_is_owner OR public.is_admin());
      BEGIN
        IF v_is_service THEN
          RETURN NEW;
        END IF;

        IF TG_OP = 'INSERT' THEN
          IF NOT v_is_owner THEN
            IF v_uid = '' OR NEW.id IS DISTINCT FROM v_uid THEN
              RAISE EXCEPTION 'Operacao negada: perfil deve pertencer ao usuario autenticado.'
                USING ERRCODE = '42501';
            END IF;
            IF COALESCE(NEW.role, 'customer') <> 'customer' THEN
              NEW.role := 'customer';
            END IF;
            NEW.vip_discount_custom := NULL;
            IF NOT v_is_admin THEN
              NEW.vip_benefit_note := NULL;
            END IF;
          END IF;
          RETURN NEW;
        END IF;

        IF TG_OP = 'UPDATE' THEN
          IF NEW.id IS DISTINCT FROM OLD.id THEN
            RAISE EXCEPTION 'Operacao negada: identificador do perfil e imutavel.'
              USING ERRCODE = '42501';
          END IF;

          IF NOT v_is_owner THEN
            IF v_uid = '' OR OLD.id IS DISTINCT FROM v_uid THEN
              IF NOT v_is_admin THEN
                RAISE EXCEPTION 'Operacao negada: voce so pode atualizar seu proprio perfil.'
                  USING ERRCODE = '42501';
              END IF;
            END IF;

            IF NEW.role IS DISTINCT FROM OLD.role THEN
              RAISE EXCEPTION 'Operacao negada: alteracao de cargo restrita ao proprietario.'
                USING ERRCODE = '42501';
            END IF;

            IF NEW.vip_discount_custom IS DISTINCT FROM OLD.vip_discount_custom THEN
              RAISE EXCEPTION 'Operacao negada: alteracao de desconto VIP restrita ao proprietario.'
                USING ERRCODE = '42501';
            END IF;

            IF NEW.vip_benefit_note IS DISTINCT FROM OLD.vip_benefit_note AND NOT v_is_admin THEN
              RAISE EXCEPTION 'Operacao negada: alteracao de fidelidade restrita a administracao.'
                USING ERRCODE = '42501';
            END IF;
          END IF;

          RETURN NEW;
        END IF;

        RETURN NEW;
      END;
      $function$;
    $sql$;
  END IF;
END $$;

-- 3. Backfill seguro: criar perfil em public.customer_profiles para qualquer conta
--    já existente em auth.users (ex.: sua conta secundária criada no celular)
DO $$
DECLARE
  v_has_name boolean;
  v_has_full_name boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customer_profiles' AND column_name = 'name'
  ) INTO v_has_name;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customer_profiles' AND column_name = 'full_name'
  ) INTO v_has_full_name;

  IF v_has_full_name AND v_has_name THEN
    INSERT INTO public.customer_profiles (id, email, full_name, name, phone, role, updated_at)
    SELECT
      au.id::text,
      COALESCE(au.email, au.id::text || '@podwave.local'),
      COALESCE(NULLIF(trim(au.raw_user_meta_data->>'full_name'), ''), NULLIF(trim(au.raw_user_meta_data->>'name'), ''), split_part(COALESCE(au.email, 'Cliente'), '@', 1)),
      COALESCE(NULLIF(trim(au.raw_user_meta_data->>'full_name'), ''), NULLIF(trim(au.raw_user_meta_data->>'name'), ''), split_part(COALESCE(au.email, 'Cliente'), '@', 1)),
      COALESCE(NULLIF(trim(au.raw_user_meta_data->>'phone'), ''), ''),
      'customer',
      NOW()
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.customer_profiles cp WHERE cp.id = au.id::text
    )
    ON CONFLICT (id) DO NOTHING;
  ELSIF v_has_full_name THEN
    INSERT INTO public.customer_profiles (id, email, full_name, phone, role, updated_at)
    SELECT
      au.id::text,
      COALESCE(au.email, au.id::text || '@podwave.local'),
      COALESCE(NULLIF(trim(au.raw_user_meta_data->>'full_name'), ''), NULLIF(trim(au.raw_user_meta_data->>'name'), ''), split_part(COALESCE(au.email, 'Cliente'), '@', 1)),
      COALESCE(NULLIF(trim(au.raw_user_meta_data->>'phone'), ''), ''),
      'customer',
      NOW()
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.customer_profiles cp WHERE cp.id = au.id::text
    )
    ON CONFLICT (id) DO NOTHING;
  ELSIF v_has_name THEN
    INSERT INTO public.customer_profiles (id, email, name, phone, role, updated_at)
    SELECT
      au.id::text,
      COALESCE(au.email, au.id::text || '@podwave.local'),
      COALESCE(NULLIF(trim(au.raw_user_meta_data->>'full_name'), ''), NULLIF(trim(au.raw_user_meta_data->>'name'), ''), split_part(COALESCE(au.email, 'Cliente'), '@', 1)),
      COALESCE(NULLIF(trim(au.raw_user_meta_data->>'phone'), ''), ''),
      'customer',
      NOW()
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.customer_profiles cp WHERE cp.id = au.id::text
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 4. Garantir GRANTs e Políticas RLS em public.customer_profiles e public.customer_orders
--    para que qualquer conta autenticada (no celular ou PC) consiga criar e ler seus próprios pedidos
--    e o Admin/Owner veja e gerencie todos os pedidos em tempo real.
GRANT SELECT, INSERT, UPDATE ON TABLE public.customer_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customer_orders TO authenticated;

-- Remover eventual política restritiva que bloqueava INSERT de clientes não-admin
DROP POLICY IF EXISTS "Block unvalidated customer inserts" ON public.customer_orders;
DROP POLICY IF EXISTS "Users can view own orders or admins view all" ON public.customer_orders;
DROP POLICY IF EXISTS "Users can insert own orders or admins insert" ON public.customer_orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.customer_orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.customer_orders;

CREATE POLICY "Users can view own orders or admins view all"
  ON public.customer_orders
  FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid()::text
    OR (to_regprocedure('public.is_admin()') IS NOT NULL AND public.is_admin())
    OR (to_regprocedure('app_security.is_admin()') IS NOT NULL AND app_security.is_admin())
  );

CREATE POLICY "Users can insert own orders or admins insert"
  ON public.customer_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = auth.uid()::text
    OR (to_regprocedure('public.is_admin()') IS NOT NULL AND public.is_admin())
    OR (to_regprocedure('app_security.is_admin()') IS NOT NULL AND app_security.is_admin())
  );

CREATE POLICY "Admins can update orders"
  ON public.customer_orders
  FOR UPDATE
  TO authenticated
  USING (
    (to_regprocedure('public.is_admin()') IS NOT NULL AND public.is_admin())
    OR (to_regprocedure('app_security.is_admin()') IS NOT NULL AND app_security.is_admin())
  )
  WITH CHECK (
    (to_regprocedure('public.is_admin()') IS NOT NULL AND public.is_admin())
    OR (to_regprocedure('app_security.is_admin()') IS NOT NULL AND app_security.is_admin())
  );

CREATE POLICY "Admins can delete orders"
  ON public.customer_orders
  FOR DELETE
  TO authenticated
  USING (
    (to_regprocedure('public.is_admin()') IS NOT NULL AND public.is_admin())
    OR (to_regprocedure('app_security.is_admin()') IS NOT NULL AND app_security.is_admin())
  );

-- 5. Garantir publicação Realtime ativa para customer_orders
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'customer_orders'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_orders;
    END IF;
  END IF;
END $$;

-- Recarregar schema cache do PostgREST imediatamente
NOTIFY pgrst, 'reload schema';

COMMIT;
