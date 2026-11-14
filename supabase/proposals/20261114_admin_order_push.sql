-- Apply after 20261107_order_push.sql and 20261107_order_push_scope.sql.
BEGIN;

ALTER TABLE public.order_push_devices
  ADD COLUMN IF NOT EXISTS notify_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_customer boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.podwave_reset_transferred_admin_push()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  NEW.notify_admin := false;
  NEW.notify_customer := true;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS podwave_reset_transferred_admin_push ON public.order_push_devices;
CREATE TRIGGER podwave_reset_transferred_admin_push BEFORE UPDATE OF customer_id ON public.order_push_devices
FOR EACH ROW WHEN (OLD.customer_id IS DISTINCT FROM NEW.customer_id)
EXECUTE FUNCTION public.podwave_reset_transferred_admin_push();

CREATE OR REPLACE FUNCTION public.podwave_register_admin_order_push(
  p_endpoint text, p_p256dh text, p_auth text, p_order_ids text[], p_admin boolean, p_customer boolean
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  owner_id text := auth.uid()::text;
BEGIN
  IF owner_id IS NULL OR NOT (coalesce(p_admin, false) OR coalesce(p_customer, false))
    OR (p_admin IS TRUE AND public.is_admin() IS NOT TRUE) THEN
    RETURN false;
  END IF;
  IF NOT public.podwave_register_order_push_scope(p_endpoint, p_p256dh, p_auth, p_order_ids) THEN
    RETURN false;
  END IF;

  UPDATE public.order_push_devices SET notify_admin = coalesce(p_admin, false),
    notify_customer = coalesce(p_customer, false)
  WHERE endpoint = p_endpoint AND customer_id = owner_id;
  DELETE FROM public.order_push_queue
  WHERE endpoint = p_endpoint AND customer_id = owner_id
    AND ((status = 'admin_new_order' AND p_admin IS NOT TRUE)
      OR (status <> 'admin_new_order' AND p_customer IS NOT TRUE));
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.podwave_queue_order_push()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO public.order_push_queue(endpoint, customer_id, order_id, status)
  SELECT endpoint, customer_id, NEW.id::text, NEW.status FROM public.order_push_devices
  WHERE customer_id = NEW.customer_id::text AND notify_customer
    AND (only_order_ids IS NULL OR NEW.id::text = ANY(only_order_ids))
  ORDER BY registered_at DESC LIMIT 10;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.podwave_queue_admin_new_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO public.order_push_queue(endpoint, customer_id, order_id, status)
  SELECT d.endpoint, d.customer_id, NEW.id::text, 'admin_new_order'
  FROM public.order_push_devices d JOIN public.customer_profiles p ON p.id::text = d.customer_id
  WHERE d.notify_admin AND p.role IN ('admin', 'owner');
  RETURN NULL;
END $$;

-- Recheck the administrator role and current subscription immediately before sending a queued alert.
CREATE OR REPLACE FUNCTION public.podwave_can_deliver_admin_order_push(p_endpoint text, p_owner text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.order_push_devices d JOIN public.customer_profiles p ON p.id::text = d.customer_id
    WHERE d.endpoint = p_endpoint AND d.customer_id = p_owner
      AND d.notify_admin AND p.role IN ('admin', 'owner')
  );
$$;

REVOKE ALL ON FUNCTION public.podwave_register_admin_order_push(text,text,text,text[],boolean,boolean),
  public.podwave_queue_admin_new_order(), public.podwave_can_deliver_admin_order_push(text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.podwave_register_admin_order_push(text,text,text,text[],boolean,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.podwave_can_deliver_admin_order_push(text,text) TO service_role;

DROP TRIGGER IF EXISTS podwave_queue_admin_new_order ON public.customer_orders;
CREATE TRIGGER podwave_queue_admin_new_order AFTER INSERT ON public.customer_orders
FOR EACH ROW WHEN (NEW.status = 'recebido' AND NEW.id::text NOT LIKE 'diag-rls-probe-%')
EXECUTE FUNCTION public.podwave_queue_admin_new_order();

COMMIT;
