# Revisão das alterações do AI Studio — 31/10/2026

Main conferida: 4e69384e78e2b2a61b59ac7b2707b206e98e2cf8. A autorização ampla do usuário foi recebida. O agente continua preservando registros e não possui conector ativo para executar SQL no Supabase; nenhuma alteração remota no banco foi realizada nesta revisão.

## O que mudou de fato no código

- O commit do AI Studio trouxe classificação de erros de perfil, mapeamento full_name/address_* e recusa de INSERT parcial quando o perfil não é encontrado. Esses pontos evoluíram desde o relatório anterior.
- A rotina de pedidos continua consultando delivery_info e montando order_code, incompatíveis com a estrutura remota informada anteriormente. O SQL recebido não cria nem migra essas colunas. O guard do PR #9 não resolve esse contrato.
- A adição de vip_benefit_note e as revogações de privilégios são declaradas no SQL recebido. O texto do comando e um commit no GitHub não confirmam quais alterações estão instaladas. O usuário informou que o executou; falta inventário posterior à execução.

## Crítico: trigger criada com expressões inválidas

O arquivo recebido pode completar a criação e COMMIT, mas falhar na primeira gravação. Reproduzido em PGlite com o SQL exato e objetos de referência:

- pg_catalog.coalesce produz 42883: function pg_catalog.coalesce(text, unknown) does not exist.
- pg_catalog.nullif produz 42883.
- pg_catalog.current_user produz 42P01: missing FROM-clause entry for table pg_catalog.

COALESCE/NULLIF são expressões SQL especiais, não funções comuns a qualificar dessa forma. current_user também possui sintaxe especial. Se a função instalada for essa versão, cadastros e edições de perfil podem falhar mesmo depois de a coluna ter sido criada. Não se conclui que a transação inteira foi desfeita: a criação pode ter sido aceita e o erro aparecer só na execução posterior.

## Crítico: current_user não identifica o chamador em SECURITY DEFINER

Corrigir apenas a grafia para current_user deixaria uma autorização perigosa. Dentro de SECURITY DEFINER, ele muda para o dono da função, que frequentemente é postgres. O teste local confirmou a mudança de identidade. Assim, essa condição poderia liberar clientes comuns caso o dono constasse na lista privilegiada.

O reparo proposto usa o papel de serviço vindo do contexto autenticado da requisição e, para manutenção administrativa direta, session_user restrito, sem UID autenticado e sem papel JWT anon/authenticated. Não usa current_user para autorizar. Preserva as regras existentes dos campos protegidos, sem ampliar grants ou criar recursos comerciais.

## Entrega defensiva

- Proposta ampla existente corrigida para não propagar expressões inválidas e o bypass de identidade.
- Reparo restrito separado: substitui somente a função existente, dentro de transação e com pré-condições de schema/trigger. Não cria colunas, não reescreve dados e não concede cargos ou privilégios.
- Inventário pós-execução somente leitura: definição e dono da função, trigger, coluna e privilégios efetivos. Use-o antes de qualquer nova execução ampla.
- Testes locais do reparo: instalação repetida, edição própria e cadastro comum, recusa de alteração indevida de cargo, campos protegidos, identificador e perfil de terceiro. A função pertence ao usuário administrativo enquanto o chamador é authenticated, cobrindo a regressão de SECURITY DEFINER.

Os testes usam identidades sintéticas e não validam RLS remota, assinatura JWT real ou configuração Auth. Não foram executadas operações de pedidos/estoque/recompensas nem um build frontend nesta revisão exclusivamente SQL.

## Outros cuidados

- O backup sugerido está apenas em comentários: não foi executado pelo bloco enviado. CREATE TABLE AS produziria uma tabela permanente, não uma tabela temporária nem um backup completo de políticas, funções e configuração. Não presumir recuperação disponível.
- ALTER FUNCTION das três funções públicas falha se alguma assinatura não existir; nesse caso a transação não chega ao COMMIT. A verificação pós-execução é necessária para distinguir isso da criação aceita com falha posterior.
- Grants amplos de SELECT em store_settings podem expor colunas administrativas se existirem. Conferir schema, respostas e políticas antes de concluir que o endurecimento está completo.
- Ainda pendentes: schema real de pedidos, operações relacionadas não atômicas, fallback que desliga controle de estoque, cache PWA e inventário integral do banco.

Não afirmar que o site inteiro foi corrigido. O reparo da proteção de perfis é uma correção defensiva; não implementa ou repara funcionalidades comerciais de venda/recompensas de vapes.

