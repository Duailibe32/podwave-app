-- ============================================================================
-- PODWAVE — DELIVERABLE D: AUDITORIA SOMENTE-LEITURA DO BANCO REMOTO
-- Arquivo: supabase/readonly_remote_state_audit.sql
--
-- SEGURANÇA: Script 100% SOMENTE-LEITURA (apenas SELECT).
-- Execute este script no Supabase SQL Editor ANTES de rodar qualquer migration
-- para inspecionar o estado real do banco remoto e verificar a conta existente
-- do proprietário (duailibe32@gmail.com).
-- ============================================================================

-- 1. VERIFICAR HISTÓRICO DE MIGRATIONS APLICADAS NO SUPABASE REMOTO
SELECT
  version,
  name,
  statements
FROM supabase_migrations.schema_migrations
ORDER BY version ASC;

-- 2. VERIFICAR QUAIS TABELAS EXISTEM E SE RLS ESTÁ HABILITADA
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'brands', 'product_models', 'flavor_variants', 'banners', 'coupons',
    'store_settings', 'audit_logs', 'customer_profiles', 'customer_orders',
    'manual_sales', 'manual_expenses', 'merchandise_purchases',
    'cash_movements', 'initial_cash_balances', 'manual_commitments'
  )
ORDER BY tablename;

-- 3. VERIFICAR ESTRUTURA DE COLUNAS E TIPOS DE DADOS DAS TABELAS EXISTENTES
SELECT
  table_name,
  column_name,
  data_type,
  numeric_precision,
  numeric_scale,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'brands', 'product_models', 'flavor_variants', 'banners', 'coupons',
    'store_settings', 'audit_logs', 'customer_profiles', 'customer_orders',
    'manual_sales', 'manual_expenses', 'merchandise_purchases',
    'cash_movements', 'initial_cash_balances', 'manual_commitments'
  )
ORDER BY table_name, ordinal_position;

-- 4. VERIFICAR POLÍTICAS RLS ATIVAS E IDENTIFICAR POLÍTICAS PERMISSIVAS ANTIGAS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. VERIFICAR FUNÇÕES DE SEGURANÇA E SE ALGUMA TRIGGER AINDA USA current_user
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  p.prosecdef AS is_security_definer,
  p.proconfig AS search_path_config,
  (pg_get_functiondef(p.oid) ILIKE '%current_user%') AS contains_vulnerable_current_user
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname IN ('public', 'app_security')
  AND p.proname IN (
    'is_admin', 'is_vip', 'get_user_role',
    'trg_protect_customer_role', 'protect_customer_role_and_vip',
    'trg_immutable_audit_logs', 'trg_deduplicate_financial_payments'
  )
ORDER BY schema_name, function_name;

-- 6. VERIFICAR PERMISSÕES (GRANTS) PARA anon E authenticated
SELECT
  table_schema,
  table_name,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'PUBLIC')
ORDER BY table_name, grantee, privilege_type;

-- 7. VERIFICAR A CONTA EXISTENTE DO PROPRIETÁRIO (duailibe32@gmail.com)
-- Confere se a conta existe em auth.users, se possui perfil correspondente em
-- public.customer_profiles vinculado por id = auth.users.id::text, e qual é o role atual.
SELECT
  au.id::text AS auth_user_id,
  au.email AS auth_email,
  au.created_at AS auth_created_at,
  au.last_sign_in_at,
  cp.id AS profile_id,
  cp.name AS profile_name,
  cp.email AS profile_email,
  cp.phone AS profile_phone,
  cp.role AS current_profile_role,
  cp.is_vip,
  CASE
    WHEN cp.id IS NULL THEN 'PERFIL_AUSENTE_EM_CUSTOMER_PROFILES'
    WHEN cp.id <> au.id::text THEN 'ALERTA_ID_DIVERGENTE'
    WHEN cp.role = 'owner' THEN 'OK_JA_CONFIGURADO_COMO_OWNER'
    ELSE 'PRECISA_PROMOVER_PARA_OWNER (role atual: ' || COALESCE(cp.role, 'NULL') || ')'
  END AS diagnostico_conta_proprietario
FROM auth.users au
LEFT JOIN public.customer_profiles cp
  ON cp.id = au.id::text
WHERE lower(trim(au.email)) = 'duailibe32@gmail.com';
