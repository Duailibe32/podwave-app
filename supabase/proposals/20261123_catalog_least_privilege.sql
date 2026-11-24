-- Remove unused direct privileges while preserving storefront reads and admin CRUD via RLS.
BEGIN;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.banners, public.brands, public.coupons, public.flavor_variants, public.product_models
  FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE
  public.banners, public.brands, public.coupons, public.flavor_variants, public.product_models
  FROM anon;
DO $$
DECLARE rel regclass;
BEGIN
  FOREACH rel IN ARRAY ARRAY['public.banners'::regclass, 'public.brands'::regclass,
      'public.coupons'::regclass, 'public.flavor_variants'::regclass, 'public.product_models'::regclass]
  LOOP
    IF has_table_privilege('anon', rel, 'TRUNCATE') OR has_table_privilege('authenticated', rel, 'TRUNCATE')
       OR has_any_column_privilege('anon', rel, 'INSERT') OR has_any_column_privilege('anon', rel, 'UPDATE')
       OR has_table_privilege('anon', rel, 'DELETE')
       OR NOT has_table_privilege('anon', rel, 'SELECT')
       OR NOT has_table_privilege('authenticated', rel, 'UPDATE') THEN
      RAISE EXCEPTION 'Catalog privileges require review';
    END IF;
  END LOOP;
END $$;
COMMIT;
