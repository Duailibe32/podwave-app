-- ==============================================================================
-- PODWAVE CATALOG - SUPABASE SEED DATA
-- Description: Dados padrão de Marcas, Modelos, Sabores, Banners e Cupons
-- ==============================================================================

-- INSERIR MARCAS
INSERT INTO public.brands (id, name, logo_text, featured, country, description, card_color)
VALUES
('ignite', 'IGNITE', 'IGNITE', true, 'USA', 'Marca global de estilo de vida premium, conhecida por seu acabamento fosco ultra-fino e alto rendimento.', 'black'),
('elfbar', 'ELFBAR', 'ELFBAR', true, 'UK', 'Líder mundial em tecnologia de vaporização compacta com modos Turbo e Smooth.', 'magenta'),
('geekbar', 'GEEK BAR', 'GEEK BAR', true, 'USA', 'Pioneira em displays inteligentes e tecnologia de bobina dupla Pulse Mesh.', 'slate'),
('oxbar', 'OXBAR', 'OXBAR', true, 'USA', 'Dispositivos de altíssima capacidade com controle de fluxo de ar e sabores intensos.', 'cyan'),
('lostmary', 'LOST MARY', 'LOST MARY', true, 'UK', 'Design anatômico ergonômico com texturas suaves e nuances aromáticas requintadas.', 'cyan'),
('fumot', 'FUMOT', 'FUMOT', true, 'Global', 'Criadora do famoso Fumot Tornado e Digital Box com iluminação RGB.', 'blue'),
('vaporesso', 'VAPORESSO', 'VAPORESSO', true, 'Global', 'Excelência em sistemas pod recarregáveis com tecnologia anti-vazamento SSS.', 'emerald')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    country = EXCLUDED.country,
    description = EXCLUDED.description;

-- INSERIR MODELOS PRINCIPAIS
INSERT INTO public.product_models (
    id, brand_id, brand_name, model_name, puffs, puffs_label, badge, starting_price, 
    image_url, category, description, battery, e_liquid, nicotine, charge_type, coil, active
) VALUES
(
    'ignite-v55', 'ignite', 'IGNITE', 'V55', 5500, '⚡ 5.500 Puffs', '★ TOP', 89.90,
    '/assets/images/pod_gold_black_1792699257182.jpg', 'Descartável Premium',
    'Dispositivo icônico em acabamento fosco suave com pegada ergonômica e vapor denso e sedoso.',
    '650mAh USB-C', '12ml', '5% (50mg)', 'USB Tipo C Fast Charge', '1.2 ohm Mesh Coil', true
),
(
    'elfbar-bc15k', 'elfbar', 'ELFBAR', 'BC15K', 15000, '⚡ 15.000 Puffs', 'LANÇAMENTO', 99.99,
    '/assets/images/pod_oxbar_maze_1792699228586.jpg', 'Smart Pod Descartável',
    'Display dinâmico com indicador percentual de líquido e bateria em tempo real. Modos Smooth e Turbo.',
    '650mAh USB-C', '16ml', '5% (50mg)', 'USB Tipo C Fast Charge', 'Dual Quaq Mesh', true
),
(
    'geekbar-pulse-15k', 'geekbar', 'GEEK BAR', 'Pulse 15000', 15000, '⚡ 15.000 Puffs', '★ TOP', 119.90,
    '/assets/images/pod_geekbar_pulse_1792699212047.jpg', 'Display Inteligente Full-Screen',
    'Primeiro pod do mundo com display em cápsula espacial full screen e dois modos de potência selecionáveis.',
    '650mAh USB-C', '16ml', '5% (50mg)', 'USB Tipo C Fast Charge', 'Dual Core Dual Mesh', true
),
(
    'oxbar-magic-maze-10k', 'oxbar', 'OXBAR', 'Magic Maze Pro', 10000, '⚡ 10.000 Puffs', 'DESTAQUE', 109.90,
    '/assets/images/pod_oxbar_maze_1792699228586.jpg', 'Smart Pod com Ajuste de Wattage',
    'Potência ajustável de 11W a 15W com tela inteligente e fluxo de ar customizável para MTL e RDL.',
    '900mAh USB-C', '18ml', '5% (50mg)', 'USB Tipo C Fast Charge', '1.0 ohm Hyper Mesh', true
)
ON CONFLICT (id) DO UPDATE SET
    model_name = EXCLUDED.model_name,
    starting_price = EXCLUDED.starting_price,
    puffs = EXCLUDED.puffs;

-- INSERIR SABORES / VARIANTES
INSERT INTO public.flavor_variants (id, model_id, name, color_hex, icon_emoji, in_stock, demo_quantity, low_quantity_threshold)
VALUES
('ignite-v55-grape-ice', 'ignite-v55', 'Grape Ice', '#9333EA', '🍇', true, 18, 3),
('ignite-v55-watermelon-ice', 'ignite-v55', 'Watermelon Ice', '#EF4444', '🍉', true, 12, 3),
('ignite-v55-cool-mint', 'ignite-v55', 'Cool Mint', '#00DFFF', '🌿', true, 8, 3),
('ignite-v55-strawberry-kiwi', 'ignite-v55', 'Strawberry Kiwi', '#F43F5E', '🍓', true, 2, 3),
('elfbar-bc15k-passion-fruit', 'elfbar-bc15k', 'Passion Fruit Orange Guava', '#F59E0B', '🍑', true, 14, 3),
('elfbar-bc15k-blue-razz', 'elfbar-bc15k', 'Blue Razz Ice', '#3B82F6', '🫐', true, 9, 3),
('elfbar-bc15k-miami-mint', 'elfbar-bc15k', 'Miami Mint', '#10B981', '🌿', true, 1, 3),
('geekbar-pulse-blow-pop', 'geekbar-pulse-15k', 'Blow Pop', '#EC4899', '🍬', true, 20, 3),
('geekbar-pulse-fcuking-fab', 'geekbar-pulse-15k', 'Fcuking FAB', '#8B5CF6', '🍍', true, 15, 3),
('geekbar-pulse-mexico-mango', 'geekbar-pulse-15k', 'Mexico Mango', '#F97316', '🥭', true, 0, 3)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    demo_quantity = EXCLUDED.demo_quantity;

-- INSERIR BANNERS
INSERT INTO public.banners (id, title, subtitle, badge, tagline, cta_text, cta_link, active, image_url, theme_gradient)
VALUES
(
    'banner-podwave-principal',
    'Mais que um Vape, é uma Onda.',
    'Sabores intensos. Tecnologia de ponta. Para quem vive novas experiências.',
    '⚡ PODWAVE OFICIAL',
    'SABORES QUE TE LEVAM MAIS LONGE',
    'Ver Produtos',
    '#catalogo',
    true,
    '/assets/images/logo.png',
    'neon'
),
(
    'banner-ignite-v55',
    'Ignite V55 Black Edition',
    '5.500 Puffs de alta densidade e acabamento ultra luxo na sua mão.',
    '★ DESTAQUE DA SEMANA',
    'LUXO & RENDIMENTO',
    'Comprar V55',
    '#catalogo',
    true,
    '/assets/images/pod_gold_black_1792699257182.jpg',
    'gold'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle;

-- INSERIR CUPONS
INSERT INTO public.coupons (id, code, discount_type, value, description, max_uses, min_order_value, active)
VALUES
('coupon-podwave15', 'PODWAVE15', 'percent', 15.00, '15% de desconto especial para clientes PodWave', 50, 0, true),
('coupon-primeira-compra', 'BEMVINDO', 'fixed', 20.00, 'R$ 20 de desconto no seu pedido', 100, 150.00, true),
('coupon-v55-vip', 'IGNITEVIP', 'percent', 10.00, '10% de desconto exclusivo para modelo Ignite V55', 30, 0, true)
ON CONFLICT (id) DO UPDATE SET
    value = EXCLUDED.value,
    active = EXCLUDED.active;

-- INSERIR CONFIGURAÇÕES
INSERT INTO public.store_settings (id, store_name, support_email, support_phone, whatsapp_number, legal_notice)
VALUES
('main', 'PODWAVE', 'contato@podwave.com', '(86) 99901-4685', '5586999014685', 'PRODUTO DESTINADO EXCLUSIVAMENTE A MAIORES DE 18 ANOS. Dispositivos eletrônicos de vaporização contêm nicotina, uma substância que causa dependência. Proibida a venda para menores de idade conforme a legislação vigente.')
ON CONFLICT (id) DO UPDATE SET
    store_name = EXCLUDED.store_name,
    support_phone = EXCLUDED.support_phone;
