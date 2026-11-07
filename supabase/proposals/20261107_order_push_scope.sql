-- Apply after 20261107_order_push.sql when closed-app alerts are configured.
BEGIN;

ALTER TABLE public.order_push_devices ADD COLUMN IF NOT EXISTS only_order_ids text[];

CREATE OR REPLACE FUNCTION public.podwave_register_order_push_scope(
  p_endpoint text, p_p256dh text, p_auth text, p_order_ids text[]
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  owner_id text := auth.uid()::text;
  owned_ids text[];
BEGIN
  IF owner_id IS NULL THEN RETURN false; END IF;
  IF p_order_ids IS NOT NULL THEN
    IF cardinality(p_order_ids) NOT BETWEEN 1 AND 50 THEN RETURN false; END IF;
    SELECT array_agg(o.id::text) INTO owned_ids
    FROM public.customer_orders o
    WHERE o.customer_id::text = owner_id AND o.id::text = ANY(p_order_ids);
    IF owned_ids IS NULL THEN RETURN false; END IF;
  END IF;

  IF NOT public.podwave_register_order_push(p_endpoint, p_p256dh, p_auth) THEN RETURN false; END IF;
  UPDATE public.order_push_devices
    SET only_order_ids = owned_ids
    WHERE endpoint = p_endpoint AND customer_id = owner_id;

  IF owned_ids IS NOT NULL THEN
    DELETE FROM public.order_push_queue
      WHERE endpoint = p_endpoint AND customer_id = owner_id AND NOT (order_id = ANY(owned_ids));
  END IF;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.podwave_queue_order_push()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO public.order_push_queue(endpoint, customer_id, order_id, status)
  SELECT endpoint, customer_id, NEW.id::text, NEW.status FROM public.order_push_devices
  WHERE customer_id = NEW.customer_id::text
    AND (only_order_ids IS NULL OR NEW.id::text = ANY(only_order_ids))
  ORDER BY registered_at DESC LIMIT 10;
  RETURN NULL;
END $$;

REVOKE ALL ON FUNCTION public.podwave_register_order_push_scope(text,text,text,text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.podwave_register_order_push_scope(text,text,text,text[]) TO authenticated;

COMMIT;
