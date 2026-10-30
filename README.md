# 🌊 PodWave — Catálogo Digital & Sistema de Gestão Comercial ("Meu Negócio")

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_&_Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-Instalável-8A2BE2?style=for-the-badge)

O **PodWave** é uma plataforma completa de **Catálogo Digital Interativo, Checkout Integrado ao WhatsApp, Programa de Fidelidade VIP e Gestão Comercial/Financeira ("Meu Negócio")**, desenvolvida sob medida para operação real em comércio local.

---

## ✨ Principais Funcionalidades

### 🛍️ 1. Vitrine & Experiência do Cliente (Storefront)
- **Catálogo Dinâmico por Marcas, Modelos e Sabores:** Filtros por quantidade de puffs, busca instantânea, destaques, lançamentos e controle de disponibilidade em tempo real.
- **Banners Promocionais & Cupons de Desconto:** Suporte a cupons percentuais (`%`) ou valor fixo (`R$`), valor mínimo de pedido e limite de usos.
- **Área do Cliente & Fidelidade VIP:**
  - Cadastro e autenticação via **Supabase Auth**.
  - Histórico completo de pedidos realizados e recompras rápidas.
  - Endereços salvos e lista de produtos favoritos.
  - **Clube VIP:** Descontos automáticos no carrinho para clientes VIP ativos.
- **Checkout Inteligente via WhatsApp:** Cálculo automático de subtotal, descontos de cupom/VIP, geração de código único do pedido e mensagem formatada pronta para envio no WhatsApp da loja.
- **PWA (Progressive Web App):** Instalável no celular (Android/iOS) e desktop como aplicativo nativo.

---

### 📊 2. Módulo Administrativo & "Meu Negócio" (ERP Comercial e Financeiro)
Acesso exclusivo para contas com permissão `admin` ou `owner`:

- **Gestão de Catálogo e Estoque:**
  - CRUD completo de Marcas, Modelos, Sabores/Variantes, Banners e Cupons.
  - Alertas visuais de estoque baixo e esgotado.
- **Gestão de Clientes e VIPs:**
  - Painel de clientes cadastrados, concessão/renovação de planos VIP e controle de cargos (`customer`, `admin`, `owner`).
- **Módulo Financeiro "Meu Negócio":**
  1. **Visão Geral (Dashboard Gerencial):** Indicadores de faturamento bruto, recebimentos reais, gastos operacionais, compras de mercadorias, lucro operacional, margem líquida, ticket médio e gráficos interativos.
  2. **Minhas Vendas:** Registro manual de vendas (balcão, WhatsApp, Instagram, indicação), múltiplos itens, baixa opcional no estoque, pagamentos parciais e parcelamentos.
  3. **Meus Gastos:** Controle de despesas fixas e variáveis por categoria, recorrência e status de quitação.
  4. **Compras de Mercadorias:** Registro de lotes adquiridos de fornecedores, cálculo automático de custo unitário com rateio de frete/taxas e entrada opcional automática no estoque do catálogo.
  5. **Fluxo de Caixa:** Controle de entradas, saídas e transferências entre canais financeiros (`Pix / Banco`, `Dinheiro / Caixa`, `Cartão / Maquininha`, `Outro`) + configuração de saldos iniciais por canal.
  6. **Contas Pendentes (A Pagar e A Receber):** Central unificada de compromissos financeiros com alertas de vencimento, atrasos e baixas parciais/totais.
  7. **Central de Relatórios:** Exportação de relatórios gerenciais em **CSV** e impressão formatada (**PDF**).
- **Resiliência Offline-First:** Sincronização inteligente com o Supabase com status por registro (`Sincronizado`, `Pendente de Sincronização`, `Erro`), fila de exclusão (*tombstones*) e deduplicação automática de pagamentos.

---

## 🔒 Arquitetura de Segurança (Supabase & PostgreSQL)

O banco de dados conta com blindagem em nível de produção:
- **Row Level Security (RLS)** ativa nas **15 tabelas** do sistema.
- **Schema Privado (`app_security`):** Funções de verificação de permissão (`app_security.is_admin()`, `app_security.is_vip()`, `app_security.get_user_role()`) isoladas fora da API pública PostgREST.
- **Proteção Anti-Escalação de Privilégios:** Trigger `app_security.trg_protect_customer_role()` que impede qualquer usuário comum de alterar seu próprio `role` ou conceder descontos VIP a si mesmo.
- **Logs de Auditoria Imutáveis (`audit_logs`):** Bloqueio de `UPDATE` e `DELETE` via privilégios e trigger `app_security.trg_immutable_audit_logs()`.
- **Proteção de Colunas Sensíveis:** Ocultação de `owner_uid` em `store_settings` para visitantes anônimos via `GRANT SELECT` granular por coluna.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 19, TypeScript, Vite 6
- **Estilização:** Tailwind CSS 4, Lucide Icons, Motion
- **Backend / BaaS:** Supabase (PostgreSQL 16, Supabase Auth, Row Level Security)
- **PWA:** `vite-plugin-pwa` + Workbox

---

## 🚀 Como Executar o Projeto Localmente

### 1. Pré-requisitos
- **Node.js** 18+ instalado
- Uma conta e projeto no [Supabase](https://supabase.com/)

### 2. Clonar e instalar dependências
```bash
git clone https://github.com/SEU-USUARIO/podwave.git
cd podwave
npm install
```

### 3. Configurar variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto (baseado no `.env.example`):

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

### 4. Configurar o Banco de Dados no Supabase
No **Supabase SQL Editor**:
- **Para um projeto novo (banco limpo):** Execute o script `supabase/clean_install_new_project.sql`.
- **Para um projeto já existente:** Execute primeiro `supabase/readonly_remote_state_audit.sql` (diagnóstico) e depois `supabase/migrations/20261030000000_definitive_security_and_rls_hardening.sql`.
- **Promover a conta do proprietário (`owner`):** Execute o bloco de promoção manual contido em `supabase/post_deployment_verification_and_tests.sql` no SQL Editor.

### 5. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:3000` no navegador.

---

## 📦 Build para Produção

```bash
npm run build
npm run preview
```

---

## 📁 Estrutura de Pastas Principal

```text
├── public/                  # Ícones PWA, imagens e ativos estáticos
├── src/
│   ├── components/
│   │   ├── admin/           # Painel Admin, aba Supabase e módulo "Meu Negócio"
│   │   ├── auth/            # Modais de Login, Cadastro e Área do Cliente
│   │   └── ...              # Componentes da vitrine, carrinho e checkout
│   ├── context/
│   │   ├── AuthContext.tsx  # Autenticação de clientes e controle de sessão
│   │   └── CatalogContext.tsx # Estado global do catálogo, pedidos e financeiro
│   ├── services/
│   │   └── supabase.ts      # Integração e mapeamento com o Supabase
│   └── types.ts             # Tipagens TypeScript completas do sistema
├── supabase/
│   ├── migrations/          # Migrations SQL versionadas e auditadas
│   ├── dev_only/            # Dados de demonstração exclusivos para ambiente dev
│   ├── clean_install_new_project.sql
│   ├── readonly_remote_state_audit.sql
│   ├── post_deployment_verification_and_tests.sql
│   └── seed.sql             # Seed mínimo seguro para produção
└── package.json
```

---

## ⚠️ Aviso Legal
Este sistema destina-se a estabelecimentos comerciais que seguem rigorosamente a legislação local vigente. **Venda proibida para menores de 18 anos.**
