# Publicação das correções de checkout

1. No GitHub, confira o resultado de **Verificações PodWave** no pull request. Se o repositório permitir, torne o check **Tipos, regras e build** obrigatório na proteção de `main`.
2. Depois do merge, aguarde o deploy da Vercel. Abra a loja numa aba nova para obter o checkout atualizado.
3. No SQL Editor do projeto real, aplique [20261107_checkout_pricing.sql](proposals/20261107_checkout_pricing.sql). Ele espera as colunas do catálogo que a loja usa hoje. A transação é revertida se uma coluna obrigatória estiver ausente. O arquivo confere novos pedidos e preserva o histórico já gravado.
4. Com uma conta de teste, confira retirada, entrega por cidade, cliente VIP e cupom. Confira a mesma referência e o mesmo total em Meus Pedidos e na Central. Use uma conexão desligada temporariamente para verificar se a sacola permanece e o site pede uma nova tentativa.

O cupom de frete consome um uso quando elimina um frete positivo. O cupom de produtos consome um uso quando vence os demais descontos. Cancelar um pedido mantém o uso registrado. O estoque continua sendo movimentado pelo fluxo administrativo quando o pedido avança.

## Alertas com a loja fechada

A configuração a seguir é opcional. O checkout e os alertas com a loja aberta funcionam separadamente.

1. Aplique [20261107_order_push.sql](proposals/20261107_order_push.sql) e depois [20261107_order_push_scope.sql](proposals/20261107_order_push_scope.sql), que habilita a inscrição por pedido no Ticket Digital. Se o envio remoto já estiver instalado, basta aplicar o segundo arquivo.
2. Gere o par de chaves VAPID com `npx web-push generate-vapid-keys`. Configure `ORDER_PUSH_VAPID_PUBLIC_KEY`, `ORDER_PUSH_VAPID_PRIVATE_KEY`, `ORDER_PUSH_VAPID_SUBJECT` (um contato `mailto:`) e um segredo aleatório longo `ORDER_PUSH_DISPATCH_SECRET` como secrets da Edge Function. Coloque apenas a chave pública `VITE_ORDER_PUSH_PUBLIC_KEY` na Vercel e faça um novo deploy.
3. Publique `order-push` com `supabase functions deploy order-push --no-verify-jwt`. A função autentica cada execução pelo segredo `x-order-push-secret`. Guarde o mesmo segredo no Vault para a chamada agendada.
4. Agende um POST para `/functions/v1/order-push` pelo Supabase Cron, enviando o header `x-order-push-secret` a partir do Vault. Comece com um intervalo de 5 minutos e ajuste de acordo com o atraso desejado e a cota do projeto.
5. Ative os alertas no perfil no Android e no iPhone com o app instalado na tela inicial. Feche a loja, mude o status de um pedido de teste e confira se chega um único aviso. Repita após sair da conta nesse aparelho. A fila e as permissões são testadas localmente. A entrega física depende desta configuração.

- [Agendamento de Edge Functions e uso do Vault no Supabase](https://supabase.com/docs/guides/functions/schedule-functions)
- [Geração de chaves VAPID](https://github.com/web-push-libs/web-push#usage)
