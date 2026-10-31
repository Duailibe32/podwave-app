-- PROPOSTA DE REPARO DEFENSIVO DA TRIGGER EXISTENTE.
-- Não cria colunas, não concede cargos, não modifica perfis/pedidos e não amplia grants.
-- Requer a definição/tipos revisados e teste em homologação. Não é executado pelo build.
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('app_security.podwave_guard_profile_permissions()') IS NULL
 OR to_regprocedure('app_security.is_podwave_finance_owner()') IS NULL
 OR to_regprocedure('public.is_admin()') IS NULL THEN
   RAISE EXCEPTION 'Funções esperadas ausentes; conferir o estado remoto antes do reparo.';
 END IF;
 IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='customer_profiles'
 AND ((column_name IN ('id','role','vip_benefit_note') AND data_type='text')
 OR (column_name='vip_discount_custom' AND data_type='numeric'))) <> 4 THEN
   RAISE EXCEPTION 'Schema diferente do revisado. Nenhuma coluna será criada automaticamente.';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass('public.customer_profiles')
 AND tgname='podwave_guard_profile_permissions' AND tgfoid=to_regprocedure('app_security.podwave_guard_profile_permissions()')
 AND tgenabled IN ('O','A') AND NOT tgisinternal) THEN
   RAISE EXCEPTION 'Trigger esperada ausente/desabilitada; verificar antes de alterar a função.';
 END IF;
END $$;

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
        RAISE EXCEPTION 'Operacao negada: novos perfis nao podem definir cargo privilegiado.'
          USING ERRCODE = '42501';
      END IF;
      IF NEW.vip_discount_custom IS NOT NULL THEN
        RAISE EXCEPTION 'Operacao negada: desconto VIP exclusivo do proprietario.'
          USING ERRCODE = '42501';
      END IF;
      IF NEW.vip_benefit_note IS NOT NULL AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Operacao negada: cartao fidelidade gerenciado apenas pela administracao.'
          USING ERRCODE = '42501';
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


COMMIT;
