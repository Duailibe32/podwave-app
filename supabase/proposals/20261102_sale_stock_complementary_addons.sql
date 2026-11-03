-- Targeted patch: keep complementary accessories in revenue, outside flavor stock.
-- Only the three fixed IDs emitted by the current checkout are accepted.
-- No data rewrite, grants, RLS or stock backfill. Apply in SQL Editor as owner.
BEGIN;
DO $patch$
DECLARE
  target regprocedure := to_regprocedure('public.save_sale_with_stock(jsonb,integer,text,boolean)');
  definition text;
  anchor text := $anchor$      SELECT f.model_id INTO variant_model FROM public.flavor_variants f WHERE f.id=item->>'flavorId';$anchor$;
  replacement text := $replacement$      -- Complementary accessories have no flavor inventory; preserve the financial line.
      IF item->>'productId'='addon' THEN
        IF item->>'flavorId' NOT IN ('addon-usbc-turbo','addon-lanyard','addon-silicone-cover') THEN
          RAISE EXCEPTION 'Acessório Compre Junto inválido. Recarregue o catálogo antes de continuar.';
        END IF;
        CONTINUE;
      END IF;
      SELECT f.model_id INTO variant_model FROM public.flavor_variants f WHERE f.id=item->>'flavorId';$replacement$;
BEGIN
  IF target IS NULL THEN
    RAISE EXCEPTION 'Função de estoque ausente. Pare e confira a instalação atual; não aplique migrations antigas.';
  END IF;
  IF (SELECT prosecdef FROM pg_proc WHERE oid=target) THEN
    RAISE EXCEPTION 'A função de estoque deve usar SECURITY INVOKER. Revise a definição antes de aplicar.';
  END IF;
  definition := pg_get_functiondef(target);
  IF strpos(definition,replacement)>0 THEN RETURN; END IF;
  IF array_length(string_to_array(definition,anchor),1)<>2 THEN
    RAISE EXCEPTION 'A definição atual difere da versão revisada. Nenhuma alteração aplicada; envie este erro para revisão.';
  END IF;
  -- CREATE OR REPLACE preserves ownership/ACLs and every other part of the live RPC.
  EXECUTE replace(definition,anchor,replacement);
END $patch$;
COMMIT;
