-- SOMENTE LEITURA: confirma o que está instalado sem executar a trigger.
SELECT jsonb_build_object(
 'vip_benefit_note_existe',EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customer_profiles' AND column_name='vip_benefit_note'),
 'funcao_instalada',(SELECT jsonb_build_object('dono',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'configuracao',p.proconfig,'definicao',pg_get_functiondef(p.oid))
 FROM pg_proc p WHERE p.oid=to_regprocedure('app_security.podwave_guard_profile_permissions()')),
 'triggers',(SELECT jsonb_agg(jsonb_build_object('nome',tgname,'estado',tgenabled,'definicao',pg_get_triggerdef(oid))) FROM pg_trigger WHERE tgrelid=to_regclass('public.customer_profiles') AND NOT tgisinternal),
 'authenticated_truncate_perfis',has_table_privilege('authenticated','public.customer_profiles','TRUNCATE'),
 'anon_update_configuracoes',has_table_privilege('anon','public.store_settings','UPDATE'),
 'authenticated_update_sequencia_logs',has_sequence_privilege('authenticated','public.audit_logs_id_seq','UPDATE'),
 'authenticated_usage_sequencia_logs',has_sequence_privilege('authenticated','public.audit_logs_id_seq','USAGE')
) AS verificacao_pos_sql;
