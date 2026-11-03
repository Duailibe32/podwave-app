# Entrega, duas sedes e cupom de frete grátis

## Como funciona

O painel Promoções oferece dois modos: **taxa fixa** e **estimativa por km e cidade**. O modo fixo permanece como padrão, com taxa R$ 0 enquanto não configurada, preservando os pedidos atuais. Nenhum preço real por km foi escolhido pelo agente.

As sedes iniciais são **Codó–MA** e **São Bernardo–MA**. No modo por km, cadastre as cidades atendidas e a distância aproximada de ida a partir de cada sede que consegue fazer aquela entrega. Quando houver mais de uma rota cadastrada para o mesmo destino, o cálculo usa a menor distância.

**Frete = maior valor entre (distância × preço por km) e taxa mínima.** A taxa fixa não é somada no modo por km. Para entrega dentro de uma cidade-sede, cadastre a rota da própria sede para a cidade com 0 km: será aplicada a taxa mínima. As distâncias são cadastradas pela loja; não há serviço de mapas, GPS ou consulta automática de rotas nesta entrega.

Exemplo fictício: destino a 20 km de Codó e 45 km de São Bernardo, R$ 2/km, mínimo R$ 8 → saída estimada de Codó, entrega R$ 40. Ajuste os valores à operação real. Se uma sede não atende um destino, não cadastre essa rota. O estoque continua unificado, sem separação por sede.

Cidade e UF precisam coincidir com o cadastro, aceitando diferenças de maiúsculas e acentos. Destino sem rota cadastrada fica **a combinar**, mostra subtotal sem frete e não finaliza automaticamente. A loja deve cadastrar/corrigir a rota ou o cliente escolher retirada. A regra não transforma um destino sem cobertura em entrega grátis.

## Frete grátis

- **Promoção:** ative “Frete grátis a partir da quantidade do Nível 2”. Exige promoção ativa e quantidade de produtos suficiente; acessórios não contam. No modo por km, vale para os destinos cadastrados.
- **Cupom:** em Cupons, selecione o novo tipo **Frete grátis**. O valor monetário é zero: o cupom isenta entrega, sem abater o preço dos produtos. Respeita o estado ativo, mínimo, modelo e limite de usos conhecidos pelo cliente. O tipo de cupom é validado pelo banco; os limites de uso seguem o mecanismo atual do aplicativo, sem nova reserva atômica de cupom no servidor.
- **Retirada:** sempre sem entrega; não consome um cupom de frete.
- Se a promoção já isenta a entrega, o cupom de frete não gera desconto adicional nem tem seu uso incrementado nesse fluxo.

A compra mínima para selo de fidelidade é independente do frete grátis.

## Valores consistentes

Checkout, prévia, mensagem de atendimento e pedido salvo usam o mesmo resumo em centavos. O pedido grava `deliveryFee` e o total com frete. A ficha não adiciona mais uma taxa fixa de R$ 10; inclui também todos os acessórios selecionados. A sede e os quilômetros da estimativa ficam registrados nas observações do pedido. Os preços e o frete ainda precisam ser conferidos pela loja antes da confirmação, como no fluxo atual; esta mudança não implementa uma cotação de preços confiável no servidor.

## Publicação

O SQL `supabase/proposals/20261102_free_shipping_coupons.sql` deve preceder o frontend. Ele foi testado em PGlite e aplicado nesta sessão ao projeto original `hccrgzjkbmgutpazlljb`. A consulta de verificação confirmou `frete_gratis_permitido=true`, `valor_monetario_zero=true` e `rls_preservado=true`. Nenhum cupom ou pedido real foi criado ou alterado pelo agente durante esta entrega.

Depois do merge/publicação:

1. Reabra o site atualizado e vá a **Promoções → Entrega e frete grátis**.
2. Escolha taxa fixa ou por km. Para km, confira as duas sedes, informe preço/km e mínimo e adicione as rotas. Salve e reabra a tela para conferir persistência.
3. Em **Cupons**, crie um código do tipo Frete grátis, com os limites desejados. Salve/sincronize pelo fluxo existente do painel e confira o código em outro navegador.
4. Sem enviar pedido, compare o resumo do checkout com a ficha: entrega paga, cupom de frete e retirada devem produzir os mesmos valores nas duas telas.
5. Teste cidade sem rota e a troca de quantidade após aplicar cupom. Não deve aparecer frete grátis indevido nem pedido automático com entrega desconhecida.

## Verificação

`npm run lint`, `npm run build` e a suíte `npm run test:audit`, incluindo `test-checkout-shipping.cjs`. Regressões verificam duas sedes/menor distância, mínimo, cidade/UF, retirada, promoção/cupom, cupom inativo/esgotado/restrito, centavos, acessórios e igualdade do payload/ficha. O SQL é instalado duas vezes em banco descartável; tipos desconhecidos e cupom de frete com valor monetário são recusados.

Prévia local dos componentes reais, com serviços simulados, verificada em largura de 375 px: frete estimado, retirada, destino desconhecido e salvamento do formulário. Isso não equivale a testar pedidos reais em dois aparelhos após a publicação. A automação desta entrega não enviou WhatsApp nem movimentou estoque real.
