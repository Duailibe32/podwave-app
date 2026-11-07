-- Apply after publishing the checkout that sends destinationCity for per-km freight.
-- Requires the current catalog schema used by the production store.
BEGIN;

DO $$
BEGIN
  PERFORM starting_price, active, model_name, brand_name FROM public.product_models LIMIT 0;
  PERFORM demo_quantity, name, model_id FROM public.flavor_variants LIMIT 0;
  PERFORM discount_type, applicable_model_id, used_count FROM public.coupons LIMIT 0;
END $$;

CREATE OR REPLACE FUNCTION public.podwave_checkout_city(value text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT SET search_path = pg_catalog AS $$
  SELECT lower(trim(regexp_replace(regexp_replace(normalize(value, NFD),
    U&'[\0300-\036f]', '', 'g'), '[[:space:]]+', ' ', 'g')));
$$;

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

CREATE OR REPLACE FUNCTION public.podwave_consume_checkout_coupon()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  UPDATE public.coupons SET used_count = coalesce(used_count, 0) + 1
  WHERE id = (SELECT id FROM public.coupons
    WHERE upper(code) = upper(NEW.delivery_info->>'couponCode') ORDER BY id LIMIT 1)
    AND (coalesce(max_uses, 0) <= 0 OR coalesce(used_count, 0) < max_uses);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Este cupom está indisponível. Confira o novo total.' USING ERRCODE = 'PWA02';
  END IF;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.podwave_preserve_coupon_usage()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  NEW.used_count := greatest(0, OLD.used_count, NEW.used_count);
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.podwave_checkout_city(text),
  public.podwave_validate_checkout(), public.podwave_consume_checkout_coupon(),
  public.podwave_preserve_coupon_usage() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS podwave_validate_checkout ON public.customer_orders;
CREATE TRIGGER podwave_validate_checkout BEFORE INSERT ON public.customer_orders
FOR EACH ROW EXECUTE FUNCTION public.podwave_validate_checkout();
DROP TRIGGER IF EXISTS podwave_consume_checkout_coupon ON public.customer_orders;
CREATE TRIGGER podwave_consume_checkout_coupon AFTER INSERT ON public.customer_orders
FOR EACH ROW WHEN (NEW.delivery_info->>'couponCode' IS NOT NULL)
EXECUTE FUNCTION public.podwave_consume_checkout_coupon();
DROP TRIGGER IF EXISTS podwave_preserve_coupon_usage ON public.coupons;
CREATE TRIGGER podwave_preserve_coupon_usage BEFORE UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.podwave_preserve_coupon_usage();

COMMIT;
