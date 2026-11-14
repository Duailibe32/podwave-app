BEGIN;

CREATE TABLE IF NOT EXISTS public.podwave_push_opt_ins (
  endpoint text PRIMARY KEY REFERENCES public.order_push_devices(endpoint) ON DELETE CASCADE,
  customer_id text NOT NULL,
  store_notices boolean NOT NULL DEFAULT false,
  promotions boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.podwave_push_campaigns (
  id uuid PRIMARY KEY,
  actor text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('store', 'promotion')),
  payload jsonb NOT NULL,
  queued integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.podwave_push_opt_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podwave_push_campaigns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.podwave_push_opt_ins, public.podwave_push_campaigns FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.podwave_clear_transferred_push_opt_in()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  DELETE FROM public.podwave_push_opt_ins WHERE endpoint = NEW.endpoint;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.podwave_clear_transferred_push_opt_in() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS podwave_clear_transferred_push_opt_in ON public.order_push_devices;
CREATE TRIGGER podwave_clear_transferred_push_opt_in AFTER UPDATE OF customer_id ON public.order_push_devices
FOR EACH ROW WHEN (OLD.customer_id IS DISTINCT FROM NEW.customer_id)
EXECUTE FUNCTION public.podwave_clear_transferred_push_opt_in();

CREATE OR REPLACE FUNCTION public.podwave_store_push_preferences(
  p_endpoint text, p_store boolean DEFAULT NULL, p_promotions boolean DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE owner_id text := auth.uid()::text;
BEGIN
  IF owner_id IS NULL THEN RETURN NULL; END IF;
  PERFORM 1 FROM public.order_push_devices
    WHERE endpoint = p_endpoint AND customer_id = owner_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF p_store IS NOT NULL AND p_promotions IS NOT NULL THEN
    INSERT INTO public.podwave_push_opt_ins VALUES (p_endpoint, owner_id, p_store, p_promotions)
    ON CONFLICT (endpoint) DO UPDATE SET customer_id = owner_id,
      store_notices = p_store, promotions = p_promotions;
    DELETE FROM public.order_push_queue q USING public.podwave_push_campaigns c
    WHERE q.endpoint = p_endpoint AND q.customer_id = owner_id AND q.status = 'store_campaign'
      AND q.order_id = c.id::text
      AND CASE c.audience WHEN 'store' THEN NOT p_store ELSE NOT p_promotions END;
  END IF;
  RETURN coalesce((SELECT jsonb_build_object('store', store_notices, 'promotions', promotions)
    FROM public.podwave_push_opt_ins WHERE endpoint = p_endpoint AND customer_id = owner_id),
    '{"store":false,"promotions":false}'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.podwave_queue_store_campaign(
  p_actor text, p_id uuid, p_audience text, p_payload jsonb
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE total integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('podwave_store_campaign'));
  SELECT queued INTO total FROM public.podwave_push_campaigns WHERE id = p_id AND actor = p_actor;
  IF FOUND THEN RETURN total; END IF;
  IF EXISTS (SELECT 1 FROM public.podwave_push_campaigns WHERE created_at > now() - interval '1 minute')
  THEN RAISE EXCEPTION 'Aguarde um minuto antes de enviar outro comunicado.'; END IF;
  INSERT INTO public.podwave_push_campaigns (id, actor, audience, payload)
    VALUES (p_id, p_actor, p_audience, p_payload);
  INSERT INTO public.order_push_queue (endpoint, customer_id, order_id, status)
    SELECT d.endpoint, d.customer_id, p_id::text, 'store_campaign'
    FROM public.order_push_devices d JOIN public.podwave_push_opt_ins o USING (endpoint, customer_id)
    WHERE CASE p_audience WHEN 'store' THEN o.store_notices WHEN 'promotion' THEN o.promotions ELSE false END;
  GET DIAGNOSTICS total = ROW_COUNT;
  UPDATE public.podwave_push_campaigns SET queued = total WHERE id = p_id;
  RETURN total;
END $$;

CREATE OR REPLACE FUNCTION public.podwave_store_campaign_payload(p_id text, p_endpoint text, p_owner text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT c.payload FROM public.podwave_push_campaigns c
  JOIN public.podwave_push_opt_ins o ON o.endpoint = p_endpoint AND o.customer_id = p_owner
  JOIN public.order_push_devices d USING (endpoint, customer_id)
  WHERE c.id::text = p_id AND CASE c.audience WHEN 'store' THEN o.store_notices ELSE o.promotions END
$$;

REVOKE ALL ON FUNCTION public.podwave_store_push_preferences(text, boolean, boolean),
  public.podwave_queue_store_campaign(text, uuid, text, jsonb),
  public.podwave_store_campaign_payload(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.podwave_store_push_preferences(text, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.podwave_queue_store_campaign(text, uuid, text, jsonb),
  public.podwave_store_campaign_payload(text, text, text) TO service_role;

COMMIT;
