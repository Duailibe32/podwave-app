-- ============================================================================
-- PODWAVE — PRODUCTION-SAFE MINIMAL SEED
-- Arquivo: supabase/seed.sql
--
-- SEGURANÇA DE PRODUÇÃO:
-- 1. NÃO insere produtos fictícios, marcas demonstrativas, banners ou cupons.
-- 2. NÃO define estoque fictício nem altera dados reais.
-- 3. Utiliza exclusivamente ON CONFLICT (id) DO NOTHING em store_settings
--    para garantir que configurações reais existentes jamais sejam sobrescritas.
-- 4. Dados demonstrativos de desenvolvimento foram isolados em:
--    supabase/dev_only/demo_catalog_dev_only.sql
-- ============================================================================

INSERT INTO public.store_settings (
  id,
  store_name,
  support_email,
  support_phone,
  whatsapp_number,
  legal_notice,
  updated_at
)
VALUES (
  'main',
  'PodWave',
  'contato@podwave.com.br',
  '(98) 98436-0626',
  '5598984360626',
  'VENDA PROIBIDA PARA MENORES DE 18 ANOS.',
  NOW()
)
ON CONFLICT (id) DO NOTHING;
