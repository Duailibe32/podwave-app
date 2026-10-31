-- ============================================================================
-- PROPOSTA DE CORREÇÃO DEFENSIVA (BASEADA NO DIAGNÓSTICO REAL DO BANCO)
-- Projeto: Duailibe32/podwave-app (hccrgzjkbmgutpazlljb)
-- Natureza: altera schema, grants e trigger; requer revisão e backup antes da aplicação.
-- Para banco que já recebeu esta proposta, use o reparo restrito em proposals/20261031_profile_guard_repair.sql.
-- Não executar esta proposta ampla novamente apenas para reparar a função.
-- ============================================================================
--
-- PASSO 0 (RECOMENDADO ANTES DE APLICAR - BACKUP DE SEGURANÇA EM TABELA TEMPORÁRIA):
-- Execute separadamente se desejar guardar uma cópia instantânea dos perfis:
--   CREATE TABLE IF NOT EXISTS app_security.backup_customer_profiles_20261031 AS
--   SELECT * FROM public.customer_profiles;
--
-- ============================================================================

BEGIN;

-- 1. Compatibilidade da coluna de fidelidade/observação sem apagar nem alterar colunas atuais
--    Resolve o erro HTTP 400 / código 42703:
--    "column customer_profiles.vip_benefit_note does not exist"
ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS vip_benefit_note TEXT;

-- 2. Endurecimento de Grants Excessivos comprovados no diagnostic_report:
--    2a) public.store_settings tinha INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER para 'anon'!
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.store_settings
  FROM PUBLIC, anon;

REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.store_settings
  FROM authenticated;

GRANT SELECT ON TABLE public.store_settings TO anon, authenticated;

--    2b) public.customer_profiles tinha TRUNCATE, REFERENCES, TRIGGER para 'authenticated'
REVOKE ALL
  ON TABLE public.customer_profiles
  FROM PUBLIC, anon;

REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.customer_profiles
  FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.customer_profiles
  TO authenticated;

--    2c) public.customer_orders: revogar privilégios estruturais desnecessários
REVOKE ALL
  ON TABLE public.customer_orders
  FROM PUBLIC, anon;

REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.customer_orders
  FROM authenticated;

--    2d) public.audit_logs e sequence public.audit_logs_id_seq:
--        Impedir UPDATE/DELETE em logs e impedir que clientes alterem o contador (setval)
REVOKE ALL
  ON TABLE public.audit_logs
  FROM PUBLIC, anon;

REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.audit_logs
  FROM authenticated;

GRANT SELECT, INSERT
  ON TABLE public.audit_logs
  TO authenticated;

REVOKE ALL
  ON SEQUENCE public.audit_logs_id_seq
  FROM PUBLIC, anon;

REVOKE UPDATE
  ON SEQUENCE public.audit_logs_id_seq
  FROM authenticated;

GRANT USAGE, SELECT
  ON SEQUENCE public.audit_logs_id_seq
  TO authenticated;

-- 3. Fixação de search_path seguro nas funções SECURITY DEFINER públicas
ALTER FUNCTION public.is_admin()
  SET search_path = pg_catalog, public, pg_temp;

ALTER FUNCTION public.is_vip()
  SET search_path = pg_catalog, public, pg_temp;

ALTER FUNCTION public.get_user_role()
  SET search_path = pg_catalog, public, pg_temp;

-- 4. Atualização da trigger function app_security.podwave_guard_profile_permissions()
--    para proteger também a nova coluna vip_benefit_note contra autoedição por clientes comuns,
--    mantendo intacta a proteção de id, role e vip_discount_custom.
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

-- ============================================================================
-- ROLLBACK (CASO DESEJE REVERTER APENAS A FUNÇÃO DE TRIGGER):
-- ============================================================================
-- Para restaurar a versão anterior da função sem remover a coluna vip_benefit_note:
-- basta recriar app_security.podwave_guard_profile_permissions() sem o bloco
-- de verificação de NEW.vip_benefit_note.
