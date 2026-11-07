-- Optional Web Push backend. Schedule the order-push Edge Function separately.
BEGIN;

CREATE TABLE IF NOT EXISTS public.order_push_devices (
  endpoint text PRIMARY KEY,
  customer_id text NOT NULL,
  p256dh text NOT NULL,
  auth_secret text NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_push_devices_customer_idx
ON public.order_push_devices (customer_id, registered_at DESC);

CREATE TABLE IF NOT EXISTS public.order_push_queue (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  endpoint text NOT NULL REFERENCES public.order_push_devices(endpoint) ON DELETE CASCADE,
  customer_id text NOT NULL,
  order_id text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  next_attempt timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS order_push_queue_ready_idx ON public.order_push_queue (next_attempt, id);

ALTER TABLE public.order_push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_push_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_push_devices, public.order_push_queue FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.order_push_devices TO service_role;
GRANT SELECT, DELETE, UPDATE ON public.order_push_queue TO service_role;

CREATE OR REPLACE FUNCTION public.podwave_register_order_push(p_endpoint text, p_p256dh text, p_auth text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE owner_id text := auth.uid()::text;
BEGIN
  IF owner_id IS NULL OR p_endpoint IS NULL OR p_p256dh IS NULL OR p_auth IS NULL
    OR length(p_endpoint) > 2048
    OR p_endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[^[:space:]]+$'
    OR p_p256dh !~ '^[A-Za-z0-9_-]{87}$' OR p_auth !~ '^[A-Za-z0-9_-]{22}$' THEN
    RETURN false;
  END IF;
  INSERT INTO public.order_push_devices AS d (endpoint, customer_id, p256dh, auth_secret)
  VALUES (p_endpoint, owner_id, p_p256dh, p_auth)
  ON CONFLICT (endpoint) DO UPDATE SET customer_id = owner_id, registered_at = now()
  WHERE d.p256dh = p_p256dh AND d.auth_secret = p_auth;
  IF NOT FOUND THEN RETURN false; END IF;
  DELETE FROM public.order_push_queue WHERE endpoint = p_endpoint AND customer_id <> owner_id;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.podwave_remove_order_push(p_endpoint text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  DELETE FROM public.order_push_devices WHERE endpoint = p_endpoint AND customer_id = auth.uid()::text;
$$;

CREATE OR REPLACE FUNCTION public.podwave_queue_order_push()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO public.order_push_queue(endpoint, customer_id, order_id, status)
  SELECT endpoint, customer_id, NEW.id::text, NEW.status FROM public.order_push_devices
  WHERE customer_id = NEW.customer_id::text
  ORDER BY registered_at DESC LIMIT 10;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.podwave_claim_order_push()
RETURNS TABLE(id bigint, endpoint text, customer_id text, order_id text, status text,
              attempts integer, p256dh text, auth_secret text)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  WITH obsolete AS (
    DELETE FROM public.order_push_queue q WHERE q.created_at < now() - interval '1 day'
      OR (q.attempts >= 5 AND q.next_attempt <= now())
  ), batch AS (
    SELECT q.id FROM public.order_push_queue q
    JOIN public.order_push_devices d ON d.endpoint = q.endpoint AND d.customer_id = q.customer_id
    WHERE q.attempts < 5 AND q.next_attempt <= now() AND q.created_at >= now() - interval '1 day'
    ORDER BY q.next_attempt, q.id LIMIT 25 FOR UPDATE OF q SKIP LOCKED
  ), leased AS (
    UPDATE public.order_push_queue q SET attempts = q.attempts + 1, next_attempt = now() + interval '2 minutes'
    FROM batch WHERE batch.id = q.id RETURNING q.*
  )
  SELECT l.id, l.endpoint, l.customer_id, l.order_id, l.status, l.attempts, d.p256dh, d.auth_secret
  FROM leased l JOIN public.order_push_devices d ON d.endpoint = l.endpoint AND d.customer_id = l.customer_id;
$$;

REVOKE ALL ON FUNCTION public.podwave_register_order_push(text,text,text), public.podwave_remove_order_push(text),
  public.podwave_queue_order_push(), public.podwave_claim_order_push() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.podwave_register_order_push(text,text,text), public.podwave_remove_order_push(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.podwave_claim_order_push() TO service_role;

DROP TRIGGER IF EXISTS podwave_queue_order_push ON public.customer_orders;
CREATE TRIGGER podwave_queue_order_push AFTER UPDATE OF status ON public.customer_orders
FOR EACH ROW WHEN (NEW.status IS DISTINCT FROM OLD.status
  AND NEW.status IN ('confirmado', 'em_separacao', 'enviado', 'entregue', 'cancelado'))
EXECUTE FUNCTION public.podwave_queue_order_push();

COMMIT;
