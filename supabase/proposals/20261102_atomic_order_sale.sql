-- Install after reviewing the live schema and the existing atomic sale RPC in staging.
-- No data migration or stock backfill. Deploy before the matching frontend.
BEGIN;
DO $$ BEGIN
  IF to_regprocedure('public.save_sale_with_stock(jsonb,integer,text,boolean)') IS NULL
     OR to_regprocedure('public.is_admin()') IS NULL
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
       AND table_name='customer_orders' AND column_name='delivery_info' AND data_type='jsonb') THEN
    RAISE EXCEPTION 'Review/install the atomic sale RPC and order schema before this proposal.';
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.save_order_with_sale(
  p_order_id text, p_expected_version integer, p_status text, p_delivery_info jsonb,
  p_sale jsonb DEFAULT NULL, p_expected_sale_revision integer DEFAULT 0, p_request_id text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE prior public.customer_orders%ROWTYPE; saved public.customer_orders%ROWTYPE;
  sale_result jsonb; info jsonb; expected_sale_id text; current_version integer;
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.is_admin(),false) THEN
    RAISE EXCEPTION 'Administrative order access required.' USING ERRCODE='42501';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('recebido','confirmado','em_separacao','enviado','entregue','cancelado')
     OR jsonb_typeof(p_delivery_info) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid order mutation.' USING ERRCODE='22023';
  END IF;
  SELECT * INTO prior FROM public.customer_orders WHERE id::text=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order absent or inaccessible.' USING ERRCODE='42501'; END IF;
  current_version:=COALESCE((prior.delivery_info->>'version')::integer,1);
  IF p_expected_version IS DISTINCT FROM current_version THEN
    RAISE EXCEPTION 'Order changed on another device. Reload before retrying.' USING ERRCODE='40001';
  END IF;
  info:=p_delivery_info || jsonb_build_object('version',current_version+1,'updatedAt',clock_timestamp());
  IF p_sale IS NOT NULL THEN
    expected_sale_id:=COALESCE(NULLIF(prior.delivery_info->>'financialSaleId',''),'sale-ord-'||p_order_id);
    IF p_sale->>'id' IS DISTINCT FROM expected_sale_id THEN
      RAISE EXCEPTION 'Sale does not belong to this order.' USING ERRCODE='22023';
    END IF;
    p_sale:=p_sale || jsonb_build_object('order_status',CASE WHEN p_status='cancelado' THEN 'cancelado'
      WHEN p_status='entregue' THEN 'entregue' ELSE 'confirmado' END);
    sale_result:=public.save_sale_with_stock(p_sale,p_expected_sale_revision,p_request_id,false);
    IF sale_result->'sale' IS NULL THEN RAISE EXCEPTION 'Sale was not confirmed.'; END IF;
    info:=info || jsonb_build_object(
      'financialSaleId',sale_result->'sale'->>'id',
      'financialRecordedAt',COALESCE(NULLIF(prior.delivery_info->'financialRecordedAt','null'::jsonb),to_jsonb(clock_timestamp())),
      'stockDeducted',COALESCE((sale_result->'sale'->>'stock_deducted')::boolean,false));
    IF COALESCE((sale_result->'sale'->>'stock_deducted')::boolean,false) THEN
      info:=info || jsonb_build_object('stockDeductedAt',COALESCE(NULLIF(prior.delivery_info->'stockDeductedAt','null'::jsonb),to_jsonb(clock_timestamp())));
    ELSE info:=info || jsonb_build_object('stockDeductedAt',NULL); END IF;
  ELSE
    -- A metadata/payment-only update cannot invent a linked sale or a stock allocation.
    IF NULLIF(prior.delivery_info->>'financialSaleId','') IS NOT NULL AND
       (p_delivery_info->'paymentStatus' IS DISTINCT FROM prior.delivery_info->'paymentStatus'
        OR p_delivery_info->'amountPaid' IS DISTINCT FROM prior.delivery_info->'amountPaid') THEN
      RAISE EXCEPTION 'Payment update requires the linked sale.' USING ERRCODE='22023';
    END IF;
    info:=info || jsonb_build_object('financialSaleId',prior.delivery_info->'financialSaleId',
      'financialRecordedAt',prior.delivery_info->'financialRecordedAt',
      'stockDeducted',COALESCE((prior.delivery_info->>'stockDeducted')::boolean,false),
      'stockDeductedAt',prior.delivery_info->'stockDeductedAt');
    IF p_status IS DISTINCT FROM prior.status AND
       (p_status IN ('confirmado','em_separacao','enviado','entregue') OR
        (p_status='cancelado' AND (COALESCE((prior.delivery_info->>'stockDeducted')::boolean,false)
          OR NULLIF(prior.delivery_info->>'financialSaleId','') IS NOT NULL))) THEN
      RAISE EXCEPTION 'Stock transition requires the linked sale.' USING ERRCODE='22023';
    END IF;
  END IF;
  UPDATE public.customer_orders SET status=p_status,delivery_info=info WHERE id::text=p_order_id RETURNING * INTO saved;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order update was not confirmed.' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('order',to_jsonb(saved),'sale',sale_result->'sale');
END $$;
REVOKE ALL ON FUNCTION public.save_order_with_sale(text,integer,text,jsonb,jsonb,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_order_with_sale(text,integer,text,jsonb,jsonb,integer,text) TO authenticated;
COMMIT;
