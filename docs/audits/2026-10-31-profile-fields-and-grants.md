# Campos de perfil e privilégios — 31/10/2026

Base: main b6a395eca6e8f5d209401bf8351263f8917b15ff. Foram lidos os 79 arquivos .ts/.tsx/.js/.jsx em src nesse commit, sem falhas de leitura. Inventário anexo contém contagens por arquivo; dados de clientes não foram consultados.

## Resultado da busca

- vip_benefit_note: 10 ocorrências em 9 linhas, somente src/services/supabase.ts. Zero ocorrências em CatalogContext.tsx e CustomerProfileModal.tsx.
- name: 261 ocorrências em 25 arquivos. Muitos usos são nomes de produtos/marcas, atributos HTML e campos de interfaces; não são consultas a customer_profiles.name.
- O mapper de perfis já prioriza d.full_name e mantém d.name como leitura de compatibilidade. Essa leitura de propriedade de objeto, por si só, não pede uma coluna ausente ao servidor.
- O payload legacyJsonPayload usa name apenas no formato de compatibilidade; há um defeito específico quando previous é null: a versão anterior escolhia esse formato primeiro, provocando uma tentativa recusada no schema plano antes do retry.
- Não foi feita substituição global. vip_benefit_note é texto estruturado; vip_discount_custom é número. Substituí-los entre si corromperia o significado dos dados. A coluna de observação existe no banco, conforme a última evidência enviada pelo usuário.

## Correção pontual proposta

Novos perfis usam primeiro full_name/address_*, o formato real informado. Linhas legadas existentes continuam usando o payload de compatibilidade adequado. Há no máximo uma tentativa alternativa somente quando o servidor retorna erro explícito de coluna ausente; recusa de permissão/rede não provoca essa tentativa. Nenhum payload cadastral comum contém role, is_vip, vip_discount_custom ou vip_benefit_note.

Testes sobre o corpo real da função, com consultas simuladas, reproduziram a primeira tentativa inválida anterior e confirmaram uma única tentativa válida no schema plano, compatibilidade legada e ausência de campos privilegiados. Não se garante ausência de erros de coluna em qualquer schema desconhecido: numa tabela legada vazia ainda pode ser necessária a tentativa alternativa.

## SQL de menor privilégio, separado da aplicação

supabase/proposals/20261031_customer_profiles_least_privilege.sql:
- Confere tabela, papel, RLS ligada e direitos essenciais já existentes.
- Revoga privilégios diretos de authenticated e mantém SELECT/INSERT/UPDATE.
- DELETE, TRUNCATE, TRIGGER, REFERENCES e outros direitos não essenciais deixam de existir diretamente.
- Confere privilégios efetivos, inclusive PUBLIC/herança/dono; se algum excesso permanecer, aborta sem modificar outros papéis automaticamente.
- Não modifica registros, políticas, triggers ou a configuração de RLS.

**Efeito deliberado:** todas as sessões do site com papel authenticated, inclusive Proprietário/Admin, deixam de excluir perfis diretamente. A política RLS de DELETE não devolve esse grant. Isso também reduz o caminho de exclusão acidental em cascata de pedidos por esse acesso, mas não muda a FK, serviços privilegiados ou RPCs com outros poderes.

RLS não é a única camada de segurança. Grants controlam operações, RLS filtra linhas, triggers e constraints protegem campos/integridade. As proteções existentes devem permanecer.

Testes PGlite: aplicação repetida, dados e políticas preservados, leitura/edição próprias e inserção permitidas, atualização cruzada filtrada, DELETE recusado, acesso herdado e direitos essenciais ausentes abortam sem mudar os grants originais. Nenhuma conexão ao Supabase ou exclusão real.

## Reprodução e limites

- node scripts/test-profile-schema-default.cjs
- node scripts/test-profile-grants.cjs

Os testes desta mudança são direcionados. Não foram executados build completo ou testes em navegador/aparelho nesta revisão. O SQL é proposta fora de migrations, sem execução automática; não foi aplicado ao banco pelo agente. Antes de executá-lo, revisar o impacto sobre a exclusão administrativa e manter backup apropriado.

A proteção da trigger já instalada e confirmada não precisa ser reaplicada. Permanecem separados os limites de preservação/concor­rência do schema de pedidos e a auditoria integral de Auth/Storage/backup.
