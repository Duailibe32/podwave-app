-- ============================================================================
-- AVISO: ARQUIVO EXCLUSIVO PARA AMBIENTE DE DESENVOLVIMENTO / TESTES LOCAIS
-- NUNCA EXECUTAR EM PRODUÇÃO!
-- Arquivo: supabase/dev_only/demo_catalog_dev_only.sql
-- ============================================================================

INSERT INTO public.store_settings (id, store_name, support_email, support_phone, whatsapp_number, legal_notice)
VALUES (
  'main',
  'PodWave',
  'contato@podwave.com.br',
  '(98) 98436-0626',
  '5598984360626',
  'VENDA PROIBIDA PARA MENORES DE 18 ANOS.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.brands (id, name, description, banner_image, sort_order, is_active)
VALUES
  ('ignite', 'IGNITE', 'A marca líder em dispositivos descartáveis premium.', '/images/ignite-v150-berry-blast.png', 1, true),
  ('elfbar', 'ELFBAR', 'Inovação tecnológica e sabores intensos.', '/images/elfbar-bc10000-peach-mango.jpg', 2, true),
  ('oxbar', 'OXBAR', 'Design futurista com performance de longa duração.', '/images/oxbar-g8000-cranberry-grape.jpg', 3, true),
  ('lost-mary', 'LOST MARY', 'Compactos, elegantes e com sabores inesquecíveis.', '/images/lost-mary-mo10000-blue-trio.png', 4, true)
ON CONFLICT (id) DO NOTHING;
