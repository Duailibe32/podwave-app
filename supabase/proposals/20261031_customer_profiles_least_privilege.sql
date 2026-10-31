-- PROPOSTA DE MENOR PRIVILEGIO PARA customer_profiles.
-- EFEITO: authenticated perde DELETE, inclusive nas sessões de Proprietario/Admin.
-- A politica de DELETE nao devolve um privilegio revogado. RPC/servico privilegiado
-- continua sujeito ao seu proprio contrato; este script nao cria nenhum deles.
-- Nao altera registros, RLS, politicas, triggers, outros papeis ou defaults futuros.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.customer_profiles') IS NULL THEN
  RAISE EXCEPTION 'Tabela ausente: conferir projeto/schema antes de continuar.';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='public.customer_profiles'::regclass AND relrowsecurity) THEN
  RAISE EXCEPTION 'RLS nao esta habilitada. Nenhuma permissao sera alterada.';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
  RAISE EXCEPTION 'Papel authenticated ausente.';
 END IF;
 -- Evita ampliar acesso em um ambiente que nao possua os privilegios essenciais.
 IF NOT (has_table_privilege('authenticated','public.customer_profiles','SELECT')
     AND has_table_privilege('authenticated','public.customer_profiles','INSERT')
     AND has_table_privilege('authenticated','public.customer_profiles','UPDATE')) THEN
  RAISE EXCEPTION 'Privilegios essenciais ausentes: revisar antes de conceder acesso.';
 END IF;
END $$;

-- ALL tambem remove REFERENCES e outros privilegios diretos nao essenciais,
-- incluindo os reconhecidos pela versao instalada do PostgreSQL.
REVOKE ALL PRIVILEGES ON TABLE public.customer_profiles FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.customer_profiles TO authenticated;

DO $$ DECLARE remaining text[]; BEGIN
 -- Detecta acesso restante por PUBLIC/heranca/dono, inclusive privilegios novos
 -- da versao instalada. Nao revoga papeis ou grants de terceiros automaticamente.
 SELECT array_agg(DISTINCT a.privilege_type) INTO remaining
 FROM pg_class c
 CROSS JOIN LATERAL aclexplode(acldefault('r',c.relowner)) a
 WHERE c.oid='public.customer_profiles'::regclass
 AND a.privilege_type NOT IN ('SELECT','INSERT','UPDATE')
 AND has_table_privilege('authenticated',c.oid,a.privilege_type);
 IF remaining IS NOT NULL THEN
  RAISE EXCEPTION 'Acesso nao essencial ainda herdado: %. Transacao deve ser revertida; revisar PUBLIC/memberships.', remaining;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='public.customer_profiles'::regclass AND relrowsecurity) THEN
  RAISE EXCEPTION 'RLS desabilitada inesperadamente.';
 END IF;
END $$;
COMMIT;

SELECT jsonb_build_object(
 'rls_habilitada',(SELECT relrowsecurity FROM pg_class WHERE oid='public.customer_profiles'::regclass),
 'select',has_table_privilege('authenticated','public.customer_profiles','SELECT'),
 'insert',has_table_privilege('authenticated','public.customer_profiles','INSERT'),
 'update',has_table_privilege('authenticated','public.customer_profiles','UPDATE'),
 'delete',has_table_privilege('authenticated','public.customer_profiles','DELETE'),
 'truncate',has_table_privilege('authenticated','public.customer_profiles','TRUNCATE'),
 'trigger',has_table_privilege('authenticated','public.customer_profiles','TRIGGER'),
 'references',has_table_privilege('authenticated','public.customer_profiles','REFERENCES')
) AS privilegios_verificados;

-- Se houver erro, nao prossiga com comandos avulsos; execute ROLLBACK antes
-- de iniciar outra transacao na mesma sessao. Nada e aplicado automaticamente.
