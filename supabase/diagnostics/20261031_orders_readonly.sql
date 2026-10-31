-- Somente metadados: nao consulta pedidos de clientes, nao altera dados.
SELECT jsonb_build_object(
 'colunas',(SELECT jsonb_agg(jsonb_build_object('nome',column_name,'tipo',data_type,'obrigatoria',is_nullable='NO','default',column_default))
 FROM information_schema.columns WHERE table_schema='public' AND table_name='customer_orders'),
 'rls',(SELECT rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename='customer_orders'),
 'politicas',(SELECT jsonb_agg(jsonb_build_object('nome',policyname,'tipo',permissive,'roles',roles,'operacao',cmd,'using',qual,'with_check',with_check))
 FROM pg_policies WHERE schemaname='public' AND tablename='customer_orders'),
 'constraints',(SELECT jsonb_agg(jsonb_build_object('nome',k.conname,'validada',k.convalidated,'definicao',pg_get_constraintdef(k.oid)))
 FROM pg_constraint k WHERE k.conrelid=to_regclass('public.customer_orders')),
 'triggers',(SELECT jsonb_agg(jsonb_build_object('nome',t.tgname,'estado',t.tgenabled,'definicao',pg_get_triggerdef(t.oid)))
 FROM pg_trigger t WHERE t.tgrelid=to_regclass('public.customer_orders') AND NOT t.tgisinternal),
 'permissoes',(SELECT jsonb_agg(jsonb_build_object('papel',grantee,'privilegio',privilege_type))
 FROM information_schema.table_privileges WHERE table_schema='public' AND table_name='customer_orders')
) AS diagnostico;

