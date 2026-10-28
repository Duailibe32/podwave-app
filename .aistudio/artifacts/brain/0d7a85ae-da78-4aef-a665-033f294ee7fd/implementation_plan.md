# WazePod / PodWave — Catálogo Digital Premium & Painel Administrativo

Sistema visual completo e protótipo interativo para a plataforma de catálogo digital de dispositivos eletrônicos (pods), combinando a identidade visual autoral da logo oficial PodWave com a estrutura refinada dos cards de referência (⚡ puffs, marcas, modelos, sabores e preços demonstrativos), além de um painel administrativo demonstrativo com persistência em `localStorage`.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões confirmadas com o usuário na Fase 1:**
> - **Identidade & Nome de Exibição:** Priorização da marca **PodWave** com aplicação rigorosa da logo oficial anexada (`/assets/images/logo.png`), preservando proporções, cores e efeitos neon originais, mantendo o contexto WazePod acessível e configurável no painel administrativo.
> - **Apresentação de Preço nos Cards:** Exibição do valor demonstrativo *"A PARTIR DE R$ 99,99"* acompanhado do botão circular com ícone `+`, replicando a fidelidade da imagem de referência sem checkout ou transação real.
> - **Acesso ao Painel Administrativo:** Botão de alternância rápida no topo da navegação (Top Bar) somado ao suporte a rota direta `/admin` e link de rodapé.

---

## 1. Overview & Core Concept

- **O que a aplicação entrega:** Um catálogo digital premium com experiência ultra-fluida, responsiva e moderna para navegação por marcas (Ignite, Elfbar, Oxbar, Vaporesso, Lost Mary, Geek Bar), modelos com contadores de puffs em destaque com o raio `⚡`, seletor visual de sabores com pastilhas coloridas e abertura de modal de detalhes do produto.
- **Público-alvo:** Visitantes e entusiastas que buscam consultar especificações técnicas, contagem de puffs, sabores disponíveis e fabricantes de forma intuitiva em computadores e celulares.
- **Painel Administrativo Demonstrativo:** Módulo `/admin` com gestão de marcas, modelos, sabores vinculados, categorias, banners e configurações visuais, com persistência total em `localStorage` para testes em tempo real.
- **Conformidade Regulatória:** Apenas catálogo e especificações para consulta demonstrativa de maiores de 18 anos, sem processamento de pagamentos ou transações comerciais.

---

## 2. User Experience & Visual Design

### A. Paleta de Cores & Atmosfera Neon Futurista
Baseada rigorosamente nas cores da logo oficial anexada e na imagem de referência:
- **Preto profundo (`#080811`):** Fundo principal da aplicação.
- **Azul-marinho escuro (`#11152A`):** Superfícies estruturais, cartões e cabeçalhos.
- **Azul elétrico (`#007BFF`):** Destaques secundários e foco.
- **Ciano neon (`#00DFFF`):** Efeitos de brilho, bordas ativas e botões primários.
- **Roxo vibrante (`#8423DA`):** Gradientes luminosos e separadores sutis.
- **Magenta neon (`#E53CF3`):** Detalhes da logo e acentos quentes de gradiente.
- **Dourado/Amarelo elétrico (`#FACC15` / `#EAB308`):** Ícone `⚡` de Puffs e estrela `★ TOP` idênticos à referência.
- **Branco puro (`#FFFFFF`) e Cinza suave (`#A5A5B8`):** Textos primários e secundários para máxima legibilidade (WCAG AA).
- **Modo Claro:** Fundo off-white refinado (`#F8FAFC`), cartões em branco puro (`#FFFFFF`), preservando a cor ciano, roxo e dourado nos destaques e contrastes.

### B. Tipografia & Hierarquia
- **Display & Títulos:** `Plus Jakarta Sans` e `Outfit` com pesos 600, 700 e 800 para o impacto futurista e moderno.
- **Corpo & Especificações:** `Plus Jakarta Sans` (400, 500) com altura de linha balanceada (`1.6`).
- **Numerais & Puffs:** `tabular-nums` e mono numérico para valores de puffs (`⚡ 15.000 Puffs`) e preços demonstrativos (`R$ 99,99`).

### C. Estrutura dos Cards de Produtos (Inspirada na Imagem de Referência)
Cada card terá 3 zonas perfeitamente articuladas:
1. **Topo:**
   - Tag arredondada de Puffs: fundo escuro com borda dourada, ícone `⚡` em amarelo neon e texto (ex: `⚡ 5.500 Puffs`, `⚡ 15.000 Puffs`).
   - Tag opcional `★ TOP` ou selo de destaque.
   - Contêiner do produto com fundo claro/branco arredondado e borda sutil, destacando o dispositivo e a caixa (exatamente como na referência).
2. **Centro:**
   - Marca em caixa alta estilizada (ex: `IGNITE`, `ELFBAR`).
   - Nome do modelo em tipografia proeminente e legível (ex: `V55`, `BC15K`).
   - Pastilha de sabores interativa com círculo colorido do sabor (ex: `🟣 🍇 Aloe Grape` ou `🍓 Morango Ice`) e indicador `+5 sabores`.
3. **Rodapé:**
   - Preço demonstrativo em duas linhas: `A PARTIR DE` em cinza suave e `R$ 99,99` em numerais dourados destacados.
   - Botão circular dourado com ícone `+` e microinteração hover com expansão luminosa.

### D. Modal Interativo de Detalhes
- Galeria com imagem principal e miniaturas adicionais.
- Seletor de sabores com pastilhas ativas: ao clicar em um sabor, altera o nome da variante, gradiente do sabor e especificações associadas.
- Ficha técnica completa: capacidade de e-líquido, bateria, tipo de carregamento USB-C, fluxo de ar regulável e teor de nicotina demonstrativo.
- Aviso legal de maioridade (+18) e saúde.

### E. Navegação Mobile-First & Desktop
- **Desktop (1440px):** Grade expansiva de 3 a 4 colunas com filtros laterais/superiores e transições rápidas.
- **Mobile (Smartphones):** Grade em 2 colunas otimizada para toque, rolagem horizontal rápida de marcas/categorias, barra de pesquisa colapsável e modal adaptado com gaveta inferior (*bottom sheet*).

---

## 3. Painel Administrativo Demonstrativo (`/admin`)

- **Dashboard:** Métricas resumidas em tempo real (Total de Marcas, Modelos Ativos, Sabores Cadastrados, Média de Puffs).
- **Gerenciador de Marcas:** Listagem, inclusão, edição e upload/seleção de logotipo.
- **Gerenciador de Modelos:** Cadastro com upload/URL de fotos, marca vinculada, quantidade de puffs com ícone ⚡, preço demonstrativo, descrição técnica e tags (`★ TOP`, `NOVO`, `DESTAQUE`).
- **Gerenciador de Sabores:** Associação de múltiplos sabores por modelo com paleta de cores (cor do círculo) e status de disponibilidade.
- **Configurações Gerais:** Nome da marca, logotipo oficial, temas e aviso legal.
- **Persistência em localStorage:** Todas as edições persistem no navegador do usuário, com botão para "Restaurar Dados Padrão".

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PODWAVE CLIENT RUNTIME                          │
│                                                                        │
│  ┌───────────────────────┐   ┌──────────────────────────────────────┐  │
│  │   Navigation & Header │   │  Theme Mode (Dark / Light)           │  │
│  │  - Official Logo.png  │   │  localStorage: 'podwave_theme'       │  │
│  │  - Search & Filters   │   └──────────────────────────────────────┘  │
│  │  - Admin Switcher     │                                             │
│  └───────────┬───────────┘                                             │
│              │                                                         │
│  ┌───────────▼──────────────────────────────────────────────────────┐  │
│  │                     CATALOG VIEW (Public)                        │  │
│  │  - Hero Banner com Iluminação Neon & Logo Oficial                 │  │
│  │  - Barramento de Marcas (Ignite, Elfbar, Oxbar, Vaporesso, etc.)  │  │
│  │  - Filtros: Puffs (⚡ 5k, 15k, 20k+), Marcas, Sabores, Ordem     │  │
│  │  - Grid de Cards Refinados (Estilo Imagem de Referência)         │  │
│  │  - Modal de Detalhes do Produto & Seletor de Sabores             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│              ▲                                                         │
│              │ (Troca de Rota / Aba)                                   │
│              ▼                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                 ADMINISTRATIVE PANEL (/admin)                    │  │
│  │  - Métricas e Estatísticas do Catálogo                           │  │
│  │  - CRUD de Marcas, Modelos, Sabores e Categorias                 │  │
│  │  - Editor de Banners e Configurações da Loja                     │  │
│  │  - Botão de Reset para Catálogo Inicial                          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│              │                                                         │
│  ┌───────────▼──────────────────────────────────────────────────────┐  │
│  │              REACTIVE LOCAL STORAGE DATA STORE                   │  │
│  │  - Key: 'podwave_catalog_state_v1'                                │  │
│  │  - Modelos com puffs, sabores vinculados, cores e status         │  │
│  │  - Marcas com logotipos e contagem de itens                      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Entidades do Modelo de Dados
- **Brand:** `id`, `name`, `logoUrl`, `description`, `featured`.
- **FlavorVariant:** `id`, `name`, `colorHex`, `iconEmoji`, `inStock`, `customImage`.
- **ProductModel:** `id`, `brandId`, `modelName`, `puffs` (número para filtro, ex: 15000), `puffsLabel` (ex: "⚡ 15.000 Puffs"), `badge` (ex: "★ TOP"), `startingPrice` (ex: 99.99), `imageUrl`, `additionalImages`, `flavors` (array de FlavorVariant), `specs` (bateria, capacidade, recarga), `description`, `active`.

---

## 5. Execution Steps

1. **Ativos Visuais & Logo:** Configurar a logo oficial anexada em `/public/assets/images/logo.png` e estruturar os dados mockados de alta fidelidade com marcas consagradas (Ignite, Elfbar, Oxbar, Vaporesso, Lost Mary).
2. **Design System & Estilos Globais:** Configurar Tailwind CSS v4 com as cores da logo (`#080811`, `#11152A`, `#00DFFF`, `#8423DA`, `#E53CF3`, `#FACC15`), tipografia moderna e suporte nativo ao tema escuro/claro.
3. **Componente Header & Hero Banner:** Cabeçalho com logo oficial, navegação rápida, busca em tempo real, seletor de tema e botão de acesso ao Admin; Banner futurista com iluminação neon e CTA de rolagem suave.
4. **Cards de Produto e Grade do Catálogo:** Implementar os cards com contêiner interno claro conforme a referência, etiqueta dourada de puffs com `⚡`, tag `★ TOP`, seletor de sabores com bolinhas coloridas e botão circular `+`.
5. **Modal de Detalhes:** Visualização ampliada do produto, troca dinâmica de sabor com feedback instantâneo, especificações completas e botão de fechamento.
6. **Filtros e Busca em Tempo Real:** Filtro rápido por faixa de puffs (`Até 6k`, `6k-15k`, `15k-25k`, `30k+`), seleção de marcas e barra de busca instantânea sem recarregar a página.
7. **Painel Administrativo Demonstrativo:** Módulo administrativo em `/admin` com abas (Dashboard, Marcas, Modelos, Sabores, Banners, Configurações) conectado ao `localStorage`.
8. **Validação & Compilação:** Executar `compile_applet` e testes de responsividade em desktop e dispositivos móveis.
9. **Painel do Proprietário & Segurança:** Transferência concluída da gestão do UID Exclusivo do Proprietário para a aba **Configurações** do `AdminPanel.tsx` e remoção definitiva da tela de login `AdminLogin.tsx`. Header e barra de avisos fixados de forma contínua no topo. Sistema PWA interativo funcional.
10. **Bloqueio de Itens Esgotados no Carrinho:** Variantes com status `ESGOTADO` (quantidade = 0 ou `inStock: false`) agora desativam e bloqueiam o botão de "Adicionar ao Carrinho" com estado visual específico ("Sabor Esgotado" em vermelho, `cursor-not-allowed`, sem clique). Proteção também implementada diretamente na camada de contexto (`addToCart`) e nos cards da vitrine.
11. **Integração Supabase & Remoção do Firebase:** Concluída a substituição total do Firebase por Supabase PostgreSQL (`@supabase/supabase-js`). Geradas as migrations em `supabase/migrations/20261025000000_initial_schema.sql` (tabelas, chaves estrangeiras, índices e políticas RLS) e `supabase/seed.sql` (dados de catálogo). Implementada a nova aba **Supabase & SQL** no painel administrativo com status da conexão, teste de credenciais, sincronização bidirecional e visualizador interativo de SQL com cópia e download em 1 clique.
12. **Estúdio de Edição, Aprimoramento e Criação de Variações de Fotos:** Implementado o componente `ImageEditorStudioModal.tsx` integrado diretamente aos modais de cadastro/edição de Modelos e Sabores no `AdminPanel.tsx` e backend fullstack em `server.ts`. O usuário pode carregar qualquer foto, aplicar iluminação de estúdio profissional (Neon PodWave Studio, Estúdio HDR, Ice Frost, Luxury Black Gold), ajustar brilho/contraste/saturação/névoa, criar variações dinâmicas de ângulo, frutas e cenário, comparar Antes/Depois em tempo real e aplicar a imagem final com 1 clique diretamente ao catálogo.
13. **Sistema de Notificações Toast:** Implementado sistema de notificações visuais reativo (`ToastContext.tsx` e `ToastContainer.tsx`) com tipos `success`, `error`, `warning` e `info`, auto-dismiss configurável, barra de progresso regressiva e microinterações táteis para feedback em carrinho, cupons, checkout e perfil do cliente.
14. **Animações Suaves no Grid de Produtos (Framer Motion / Motion v12):** Implementadas transições fluidas com `<motion.div layout>` e `<AnimatePresence mode="popLayout">` na listagem de produtos (`CatalogSection.tsx`), além de microinterações táteis `whileTap` nos botões de filtro (faixa de puffs, categorias e marcas em `BrandScroller.tsx`). Ao filtrar por marca, categoria, puffs ou busca, os cards que deixam a tela desaparecem suavemente com escala e fade, enquanto os cards restantes se reorganizam na grade com transições de layout contínuas sem saltos abruptos. Se nenhum produto for encontrado, o aviso de lista vazia também surge com animação suave.
