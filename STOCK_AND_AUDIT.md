# Estoque automático, auditoria e exclusão de contas

## Comportamento

- Novas vendas administrativas exigem produto e sabor do catálogo, com quantidade inteira conhecida e disponível. Estoque não informado não permite vender.
- Toda venda não cancelada reserva as unidades, inclusive vendas a prazo e com status pendente. Pagamento não é o gatilho da baixa. Cancelamento ou exclusão confirmados devolvem somente as unidades reservadas por essa venda. Reativação confere o estoque novamente.
- Alterações de quantidade aplicam somente a diferença. Itens repetidos do mesmo sabor são somados no banco.
- A venda e as alterações de estoque acontecem na mesma transação. Sem conexão/instalação da função, o formulário permanece aberto e a venda não é confirmada localmente. Identificador da operação evita baixa repetida após perda da resposta; versão da venda bloqueia edição desatualizada.
- Vendas anteriores à instalação não têm baixa retroativa. Seus itens ficam preservados; é possível atualizar os dados financeiros sem alterar o estoque histórico. Uma nova venda é necessária para novos itens.
- Carrinho limita quantidades. Antes de enviar ao WhatsApp, consulta o estoque do servidor. O pedido pelo WhatsApp não reserva nem confirma uma venda: a confirmação administrativa aplica a reserva atômica. Acessório USB continua sendo o adicional existente, fora dos produtos por sabor; não ganha estoque próprio nesta alteração.
- Push/Auto-Sync do catálogo atualizam metadados dos sabores existentes sem reenviar quantidades. Ajustes de estoque continuam no controle dedicado; novos sabores recebem a quantidade inicial definida no cadastro. Snapshots antigos não podem repor quantidades vendidas.
- Contas pendentes usam uma confirmação dentro do site, sem depender de window.confirm bloqueável em iframe. Exclusão só remove o item da tela após o banco confirmar a linha excluída; falhas aparecem na janela. Contas derivadas de vendas/compras continuam sendo administradas na origem.

## Auditoria

Nova área em Auditoria & Logs: operações confirmadas, responsável obtido da sessão do banco, busca por responsável/descrição/ID, área, ação, intervalo de datas, paginação e exportação CSV da página atual. Cada evento permite comparar antes e depois. Estoque, financeiro e catálogo são registrados por triggers na mesma transação da alteração. Transações desfeitas não produzem evento confirmado.

O histórico começa na instalação. Logs antigos e tentativas locais continuam acessíveis separadamente. Erros ao salvar vendas e excluir contas são registrados no histórico do aplicativo, sem se passarem por operações confirmadas. Não há retropreenchimento ou logs fictícios. A tabela nova só permite leitura a administradores/proprietário; o aplicativo não recebe permissão para inserir, alterar ou apagar os eventos. As políticas existentes das demais tabelas não são substituídas.

## Instalação pendente — não executar automaticamente

1. Conferir a estrutura real de flavor_variants: id, model_id, demo_quantity, in_stock e updated_at. A migration faz uma verificação inicial de demo_quantity e aborta se não existir. Os nomes seguem o serviço do aplicativo; não substituem a conferência do banco real.
2. Revisar a migration 20261030010000_atomic_sale_stock_and_audit.sql e combinar uma janela breve de atualização. O usuário deve autorizar a aplicação no Supabase separadamente.
3. Atualizar o código no AI Studio e instalar a migration na mesma janela, com vendas pausadas. O código novo bloqueia vendas enquanto a função não existir. Depois da migration, versões antigas não podem gravar ou excluir vendas pela rota anterior. Não executar migrations antigas nem reinstalar o banco.
4. Conferir uma operação real autorizada, sem criar dados fictícios. Não realizar baixas retroativas nas vendas já registradas nem limpar o armazenamento do navegador.

A migration adiciona metadados às vendas e uma tabela de auditoria; não modifica as quantidades atuais durante a instalação. Não foi executada no banco real por este trabalho. O PR fica em rascunho até confirmar o esquema e a instalação.

## Verificações

- node scripts/test-sale-stock.cjs: PostgreSQL em memória, instalação idempotente, ausência de baixa retroativa, reserva, edição por diferença, cancelamento, exclusão, repetição, bloqueio de versão antiga, rollback integral, agregação de itens, solicitações concorrentes enfileiradas, estoque desconhecido, histórico de exclusão, RLS e imutabilidade da auditoria. PGlite enfileira as solicitações; não substitui teste de concorrência com várias conexões em PostgreSQL real.
- node scripts/test-stock-ui.cjs: limites do carrinho e fluxo de confirmação/exclusão com callbacks reais extraídos do componente.
- node scripts/test-financial-compat.cjs: regressão dos mapeamentos financeiros.
- npm run lint e npm run build.

Os testes não acessam o Supabase nem os dados do navegador. Não houve teste visual no AI Studio nesta etapa.
