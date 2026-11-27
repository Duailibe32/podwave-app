-- Cupons privados: visitantes deixam de baixar a lista de cupons ativos.
--
-- Antes: a política "Public Read Coupons" liberava SELECT de todo cupom ativo para
-- anon/authenticated, e a vitrine baixava a tabela inteira junto com o catálogo.
-- Qualquer visitante via todos os códigos, inclusive os enviados a um único cliente.
--
-- Depois:
--   * Só administradores leem a tabela public.coupons (via public.is_admin() ou
--     app_security.is_admin(), a que existir no banco).
--   * O cliente consulta um código por vez com public.podwave_lookup_coupon(p_code),
--     que devolve no máximo uma linha e nada quando o código não existe.
--   * O SELECT continua concedido (sem REVOKE) para que a leitura da vitrine
--     retorne lista vazia em vez de erro de permissão.
--   * O checkout não muda: os gatilhos podwave_validate_checkout e
--     podwave_consume_checkout_coupon são SECURITY DEFINER e continuam lendo a tabela.
--
-- Ordem de publicação: publique o frontend desta versão primeiro (ele funciona com o
-- banco antigo e com o novo) e depois aplique este arquivo no SQL Editor.
BEGIN;

-- O banco original usa public.is_admin(); instalações novas usam app_security.is_admin().
DO $$
DECLARE
  admin_check text;
BEGIN
  IF to_regprocedure('public.is_admin()') IS NOT NULL THEN
    admin_check := 'public.is_admin()';
  ELSIF to_regprocedure('app_security.is_admin()') IS NOT NULL THEN
    admin_check := 'app_security.is_admin()';
  ELSE
    RAISE EXCEPTION 'Nenhuma função is_admin() encontrada (public ou app_security). Nada foi alterado.';
  END IF;

  DROP POLICY IF EXISTS "Public Read Coupons" ON public.coupons;
  DROP POLICY IF EXISTS "Admin Read Coupons" ON public.coupons;
  EXECUTE format(
    'CREATE POLICY "Admin Read Coupons" ON public.coupons FOR SELECT TO authenticated USING (%s)',
    admin_check
  );
END $$;

CREATE OR REPLACE FUNCTION public.podwave_lookup_coupon(p_code text)
RETURNS SETOF public.coupons
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT c.*
  FROM public.coupons c
  WHERE length(trim(coalesce(p_code, ''))) BETWEEN 1 AND 64
    AND upper(c.code) = upper(trim(p_code))
    -- A coluna de ativação varia entre instalações (active / is_active).
    AND coalesce((to_jsonb(c) ->> 'active')::boolean, (to_jsonb(c) ->> 'is_active')::boolean, true)
  ORDER BY c.id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.podwave_lookup_coupon(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.podwave_lookup_coupon(text) TO anon, authenticated, service_role;

-- Verificação: nenhuma política de leitura pública pode restar na tabela.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coupons' AND cmd IN ('SELECT', 'ALL')
      AND policyname <> 'Admin Read Coupons'
      AND (roles && ARRAY['public', 'anon']::name[] OR qual IS NULL OR qual NOT LIKE '%is_admin%')
  ) THEN
    RAISE EXCEPTION 'Ainda existe política de leitura pública em public.coupons: %. Nada foi alterado.',
      (SELECT string_agg(policyname, ', ') FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'coupons' AND cmd IN ('SELECT', 'ALL')
         AND policyname <> 'Admin Read Coupons');
  END IF;
END $$;

COMMIT;
