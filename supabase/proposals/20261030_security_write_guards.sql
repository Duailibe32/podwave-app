-- PROPOSAL ONLY. Do not apply before read-only inventory, backup and review.
-- No historic records are deleted, rewritten or silently converted.
-- The final restrictive policy deliberately suspends unvalidated customer INSERTs.
-- A trusted server pricing path is required before enabling them again.
BEGIN;
DO $$ BEGIN
  IF to_regprocedure('app_security.is_admin()') IS NULL
     OR to_regclass('public.customer_profiles') IS NULL
     OR to_regclass('public.customer_orders') IS NULL THEN
    RAISE EXCEPTION 'Required security schema is absent. Review the deployed schema first.';
  END IF;
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND
      ((table_name='customer_profiles' AND ((column_name IN ('id','email','vip_benefit_note') AND data_type='text') OR (column_name='default_address' AND data_type='jsonb')))
       OR (table_name='customer_orders' AND ((column_name IN ('id','customer_id') AND data_type='text') OR (column_name='delivery_info' AND data_type='jsonb'))))) <> 7 THEN
    RAISE EXCEPTION 'Deployed column types differ from the reviewed baseline. No changes applied.';
  END IF;
END $$;

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_profiles, public.customer_orders FROM PUBLIC, anon;
DROP POLICY IF EXISTS "Constrain private profile access" ON public.customer_profiles;
CREATE POLICY "Constrain private profile access" ON public.customer_profiles
AS RESTRICTIVE FOR ALL TO authenticated
USING (id=auth.uid()::text OR app_security.is_admin())
WITH CHECK (id=auth.uid()::text OR app_security.is_admin());

CREATE OR REPLACE FUNCTION app_security.guard_profile_privileged_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
DECLARE role_name text := COALESCE(auth.jwt()->>'role',''); new_data jsonb; old_data jsonb;
BEGIN
  IF role_name='service_role' OR app_security.is_admin() THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR NEW.id IS DISTINCT FROM auth.uid()::text THEN
    RAISE EXCEPTION 'Profile write denied.' USING ERRCODE='42501';
  END IF;
  new_data := to_jsonb(NEW);
  IF TG_OP='INSERT' THEN
    IF COALESCE(new_data->>'role','customer')<>'customer'
       OR COALESCE((new_data->>'is_vip')::boolean,false)
       OR COALESCE(new_data->>'vip_status','inactive')<>'inactive'
       OR new_data->>'vip_benefit_note' IS NOT NULL
       OR new_data->>'vip_discount_custom' IS NOT NULL
       OR COALESCE(new_data->'default_address','{}')->'loyaltyCard' IS NOT NULL THEN
      RAISE EXCEPTION 'Privileged profile fields are protected.' USING ERRCODE='42501';
    END IF;
  ELSE
    old_data := to_jsonb(OLD);
    -- Only ordinary registration fields may change through a customer session.
    IF (new_data - ARRAY['name','email','phone','cpf','birth_date','default_address','saved_addresses','favorite_model_ids','updated_at'])
       IS DISTINCT FROM
       (old_data - ARRAY['name','email','phone','cpf','birth_date','default_address','saved_addresses','favorite_model_ids','updated_at']) THEN
      RAISE EXCEPTION 'Privileged profile fields are protected.' USING ERRCODE='42501';
    END IF;
    -- Removing legacy untrusted data is allowed; adding/modifying it is not.
    IF new_data->'default_address' ? 'loyaltyCard'
       AND new_data->'default_address'->'loyaltyCard' IS DISTINCT FROM old_data->'default_address'->'loyaltyCard' THEN
      RAISE EXCEPTION 'Embedded loyalty changes are forbidden.' USING ERRCODE='42501';
    END IF;
  END IF;
  IF lower(NEW.email) IS DISTINCT FROM lower(auth.jwt()->>'email') THEN
    RAISE EXCEPTION 'Profile email must match the authenticated identity.' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app_security.guard_profile_privileged_fields() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_profile_privileged_fields ON public.customer_profiles;
CREATE TRIGGER guard_profile_privileged_fields BEFORE INSERT OR UPDATE ON public.customer_profiles
FOR EACH ROW EXECUTE FUNCTION app_security.guard_profile_privileged_fields();

CREATE OR REPLACE FUNCTION app_security.guard_order_revision()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $$
DECLARE previous_version integer; next_version integer;
BEGIN
  previous_version := COALESCE((OLD.delivery_info->>'version')::integer,1);
  next_version := (NEW.delivery_info->>'version')::integer;
  IF next_version IS NULL OR next_version<>previous_version+1 THEN
    RAISE EXCEPTION 'Stale record revision. Reload before retrying.' USING ERRCODE='40001';
  END IF;
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Record identity is immutable.' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app_security.guard_order_revision() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_order_revision ON public.customer_orders;
CREATE TRIGGER guard_order_revision BEFORE UPDATE ON public.customer_orders
FOR EACH ROW EXECUTE FUNCTION app_security.guard_order_revision();

-- Restrictive policies compose with existing permissive policies using AND.
-- This is containment, not a replacement for a validated server pricing path.
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Constrain private record visibility" ON public.customer_orders;
CREATE POLICY "Constrain private record visibility" ON public.customer_orders
AS RESTRICTIVE FOR SELECT TO authenticated USING(customer_id=auth.uid()::text OR app_security.is_admin());
DROP POLICY IF EXISTS "Constrain private record updates" ON public.customer_orders;
CREATE POLICY "Constrain private record updates" ON public.customer_orders
AS RESTRICTIVE FOR UPDATE TO authenticated USING(app_security.is_admin()) WITH CHECK(app_security.is_admin());
DROP POLICY IF EXISTS "Constrain private record deletion" ON public.customer_orders;
CREATE POLICY "Constrain private record deletion" ON public.customer_orders
AS RESTRICTIVE FOR DELETE TO authenticated USING(app_security.is_admin());
DROP POLICY IF EXISTS "Block unvalidated customer inserts" ON public.customer_orders;
CREATE POLICY "Block unvalidated customer inserts" ON public.customer_orders
AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (app_security.is_admin());
COMMIT;
