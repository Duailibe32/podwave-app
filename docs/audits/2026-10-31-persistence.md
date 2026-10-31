# Revisão defensiva de persistência — 31/10/2026

Main consultada: `43371d34426032feaa892e65024a5a9de21e07b4`. Versão efetivamente publicada na Vercel não confirmada por SHA. Supabase: evidências enviadas pelo usuário; sem acesso direto do agente.

## Prioridades

| Gravidade | Achado | Evidência | Estado |
|---|---|---|---|
| Alta | Interface pode confirmar mudança mesmo com gravação recusada | CatalogContext.tsx:1514–1568, 1688–1707 e 2056–2075 | Reproduzido com callbacks reais e serviços simulados; guard defensivo preparado |
| Alta | Schema de perfis incompatível com consultas do aplicativo | Supabase HTTP 400/42703: vip_benefit_note ausente; estrutura enviada usa full_name/address_* | Confirmado; não alterar dados ou criar coluna isolada |
| Alta | authenticated possui TRUNCATE em customer_profiles | Grants enviados pelo usuário; RLS não protege TRUNCATE | Confirmado; proposta de menor privilégio depende de revisão/autorização, sem teste destrutivo |
| Alta | Falha de RPC pode ser seguida por nova tentativa com stockManaged=false | CatalogContext.tsx:1405–1411 e 2007–2014 | Caminho estático confirmado; é preciso revisar autorização/contrato remoto. Não foi executado |
| Alta | Operações relacionadas continuam em transações separadas | Estado financeiro pode mudar antes da confirmação do registro principal | Não resolvido pelo guard; pode exigir reconciliação. Não repetir operações incertas |
| Média | Retry cego usa a versão remota nova com payload derivado do estado antigo | CatalogContext.tsx:1517–1529 e blocos equivalentes | Removido nos três guards propostos; não sobrescrever concorrência automaticamente |
| Média | Mudança relacionada pode ser mantida localmente como pending_sync após RPC recusada | CatalogContext.tsx:1477–1494, 1656–1663 | Confirmado estaticamente; guard não constitui rollback |
| Média | Erros de gravação se reduzem a boolean/null e perdem a causa | supabase.ts:1108–1144 e rotinas de perfil | Confirmado; resposta original ainda necessária para falha de customer_orders |
| Média | Exclusão de perfil pode confirmar zero linhas afetadas | supabase.ts:913–930 na versão anterior analisada; revalidar linha na revisão seguinte | Guard preparado e teste com mocks: zero linhas, recusa e ID divergente não confirmam exclusão; sem teste remoto |
| Revisar | Novo cache PWA inclui respostas de coupons/store_settings sem separar identidade na configuração | vite.config.ts:63–82 | Não demonstra vazamento; revisar respostas por cargo, Vary, ciclo de logout e dados privados antes de confiar no cache |

## Por que o cancelamento parece voltar

Na main consultada, saveCustomerOrderToSupabase retorna false quando não há confirmação. O contexto tenta novamente e, mesmo se continuar false, atualiza a lista local e retorna success:true. A atualização posterior substitui a lista pelos dados do servidor. Esse caminho reproduz o sintoma relatado; a causa da recusa remota específica (schema, constraint, RLS, conflito ou conexão) não foi comprovada sem a resposta da API/estrutura de customer_orders.

O teste local usou os corpos completos das três funções, extraídos do código e transpilados, com dependências simuladas. Na versão antiga, duas gravações recusadas ainda resultaram em sucesso e atualização local. Com os guards, recusa e configuração ausente retornam falha sem atualizar o registro principal ou registrar sucesso; exceções não confirmam a operação e liberam a trava. Não houve chamada ao Supabase.

## Correção proposta e limites

Somente correção defensiva de confirmação (incluindo exclusão de perfil com ID afetado confirmado): exigir configuração e confirmação positiva do banco nos três fluxos; impedir retry cego sobre revisão concorrente. Não implementa backend comercial, não muda políticas ou cargos, não habilita recursos de venda/recompensa e não resolve o schema remoto. Não torna as operações relacionadas atômicas.

Se uma etapa financeira/estoque já tiver ocorrido, uma falha posterior pode deixar resultado parcial. A mensagem orienta recarregar/reconciliar, sem afirmar que nada mudou. O guard também não corrige mensagens antigas, rotinas de recompensa ou compatibilidade de perfis.

## Ordem de organização

1. Preservar dados e exportações existentes. Não limpar localStorage nem apagar registros para esconder divergência.
2. Revisar e testar guard em homologação; não integrar automaticamente à main.
3. Receber inventário somente leitura de customer_orders e resposta original da requisição recusada, se disponível, sem repetir operações em produção.
4. Fechar a matriz aplicativo/schema para todas as tabelas antes de propor qualquer alteração SQL.
5. Revisar menor privilégio, funções SECURITY DEFINER, RPCs expostas e backups.
6. Em ambiente descartável autorizado, testar identidade, isolamento entre usuários, conflitos, falhas parciais e restauração.
7. Validar acessibilidade móvel, cache/atualização PWA e autenticação no domínio publicado.

## O que ainda não está concluído

Auditoria integral de todas as tabelas, RPCs, Storage, Auth/Passkeys, políticas de backup, dados financeiros legados e produção. Não foi possível afirmar que todo o projeto está corrigido ou seguro. Não houve teste real de cancelamento, estoque ou transação financeira; os ensaios foram isolados e com dados fictícios.

O build completo do commit atual não foi executado nesta revisão; os testes executam/transpilam os callbacks afetados. A revisão anterior possuía build aprovado, mas isso não valida automaticamente a main atual.

