# Oferta Relâmpago do Dia

No Admin, abrir **Promoções → Oferta Relâmpago do Dia**. Selecionar um modelo e, opcionalmente, um único sabor, informar a porcentagem e o término. O botão **Definir término em 24 horas** facilita o preenchimento. **Salvar e ativar oferta** inicia a campanha após a gravação confirmada. Só existe uma oferta configurada por vez.

Os modelos aparecem em ordem de estoque informado. A seleção exige modelo ativo e sabor disponível com estoque conhecido. No modelo inteiro, a oferta vale apenas para seus sabores disponíveis. O intervalo deve ser positivo e ter no máximo 24 horas; a porcentagem deve ser maior que zero e até 100%. Datas são convertidas do horário do aparelho para timestamps absolutos; atualizar a página não reinicia o prazo.

Na loja, o banner mostra produto/sabor, porcentagem, contador e **Ver oferta**, que abre a ficha com o sabor escolhido. Ofertas desativadas, vencidas, malformadas ou sem estoque não aparecem e não geram desconto. A contagem de segundos fica no próprio banner; o contexto do catálogo só agenda atualizações nas fronteiras de início/fim e ao retomar a aba.

O desconto aplica-se apenas às linhas elegíveis, em centavos. O carrinho compara o valor da oferta com VIP, combo e cupom e aplica somente o maior. Empates preservam o cupom, com prioridade VIP, combo, oferta e cupom. Frete grátis permanece uma regra separada. Carrinho e checkout identificam o desconto da oferta, sem atribuí-lo por engano ao cupom.

O resumo recalcula o prazo ao ser consultado. Se o total mudar por vencimento no clique ou durante a consulta de estoque, o envio é interrompido antes dos efeitos de pedido/cupom e o cliente deve revisar e confirmar novamente. A ficha e a persistência usam o mesmo resumo financeiro.

## Persistência e limites

- Usa `progressiveDiscountConfig.flashSale` no JSON da linha já existente `store_settings/promotions_config`. Sem tabela, coluna ou SQL novos.
- O formulário só aplica a regra local e anuncia sucesso após uma gravação confirmada. Erros mantêm a regra anterior. A leitura dá prioridade à linha dedicada de promoções sobre colunas legadas. Restaurar os padrões de combo/acessórios preserva a oferta.
- A vitrine carrega as configurações ao abrir. Após ativar, editar ou desativar no Admin, atualizar uma aba da loja que já estava aberta para carregar a nova configuração. O término da configuração já carregada acontece automaticamente.
- O prazo e os cálculos desta entrega são conferidos no aplicativo, com o relógio do aparelho. A etapa de validação autoritativa de preços/descontos no servidor continua pendente; esta funcionalidade não elimina essa limitação anterior.

## Validação

`npm run lint`, `npm run test:audit` (24 scripts), `npm run build -- --manifest` e `node scripts/check-mobile-build.cjs`.

O novo teste executa helpers reais, cálculo do contexto, resumo, callback de envio até a barreira de expiração, persistência Admin, serializador e leitura de configurações com mocks isolados. Cobre alvo modelo/sabor, estoque/remoção, datas/porcentagens inválidas, prazo exato, não acumulação/empates, centavos, reavaliação após expirar, expiração durante espera de estoque, erro/negação/exceção no save e timer/cleanup sem intervalo global por segundo.

Prévia com componentes reais e dados fictícios: ativar por sabor, falha simulada ao gravar, contador regredindo, abrir alvo correto, pausa, expiração curta, comparação com VIP/combo/cupom e total R$160 para subtotal R$200 com oferta de 20%. Carrinho e checkout conferidos; larguras 320/375/430px sem rolagem horizontal. Nenhuma campanha ou pedido foi criado na loja real.

## Após publicar

1. Abrir Admin → Promoções e configurar o alvo, desconto e horário. Conferir a prévia antes de ativar.
2. Atualizar a vitrine em outra aba ou no celular; conferir alvo e contador.
3. Adicionar o sabor elegível e conferir o desconto e o total na sacola.
4. Conferir outro sabor quando a oferta for específica; ele deve manter o preço normal, sujeito aos demais benefícios.
5. Conferir com VIP/cupom e verificar que apenas o maior desconto monetário foi aplicado.
6. Desativar e atualizar a vitrine, ou aguardar o término; a oferta deve desaparecer. É possível testar esses passos sem enviar um pedido.
