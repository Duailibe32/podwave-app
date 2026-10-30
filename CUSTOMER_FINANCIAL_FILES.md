# Ficha financeira do cliente

Local: Painel Administrativo → Meu Negócio → Clientes, somente para proprietário. Tela de consulta, sem cadastro, edição, exclusão, quitação automática ou alteração de estoque. Não exige SQL.

Evolução: a ficha mantém os registros financeiros somente para leitura e agora pode incluir uma área separada de atendimentos internos. Essa área grava apenas observações em uma tabela própria e exige a instalação descrita em SERVICE_HISTORY_AND_ACCESSIBILITY.md. Não modifica os dados financeiros consultados pela ficha.

## Dados e identificação

A ficha usa vendas manuais e compromissos avulsos a receber já carregados pelo contexto financeiro. Compromissos a pagar, despesas e compras de fornecedores não são classificados como dívidas de clientes. Não associa contas de login do site a clientes financeiros por suposição.

Os registros atuais não têm um customer_id financeiro. Nesta versão, o agrupamento é indicativo: mesmo nome normalizado (acentos, caixa e espaços) e mesmo telefone completo. Telefone brasileiro com ou sem +55 é normalizado; contatos internacionais explícitos mantêm o código. Nome igual com telefone diferente ou telefone igual com nome diferente continua separado. Nome ou contato ausente/incompleto mantém uma ficha por registro. O contato não é verificado por SMS e não constitui prova de identidade. Nenhum vínculo é gravado no banco.

Correções de nomes e contatos devem ser feitas na origem. A ficha será reagrupada ao receber os dados atualizados. Pessoas diferentes que compartilham exatamente nome e telefone ainda podem aparecer juntas; um cadastro com identificador persistente é uma evolução futura.

## Valores

- Total comprado e recebido em vendas consideram apenas vendas não canceladas.
- Recebimentos de contas avulsas aparecem separadamente; não aumentam o total comprado.
- Saldo a receber soma os saldos registrados em vendas e contas avulsas a receber não canceladas. Uma conta avulsa duplicando uma dívida de venda não tem vínculo explícito para ser deduplicada automaticamente; a tela alerta para conferir a origem.
- Os valores agregados vêm dos campos das operações. Receipts/payments são exibidos como detalhamento e não são somados novamente. IDs de pagamento repetidos são deduplicados dentro da mesma operação, sem eliminar pagamentos de outra operação com o mesmo ID.
- Ausência ou diferença entre valor recebido e pagamentos detalhados gera aviso de histórico possivelmente incompleto. Não são criados recebimentos fictícios, datas ou comprovantes.
- Cancelamentos permanecem no histórico, fora dos totais. A ficha não presume que houve devolução de dinheiro.
- Cálculos agregados usam centavos inteiros e preservam valores zerados. Datas ausentes/ilegíveis são indicadas e não assumem a data atual.

Pesquisa por nome, telefone ou ID, filtro por saldo pendente, paginação de fichas/registros/pagamentos, indicadores de sincronização e atualização pelos mecanismos existentes. Reflete os dados disponíveis no navegador e os limites das consultas já existentes; não promete extrato integral além dos registros carregados. Dados locais ainda pendentes podem aparecer e são sinalizados.

## Verificação

`node scripts/test-customer-financial-records.cjs`: identificação conservadora, telefones normalizados/incompletos, homônimos, ausência de dados, centavos e zero, cancelamentos, exclusão de contas a pagar, ausência de duplicação de pagamentos, pureza da agregação, acesso do proprietário e estado vazio renderizado.

Também executados verificação de tipos, compilação e testes existentes de estoque, financeiro, configurações e notificações. Sem acesso ao banco real, sem dados demonstrativos na aplicação e sem alterações nos registros, RLS, autenticação, lógica de vendas ou sincronização. Conferência visual na prévia permanece pendente.
