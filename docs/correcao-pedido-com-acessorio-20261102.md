# Pedido com Compre Junto: erro de vínculo de sabor

## Causa confirmada

O pedido de teste `PW-20261102-XAK2` contém:

- `modelId=ignite-v55`, `flavorId=f-cool-mint`; o banco confirma `flavor_variants.model_id=ignite-v55`. O vínculo do produto está correto.
- `modelId=addon`, `flavorId=addon-usbc-turbo`; cabo USB sem registro em `flavor_variants`, como esperado.

A função `save_sale_with_stock` validava todos os itens como sabores, inclusive o cabo. Por isso retornava “O sabor não pertence ao produto selecionado”. O pedido não precisa ser excluído ou recriado.

## Correção

Aplicar `supabase/proposals/20261102_sale_stock_complementary_addons.sql` no SQL Editor do projeto original `hccrgzjkbmgutpazlljb`.

O patch altera somente o bloco de validação da função existente. Aceita os três IDs fixos que o checkout atual emite, exclusivamente quando `productId=addon`: `addon-usbc-turbo`, `addon-lanyard`, `addon-silicone-cover`. A quantidade continua validada. A linha do acessório permanece na venda e no total; somente os sabores reais entram na alocação de estoque. IDs desconhecidos, produto/sabor divergentes e quantidades inválidas continuam sendo recusados.

Não desativa o controle de estoque da venda, não altera RLS/ACLs/autorização e não regrava dados de pedidos/vendas/estoque. O patch é idempotente e recusa uma definição diferente da versão revisada. A proteção contra exclusão de venda vinculada continua ativa.

## Validação local

`node scripts/test-sale-stock.cjs`: aprovado em PostgreSQL/PGlite descartável. O teste primeiro reproduz a falha com a função anterior, depois aplica o patch duas vezes e confirma:

- pedido com produto + cabo gera uma venda com ambos os itens e o valor do acessório;
- só o sabor real sofre baixa;
- cancelamento devolve o estoque uma única vez;
- exclusão vinculada continua bloqueada, sem estorno parcial;
- vendas avulsas continuam funcionando;
- acessórios falsos e vínculo incorreto continuam bloqueados;
- SECURITY INVOKER e ACLs são preservados.

## Reteste pelo proprietário

No painel, clique **Atualizar Pedidos** e tente **Confirmar Pedido** no mesmo pedido de teste. Essa ação movimenta o estoque real e deve ser executada pelo proprietário. Conferir uma única venda com produto + cabo e uma única baixa do sabor. Ao cancelar pela Central, a baixa deve ser devolvida uma vez. Não repetir por criação de outro pedido nem apagar o acessório para contornar o erro.

Para conferir a instalação sem alterar dados:

```sql
select strpos(pg_get_functiondef(
  'public.save_sale_with_stock(jsonb,integer,text,boolean)'::regprocedure
), 'Complementary accessories have no flavor inventory') > 0 as ajuste_instalado;
```
