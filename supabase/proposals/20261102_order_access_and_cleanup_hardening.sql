-- Incremental proposal for an existing installation. Review schema and test in staging.
-- No grants of roles, stock adjustments or historical deletions during installation.
BEGIN;
DO $$ BEGIN
  IF to_regprocedure('public.is_admin()') IS NULL
     OR to_regclass('public.customer_profiles') IS NULL
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
       AND table_name='customer_orders' AND column_name='delivery_info' AND data_type='jsonb') THEN
    RAISE EXCEPTION 'Required profile/order schema is absent. Inspect the database before installing.';
  END IF;
END $$;

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_profiles, public.customer_orders FROM PUBLIC, anon;

-- Restrictive policies contain permissive policies left by older installations.
DROP POLICY IF EXISTS podwave_profile_visibility_boundary ON public.customer_profiles;
CREATE POLICY podwave_profile_visibility_boundary ON public.customer_profiles AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (id::text=auth.uid()::text OR public.is_admin())
  WITH CHECK (id::text=auth.uid()::text OR public.is_admin());
DROP POLICY IF EXISTS podwave_order_visibility_boundary ON public.customer_orders;
CREATE POLICY podwave_order_visibility_boundary ON public.customer_orders AS RESTRICTIVE
  FOR SELECT TO authenticated USING (customer_id::text=auth.uid()::text OR public.is_admin());
DROP POLICY IF EXISTS podwave_order_update_boundary ON public.customer_orders;
CREATE POLICY podwave_order_update_boundary ON public.customer_orders AS RESTRICTIVE
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS podwave_order_delete_boundary ON public.customer_orders;
CREATE POLICY podwave_order_delete_boundary ON public.customer_orders AS RESTRICTIVE
  FOR DELETE TO authenticated USING (public.is_admin() OR
    (customer_id::text=auth.uid()::text AND id::text LIKE 'diag-rls-probe-%'));
DROP POLICY IF EXISTS podwave_order_insert_boundary ON public.customer_orders;
CREATE POLICY podwave_order_insert_boundary ON public.customer_orders AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR (
    customer_id::text=auth.uid()::text AND status='recebido'
    AND COALESCE(delivery_info->>'paymentStatus','pendente')='pendente'
    AND COALESCE(delivery_info->>'amountPaid','0')='0'
    AND COALESCE(delivery_info->>'version','1')='1'
    AND COALESCE(delivery_info->>'stockDeducted','false')='false'
    AND COALESCE(delivery_info->>'loyaltyStampGranted','false')='false'
    AND delivery_info->>'financialSaleId' IS NULL
  ));

CREATE OR REPLACE FUNCTION public.podwave_guard_profile_privileges()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE field text; after_data jsonb:=to_jsonb(NEW); before_data jsonb;
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role',true),'')='service_role'
     OR public.is_admin() THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' THEN
    IF COALESCE(after_data->>'role','customer')<>'customer'
       OR COALESCE(after_data->>'is_vip','false')<>'false'
       OR COALESCE(after_data->>'vip_status','inactive')<>'inactive'
       OR after_data->>'vip_benefit_note' IS NOT NULL
       OR after_data->>'vip_discount_custom' IS NOT NULL THEN
      RAISE EXCEPTION 'Privileged profile fields are protected.' USING ERRCODE='42501';
    END IF;
  ELSE
    before_data:=to_jsonb(OLD);
    FOR field IN SELECT jsonb_object_keys(after_data) LOOP
      IF (field IN ('id','role','is_vip') OR left(field,4)='vip_')
         AND after_data->field IS DISTINCT FROM before_data->field THEN
        RAISE EXCEPTION 'Privileged profile fields are protected.' USING ERRCODE='42501';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.podwave_guard_profile_privileges() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS podwave_guard_profile_privileges ON public.customer_profiles;
CREATE TRIGGER podwave_guard_profile_privileges BEFORE INSERT OR UPDATE ON public.customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.podwave_guard_profile_privileges();

CREATE OR REPLACE FUNCTION public.podwave_cancelled_order_at(info jsonb, fallback_at timestamptz)
RETURNS timestamptz LANGUAGE plpgsql STABLE SET search_path=pg_catalog,public AS $$
DECLARE entry jsonb; candidate timestamptz; latest timestamptz;
BEGIN
  FOR entry IN SELECT value FROM jsonb_array_elements(
    CASE WHEN jsonb_typeof(info->'statusHistory')='array' THEN info->'statusHistory' ELSE '[]'::jsonb END)
  LOOP
    IF entry->>'toStatus'='cancelado' THEN
      BEGIN
        candidate:=NULLIF(entry->>'changedAt','')::timestamptz;
        latest:=GREATEST(latest,candidate);
      EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN NULL;
      END;
    END IF;
  END LOOP;
  IF latest IS NOT NULL THEN RETURN latest; END IF;
  BEGIN RETURN COALESCE(NULLIF(info->>'updatedAt','')::timestamptz,fallback_at);
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RETURN fallback_at;
  END;
END $$;

CREATE OR REPLACE FUNCTION public.cleanup_cancelled_orders(p_hours integer DEFAULT 24)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE deleted_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.is_admin(),false) THEN
    RAISE EXCEPTION 'Only an authenticated administrator can clean cancelled orders.' USING ERRCODE='42501';
  END IF;
  IF p_hours IS NULL OR p_hours<0 THEN RAISE EXCEPTION 'Invalid retention.' USING ERRCODE='22023'; END IF;
  DELETE FROM public.customer_orders
  WHERE status IN ('cancelado','canceled') AND (p_hours=0 OR
    public.podwave_cancelled_order_at(delivery_info,created_at)<=now()-make_interval(hours=>p_hours));
  GET DIAGNOSTICS deleted_count=ROW_COUNT;
  RETURN deleted_count;
END $$;
REVOKE ALL ON FUNCTION public.cleanup_cancelled_orders(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_cancelled_orders(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_fn_auto_cleanup_cancelled_orders()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
  -- Customer checkout must not invoke an administrative cleanup or fail because of it.
  IF auth.uid() IS NOT NULL AND COALESCE(public.is_admin(),false) THEN
    PERFORM public.cleanup_cancelled_orders(24);
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.trg_fn_auto_cleanup_cancelled_orders() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_auto_cleanup_cancelled_orders ON public.customer_orders;
CREATE TRIGGER trg_auto_cleanup_cancelled_orders AFTER INSERT OR UPDATE OF status ON public.customer_orders
  FOR EACH STATEMENT EXECUTE FUNCTION public.trg_fn_auto_cleanup_cancelled_orders();
COMMIT;
