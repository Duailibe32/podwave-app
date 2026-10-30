-- =========================================================================================
-- PROPOSTA DE MIGRAÇÃO INCREMENTAL NÃO DESTRUTIVA — CENTRAL DE PEDIDOS PODWAVE
-- Arquivo para revisão antes de execução manual no Supabase SQL Editor.
-- NENHUMA tabela ou registro existente é removido ou truncado.
-- =========================================================================================

BEGIN;

-- 1. Verificação de segurança: garante que a tabela customer_orders já existe antes de aplicar índices
DO $$
BEGIN
  IF to_regclass('public.customer_orders') IS NULL THEN
    RAISE EXCEPTION 'Tabela public.customer_orders não encontrada. Migração abortada com segurança.';
  END IF;
END $$;

-- 2. Índices incrementais para performance da Central de Pedidos (filtros por status, data e cliente)
CREATE INDEX IF NOT EXISTS idx_customer_orders_status_created_at
  ON public.customer_orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_orders_customer_created_at
  ON public.customer_orders (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_orders_order_code
  ON public.customer_orders (order_code);

-- 3. Índice funcional opcional sobre delivery_info->>'paymentStatus' e delivery_info->>'financialSaleId'
--    (Mantém total compatibilidade com a coluna JSONB delivery_info já existente)
CREATE INDEX IF NOT EXISTS idx_customer_orders_payment_status
  ON public.customer_orders ((delivery_info->>'paymentStatus'));

CREATE INDEX IF NOT EXISTS idx_customer_orders_financial_sale_id
  ON public.customer_orders ((delivery_info->>'financialSaleId'))
  WHERE (delivery_info->>'financialSaleId') IS NOT NULL;

-- 4. Garantia de publicação Realtime para public.customer_orders (idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'customer_orders'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_orders;
    END IF;
  END IF;
END $$;

COMMIT;
