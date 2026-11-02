# Correções da reauditoria — instalação

## O que esta entrega corrige

- Login não executa mais o diagnóstico de pedidos automaticamente.
- Diagnóstico nunca reenvia cache, mesmo recebendo a opção legada `localOrdersToReconcile`. Por padrão só lê; reparo de perfil/sonda exigem `runWriteProbe: true`.
- Falha na exclusão da sonda gera aviso e não aparece como sucesso no painel.
- Venda vinculada a pedido é preservada. O cancelamento deve ser feito na Central de Pedidos, pela transação já existente de pedido/venda/estoque. Vendas avulsas continuam podendo ser excluídas.
- Uma trigger bloqueia exclusão de venda vinculada até para clientes antigos e quando RLS oculta o pedido. A exceção desfaz o estorno e todos os efeitos da transação.
- Desconto progressivo de 0% permanece zero; desconto fixo aparece em reais no rodapé.
- O aviso de retenção informa elegibilidade, sem prometer exclusão em um instante sem agendador.

## Passo a passo para publicar

1. No Supabase, abra o projeto original **Duailibe32's Project** (`hccrgzjkbmgutpazlljb`). Não escolha o projeto PodWave Testes.
2. Abra **SQL Editor → New query**. Copie o conteúdo completo de `supabase/proposals/20261102_guard_linked_sale_deletion.sql`, cole e execute **Run**. O resultado esperado é sucesso. O script não reescreve pedidos, vendas ou estoque e pode ser aplicado novamente.
3. Se houver erro, pare e envie a mensagem. Não execute migrations antigas nem remova RLS para contornar.
4. Após o SQL instalado, faça o merge desta PR no GitHub. Aguarde a publicação da Vercel concluir.
5. Recarregue o site no celular e no PC. Não limpe os dados do navegador: pode haver rascunhos não enviados.
6. Primeiro em **PodWave Testes**, confirme um pedido fictício de 1 unidade: estoque 5→4, uma venda. Tente excluir a venda vinculada: deve ser bloqueado, mantendo estoque 4. Cancele o pedido pela Central: estoque 4→5, venda cancelada preservada. Atualize a página: nada deve duplicar.
7. Abra e atualize o histórico várias vezes: nenhum pedido deve ser criado pela consulta ou pelo diagnóstico. Pedidos antigos já existentes no banco não desaparecem automaticamente com esta atualização.

## Verificação do SQL instalado (somente leitura)

```sql
select t.tgname, t.tgenabled,
       p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_pode_executar
from pg_trigger t
join pg_proc p on p.oid=t.tgfoid
where t.tgrelid='public.manual_sales'::regclass
  and t.tgname='trg_guard_linked_order_sale_deletion'
  and not t.tgisinternal;
```

Esperado: uma linha, `tgenabled=O`, `security_definer=true`, `anon_pode_executar=false`.

## Validação realizada

`npm run lint`, `npm run build` e `npm run test:audit`: aprovados (18 scripts). Regressões novas exercitam o diagnóstico real com mocks, cálculo real de descontos, e SQL real em PostgreSQL/PGlite descartável. Incluem exclusão bloqueada com pedido oculto por RLS, rollback do estoque e auditoria, exclusão de venda avulsa, instalação repetida e cancelamento coordenado.

Esses testes não substituem o ensaio entre dois aparelhos e duas contas. O SQL desta entrega não foi aplicado em produção pelo agente.

## Pendências da auditoria

Frete grátis integrado ao checkout, criação/exclusão arbitrária de acessórios, agendamento real da retenção, cálculo confiável de preços e regra mínima de fidelidade, e testes completos em dois aparelhos. Os três pedidos antigos de teste não foram excluídos; só tratar sua remoção depois da publicação atualizada em todos os aparelhos.

## Reversão

Se necessário, reverta o commit do frontend pelo GitHub. Mantenha a trigger de proteção: ela é compatível com a versão anterior e evita a falha antiga. A reversão do frontend reativa o diagnóstico antigo; prefira suspender o uso desse fluxo até corrigir. Não há migração de dados para desfazer.
