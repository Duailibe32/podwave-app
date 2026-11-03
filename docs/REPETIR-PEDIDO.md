# Repetir Pedido — primeira etapa

Em Minha Conta → Pedidos, cada pedido tem o botão **Repetir Pedido**. O botão adiciona modelos e sabores à sacola para revisão; não envia um pedido novo.

- Busca os mesmos IDs no catálogo atual, sem substituir sabores ou tentar localizar itens pelo nome.
- Usa preços, nomes e imagens atuais. Preserva outros itens da sacola e soma quantidades da mesma variante, considerando o estoque já comprometido pela sacola.
- Só adiciona a quantidade inteira solicitada para cada modelo/sabor. Itens removidos, inativos, sem estoque suficiente ou com estoque não informado ficam de fora, com aviso persistente no carrinho.
- Se nenhum item puder ser adicionado, mantém o histórico aberto e direciona o foco ao aviso.
- Não copia acessórios, cupom, frete nem totais do pedido antigo. As escolhas já existentes na sacola continuam; o cliente deve revisá-las antes de finalizar.
- Verifica o estoque informado pelo catálogo carregado; adicionar à sacola não reserva estoque.

Sem alterações de SQL. A Oferta Relâmpago é uma próxima etapa separada.

## Validação

`npm run lint`, `npm run test:audit` (23 scripts) e `npm run build`.

O teste de recompra executa a função real e o callback do contexto com dados sintéticos: preços atuais, estoque e sacola existente, duplicatas no histórico, itens inválidos/removidos/inativos, resultado parcial, preservação do histórico e ausência de operações de pedido no callback. O teste existente de descontos normaliza CRLF para funcionar em checkout do Windows.

Prévia local isolada usa os componentes reais de perfil e carrinho, com histórico e catálogo fictícios e serviço de pedidos substituído. Conferidos: pedido sem nenhum item disponível, pedido parcialmente disponível, aviso no carrinho, preço atual (2 × R$120), preservação de item existente (R$40) e total R$280. Nenhum pedido real foi criado.

## Conferência após publicar

1. Entrar na conta e abrir **Pedidos**.
2. Tocar em **Repetir Pedido** em um pedido anterior.
3. Conferir modelos, sabores, quantidades e preços atuais na sacola.
4. Conferir os avisos de itens que ficaram de fora.
5. Revisar acessórios, cupom e entrega antes de finalizar. Para testar apenas a recompra, basta conferir a sacola sem enviar.
