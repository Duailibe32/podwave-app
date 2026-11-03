# Descontos monetários não cumulativos

VIP, combo progressivo e cupom monetário são alternativas: só o maior benefício em reais é aplicado. A comparação usa centavos e respeita as bases de cálculo existentes de cada benefício. Em empate, VIP tem preferência, depois combo e depois cupom, evitando consumir um cupom sem vantagem adicional.

Somente o benefício selecionado aparece com valor positivo no resumo. O cupom monetário selecionado mas superado por outro desconto mostra “Maior benefício já aplicado”; não incrementa o contador nem é registrado como cupom utilizado no novo pedido. O valor VIP registrado no pedido também corresponde ao benefício efetivamente aplicado.

Frete grátis permanece independente, porque não reduz o valor dos produtos. Retirada continua sem taxa e não consome cupom de frete. Promoção de frete já existente também evita consumo desnecessário desse cupom, conforme a regra anterior.

Exemplo reproduzido da captura do usuário:

- Produtos: R$ 219,98; acessórios: R$ 51,00; retirada sem taxa.
- VIP de 10% dos produtos: R$ 22,00. Combo de 5%: R$ 11,00.
- Aplicado: somente VIP R$ 22,00. **Total: R$ 248,98**, em vez de R$ 237,98.

Teste sem enviar pedido: entrar como VIP, usar 2 produtos, comparar o total com um cupom monetário menor e depois um maior. O desconto menor não deve se somar; um cupom maior deve substituir o VIP. Repetir com conta comum, cupom de frete e retirada. A ficha e o checkout devem coincidir.

A correção não altera pedidos históricos, estoque ou as configurações percentuais da loja. Não exige SQL novo. É a correção da política de cálculo no aplicativo; o cálculo confiável de preços e limites de cupons no servidor continua sendo uma pendência separada da auditoria.
