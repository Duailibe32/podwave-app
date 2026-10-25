-- ==============================================================================
-- PODWAVE CATALOG - SUPABASE MIGRATION: CUSTOMER AUTH & ORDERS
-- Migration: 20261025000001_customer_auth_and_orders.sql
-- Description: Criação das tabelas de perfis de clientes (customer_profiles) e
--              histórico de pedidos (customer_orders) com diferenciação de dono (owner).
-- ==============================================================================

-- 1. TABELA DE PERFIS DE CLIENTES E USUÁRIOS
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

-- 2. TABELA DE HISTÓRICO DE PEDIDOS DE CLIENTES
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

-- ÍNDICES PARA BUSCA RÁPIDA
CREATE INDEX IF NOT EXISTS idx_customer_profiles_email ON public.customer_profiles(email);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_role ON public.customer_profiles(role);
CREATE INDEX IF NOT EXISTS idx_customer_orders_customer_id ON public.customer_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_orders_created_at ON public.customer_orders(created_at DESC);

-- HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: LEITURA E GRAVAÇÃO
CREATE POLICY "Public Read Customer Profiles" ON public.customer_profiles FOR SELECT USING (true);
CREATE POLICY "Public Write Customer Profiles" ON public.customer_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Customer Orders" ON public.customer_orders FOR SELECT USING (true);
CREATE POLICY "Public Write Customer Orders" ON public.customer_orders FOR ALL USING (true) WITH CHECK (true);
