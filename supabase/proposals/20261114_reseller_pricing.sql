BEGIN;

CREATE TABLE IF NOT EXISTS public.podwave_resellers (
  customer_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS public.podwave_reseller_prices (
  model_id text REFERENCES public.product_models(id) ON DELETE CASCADE,
  min_quantity integer CHECK (min_quantity BETWEEN 6 AND 999999),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price > 0),
  PRIMARY KEY (model_id, min_quantity)
);
ALTER TABLE public.podwave_resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podwave_reseller_prices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.podwave_resellers, public.podwave_reseller_prices FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.podwave_reseller_catalog()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.min_quantity), '[]'::jsonb)
  FROM public.podwave_reseller_prices p
  WHERE public.is_admin() OR EXISTS (
    SELECT 1 FROM public.podwave_resellers r WHERE r.customer_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.podwave_reseller_admin(p_customer uuid, p_approved boolean)
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF public.is_admin() IS NOT TRUE THEN RAISE EXCEPTION 'Acesso restrito.' USING ERRCODE = '42501'; END IF;
  IF p_customer IS NOT NULL THEN
    IF p_approved THEN
      INSERT INTO public.podwave_resellers VALUES (p_customer) ON CONFLICT DO NOTHING;
    ELSE
      DELETE FROM public.podwave_resellers WHERE customer_id = p_customer;
    END IF;
  END IF;
  RETURN ARRAY(SELECT customer_id FROM public.podwave_resellers);
END $$;

CREATE OR REPLACE FUNCTION public.podwave_save_reseller_prices(p_model text, p_prices jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE retail numeric;
BEGIN
  IF public.is_admin() IS NOT TRUE THEN RAISE EXCEPTION 'Acesso restrito.' USING ERRCODE = '42501'; END IF;
  SELECT starting_price INTO retail FROM public.product_models WHERE id = p_model FOR UPDATE;
  IF NOT FOUND OR jsonb_typeof(p_prices) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Confira o modelo e as faixas.';
  END IF;
  IF jsonb_array_length(p_prices) > 30 OR EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_prices) AS p(min_quantity integer, unit_price numeric)
    WHERE p.min_quantity IS NULL OR p.min_quantity < 6 OR p.unit_price IS NULL
      OR p.unit_price <= 0 OR p.unit_price > retail OR p.unit_price <> round(p.unit_price, 2)
  ) THEN RAISE EXCEPTION 'Use no mínimo 6 unidades e um preço válido até o valor de varejo.'; END IF;
  IF EXISTS (
    SELECT 1 FROM (
      SELECT unit_price, lag(unit_price) OVER (ORDER BY min_quantity) AS previous_price
      FROM jsonb_to_recordset(p_prices) AS p(min_quantity integer, unit_price numeric)
    ) prices WHERE unit_price > previous_price
  ) THEN RAISE EXCEPTION 'O preço unitário deve diminuir ou permanecer igual nas faixas maiores.'; END IF;
  DELETE FROM public.podwave_reseller_prices WHERE model_id = p_model;
  INSERT INTO public.podwave_reseller_prices (model_id, min_quantity, unit_price)
    SELECT p_model, p.min_quantity, p.unit_price
    FROM jsonb_to_recordset(p_prices) AS p(min_quantity integer, unit_price numeric);
END $$;

REVOKE ALL ON FUNCTION public.podwave_reseller_catalog(), public.podwave_reseller_admin(uuid, boolean),
  public.podwave_save_reseller_prices(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.podwave_reseller_catalog(), public.podwave_reseller_admin(uuid, boolean),
  public.podwave_save_reseller_prices(text, jsonb) TO authenticated;


CREATE OR REPLACE FUNCTION public.podwave_validate_checkout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  info jsonb := NEW.delivery_info;
  settings jsonb;
  promotions jsonb;
  config jsonb;
  addons jsonb;
  default_addons constant jsonb := '[
    {"id":"addon-usbc-turbo","price":16,"name":"Cabo USB tipo C 1m TURBO"},
    {"id":"addon-lanyard","price":12,"name":"Cordão Anti-Queda PodWave"},
    {"id":"addon-silicone-cover","price":35,"name":"Carregador Portátil Chaveiro 1500mAh (Type-C / Lightning)"}
  ]';
  flash jsonb;
  flash_start timestamptz;
  flash_end timestamptz;
  checkout_time timestamptz;
  has_flash boolean := false;
  coupon public.coupons%ROWTYPE;
  coupon_code text := nullif(upper(trim(info->>'couponCode')), '');
  coupon_base numeric := 0;
  coupon_discount numeric := 0;
  vip_discount numeric := 0;
  vip_amount numeric := 0;
  progressive_discount numeric := 0;
  flash_base numeric := 0;
  flash_discount numeric := 0;
  pod_subtotal numeric := 0;
  addons_subtotal numeric := 0;
  subtotal numeric;
  discount numeric;
  shipping numeric := 0;
  distance_km numeric;
  rate numeric;
  pod_units integer := 0;
  tier2 numeric;
  tier3 numeric;
  tier text;
  tier_value numeric;
  free_shipping boolean := false;
  uses_coupon boolean := false;
  line record;
  product record;
  addon jsonb;
  line_price numeric;
  is_reseller boolean := EXISTS (SELECT 1 FROM public.podwave_resellers WHERE customer_id = auth.uid());
  canonical_lines jsonb := '[]';
  quote_changed constant text := 'O catálogo ou a oferta mudou. Atualize a loja e confira o carrinho.';
BEGIN
  IF NEW.status IS DISTINCT FROM 'recebido'
     OR NEW.customer_id::text IS DISTINCT FROM auth.uid()::text
     OR jsonb_typeof(info) IS DISTINCT FROM 'object'
     OR coalesce(info->>'deliveryType', '') NOT IN ('pickup', 'delivery')
     OR jsonb_typeof(NEW.items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Confira a conta e a forma de entrega do pedido.' USING ERRCODE = 'PWA01';
  END IF;
  IF jsonb_array_length(NEW.items) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Confira a quantidade de itens no carrinho.' USING ERRCODE = 'PWA01';
  END IF;

  SELECT to_jsonb(s) INTO settings FROM public.store_settings s
    WHERE s.id <> 'promotions_config' ORDER BY (s.id = 'main') DESC, s.id LIMIT 1;
  BEGIN
    SELECT s.legal_notice::jsonb INTO promotions FROM public.store_settings s WHERE s.id = 'promotions_config';
  EXCEPTION WHEN invalid_text_representation THEN
    promotions := NULL;
  END;
  config := coalesce(nullif(promotions->'progressiveDiscountConfig', 'null'),
    nullif(settings->'progressive_discount_config', 'null'), '{}');
  addons := coalesce(nullif(promotions->'complementaryAddons', 'null'),
    nullif(settings->'complementary_addons', 'null'), default_addons);
  IF jsonb_typeof(addons) <> 'array' OR addons = '[]' THEN addons := default_addons; END IF;
  flash := config->'flashSale';

  -- Serialize redemptions of the same code. The AFTER trigger counts only inserted rows.
  IF coupon_code IS NOT NULL THEN
    SELECT c.* INTO coupon FROM public.coupons c
    WHERE upper(c.code) = coupon_code ORDER BY c.id LIMIT 1 FOR UPDATE;
    IF NOT FOUND OR coupon.active IS FALSE
      OR (coalesce(coupon.max_uses, 0) > 0 AND coalesce(coupon.used_count, 0) >= coupon.max_uses)
      OR coupon.discount_type NOT IN ('percent', 'fixed', 'free_shipping') THEN
      RAISE EXCEPTION 'Este cupom está indisponível. Confira o novo total.' USING ERRCODE = 'PWA02';
    END IF;
  END IF;

  checkout_time := clock_timestamp();
  IF flash->'enabled' = 'true' AND jsonb_typeof(flash->'percent') = 'number'
     AND (flash->>'percent')::numeric > 0 AND (flash->>'percent')::numeric <= 100 THEN
    BEGIN
      flash_start := (flash->>'startsAt')::timestamptz;
      flash_end := (flash->>'endsAt')::timestamptz;
      has_flash := coalesce(checkout_time >= flash_start AND checkout_time < flash_end
        AND flash_end - flash_start <= interval '24 hours', false);
    EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
      has_flash := false;
    END;
  END IF;

  -- One line per product/flavor, so split quantities cannot evade the stock check.
  FOR line IN
    SELECT item, count(*) OVER (PARTITION BY item->>'modelId', item->>'flavorId') AS copies
    FROM jsonb_array_elements(NEW.items) AS entry(item)
  LOOP
    IF line.copies <> 1 OR jsonb_typeof(line.item->'quantity') IS DISTINCT FROM 'number'
       OR jsonb_typeof(line.item->'price') IS DISTINCT FROM 'number'
       OR (line.item->>'quantity') !~ '^[1-9][0-9]{0,5}$' THEN
      RAISE EXCEPTION 'Confira a quantidade de cada item no carrinho.' USING ERRCODE = 'PWA01';
    END IF;
    IF line.item->>'modelId' = 'addon' THEN
      -- The store offers three configured slots with the same fallback as the cart.
      SELECT slot.item INTO addon FROM (
        SELECT coalesce((SELECT a.item FROM jsonb_array_elements(addons) AS a(item)
                           WHERE a.item->>'id' = d.item->>'id' LIMIT 1),
                         addons->((d.position - 1)::integer), d.item) AS item
        FROM jsonb_array_elements(default_addons) WITH ORDINALITY AS d(item, position)
      ) slot WHERE slot.item->>'id' = line.item->>'flavorId' LIMIT 1;
      IF NOT FOUND OR addon->'active' = 'false' OR (line.item->>'quantity')::integer <> 1 THEN
        RAISE EXCEPTION 'Um acessório do carrinho ficou indisponível.' USING ERRCODE = 'PWA01';
      END IF;
      line_price := coalesce((addon->>'price')::numeric, 0);
      addons_subtotal := addons_subtotal + line_price;
      canonical_lines := canonical_lines || (line.item || jsonb_build_object(
        'id', addon->>'id', 'brandName', 'Compre Junto', 'modelName', addon->>'name',
        'flavorName', coalesce(nullif(addon->>'description',''), 'Acessório'), 'imageUrl', ''));
    ELSE
      SELECT m.starting_price, m.active, m.brand_name, m.model_name, m.image_url,
             f.name, f.in_stock, f.demo_quantity
      INTO product FROM public.product_models m
      JOIN public.flavor_variants f ON f.model_id = m.id
      WHERE m.id = line.item->>'modelId' AND f.id = line.item->>'flavorId';
      IF NOT FOUND OR product.active IS NOT TRUE OR product.in_stock IS FALSE
        OR product.demo_quantity < (line.item->>'quantity')::integer THEN
        RAISE EXCEPTION 'Um produto ou sabor ficou indisponível na quantidade escolhida.' USING ERRCODE = 'PWA01';
      END IF;
      line_price := product.starting_price;
      IF is_reseller THEN
        SELECT least(p.unit_price, product.starting_price) INTO line_price
        FROM public.podwave_reseller_prices p
        WHERE p.model_id = line.item->>'modelId'
          AND p.min_quantity <= (
            SELECT sum((entry.item->>'quantity')::integer)
            FROM jsonb_array_elements(NEW.items) AS entry(item)
            WHERE entry.item->>'modelId' = p.model_id
              AND (entry.item->>'quantity') ~ '^[1-9][0-9]{0,5}$'
          )
        ORDER BY p.min_quantity DESC LIMIT 1;
        line_price := coalesce(line_price, product.starting_price);
      END IF;
      pod_units := pod_units + (line.item->>'quantity')::integer;
      pod_subtotal := pod_subtotal + line_price * (line.item->>'quantity')::integer;
      IF coupon.id IS NOT NULL AND coupon.applicable_model_id = line.item->>'modelId' THEN
        coupon_base := coupon_base + line_price * (line.item->>'quantity')::integer;
      END IF;
      IF has_flash AND product.demo_quantity > 0 AND flash->>'modelId' = line.item->>'modelId'
        AND (nullif(flash->>'flavorId', '') IS NULL OR flash->>'flavorId' = line.item->>'flavorId') THEN
        flash_base := flash_base + round(line_price, 2) * (line.item->>'quantity')::integer;
      END IF;
      canonical_lines := canonical_lines || (line.item || jsonb_build_object(
        'id', (line.item->>'modelId') || '-' || (line.item->>'flavorId'),
        'brandName', product.brand_name, 'modelName', product.model_name, 'flavorName', product.name,
        'imageUrl', coalesce(nullif(product.image_url,''), '/assets/images/logo.png')));
    END IF;
    IF line_price IS NULL OR line_price < 0 OR line_price <> (line.item->>'price')::numeric THEN
      RAISE EXCEPTION '%', quote_changed USING ERRCODE = 'PWA01';
    END IF;
  END LOOP;
  IF pod_units = 0 THEN
    RAISE EXCEPTION 'Adicione um produto do catálogo para concluir o pedido.' USING ERRCODE = 'PWA01';
  END IF;

  subtotal := round(pod_subtotal, 2) + round(addons_subtotal, 2);
  SELECT round(pod_subtotal * coalesce(nullif(p.vip_discount_custom, 0),
    nullif((promotions->>'vipDiscountPercent')::numeric, 0), 10) / 100, 2) INTO vip_discount
  FROM public.customer_profiles p WHERE p.id = NEW.customer_id AND p.role = 'vip';
  vip_discount := coalesce(vip_discount, 0);
  tier2 := greatest(1, coalesce(nullif((config->>'tier2MinUnits')::numeric, 0), 2));
  tier3 := greatest(tier2, coalesce(nullif((config->>'tier3MinUnits')::numeric, 0), 3));
  IF config->'enabled' IS DISTINCT FROM 'false' THEN
    IF pod_units >= tier3 THEN tier := 'tier3';
    ELSIF pod_units >= tier2 THEN tier := 'tier2';
    END IF;
    IF tier IS NOT NULL THEN
      tier_value := greatest(0, coalesce((config->>(tier || 'DiscountPercent'))::numeric,
        CASE WHEN tier = 'tier3' THEN 10 ELSE 5 END));
      progressive_discount := round(CASE WHEN config->>(tier || 'DiscountType') = 'fixed'
        THEN least(pod_subtotal, tier_value) ELSE pod_subtotal * tier_value / 100 END, 2);
    END IF;
    free_shipping := coalesce(config->'tier2FreeShipping' = 'true' AND pod_units >= tier2, false);
  END IF;
  IF has_flash THEN flash_discount := round(flash_base * (flash->>'percent')::numeric / 100, 2); END IF;

  IF coupon.id IS NOT NULL THEN
    IF coupon.applicable_model_id IS NULL OR coupon.applicable_model_id IN ('', 'all') THEN
      coupon_base := pod_subtotal + addons_subtotal;
    ELSIF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(canonical_lines) AS l(item)
                        WHERE l.item->>'modelId' = coupon.applicable_model_id) THEN
      RAISE EXCEPTION 'O cupom é restrito a outro modelo.' USING ERRCODE = 'PWA02';
    END IF;
    IF pod_subtotal < coalesce(coupon.min_order_value, 0) THEN
      RAISE EXCEPTION 'O pedido não atingiu o mínimo para este cupom.' USING ERRCODE = 'PWA02';
    END IF;
    coupon_discount := round(CASE coupon.discount_type
      WHEN 'percent' THEN coupon_base * coupon.value / 100
      WHEN 'fixed' THEN least(coupon.value, coupon_base)
      ELSE 0 END, 2);
  END IF;
  discount := least(subtotal, greatest(vip_discount, progressive_discount, flash_discount, coupon_discount));
  IF discount > 0 AND least(subtotal, vip_discount) = discount THEN vip_amount := discount; END IF;
  uses_coupon := discount > 0 AND least(subtotal, coupon_discount) = discount
    AND least(subtotal, greatest(vip_discount, progressive_discount, flash_discount)) < discount;

  IF info->>'deliveryType' = 'delivery' THEN
    IF config->>'deliveryPricingMode' = 'per_km' THEN
      rate := (config->>'deliveryRatePerKm')::numeric;
      SELECT (zone.item->>'distanceKm')::numeric INTO distance_km
      FROM jsonb_array_elements(coalesce(nullif(config->'deliveryCities','null'), '[]')) AS zone(item)
      WHERE public.podwave_checkout_city((zone.item->>'city') || ' - ' || (zone.item->>'state'))
          = public.podwave_checkout_city(coalesce(nullif(info->>'destinationCity', ''),
            split_part(info->>'addressSummary', ' - ', -2) || ' - ' || split_part(info->>'addressSummary', ' - ', -1)))
        AND (zone.item->>'distanceKm')::numeric >= 0
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(coalesce(nullif(config->'deliveryOrigins','null'),
            '[{"id":"base-codo","city":"Codó","state":"MA"},{"id":"base-sao-bernardo","city":"São Bernardo","state":"MA"}]')) AS origin(item)
          WHERE origin.item->>'id' = zone.item->>'originId'
            AND nullif(trim(origin.item->>'city'),'') IS NOT NULL
            AND nullif(trim(origin.item->>'state'),'') IS NOT NULL
        )
      ORDER BY 1 LIMIT 1;
      IF distance_km IS NULL OR coalesce(rate, 0) <= 0 THEN
        RAISE EXCEPTION 'Confira a cidade e a UF para calcular o frete.' USING ERRCODE = 'PWA01';
      END IF;
      shipping := round(greatest(0, (config->>'deliveryMinimumFee')::numeric, distance_km * rate), 2);
    ELSE
      shipping := round(greatest(0, (config->>'baseDeliveryFee')::numeric), 2);
    END IF;
    IF free_shipping OR coupon.discount_type = 'free_shipping' THEN
      uses_coupon := uses_coupon OR (NOT free_shipping AND shipping > 0);
      shipping := 0;
    END IF;
  END IF;

  IF NEW.subtotal IS DISTINCT FROM subtotal OR NEW.discount IS DISTINCT FROM discount
    OR NEW.total IS DISTINCT FROM (subtotal - discount + shipping)
    OR coalesce((info->>'deliveryFee')::numeric, 0) <> shipping THEN
    RAISE EXCEPTION '%', quote_changed USING ERRCODE = 'PWA01';
  END IF;

  NEW.items := canonical_lines;
  NEW := jsonb_populate_record(NEW, jsonb_build_object(
    'coupon_code', CASE WHEN uses_coupon THEN coupon.code END, 'vip_discount_applied', vip_amount > 0,
    'vip_discount_amount', vip_amount, 'delivery_fee', shipping, 'delivery_type', info->>'deliveryType',
    'payment_status', 'pendente', 'amount_paid', 0, 'whatsapp_confirmation_sent', false));
  NEW.delivery_info := info || jsonb_build_object(
    'couponCode', CASE WHEN uses_coupon THEN coupon.code END, 'vipDiscountApplied', vip_amount > 0,
    'vipDiscountAmount', vip_amount, 'deliveryFee', shipping, 'customerId', NEW.customer_id,
    'paymentStatus', 'pendente', 'amountPaid', 0, 'version', 1, 'stockDeducted', false,
    'stockDeductedAt', null, 'loyaltyEligible', true, 'loyaltyStampGranted', false,
    'loyaltyStampGrantedAt', null, 'loyaltyStampGrantedBy', null, 'loyaltyGrantIdempotencyKey', null,
    'financialSaleId', null, 'financialRecordedAt', null, 'cancelReason', null,
    'statusHistory', jsonb_build_array(jsonb_build_object('id', NEW.id, 'fromStatus', null,
      'toStatus', 'recebido', 'changedAt', checkout_time, 'changedBy', 'Cliente', 'origin', 'checkout')));
  RETURN NEW;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RAISE EXCEPTION 'Confira o carrinho e tente novamente.' USING ERRCODE = 'PWA01';
END $$;


COMMIT;
