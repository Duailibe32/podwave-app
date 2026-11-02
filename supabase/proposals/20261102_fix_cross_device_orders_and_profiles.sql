-- =============================================================================
-- FIX UNIFICADO E DEFINITIVO — PODWAVE SUPABASE
-- Compatível com o schema real verificado de public.customer_profiles:
--   (id, email, full_name, phone, role, updated_at)
-- e public.customer_orders + Auto-exclusão de pedidos cancelados após 24h
-- =============================================================================

-- 1. Garantir função public.is_admin() com cast ::text (evita erro text = uuid)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.customer_profiles
    WHERE id::text = auth.uid()::text
      AND role IN ('admin', 'owner')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- 2. Backfill seguro: Cria perfil em public.customer_profiles para todas as contas do auth.users
--    usando as colunas reais da tabela: (id, email, full_name, phone, role, updated_at)
INSERT INTO public.customer_profiles (
  id,
  email,
  full_name,
  phone,
  role,
  updated_at
)
SELECT
  u.id::text,
  COALESCE(u.email, u.id::text || '@cliente.podwave.local'),
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
    SPLIT_PART(COALESCE(u.email, 'Cliente'), '@', 1)
  ),
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'phone_whatsapp'), ''),
    NULLIF(TRIM(u.raw_user_meta_data->>'phone'), ''),
    ''
  ),
  'customer',
  now()
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- 3. Trigger automática: Toda nova conta criada no celular ou PC gera perfil em customer_profiles
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customer_profiles (
    id,
    email,
    full_name,
    phone,
    role,
    updated_at
  )
  VALUES (
    NEW.id::text,
    COALESCE(NEW.email, NEW.id::text || '@cliente.podwave.local'),
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      SPLIT_PART(COALESCE(NEW.email, 'Cliente'), '@', 1)
    ),
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'phone_whatsapp'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
      ''
    ),
    'customer',
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user_profile();

-- 4. Políticas RLS em public.customer_profiles e public.customer_orders (usando ::text)
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_profiles_select_self_or_admin ON public.customer_profiles;
CREATE POLICY customer_profiles_select_self_or_admin
  ON public.customer_profiles
  FOR SELECT
  TO authenticated
  USING (id::text = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS customer_profiles_insert_self_or_admin ON public.customer_profiles;
CREATE POLICY customer_profiles_insert_self_or_admin
  ON public.customer_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id::text = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS customer_profiles_update_self_or_admin ON public.customer_profiles;
CREATE POLICY customer_profiles_update_self_or_admin
  ON public.customer_profiles
  FOR UPDATE
  TO authenticated
  USING (id::text = auth.uid()::text OR public.is_admin())
  WITH CHECK (id::text = auth.uid()::text OR public.is_admin());

ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_orders_select_own_or_admin ON public.customer_orders;
CREATE POLICY customer_orders_select_own_or_admin
  ON public.customer_orders
  FOR SELECT
  TO authenticated
  USING (customer_id::text = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS customer_orders_insert_own_or_admin ON public.customer_orders;
CREATE POLICY customer_orders_insert_own_or_admin
  ON public.customer_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (customer_id::text = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS customer_orders_update_own_or_admin ON public.customer_orders;
CREATE POLICY customer_orders_update_own_or_admin
  ON public.customer_orders
  FOR UPDATE
  TO authenticated
  USING (customer_id::text = auth.uid()::text OR public.is_admin())
  WITH CHECK (customer_id::text = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS customer_orders_delete_admin ON public.customer_orders;
CREATE POLICY customer_orders_delete_admin
  ON public.customer_orders
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR (customer_id::text = auth.uid()::text AND id::text LIKE 'diag-rls-probe-%')
  );

-- 5. Unificar 'public.orders' com 'public.customer_orders' (View Atualizável com RLS Invoker)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'orders'
      AND c.relkind = 'r'
  ) THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.orders WITH (security_invoker = true) AS SELECT * FROM public.customer_orders';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated';
  END IF;
END
$$;

-- 6. Auto-Exclusão de Pedidos Cancelados após 24 horas (Função RPC + Trigger Automática)
CREATE OR REPLACE FUNCTION public.cleanup_cancelled_orders(p_hours integer DEFAULT 24)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer := 0;
BEGIN
  DELETE FROM public.customer_orders
  WHERE status IN ('cancelado', 'canceled')
    AND (
      p_hours <= 0
      OR COALESCE(
        NULLIF(delivery_info->>'updatedAt', '')::timestamptz,
        created_at
      ) <= (now() - make_interval(hours => p_hours))
    );

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_cancelled_orders(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_fn_auto_cleanup_cancelled_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.cleanup_cancelled_orders(24);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_cleanup_cancelled_orders ON public.customer_orders;
CREATE TRIGGER trg_auto_cleanup_cancelled_orders
  AFTER INSERT OR UPDATE OF status ON public.customer_orders
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trg_fn_auto_cleanup_cancelled_orders();
