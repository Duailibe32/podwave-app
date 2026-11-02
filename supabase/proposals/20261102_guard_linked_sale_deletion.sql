-- Apply before the matching frontend. No data rewrite or stock backfill.
-- Linked sales are retained; cancel their order through save_order_with_sale.
BEGIN;
DO $$ BEGIN
  IF to_regclass('public.customer_orders') IS NULL
     OR to_regprocedure('public.save_sale_with_stock(jsonb,integer,text,boolean)') IS NULL THEN
    RAISE EXCEPTION 'Install the order schema and atomic sale RPC first.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.guard_linked_order_sale_deletion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  -- Read all links, even if the caller cannot SELECT a particular order through RLS.
  -- No writes or authorization grants: raising aborts the entire stock/delete RPC.
  IF EXISTS (SELECT 1 FROM public.customer_orders o
    WHERE o.delivery_info->>'financialSaleId'=OLD.id::text
       OR 'sale-ord-'||o.id::text=OLD.id::text
       OR 'sale-'||o.id::text=OLD.id::text) THEN
    RAISE EXCEPTION 'Venda vinculada a um pedido. Cancele pela Central de Pedidos; preserve a venda para auditoria.'
      USING ERRCODE='23503';
  END IF;
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.guard_linked_order_sale_deletion() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_guard_linked_order_sale_deletion ON public.manual_sales;
CREATE TRIGGER trg_guard_linked_order_sale_deletion BEFORE DELETE ON public.manual_sales
FOR EACH ROW EXECUTE FUNCTION public.guard_linked_order_sale_deletion();
COMMIT;
