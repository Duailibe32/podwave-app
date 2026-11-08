<div align="center">
  <img src="public/pwa-192x192.png" width="96" alt="Ícone do PodWave" />

  <h1>PodWave</h1>

  <p><strong>Catálogo mobile, pedidos em tempo real e gestão da operação.</strong></p>
  <p>Da escolha do sabor à entrega, com checkout pelo WhatsApp e acompanhamento pelo Ticket Digital.</p>

  <p>
    <a href="https://podwave-app.vercel.app/">Abrir a loja</a> ·
    <a href="#funcionalidades">Funcionalidades</a> ·
    <a href="#executar-localmente">Executar localmente</a> ·
    <a href="#google-ai-studio">Google AI Studio</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&amp;logoColor=black" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&amp;logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&amp;logoColor=black" alt="Supabase" />
    <img src="https://img.shields.io/badge/PWA-Instal%C3%A1vel-8423DA" alt="PWA instalável" />
  </p>
</div>

---

## Visão geral

O PodWave conecta a vitrine, a Central de Pedidos e o módulo **Meu Negócio**. A loja foi pensada para uso no celular, com navegação inferior, escolha de sabores por toque e um comprovante que o cliente pode reabrir quando precisar. No painel, a equipe acompanha a operação, o estoque e as movimentações financeiras.

| Cliente | Loja |
| --- | --- |
| Consulta produtos, sabores e disponibilidade. | Atualiza o catálogo, o estoque, as promoções e as regras de entrega. |
| Finaliza o pedido, abre a conversa no WhatsApp e acompanha o Ticket Digital. | Confirma o pedido, avança as etapas e registra pagamentos. |
| Consulta os selos e recompra a partir do histórico. | Acompanha vendas, despesas, compras, caixa e contas pendentes. |

## Funcionalidades

### Vitrine e compras pelo celular

- Catálogo com busca, filtros por marca, categoria e faixa de puffs, além de ordenação.
- Seletor de sabores com cor, nome e disponibilidade. No celular, as setas trocam o sabor no card e a ficha mantém o botão **Adicionar à sacola** ao alcance durante a rolagem.
- Sacola com **Compre Junto**, metas de combo e fidelidade, desconto VIP, Oferta Relâmpago e cupons de valor fixo, percentual ou frete grátis. O cálculo escolhe o melhor desconto de produto elegível.
- Entrega com taxa fixa ou estimativa por distância cadastrada, incluindo suporte às sedes de **Codó–MA** e **São Bernardo–MA**. A retirada aparece como modalidade própria.
- Login por e-mail e senha, código por e-mail, Google e passkeys conforme a configuração de autenticação do projeto.
- Área do cliente com histórico, recompra conforme o catálogo e o estoque atuais, cartão de fidelidade e atalho para o pedido em andamento.

### Checkout e Ticket Digital

1. O cliente entra na conta, escolhe entrega ou retirada, revisa os valores e confirma.
2. O pedido é salvo no Supabase. Após a confirmação, a loja abre o **Ticket Digital** e tenta abrir a conversa no WhatsApp.
3. O ticket mostra código, etapa, itens, destino, pagamento, total, economia e saldo de selos. Ele pode ser reaberto em **Meus Pedidos → Ver Ticket Digital**.
4. O cliente pode copiar o código, compartilhar o resumo, baixar o comprovante em PNG e reabrir a conversa com a mesma referência. O resumo compartilhável e o PNG omitem o endereço.

O prazo depende da modalidade. O ticket apresenta a estimativa local da **Entrega Flash** ou sinaliza que a loja precisa confirmar o prazo da rota regional. A sincronização usa o Supabase. Os avisos com a loja fechada dependem da configuração de Web Push no navegador e no servidor. Consulte o [guia de publicação e alertas](supabase/PUBLICACAO_CHECKOUT.md).

### Central de Pedidos e Meu Negócio

- **Pedidos** com visualização em lista e Kanban, filtros, histórico de alterações, atalhos de atendimento no WhatsApp e impressão térmica de 58 ou 80 mm.
- **Estoque** com baixa e estorno no fluxo de pedidos. As operações que vinculam pedido, venda e estoque usam transações no banco.
- **Financeiro** com vendas, despesas, compras de mercadorias, entradas e saídas de caixa, transferências e contas a pagar ou receber. Inclui relatórios com exportação em CSV e Excel.
- **Gestão de clientes** com cargos, benefícios VIP, fidelidade e histórico de atendimento.

## Google AI Studio

Os **confetes do Ticket Digital** e o **convite de instalação do PWA no rodapé** foram implementados no [Google AI Studio](https://aistudio.google.com/) e integram a versão atual do PodWave. [Ver a alteração no GitHub](https://github.com/Duailibe32/podwave-app/commit/fdc831e33ebb0b08cf267c83d19b940a45f100fa).

| Entrega | Como funciona |
| --- | --- |
| [Confetes no Ticket Digital](src/components/OrderTicketModal.tsx) | Uma explosão central e dois disparos laterais usam a paleta neon da marca dentro do modal. A animação ocorre na primeira abertura do comprovante de cada pedido no navegador, respeita a preferência por movimento reduzido e fica desativada para pedidos cancelados. |
| [Convite para instalar o PWA](src/components/PWAInstallButton.tsx) | O [rodapé](src/components/Footer.tsx) ganhou uma dica discreta e o aviso inferior foi aprimorado. O convite explica como adicionar o PodWave à tela inicial, abre a instalação nativa quando disponível ou mostra instruções para Android e iPhone. O visitante também pode dispensá-lo. |

## Arquitetura

| Camada | Implementação |
| --- | --- |
| Interface | React, TypeScript, Vite, Tailwind CSS, Lucide e Motion |
| Dados e autenticação | Supabase com PostgreSQL, Auth, Realtime e políticas de acesso por linha (RLS) |
| Aplicativo instalável | Manifesto, Service Worker, cache de recursos e integração opcional com Web Push |
| Desenvolvimento e publicação | Servidor local Express, Vercel e verificações no GitHub Actions |

O checkout usa regras no banco para conferir preço, estoque, frete e descontos antes de aceitar o pedido. O limite de cupom é consumido na mesma gravação. Os clientes acompanham seus próprios pedidos, e os fluxos de operação são reservados aos perfis autorizados. A ficha do produto, o checkout, o ticket, o painel e a biblioteca de Excel são carregados sob demanda.

## Executar localmente

O fluxo de verificação do repositório usa **Node.js 24** e **Bun** para instalar as versões registradas no `bun.lock`.

```bash
git clone https://github.com/Duailibe32/podwave-app.git
cd podwave-app
bun install --frozen-lockfile
```

Crie um arquivo `.env` na raiz com base no [`.env.example`](.env.example). Use a URL e a chave **pública** de um projeto Supabase de desenvolvimento.

```dotenv
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

```bash
npm run dev
```

Abra `http://localhost:3000`. Para testar conta, pedidos e painel, use um banco com o esquema do PodWave e os perfis correspondentes.

### Supabase e publicação

1. Para atualizar uma instalação existente, consulte o [guia de publicação do checkout](supabase/PUBLICACAO_CHECKOUT.md) e aplique as mudanças correspondentes à versão do banco.
2. Use as [consultas de diagnóstico](supabase/diagnostics/) para conferir tabelas e permissões antes de testar com uma conta.
3. Configure os alertas com a loja fechada quando desejar usar o Web Push. A chave VAPID pública vai em `VITE_ORDER_PUSH_PUBLIC_KEY`. A chave privada e o segredo de envio ficam em **Edge Functions → Secrets** no Supabase.

Os arquivos de [migrações](supabase/migrations/) e [propostas SQL](supabase/proposals/) registram as etapas de evolução do banco. Para preparar um novo ambiente, confirme a compatibilidade do esquema e dos scripts com a versão do aplicativo em um projeto de desenvolvimento.

### Diagnóstico

Se os pedidos não aparecerem, use o diagnóstico na **Central de Pedidos** para conferir a sessão, o perfil e o acesso às tabelas. A consulta padrão verifica a leitura. No navegador, também é possível rodar `await window.diagnoseSupabaseOrders()` pelo console.

## Testes

```bash
npm run lint                         # Checagem de tipos
npm run test:audit                   # Regras de pedidos, permissões, estoque e financeiro
npm run build -- --manifest          # Build de produção
node scripts/check-mobile-build.cjs  # Orçamento de carregamento e telas sob demanda
```

O [workflow do GitHub](.github/workflows/podwave.yml) executa essas verificações em pull requests e na branch principal.

## Estrutura do projeto

```text
src/
├── components/    Vitrine, checkout, ticket, área do cliente e painel
├── context/       Sessão, catálogo, sacola e notificações
├── services/      Acesso ao Supabase e serviços de pedidos e atendimento
└── utils/         Preços, descontos, frete, fidelidade e compartilhamento

public/            Ativos e recursos da PWA
scripts/           Testes e verificações de build
supabase/          SQL, diagnósticos e função de envio de alertas
docs/              Guias técnicos e registros de auditoria
```

### Guias do repositório

- [Experiência móvel](MOBILE_LAYOUT.md)
- [Entrega por sede e cupom de frete](docs/frete-sedes-e-cupom.md)
- [Descontos não cumulativos](docs/descontos-nao-cumulativos.md)
- [Oferta Relâmpago](docs/OFERTA-RELAMPAGO.md) e [recompra](docs/REPETIR-PEDIDO.md)
- [Estoque e auditoria](STOCK_AND_AUDIT.md) e [segurança](SECURITY_HARDENING.md)

---

<div align="center">
  <strong>PodWave</strong> · <a href="https://podwave-app.vercel.app/">Visitar a loja</a>
</div>
