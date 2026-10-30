# Compatibilidade financeira com o Supabase existente

Esta correção adapta o aplicativo às seis tabelas cuja estrutura foi fornecida em 30/10/2026. Não requer executar SQL, migrations, alterar RLS ou limpar dados locais.

| Tabela | Adaptação |
| --- | --- |
| manual_sales | date, customer_contact, subtotal, total, payment_date e payments |
| manual_expenses | date e title |
| merchandise_purchases | date, supplier, subtotal, freight_or_extra_cost e total |
| cash_movements | date, movement_type e destination_channel |
| initial_cash_balances | Nomes já compatíveis; preserva edições locais pendentes ao carregar |
| manual_commitments | commitment_type, title, person_or_supplier e contact |

Os campos opcionais do aplicativo que correspondem a colunas TEXT obrigatórias são enviados como texto vazio quando não preenchidos: cliente da venda, categoria da movimentação e vencimento do compromisso. Nenhum nome ou vencimento fictício é criado.

O banco não possui colunas para modalidade de entrega/status do pedido, referência/status de recebimento da compra, divisão entre frete e outros custos, nem origem/referência da movimentação. Esses campos são preservados em um envelope JSON identificado por `podwave:financial-notes:v1:` dentro de `notes`. As observações originais ficam dentro desse envelope e aparecem normalmente no aplicativo. Na tabela do Supabase, essa coluna mostra o envelope completo. Notas antigas em texto continuam legíveis. O campo freight_or_extra_cost recebe a soma do frete e dos outros custos; a divisão fica no envelope. Colunas não utilizadas pelo aplicativo, como os indicadores de estoque, não são enviadas nas atualizações.

## Verificação local

- `node scripts/test-financial-compat.cjs`: PostgreSQL em memória, sem conexão com Supabase. Verifica as seis tabelas, colunas e restrições, salvar/carregar/editar, pagamentos, parcelas, transferências, valores zerados, campos opcionais, notas antigas, preservação de colunas de estoque e recusa de gravações. Verifica também a mesclagem de saldos locais pendentes.
- `npm run lint`: verificação de tipos.
- `npm run build`: compilação de produção.

O teste usa somente as definições CREATE TABLE do arquivo de segurança existente como referência local. Não executa o arquivo completo, políticas ou migrations no projeto real. Não valida as políticas de acesso do servidor nem faz teste integrado no site publicado.

Há um conflito preexistente entre as versões declaradas de Vite e esbuild. Para a verificação local foi usado `npm install --ignore-scripts --package-lock=false --legacy-peer-deps`, sem alterar dependências nem arquivo de lock. A compilação apresenta avisos preexistentes de configuração e tamanho do pacote.

## Revisão e publicação

O PR deve ser revisado antes da integração à main. Auto-Sync permanece na configuração atual. Nenhum dado financeiro é enviado por esta revisão. Não é necessário executar SQL ou limpar o navegador. Depois da integração/publicação, a verificação no ambiente real deve ser feita com a conta administrativa e registros reais autorizados, preservando os dados locais existentes.
