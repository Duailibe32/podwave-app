-- ==============================================================================
-- PODWAVE MIGRATION: 20261030040000_add_customer_orders_coupon_and_vip_columns.sql
-- Adiciona colunas coupon_code e vip_discount em public.customer_orders
-- Garante compatibilidade total e recarrega o cache do PostgREST
-- ==============================================================================

DO $$
BEGIN
  -- 1. Coluna coupon_code
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'customer_orders' 
      AND column_name = 'coupon_code'
  ) THEN
    ALTER TABLE public.customer_orders ADD COLUMN coupon_code TEXT;
  END IF;

  -- 2. Coluna vip_discount_applied
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'customer_orders' 
      AND column_name = 'vip_discount_applied'
  ) THEN
    ALTER TABLE public.customer_orders ADD COLUMN vip_discount_applied BOOLEAN DEFAULT false;
  END IF;

  -- 3. Coluna vip_discount_amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'customer_orders' 
      AND column_name = 'vip_discount_amount'
  ) THEN
    ALTER TABLE public.customer_orders ADD COLUMN vip_discount_amount NUMERIC(10, 2) DEFAULT 0;
  END IF;
END $$;

-- Recarrega o cache de schema do PostgREST para evitar o erro "Não foi possível encontrar a coluna no cache do esquema"
NOTIFY pgrst, 'reload schema';
