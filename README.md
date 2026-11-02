# 🌊 PodWave — Catálogo Digital Interativo, Central de Pedidos Realtime & ERP "Meu Negócio"

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_&_Realtime-3ECF8E?style=for-the-badge&logo=supabase&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-Instalável_&_Notificações-8A2BE2?style=for-the-badge)

O **PodWave** é uma plataforma completa de **Catálogo Digital Interativo, Checkout Integrado ao WhatsApp, Central Inteligente de Pedidos em Tempo Real, Motor de Promoções Dinâmicas, Programa de Fidelidade VIP e ERP Comercial/Financeiro ("Meu Negócio")**, arquitetada com **React 19 + TypeScript + Supabase (PostgreSQL, Auth, RLS e Realtime)**.

---

## ✨ Visão Geral das Funcionalidades

### 🛍️ 1. Vitrine, Carrinho Inteligente & Experiência do Cliente (Storefront)
- **Catálogo Dinâmico por Marcas, Modelos e Sabores:**
  - Busca instantânea, filtros por marca, faixa de puffs, categoria e ordenação por preço/destaque.
  - Indicadores visuais em tempo real de disponibilidade de sabores (`Em estoque`, `Últimas unidades`, `Esgotado`) sincronizados via **Supabase Realtime** (`flavor_variants`).
- **Motor Dinâmico de Promoções no Carrinho:**
  - **Desconto Progressivo Configurável:** Faixas de desconto automático por quantidade mínima de unidades no carrinho (ex.: 2 un = 5% OFF, 3+ un = 10% OFF + Frete Grátis), editáveis pelo painel administrativo e salvas no banco de dados.
  - **Compre Junto (Acessórios Recomendados):** Sugestão inteligente de acessórios no carrinho (Cabo USB-C, Cordão Lanyard, Case de Silicone ou itens personalizados), podendo ser globais ou vinculados especificamente a determinados modelos de produtos.
  - **Cupons de Desconto & Benefício VIP:** Suporte a cupons percentuais (`%`) ou valor fixo (`R$`), pedido mínimo, limite de usos e aplicação automática de desconto exclusivo para membros VIP.
- **Autenticação Moderna & Área do Cliente (`Minha Conta`):**
  - Login e cadastro via **E-mail e Senha**, **Google OAuth**, **Código OTP por E-mail** e **Passkeys Biométricas (WebAuthn / FaceID / TouchID)**.
  - **Acompanhamento de Pedidos em Tempo Real (`Meus Pedidos`):** Linha do tempo interativa com atualização instantânea de status (`Recebido`, `Confirmado`, `Em Preparo`, `Saiu para Entrega`, `Entregue`, `Cancelado`) e avisos de segundo plano.
  - **Cartão Fidelidade Digital:** Acúmulo de selos a cada compra qualificada (meta padrão de 10 selos) com acompanhamento visual de recompensas.
  - **Sincronização Multi-Dispositivo (Celular ↔ PC):** Todo pedido realizado no celular por um cliente autenticado gera/valida automaticamente o perfil em `public.customer_profiles` e grava o pedido em `public.customer_orders` (e view `public.orders`), refletindo imediatamente no painel administrativo no PC.

---

### 📦 2. Central Inteligente de Pedidos (`OrdersCenterTab`)
- **Fila de Pedidos em Tempo Real (Kanban & Lista):**
  - Escuta ativa via Supabase Realtime (`customer_orders` e `orders`) com alerta sonoro/visual para novos pedidos.
  - Filtros por período (`Hoje`, `Ontem`, `7 dias`, `30 dias`, `Personalizado`), status do pedido, status de pagamento e busca textual.
- **Processamento Rápido & Automação de Estoque:**
  - Mudança de status em 1 clique (`Recebido` → `Confirmado` → `Em Preparo` → `Enviado` → `Entregue` / `Cancelado`).
  - **Baixa Automática de Estoque:** Ao confirmar ou avançar um pedido, o sistema desconta automaticamente as unidades dos sabores comprados em `flavor_variants` no Supabase e marca `stockDeducted = true` (evitando baixa duplicada).
  - **Estorno Automático no Cancelamento:** Se um pedido que já teve estoque baixado for cancelado, as quantidades retornam automaticamente ao catálogo.
- **Auto-Exclusão de Pedidos Cancelados (24h):**
  - Pedidos com status `cancelado` exibem um contador regressivo e são **excluídos automaticamente do banco de dados após 24 horas** (via trigger PostgreSQL `trg_auto_cleanup_cancelled_orders` + rotina automática no cliente).
  - Botão rápido **"Limpar Cancelados"** no topo da Central de Pedidos para exclusão imediata em 1 clique.
- **Log de Auditoria Simples de Status de Pedidos:**
  - Painel dedicado na Central de Pedidos e dentro de cada card exibindo o histórico cronológico completo de cada alteração de status (`Status Anterior` → `Novo Status`), com **data, horário exato (DD/MM/AAAA às HH:MM:SS)**, autor da mudança e motivo.
- **Diagnóstico Integrado de Conexão & Políticas RLS:**
  - Botão **"Diagnosticar RLS & Orders"** na Central de Pedidos (e comando global `await window.diagnoseSupabaseOrders()` no Console `F12`).
  - Verifica sessão autenticada (`auth.uid()`), integridade de chave estrangeira em `public.customer_profiles`, permissão `SELECT` em `public.orders` e `public.customer_orders`, executa um teste real de escrita `INSERT` + limpeza de sonda e reconcilia pedidos locais pendentes.
- **Atendimento WhatsApp & Impressão Térmica:**
  - Botões rápidos de WhatsApp em 1 clique (*Chave Pix*, *Pedido Saiu para Entrega*, *+1 Selo Fidelidade*) e Estúdio de Modelos personalizáveis com variáveis dinâmicas.
  - **Impressão de Comprovante Térmico (58mm e 80mm):** Layout otimizado para impressoras térmicas de balcão e entrega via motoboy.

---

### 🎁 3. Aba "Promoções" no AdminPanel (`PromotionsTab`)
- **Editor de Desconto Progressivo:**
  - Ativação/desativação global do desconto progressivo.
  - Adição, edição e remoção de faixas (quantidade mínima de pods, percentual de desconto, rótulo promocional e ativação de frete grátis na faixa).
- **Gerenciador de "Compre Junto" (Acessórios Recomendados):**
  - Cadastro completo de itens adicionais (nome, descrição, preço promocional, preço original, categoria, emoji, cor e imagem).
  - **Vinculação Inteligente a Produtos Principais:** Permite definir se o acessório aparece para **todos os produtos do catálogo** ou **apenas quando determinados modelos selecionados** estiverem no carrinho.
- **Persistência no Banco de Dados:** Salvo diretamente na tabela `public.store_settings` (dentro de `promotions_config` / `business_meta`) com sincronização instantânea para todos os clientes.

---

### 💼 4. Módulo ERP Comercial e Financeiro ("Meu Negócio")
Acesso exclusivo para contas com cargo `admin` ou `owner`:
1. **Visão Geral (Dashboard Executivo):** Faturamento bruto, recebimentos líquidos, despesas operacionais, compras de estoque, lucro operacional, margem líquida e ticket médio.
2. **Minhas Vendas (`manual_sales`):**
   - Lançamento direto ou importação em 1 clique a partir da Central de Pedidos sem duplicidade.
   - Baixa atômica de estoque via RPC `public.podwave_save_sale_with_stock` e devolução automática de estoque ao excluir vendas.
   - Cache local higienizado (`podwave_local_manual_sales_v3`) com controle de *tombstones* para evitar vendas fantasmas.
3. **Meus Gastos (`manual_expenses`):** Controle de despesas fixas e variáveis, categorias e status de quitação.
4. **Compras de Mercadorias (`merchandise_purchases`):** Registro de lotes de fornecedores, rateio de frete/impostos e entrada automática no estoque.
5. **Fluxo de Caixa (`cash_movements` & `initial_cash_balances`):** Entradas, saídas e transferências entre canais (`Pix / Banco`, `Dinheiro / Caixa`, `Cartão / Maquininha`, `Outro`).
6. **Contas Pendentes (`manual_commitments`):** Contas a pagar e a receber com controle de vencimento e baixas parciais.
7. **Ficha de Atendimento do Cliente (`customer_service_notes`):** Histórico de anotações de atendimento e pós-venda vinculado ao perfil de cada cliente.
8. **Log Geral de Auditoria (`activity_logs` & `business_audit_events`):** Rastreabilidade completa de ações administrativas com data, hora e operador.

---

## 🔒 Arquitetura de Banco de Dados, RLS & Realtime (Supabase)

### Tabelas com Realtime Ativo (`supabase_realtime`)
- `public.customer_orders` (e view atualizável `public.orders`)
- `public.customer_profiles`
- `public.flavor_variants`
- `public.product_models`
- `public.coupons`

### Regras de Segurança e Integridade (RLS)
- **Função Administrativa Compatível (`public.is_admin()`):** Verifica se `id::text = auth.uid()::text` possui `role IN ('admin', 'owner')` em `public.customer_profiles`.
- **Sincronização Automática `auth.users` → `public.customer_profiles`:**
  - Trigger `on_auth_user_created_profile` garante que toda conta criada no celular ou PC tenha registro imediato em `public.customer_profiles` (`id, email, full_name, phone, role, updated_at`), prevenindo falhas de Foreign Key (`23503`) ao registrar pedidos.
- **Políticas de Pedidos (`public.customer_orders` / `public.orders`):**
  - `SELECT`, `INSERT`, `UPDATE`: Permitidos quando `customer_id::text = auth.uid()::text OR public.is_admin()`.
  - `DELETE`: Permitido para `public.is_admin()`, para limpeza automática de pedidos cancelados há mais de 24h (`public.cleanup_cancelled_orders`) e para limpeza de sondas de diagnóstico (`diag-rls-probe-%`).

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 19, TypeScript 5.8, Vite 6
- **Estilização:** Tailwind CSS 4, Lucide React Icons, Motion
- **Backend / BaaS:** Supabase (`@supabase/supabase-js` — PostgreSQL 16, Auth, Row Level Security, Realtime Channels, RPCs)
- **PWA:** Manifest, Service Worker e Notificações de Status de Pedido

---

## 🚀 Como Executar e Configurar o Projeto

### 1. Instalar dependências
```bash
npm install
```

### 2. Variáveis de Ambiente (`.env`)
Crie um arquivo `.env` na raiz do projeto (baseado no `.env.example`):
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

### 3. Script SQL de Organização, RLS e Auto-Limpeza no Supabase
No **SQL Editor** do Supabase, execute o script consolidado em:
- `supabase/proposals/20261102_fix_cross_device_orders_and_profiles.sql`

Esse script configura:
1. `public.is_admin()` com cast `::text`;
2. Backfill + Trigger automática de `auth.users` para `public.customer_profiles (id, email, full_name, phone, role, updated_at)`;
3. Políticas RLS de leitura e escrita para clientes autenticados e administradores;
4. View atualizável `public.orders` apontando para `public.customer_orders`;
5. Função e Trigger de **auto-exclusão de pedidos cancelados após 24 horas** (`public.cleanup_cancelled_orders(24)`).

### 4. Executar o servidor de desenvolvimento e testes
```bash
# Iniciar aplicação em modo desenvolvimento (porta 3000)
npm run dev

# Executar suíte de testes de compatibilidade financeira e estoque
node scripts/test-financial-compat.cjs && node scripts/test-sale-stock.cjs

# Build de produção
npm run build
```

---

## 🔍 Como Executar o Diagnóstico de Conexão e RLS no Navegador

1. Abra o site autenticado em uma conta (Cliente ou Admin).
2. No **Painel Admin → Aba Pedidos**, clique no botão **"Diagnosticar RLS & Orders"**; **OU**
3. Abra o Console do navegador (`F12` → aba **Console**) e execute:
   ```js
   await window.diagnoseSupabaseOrders()
   ```
4. O sistema exibirá uma tabela detalhada no console informando o status da sessão, existência do perfil em `customer_profiles`, permissão `SELECT` em `orders` e `customer_orders`, resultado do teste real de `INSERT` e quantidade de pedidos locais sincronizados.

---

## 📁 Estrutura de Pastas Principal

```text
├── public/                        # Ativos estáticos, ícones PWA e manifesto
├── scripts/                       # Testes automatizados de estoque e financeiro
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── OrdersCenterTab.tsx      # Central de Pedidos, Log de Auditoria, Diagnóstico RLS e Cupom Térmico
│   │   │   ├── PromotionsTab.tsx        # Gestão de Desconto Progressivo e Compre Junto
│   │   │   ├── BusinessManagementTab.tsx # ERP Financeiro "Meu Negócio"
│   │   │   └── ThermalReceiptModal.tsx  # Impressão térmica 58mm/80mm
│   │   ├── CartDrawer.tsx               # Carrinho com Desconto Progressivo e Compre Junto
│   │   ├── CheckoutModal.tsx            # Checkout WhatsApp + Persistência Supabase
│   │   ├── CustomerProfileModal.tsx     # Área do Cliente, Meus Pedidos Realtime e Fidelidade
│   │   └── OrderStatusTimeline.tsx      # Linha do tempo visual de status de pedidos
│   ├── context/
│   │   └── CatalogContext.tsx           # Estado global, sincronização Realtime, Auth e Auto-Cleanup
│   ├── services/
│   │   ├── supabase.ts                  # Cliente Supabase, CRUD adaptativo, Diagnóstico RLS e RPCs
│   │   └── orderCenterService.ts        # Regras de transição de status, KPIs e templates WhatsApp
│   └── types/
│       └── catalog.ts                   # Tipagens TypeScript completas
└── supabase/
    ├── migrations/                      # Migrações estruturais do banco de dados
    └── proposals/
        └── 20261102_fix_cross_device_orders_and_profiles.sql # Fix consolidado de RLS, Orders View e Auto-Cleanup 24h
```

---

## ⚠️ Aviso Legal
Sistema destinado a estabelecimentos comerciais que cumprem rigorosamente a legislação vigente. **Venda estritamente proibida para menores de 18 anos.**
