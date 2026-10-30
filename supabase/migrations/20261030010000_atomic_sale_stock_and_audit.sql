-- Apply only after reviewing the PR and checking the live flavor_variants schema.
-- No backfill: existing sales remain unmanaged and existing quantities are untouched.
BEGIN;
DO $$ BEGIN
  IF to_regprocedure('app_security.is_admin()') IS NULL THEN
    RAISE EXCEPTION 'Instalação não iniciada: a função de autorização app_security.is_admin() não existe. Confira as funções e políticas reais antes de instalar; não execute migrations antigas para suprir esta dependência.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='flavor_variants' AND column_name='demo_quantity') THEN
    RAISE EXCEPTION 'Estrutura de estoque não confirmada: flavor_variants.demo_quantity ausente. Nenhuma alteração aplicada.';
  END IF;
END $$;

ALTER TABLE public.manual_sales
  ADD COLUMN IF NOT EXISTS stock_managed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_revision integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_allocation jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS stock_request_id text;

CREATE TABLE IF NOT EXISTS public.business_audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  actor_id text,
  actor_label text,
  summary text,
  operation text NOT NULL,
  entity text NOT NULL,
  record_id text NOT NULL,
  before_data jsonb,
  after_data jsonb
);
CREATE INDEX IF NOT EXISTS business_audit_events_date ON public.business_audit_events(occurred_at DESC, id DESC);
ALTER TABLE public.business_audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_audit_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.business_audit_events TO authenticated;
DROP POLICY IF EXISTS "Admin read business audit" ON public.business_audit_events;
CREATE POLICY "Admin read business audit" ON public.business_audit_events FOR SELECT TO authenticated USING (app_security.is_admin());

CREATE OR REPLACE FUNCTION app_security.capture_business_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE b jsonb; a jsonb;
BEGIN
  IF TG_OP <> 'INSERT' THEN b := to_jsonb(OLD) - ARRAY['admin_password','password','anon_key','service_role_key','owner_uid']; END IF;
  IF TG_OP <> 'DELETE' THEN a := to_jsonb(NEW) - ARRAY['admin_password','password','anon_key','service_role_key','owner_uid']; END IF;
  IF TG_OP='UPDATE' AND (b - 'updated_at') = (a - 'updated_at') THEN RETURN NEW; END IF;
  INSERT INTO public.business_audit_events(actor_id, actor_label, summary, operation, entity, record_id, before_data, after_data)
    VALUES(auth.uid()::text, COALESCE(auth.jwt()->>'email',auth.uid()::text,'Sistema'),
      COALESCE(a->>'title',b->>'title',a->>'description',b->>'description',a->>'customer_name',b->>'customer_name',a->>'supplier',b->>'supplier',a->>'name',b->>'name',a->>'model_name',b->>'model_name',''),
      TG_OP, TG_TABLE_NAME, COALESCE(a->>'id',b->>'id'), b, a);
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app_security.capture_business_audit() FROM PUBLIC, anon, authenticated;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['manual_sales','manual_expenses','merchandise_purchases','cash_movements','initial_cash_balances','manual_commitments','brands','product_models','flavor_variants','banners','coupons'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS business_audit_capture ON public.%I',t);
    EXECUTE format('CREATE TRIGGER business_audit_capture AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION app_security.capture_business_audit()',t);
  END LOOP;
END $$;

-- Blocks stale app versions from bypassing the atomic save/delete path.
CREATE OR REPLACE FUNCTION app_security.require_atomic_sale_write() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF current_setting('podwave.atomic_sale_write', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Atualize o aplicativo: vendas devem usar a operação com controle de estoque.';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app_security.require_atomic_sale_write() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS require_atomic_sale_write ON public.manual_sales;
CREATE TRIGGER require_atomic_sale_write BEFORE INSERT OR UPDATE OR DELETE ON public.manual_sales
  FOR EACH ROW EXECUTE FUNCTION app_security.require_atomic_sale_write();

-- SECURITY INVOKER: existing RLS on sales and flavors continues to apply.
CREATE OR REPLACE FUNCTION public.save_sale_with_stock(p_sale jsonb, p_expected_revision integer, p_request_id text, p_delete boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  prior public.manual_sales%ROWTYPE; saved public.manual_sales%ROWTYPE;
  sale_id text := p_sale->>'id'; exists_prior boolean; managed boolean;
  desired jsonb := '{}'; previous jsonb := '{}'; item jsonb; v record;
  qty numeric; old_qty integer; new_qty integer; delta integer; available integer;
  variant_model text; variant_available boolean; model_available boolean;
BEGIN
  IF NOT app_security.is_admin() THEN RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE='42501'; END IF;
  IF sale_id IS NULL OR sale_id='' OR p_request_id IS NULL OR length(p_request_id)<8 THEN RAISE EXCEPTION 'Identificador da operação inválido.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(sale_id, 917));
  SELECT * INTO prior FROM public.manual_sales WHERE id=sale_id FOR UPDATE;
  exists_prior := FOUND;
  IF exists_prior AND prior.stock_request_id=p_request_id AND NOT p_delete THEN
    RETURN jsonb_build_object('sale',to_jsonb(prior));
  END IF;
  IF exists_prior AND prior.stock_revision IS DISTINCT FROM p_expected_revision THEN
    RAISE EXCEPTION 'Esta venda mudou em outro dispositivo. Recarregue os dados antes de editar.';
  END IF;
  IF NOT exists_prior AND p_delete THEN RETURN jsonb_build_object('deleted',true); END IF;
  IF NOT exists_prior AND (p_expected_revision<>0 OR EXISTS (SELECT 1 FROM public.business_audit_events WHERE entity='manual_sales' AND record_id=sale_id)) THEN
    RAISE EXCEPTION 'Esta venda foi excluída. Uma tentativa antiga não pode recriá-la.';
  END IF;
  PERFORM set_config('podwave.atomic_sale_write','on',true);
  managed := CASE WHEN exists_prior THEN prior.stock_managed ELSE true END;
  IF NOT exists_prior AND COALESCE((p_sale->>'stock_managed')::boolean,false)=false THEN
    RAISE EXCEPTION 'Venda local antiga: revise e vincule os itens ao estoque antes de enviar.';
  END IF;
  IF exists_prior THEN previous := prior.stock_allocation; END IF;
  IF NOT p_delete AND NOT managed AND p_sale->'items' IS DISTINCT FROM prior.items THEN
    RAISE EXCEPTION 'Venda anterior ao controle de estoque: os itens históricos devem ser preservados. Registre uma nova venda para novos produtos.';
  END IF;
  IF NOT p_delete AND managed THEN
    IF jsonb_typeof(p_sale->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(p_sale->'items')=0 THEN RAISE EXCEPTION 'Adicione produtos do catálogo à venda.'; END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(p_sale->'items') LOOP
      qty := (item->>'quantity')::numeric;
      IF qty IS NULL OR qty<=0 OR qty<>trunc(qty) OR qty>2147483647 THEN RAISE EXCEPTION 'A quantidade deve ser um número inteiro positivo.'; END IF;
      IF COALESCE(item->>'flavorId','')='' OR COALESCE(item->>'productId','')='' THEN RAISE EXCEPTION 'Selecione produto e sabor do catálogo para todos os itens.'; END IF;
      SELECT f.model_id INTO variant_model FROM public.flavor_variants f WHERE f.id=item->>'flavorId';
      IF NOT FOUND OR variant_model<>item->>'productId' THEN RAISE EXCEPTION 'O sabor não pertence ao produto selecionado.'; END IF;
      desired := jsonb_set(desired, ARRAY[item->>'flavorId'], to_jsonb(COALESCE((desired->>(item->>'flavorId'))::integer,0)+qty::integer));
    END LOOP;
    IF p_sale->>'order_status'='cancelado' THEN desired := '{}'; END IF;
  END IF;
  -- Deterministic row lock order prevents two sales from consuming the same stock.
  FOR v IN SELECT key FROM (SELECT jsonb_object_keys(previous) AS key UNION SELECT jsonb_object_keys(desired) AS key) s ORDER BY key LOOP
    SELECT f.demo_quantity, f.in_stock, COALESCE((to_jsonb(m)->>'active')::boolean,(to_jsonb(m)->>'is_active')::boolean,true)
      INTO available, variant_available, model_available FROM public.flavor_variants f JOIN public.product_models m ON m.id=f.model_id WHERE f.id=v.key FOR UPDATE OF f;
    IF NOT FOUND THEN RAISE EXCEPTION 'Um sabor vinculado à venda foi removido. Restaure o cadastro antes de ajustar a venda.'; END IF;
    old_qty := COALESCE((previous->>v.key)::integer,0); new_qty := COALESCE((desired->>v.key)::integer,0); delta := new_qty-old_qty;
    IF delta>0 AND (available IS NULL OR available<delta OR NOT COALESCE(variant_available,false) OR NOT model_available) THEN
      RAISE EXCEPTION 'Estoque insuficiente ou não informado para o sabor %. Disponível: %.',v.key,COALESCE(available::text,'não informado');
    END IF;
    IF delta<>0 THEN
      IF available IS NULL THEN RAISE EXCEPTION 'Defina o estoque deste sabor antes de devolver unidades.'; END IF;
      UPDATE public.flavor_variants SET demo_quantity=available-delta, in_stock=(available-delta)>0, updated_at=clock_timestamp() WHERE id=v.key;
    END IF;
  END LOOP;
  PERFORM set_config('podwave.atomic_sale_write','on',true);
  IF p_delete THEN
    DELETE FROM public.manual_sales WHERE id=sale_id;
    RETURN jsonb_build_object('deleted',true);
  END IF;
  INSERT INTO public.manual_sales(id,date,customer_name,customer_contact,items,subtotal,discount,delivery_fee,total,payment_method,payment_status,amount_received,amount_pending,due_date,payment_date,installments,payments,notes,stock_deducted,stock_managed,stock_revision,stock_allocation,stock_request_id)
    VALUES(sale_id,p_sale->>'date',COALESCE(p_sale->>'customer_name',''),p_sale->>'customer_contact',p_sale->'items',(p_sale->>'subtotal')::numeric,(p_sale->>'discount')::numeric,(p_sale->>'delivery_fee')::numeric,(p_sale->>'total')::numeric,p_sale->>'payment_method',p_sale->>'payment_status',(p_sale->>'amount_received')::numeric,(p_sale->>'amount_pending')::numeric,p_sale->>'due_date',p_sale->>'payment_date',COALESCE(p_sale->'installments','[]'),COALESCE(p_sale->'payments','[]'),p_sale->>'notes',desired<>'{}',managed,COALESCE(prior.stock_revision,0)+1,desired,p_request_id)
    ON CONFLICT(id) DO UPDATE SET date=EXCLUDED.date,customer_name=EXCLUDED.customer_name,customer_contact=EXCLUDED.customer_contact,items=EXCLUDED.items,subtotal=EXCLUDED.subtotal,discount=EXCLUDED.discount,delivery_fee=EXCLUDED.delivery_fee,total=EXCLUDED.total,payment_method=EXCLUDED.payment_method,payment_status=EXCLUDED.payment_status,amount_received=EXCLUDED.amount_received,amount_pending=EXCLUDED.amount_pending,due_date=EXCLUDED.due_date,payment_date=EXCLUDED.payment_date,installments=EXCLUDED.installments,payments=EXCLUDED.payments,notes=EXCLUDED.notes,stock_deducted=CASE WHEN managed THEN EXCLUDED.stock_deducted ELSE prior.stock_deducted END,stock_managed=EXCLUDED.stock_managed,stock_revision=EXCLUDED.stock_revision,stock_allocation=EXCLUDED.stock_allocation,stock_request_id=EXCLUDED.stock_request_id,updated_at=clock_timestamp()
    RETURNING * INTO saved;
  RETURN jsonb_build_object('sale',to_jsonb(saved));
END $$;
REVOKE ALL ON FUNCTION public.save_sale_with_stock(jsonb,integer,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_sale_with_stock(jsonb,integer,text,boolean) TO authenticated;

-- Stale catalog pushes must not restore quantities already consumed by a sale.
CREATE OR REPLACE FUNCTION app_security.guard_stock_snapshot() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    IF EXISTS(SELECT 1 FROM public.manual_sales WHERE stock_managed AND (stock_allocation->>OLD.id)::integer>0) THEN
      RAISE EXCEPTION 'Este sabor possui unidades vinculadas a vendas. Cancele as vendas antes de removê-lo.';
    END IF;
    RETURN OLD;
  END IF;
  IF (NEW.demo_quantity IS DISTINCT FROM OLD.demo_quantity OR NEW.in_stock IS DISTINCT FROM OLD.in_stock)
      AND current_setting('podwave.atomic_sale_write',true) IS DISTINCT FROM 'on'
      AND (NEW.updated_at IS NULL OR NEW.updated_at<=OLD.updated_at) THEN
    RAISE EXCEPTION 'Estoque alterado por outra operação. Recarregue o catálogo antes de enviar alterações.';
  END IF;
  NEW.updated_at := greatest(OLD.updated_at,NEW.updated_at,clock_timestamp());
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app_security.guard_stock_snapshot() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS guard_stock_snapshot ON public.flavor_variants;
CREATE TRIGGER guard_stock_snapshot BEFORE UPDATE OR DELETE ON public.flavor_variants FOR EACH ROW EXECUTE FUNCTION app_security.guard_stock_snapshot();
COMMIT;
