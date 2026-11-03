-- Apply before publishing frontend support for free_shipping coupons.
-- Schema inspected in production: coupons.discount_type TEXT, named type CHECK.
-- No coupon is created and no RLS/ACL/data is rewritten.
BEGIN;
DO $$
DECLARE definition text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint
    WHERE conrelid='public.coupons'::regclass AND conname='coupons_discount_type_check';
  IF definition IS NULL OR definition NOT IN (
    $old$CHECK ((discount_type = ANY (ARRAY['percent'::text, 'fixed'::text])))$old$,
    $new$CHECK ((discount_type = ANY (ARRAY['percent'::text, 'fixed'::text, 'free_shipping'::text])))$new$
  ) THEN RAISE EXCEPTION 'A restrição de tipo de cupom difere da versão revisada. Nenhuma alteração aplicada.'; END IF;
END $$;
ALTER TABLE public.coupons DROP CONSTRAINT coupons_discount_type_check;
ALTER TABLE public.coupons ADD CONSTRAINT coupons_discount_type_check
  CHECK (discount_type IN ('percent','fixed','free_shipping'));
ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_free_shipping_zero_value;
ALTER TABLE public.coupons ADD CONSTRAINT coupons_free_shipping_zero_value
  CHECK (discount_type <> 'free_shipping' OR value = 0);
COMMIT;
