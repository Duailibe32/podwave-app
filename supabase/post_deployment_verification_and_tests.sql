-- ============================================================================
-- PODWAVE — DELIVERABLE E: VERIFICAÇÃO PÓS-IMPLANTAÇÃO, PROMOÇÃO DO OWNER E TESTES
-- Arquivo: supabase/post_deployment_verification_and_tests.sql
-- ============================================================================

-- ============================================================================
-- PARTE 1: CONSULTAS DE VERIFICAÇÃO PÓS-IMPLANTAÇÃO (SOMENTE-LEITURA)
-- ============================================================================

-- 1.1 Confirmar que todas as 15 tabelas existem e possuem RLS ATIVO (rowsecurity = true)
SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'brands', 'product_models', 'flavor_variants', 'banners', 'coupons',
    'store_settings', 'audit_logs', 'customer_profiles', 'customer_orders',
    'manual_sales', 'manual_expenses', 'merchandise_purchases',
    'cash_movements', 'initial_cash_balances', 'manual_commitments'
  )
ORDER BY tablename;

-- 1.2 Confirmar que NÃO existe nenhuma política de escrita com USING(true) ou WITH CHECK(true)
-- (Deve retornar 0 linhas)
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (cmd <> 'SELECT' AND (qual = 'true' OR with_check = 'true'))
    OR (tablename IN ('audit_logs', 'customer_profiles', 'customer_orders', 'manual_sales', 'manual_expenses', 'merchandise_purchases', 'cash_movements', 'initial_cash_balances', 'manual_commitments') AND qual = 'true')
  );

-- 1.3 Confirmar que app_security.trg_protect_customer_role() NÃO utiliza current_user
-- (contains_current_user DEVE SER false)
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  p.prosecdef AS is_security_definer,
  (pg_get_functiondef(p.oid) ILIKE '%current_user%') AS contains_current_user
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'app_security'
  AND p.proname = 'trg_protect_customer_role';

-- ============================================================================
-- PARTE 2: VERIFICAÇÃO E PROMOÇÃO MANUAL SEGURA DA CONTA DO PROPRIETÁRIO
-- Conta existente: duailibe32@gmail.com
-- ============================================================================

-- 2.1 Consulta de diagnóstico da conta duailibe32@gmail.com:
SELECT
  au.id::text AS auth_user_id,
  au.email AS auth_email,
  cp.id AS profile_id,
  cp.name AS profile_name,
  cp.role AS current_role,
  cp.updated_at
FROM auth.users au
LEFT JOIN public.customer_profiles cp ON cp.id = au.id::text
WHERE lower(trim(au.email)) = 'duailibe32@gmail.com';

-- 2.2 Comando seguro para promover exclusivamente a conta existente (duailibe32@gmail.com)
-- para role = 'owner', vinculada ao id real de auth.users, preservando todos os dados:
BEGIN;

  -- Autoriza explicitamente a alteração privilegiada de role apenas nesta transação do SQL Editor
  SET LOCAL app_security.allow_privileged_role_change = 'on';

  -- Caso o usuário já exista em auth.users mas ainda não tenha linha em customer_profiles,
  -- cria o perfil preservando o ID e metadados de auth.users; se já existir, preserva todos
  -- os dados cadastrais e atualiza apenas role = 'owner' caso ainda não seja 'owner'.
  INSERT INTO public.customer_profiles (
    id,
    name,
    email,
    phone,
    role,
    created_at,
    updated_at
  )
  SELECT
    au.id::text,
    COALESCE(NULLIF(trim(au.raw_user_meta_data->>'name'), ''), split_part(au.email, '@', 1)),
    au.email,
    COALESCE(NULLIF(trim(au.raw_user_meta_data->>'phone'), ''), ''),
    'owner',
    NOW(),
    NOW()
  FROM auth.users au
  WHERE lower(trim(au.email)) = 'duailibe32@gmail.com'
  ON CONFLICT (id) DO UPDATE
    SET role = 'owner',
        updated_at = NOW()
  WHERE public.customer_profiles.role IS DISTINCT FROM 'owner';

  -- Opcional: vincula o owner_uid na configuração principal da loja
  UPDATE public.store_settings
  SET owner_uid = (
    SELECT au.id::text
    FROM auth.users au
    WHERE lower(trim(au.email)) = 'duailibe32@gmail.com'
    LIMIT 1
  )
  WHERE id = 'main';

COMMIT;

-- 2.3 Confirmação pós-promoção:
SELECT
  au.id::text AS auth_user_id,
  au.email,
  cp.id AS profile_id,
  cp.name,
  cp.phone,
  cp.role
FROM auth.users au
JOIN public.customer_profiles cp ON cp.id = au.id::text
WHERE lower(trim(au.email)) = 'duailibe32@gmail.com';

-- ============================================================================
-- PARTE 3: SUÍTE DE TESTES TRANSACIONAIS DE SEGURANÇA (COM ROLLBACK AUTOMÁTICO)
-- Pode ser executada com segurança no Supabase SQL Editor pois termina em ROLLBACK.
-- ============================================================================

BEGIN;

  -- Criar perfis temporários de teste dentro da transação usando a flag local privilegiada
  SET LOCAL app_security.allow_privileged_role_change = 'on';

  INSERT INTO public.customer_profiles (id, name, email, phone, role)
  VALUES
    ('00000000-0000-0000-0000-0000000000a1', 'Admin Teste', 'admin.teste.rls@podwave.local', '11999990001', 'admin'),
    ('00000000-0000-0000-0000-0000000000c1', 'Cliente 1', 'cliente1.rls@podwave.local', '11999990002', 'customer'),
    ('00000000-0000-0000-0000-0000000000c2', 'Cliente 2', 'cliente2.rls@podwave.local', '11999990003', 'customer')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.customer_orders (id, order_code, customer_id, status, items, subtotal, discount, total, payment_method, delivery_info)
  VALUES (
    'ord-test-c2', 'PW-TESTC2', '00000000-0000-0000-0000-0000000000c2', 'pending', '[]'::jsonb, 100, 0, 100, 'pix', '{}'::jsonb
  );

  SET LOCAL app_security.allow_privileged_role_change = 'off';

  -- Simular sessão de Cliente 1 (customer autenticado)
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.role" = 'authenticated';
  SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-0000000000c1';
  SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';

  DO $$
  DECLARE
    v_cnt INT;
    v_role TEXT;
  BEGIN
    -- Teste 1: app_security.is_admin() deve ser FALSE para customer
    IF app_security.is_admin() IS TRUE THEN
      RAISE EXCEPTION 'FALHA TESTE 1: customer foi identificado como admin!';
    END IF;

    -- Teste 2: Tentativa de auto-promoção para owner DEVE FALHAR na trigger
    BEGIN
      UPDATE public.customer_profiles
      SET role = 'owner'
      WHERE id = '00000000-0000-0000-0000-0000000000c1';
      RAISE EXCEPTION 'FALHA TESTE 2: customer conseguiu promover a si mesmo para owner!';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM LIKE 'FALHA TESTE 2%' THEN RAISE; END IF;
    END;

    -- Teste 3: Tentativa de alterar vip_discount_custom DEVE FALHAR na trigger
    BEGIN
      UPDATE public.customer_profiles
      SET vip_discount_custom = 50
      WHERE id = '00000000-0000-0000-0000-0000000000c1';
      RAISE EXCEPTION 'FALHA TESTE 3: customer conseguiu alterar vip_discount_custom!';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM LIKE 'FALHA TESTE 3%' THEN RAISE; END IF;
    END;

    -- Teste 4: Cliente 1 NÃO pode ler pedidos do Cliente 2
    SELECT COUNT(*) INTO v_cnt FROM public.customer_orders WHERE id = 'ord-test-c2';
    IF v_cnt > 0 THEN
      RAISE EXCEPTION 'FALHA TESTE 4: Cliente 1 conseguiu visualizar pedido do Cliente 2!';
    END IF;

    -- Teste 5: Cliente 1 NÃO pode ler nem inserir em audit_logs
    SELECT COUNT(*) INTO v_cnt FROM public.audit_logs;
    IF v_cnt > 0 THEN
      RAISE EXCEPTION 'FALHA TESTE 5A: customer conseguiu ler audit_logs!';
    END IF;

    BEGIN
      INSERT INTO public.audit_logs (id, action, entity_type, entity_id, entity_name)
      VALUES ('aud-hack', 'create', 'order', '1', 'Hack');
      RAISE EXCEPTION 'FALHA TESTE 5B: customer conseguiu inserir em audit_logs!';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM LIKE 'FALHA TESTE 5B%' THEN RAISE; END IF;
    END;

    -- Teste 6: Cliente 1 NÃO pode ler nem inserir nas tabelas financeiras
    SELECT COUNT(*) INTO v_cnt FROM public.manual_sales;
    IF v_cnt > 0 THEN
      RAISE EXCEPTION 'FALHA TESTE 6A: customer conseguiu ler manual_sales!';
    END IF;

    BEGIN
      INSERT INTO public.manual_sales (id, date, customer_name, total, payment_method)
      VALUES ('sale-hack', '2026-10-30', 'Hacker', 100, 'pix');
      RAISE EXCEPTION 'FALHA TESTE 6B: customer conseguiu inserir em manual_sales!';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM LIKE 'FALHA TESTE 6B%' THEN RAISE; END IF;
    END;
  END $$;

ROLLBACK;
