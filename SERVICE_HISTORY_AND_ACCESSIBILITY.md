# Atendimentos internos e consulta do pedido

## Escopo

Histórico manual de atendimentos do proprietário na ficha financeira, linha do tempo informativa na conta do cliente e ajustes gerais de acessibilidade. Sem selos, pontos, recompensas, descontos, brindes, repetição de pedidos ou atalhos de compra. A alteração não automatiza vendas ou contatos com clientes.

## Atendimentos

Em Meu Negócio → Clientes → Abrir ficha, o proprietário pode registrar uma observação interna com data e motivo. Cada nota fica vinculada ao ID de uma venda ou conta avulsa a receber existente no banco; o vínculo não depende do nome/telefone agrupado na tela. Registros locais ainda não confirmados não podem receber novas notas pela interface.

Uma correção exige motivo e mantém o conteúdo anterior na auditoria. A invalidação preserva o texto/data, marca a nota e exige motivo; nota invalidada não pode ser reativada ou editada. Não há botão nem permissão de exclusão. Autor e horários são definidos no banco com a sessão autenticada; o vínculo original é imutável. Versão evita sobrescrever uma correção concorrente. Uma repetição idêntica de inclusão com o mesmo UUID recupera a nota existente sem duplicar o registro. Após erro de confirmação, recarregue o histórico para conferir o resultado antes de criar outra nota.

A interface exibe até os 100 registros mais recentes da ficha, inclusive invalidados. Registros anteriores continuam no banco e na auditoria. Se a venda/conta for excluída depois, suas notas permanecem no banco/auditoria, mas deixam de ser incluídas na ficha calculada por registros financeiros existentes. A interface mostra IDs de autoria; a auditoria existente registra também o rótulo da sessão.

## Banco — instalação pendente

Arquivo: supabase/migrations/20261030020000_customer_service_history.sql. Adiciona somente customer_service_notes, suas regras, índice e triggers; reutiliza app_security.is_podwave_finance_owner() e app_security.capture_business_audit(). A verificação inicial aborta se essas funções não existirem. A instalação pode ser repetida e não cria notas de exemplo.

RLS e privilégios permitem somente SELECT/INSERT/UPDATE ao proprietário financeiro autenticado. DELETE não é concedido. Não altera as políticas existentes, vendas, quantidades, parcelas, pagamentos ou dados históricos. As notas e alterações são registradas no mesmo fluxo de auditoria confirmado do banco.

O usuário confirmou a instalação pelo SQL Editor com “Success. No rows returned”. O agente não acessou nem alterou diretamente o banco real. O PR segue sem integração por orientação explícita do usuário; a revisão atual compatibilizou a branch com a main atualizada. Antes da instalação, a área de atendimentos informa a pendência sem bloquear a ficha financeira. Esta revisão não muda o SQL instalado nem exige executá-lo novamente.

## Situação do pedido

Em Minha conta → Histórico de Pedidos, cada pedido mostra seu status atual em uma sequência de referência: recebido, em separação, enviado, entregue. Não afirma que etapas anteriores efetivamente ocorreram e não inventa datas por etapa. Status desconhecido aparece como informado; cancelamento aparece separadamente. A consulta usa os pedidos já disponíveis no perfil; não muda status nem oferece confirmação de venda.

## Acessibilidade

Foco de teclado visível nos controles, com cores adequadas para temas escuro/claro, indicação textual do status atual e aria-current. Respeita preferência de movimento reduzido. Ao corrigir/invalidar atendimento, leva o foco ao motivo da operação. Não altera o funcionamento financeiro ou os ajustes visuais enviados anteriormente.

## Verificação

node scripts/test-service-history.cjs: instalação idempotente, pré-requisitos, autorização, autoria confiável, vínculo real, motivo, versão concorrente, correção/invalidação, conteúdo antes/depois na auditoria, impossibilidade de exclusão e estados da linha do tempo. PostgreSQL em memória; nenhum dado real alterado. Também devem passar os testes anteriores, verificação de tipos e build. Conferência visual/de teclado no dispositivo real permanece pendente.

Revisão da main atualizada: conflito de importações na conta resolvido preservando os componentes existentes. Atualizar atendimentos agora preserva os campos ainda não salvos e seu identificador de repetição; o salvamento aguarda a consulta da lista para evitar que uma resposta antiga esconda um registro recém-criado. Teste adicional: node scripts/test-service-history-drafts.cjs. Correção de versão desatualizada orienta a reabrir Corrigir após atualizar, mantendo os campos digitados.
