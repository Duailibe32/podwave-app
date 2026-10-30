-- Owner-only internal service notes. No change to sales, stock or permissions on existing tables.
BEGIN;
DO $$ BEGIN
  IF to_regprocedure('app_security.is_podwave_finance_owner()') IS NULL OR to_regprocedure('app_security.capture_business_audit()') IS NULL THEN
    RAISE EXCEPTION 'Instalação não iniciada: autorização do proprietário ou auditoria existente ausente.';
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.customer_service_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_kind text NOT NULL CHECK(source_kind IN ('venda','avulsa')),
  source_id text NOT NULL,
  body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 4000),
  occurred_on date NOT NULL,
  change_reason text NOT NULL CHECK(length(trim(change_reason)) BETWEEN 3 AND 500),
  is_void boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_by uuid NOT NULL DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS customer_service_notes_source ON public.customer_service_notes(source_kind,source_id,created_at DESC);
ALTER TABLE public.customer_service_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_service_notes FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.customer_service_notes TO authenticated;
DROP POLICY IF EXISTS "Owner service history" ON public.customer_service_notes;
CREATE POLICY "Owner service history" ON public.customer_service_notes TO authenticated
  USING(app_security.is_podwave_finance_owner()) WITH CHECK(app_security.is_podwave_finance_owner());

CREATE OR REPLACE FUNCTION app_security.protect_customer_service_note() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
  IF NOT COALESCE(app_security.is_podwave_finance_owner(),false) OR auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Histórico de atendimentos restrito ao proprietário.' USING ERRCODE='42501';
  END IF;
  IF TG_OP='INSERT' THEN
    IF (NEW.source_kind='venda' AND NOT EXISTS(SELECT 1 FROM public.manual_sales WHERE id=NEW.source_id)) OR
       (NEW.source_kind='avulsa' AND NOT EXISTS(SELECT 1 FROM public.manual_commitments WHERE id=NEW.source_id AND commitment_type='a_receber')) THEN
      RAISE EXCEPTION 'Vincule o atendimento a uma venda ou conta a receber já confirmada no banco.';
    END IF;
    NEW.version:=1; NEW.is_void:=false; NEW.created_by:=auth.uid(); NEW.created_at:=clock_timestamp();
  ELSE
    IF OLD.is_void THEN RAISE EXCEPTION 'Atendimento invalidado é preservado para consulta.'; END IF;
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.source_kind IS DISTINCT FROM OLD.source_kind OR NEW.source_id IS DISTINCT FROM OLD.source_id OR
       NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'O vínculo e a autoria original do atendimento são imutáveis.';
    END IF;
    IF NEW.version IS DISTINCT FROM OLD.version+1 THEN RAISE EXCEPTION 'Atendimento alterado em outra sessão. Recarregue antes de corrigir.'; END IF;
    IF NEW.is_void AND (NEW.body IS DISTINCT FROM OLD.body OR NEW.occurred_on IS DISTINCT FROM OLD.occurred_on) THEN
      RAISE EXCEPTION 'A invalidação preserva o conteúdo e a data originais.';
    END IF;
  END IF;
  NEW.updated_by:=auth.uid(); NEW.updated_at:=clock_timestamp();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app_security.protect_customer_service_note() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS protect_customer_service_note ON public.customer_service_notes;
CREATE TRIGGER protect_customer_service_note BEFORE INSERT OR UPDATE ON public.customer_service_notes
  FOR EACH ROW EXECUTE FUNCTION app_security.protect_customer_service_note();
DROP TRIGGER IF EXISTS business_audit_capture ON public.customer_service_notes;
CREATE TRIGGER business_audit_capture AFTER INSERT OR UPDATE ON public.customer_service_notes
  FOR EACH ROW EXECUTE FUNCTION app_security.capture_business_audit();
COMMIT;
