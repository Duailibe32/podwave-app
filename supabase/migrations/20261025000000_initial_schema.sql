-- ==============================================================================
-- PODWAVE CATALOG - SUPABASE POSTGRESQL MIGRATION
-- Migration: 20261025000000_initial_schema.sql
-- Description: Criação da estrutura de tabelas, índices, RLS e dados iniciais
-- ==============================================================================

-- 1. TABELA DE MARCAS (BRANDS)
CREATE TABLE IF NOT EXISTS public.brands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    logo_text TEXT,
    featured BOOLEAN DEFAULT true,
    logo_url TEXT,
    country TEXT DEFAULT 'Global',
    description TEXT,
    card_color TEXT DEFAULT 'black',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA DE MODELOS / PRODUTOS (PRODUCT_MODELS)
CREATE TABLE IF NOT EXISTS public.product_models (
    id TEXT PRIMARY KEY,
    brand_id TEXT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    brand_name TEXT NOT NULL,
    model_name TEXT NOT NULL,
    puffs INTEGER NOT NULL,
    puffs_label TEXT NOT NULL,
    badge TEXT,
    starting_price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    category TEXT DEFAULT 'Descartável Premium' NOT NULL,
    description TEXT,
    battery TEXT DEFAULT '650mAh USB-C',
    e_liquid TEXT DEFAULT '16ml',
    nicotine TEXT DEFAULT '5% (50mg)',
    charge_type TEXT DEFAULT 'USB Tipo C Fast Charge',
    coil TEXT DEFAULT 'Dual Mesh Coil',
    airflow TEXT,
    low_quantity_threshold INTEGER DEFAULT 3,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE SABORES / VARIANTES (FLAVOR_VARIANTS)
CREATE TABLE IF NOT EXISTS public.flavor_variants (
    id TEXT PRIMARY KEY,
    model_id TEXT NOT NULL REFERENCES public.product_models(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color_hex TEXT DEFAULT '#9333EA' NOT NULL,
    icon_emoji TEXT DEFAULT '🍇' NOT NULL,
    in_stock BOOLEAN DEFAULT true NOT NULL,
    demo_quantity INTEGER,
    low_quantity_threshold INTEGER DEFAULT 3,
    custom_image TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELA DE BANNERS DO CARROSSEL (BANNERS)
CREATE TABLE IF NOT EXISTS public.banners (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    badge TEXT,
    tagline TEXT,
    cta_text TEXT DEFAULT 'Ver Produtos',
    cta_link TEXT DEFAULT '#catalogo',
    active BOOLEAN DEFAULT true NOT NULL,
    image_url TEXT NOT NULL,
    position_x NUMERIC(5, 2) DEFAULT 0,
    position_y NUMERIC(5, 2) DEFAULT 0,
    scale NUMERIC(4, 2) DEFAULT 1,
    object_fit TEXT DEFAULT 'contain',
    theme_gradient TEXT DEFAULT 'neon',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABELA DE CUPONS PROMOCIONAIS (COUPONS)
CREATE TABLE IF NOT EXISTS public.coupons (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT DEFAULT 'percent' NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
    value NUMERIC(10, 2) NOT NULL,
    description TEXT,
    applicable_model_id TEXT DEFAULT 'all',
    applicable_model_name TEXT,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0 NOT NULL,
    min_order_value NUMERIC(10, 2) DEFAULT 0,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABELA DE CONFIGURAÇÕES GERAIS (STORE_SETTINGS)
CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    store_name TEXT DEFAULT 'PODWAVE' NOT NULL,
    support_email TEXT DEFAULT 'contato@podwave.com',
    support_phone TEXT DEFAULT '(86) 99901-4685',
    whatsapp_number TEXT DEFAULT '5586999014685',
    legal_notice TEXT,
    owner_uid TEXT,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABELA DE AUDITORIA DE ALTERAÇÕES (AUDIT_LOGS)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    details TEXT,
    author TEXT DEFAULT 'Proprietário',
    timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ÍNDICES PARA ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_product_models_brand_id ON public.product_models(brand_id);
CREATE INDEX IF NOT EXISTS idx_product_models_active ON public.product_models(active);
CREATE INDEX IF NOT EXISTS idx_product_models_puffs ON public.product_models(puffs);
CREATE INDEX IF NOT EXISTS idx_flavor_variants_model_id ON public.flavor_variants(model_id);
CREATE INDEX IF NOT EXISTS idx_flavor_variants_in_stock ON public.flavor_variants(in_stock);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_banners_active ON public.banners(active);

-- HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flavor_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE ACESSO (POLICIES)
-- Leitura pública para o catálogo digital (anon e authenticated)
CREATE POLICY "Public Read Brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Public Read Models" ON public.product_models FOR SELECT USING (true);
CREATE POLICY "Public Read Flavors" ON public.flavor_variants FOR SELECT USING (true);
CREATE POLICY "Public Read Banners" ON public.banners FOR SELECT USING (true);
CREATE POLICY "Public Read Coupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Public Read Settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Public Read Audit" ON public.audit_logs FOR SELECT USING (true);

-- Modificação administrativa (INSERT, UPDATE, DELETE)
CREATE POLICY "Admin Write Brands" ON public.brands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin Write Models" ON public.product_models FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin Write Flavors" ON public.flavor_variants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin Write Banners" ON public.banners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin Write Coupons" ON public.coupons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin Write Settings" ON public.store_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin Write Audit" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- 8. TABELA DE PERFIS DE CLIENTES / USUÁRIOS (CUSTOMER_PROFILES)
CREATE TABLE IF NOT EXISTS public.customer_profiles (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    cpf TEXT,
    role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'owner')) NOT NULL,
    address_cep TEXT,
    address_street TEXT,
    address_number TEXT,
    address_neighborhood TEXT,
    address_complement TEXT,
    address_city TEXT,
    address_state TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. TABELA DE HISTÓRICO DE PEDIDOS DE CLIENTES (CUSTOMER_ORDERS)
CREATE TABLE IF NOT EXISTS public.customer_orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
    reference_id TEXT NOT NULL,
    items JSONB NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    delivery_type TEXT DEFAULT 'delivery' NOT NULL,
    address_summary TEXT,
    status TEXT DEFAULT 'recebido' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_email ON public.customer_profiles(email);
CREATE INDEX IF NOT EXISTS idx_customer_orders_customer_id ON public.customer_orders(customer_id);

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Customer Profiles" ON public.customer_profiles FOR SELECT USING (true);
CREATE POLICY "Public Write Customer Profiles" ON public.customer_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Customer Orders" ON public.customer_orders FOR SELECT USING (true);
CREATE POLICY "Public Write Customer Orders" ON public.customer_orders FOR ALL USING (true) WITH CHECK (true);

