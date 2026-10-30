# Correções defensivas e validação móvel — 30/10/2026

Base: main e0ef5f7a5b94d602c5a4cd7e2bee1f476bf7b27a, após os PRs #6 e #7. Esta proposta não foi aplicada ao Supabase nem integrada à main pelo agente.

## Alterações no aplicativo

- A identidade começa vazia. Cargo e perfil são recuperados usando Auth.getUser e o UID da identidade autenticada, em vez de recuperar um objeto owner do localStorage.
- O painel aguarda a verificação de sessão. Metadados de cadastro não concedem cargos.
- Um único cliente Supabase atende aos serviços e ao contexto. Variáveis da hospedagem prevalecem sobre a configuração local. Chaves secretas/service_role e URLs HTTP não locais são recusadas. Esse filtro não valida assinaturas JWT e não torna secreta uma variável VITE_; uma chave privada já publicada continua exigindo rotação.
- Edição comum de perfil envia somente campos cadastrais permitidos. Benefícios em default_address não são aceitos como dados confiáveis, nem usados como fallback quando o servidor recusa uma atualização.
- Alterações de benefícios exigem confirmação de linha afetada e comparação com a versão anterior. Dados antigos presentes apenas no endereço não são migrados automaticamente; sua alteração fica bloqueada para revisão.
- As rotinas deixam de contornar recusas da RPC usando escrita direta em estoque/vendas. Erros de registro excluído não geram automaticamente outro ID. Atualizações de registros comparam a revisão no banco; falha/conflito não vira INSERT/upsert.
- Mudança de cargo exige confirmação da linha atualizada. Criação administrativa via signUp no navegador e usuários administrativos simulados foram bloqueados: essa operação exige serviço autorizado, e não deve substituir a sessão do operador.
- Dados financeiros, registros e logs locais passam a usar chaves por projeto e usuário. Consultas atrasadas de outra identidade são ignoradas. Dados antigos sem identificação de dono são preservados e não entram automaticamente na nova conta.
- O proprietário encontra um aviso e opção para baixar cópia dos dados locais antigos em Configurações avançadas. Não limpe o navegador: pode haver dados ainda não sincronizados.
- Catálogo remoto vazio substitui arrays antigos, e o envio automático exige privilégio verificado e carregamento remoto bem-sucedido.
- A rota de proxy de URLs, sem uso pelo frontend, passa a responder 410 e não faz downloads externos, eliminando essa superfície de SSRF.
- Em 320px, as opções de autenticação agora cabem e os campos de endereço têm mais espaço, com alvos de toque maiores.

## SQL proposto: contenção, sem execução automática

Arquivo: supabase/proposals/20261030_security_write_guards.sql. Ele está fora de migrations para não ser confundido com uma alteração já implantada.

O script verifica tabelas, função de autorização e tipos básicos antes de alterar o esquema. Instala proteções de campos de perfil, políticas restritivas que se somam às políticas antigas, isolamento de leitura e revisão imutável de registros.

**Efeito funcional deliberado:** bloqueia novas inserções de registros por sessões comuns até existir uma criação confiável com cálculo e autorização no servidor. Isso contém a vulnerabilidade de valores/status arbitrários; não implementa esse backend. Aplicar o SQL altera esse fluxo e exige aprovação expressa e planejamento. Não execute como tentativa de reparar um banco diferente.

## Verificação executada

- npm run lint e npm run build aprovados.
- 14 scripts locais test-*.cjs (excluindo o teste de navegador) aprovados; um deles é apenas helper. Os testes antigos de Passkeys continuam sendo testes de helpers, não cerimônias biométricas.
- test-security-hardening.cjs usa funções de produção, clientes simulados e PGlite. Confere recusa de chave privilegiada, cliente compartilhado, identidade verificada, edição sem cargo, remoção do fallback de benefícios, bloqueio de escrita direta, compare-and-set, políticas restritivas mesmo com políticas antigas permissivas e revisões imutáveis. O SQL foi testado duas vezes em banco em memória para verificar reinstalação.
- test-mobile-browser.cjs executou Chrome headless com perfil temporário, dados fictícios, sem Supabase e sem localização real. Valida áreas CSS exatas de 320, 360, 390 e 430px usando iframe de mesma origem, pois Chrome desktop impõe largura mínima de janela.
- As três telas de formulário passaram nas quatro larguras (12 cenários), com captura sintética de GPS, sem transbordamento horizontal dos formulários/controles. Capturas foram inspecionadas e o corte das opções de login em 320px foi corrigido.
- Um teste adicional renderiza o CatalogProvider real com owner forjado no cache: não restaura identidade/cargo administrativo, não expõe registros financeiros e preserva o cache antigo.

Para reproduzir: npm run build; node scripts/test-mobile-browser.cjs. É necessário Chrome/Edge/Chromium instalado; opcionalmente defina CHROMIUM_PATH. Artefatos locais ficam em .mobile-qa, ignorado pelo Git. O Brave não iniciou adequadamente neste ambiente; o teste final foi executado no Chrome instalado. Não há uso de perfil pessoal de navegador.

Os testes responsivos verificam Chromium em larguras móveis. Não são testes de Safari/iOS, teclado físico/virtual do aparelho, permissão real de GPS, autenticação em produção ou Passkeys.

## Limites e trabalho ainda necessário

1. As RLS, funções, grants, dados e configuração Auth efetivos no Supabase ainda precisam de inventário somente leitura. Não foram consultados nem alterados nesta tarefa.
2. As operações que ligam registro, estoque, recebimento e benefícios ainda não formam uma transação única. Agora falham sem contorno inseguro e informam falta de confirmação, mas uma etapa relacionada pode já ter sido gravada. A transação única requer o esquema real e um plano coordenado de backend/banco. Não repetir uma operação incerta sem recarregar e reconciliar.
3. A comparação de versões do cliente não protege contra qualquer consumidor antigo da API; o guard de revisão no servidor depende da instalação aprovada do SQL.
4. A contenção SQL suspende inserções públicas não validadas. Reabilitá-las exige cálculo e validação no servidor, incluindo permissões e regras de dados. Não remova a política só para fazer um teste passar.
5. Dados financeiros antigos e benefícios gravados apenas no JSON do endereço exigem reconciliação. Não foram apagados ou convertidos automaticamente. Caches do navegador não são criptografados; o isolamento da interface não impede alguém com acesso ao perfil do sistema operacional de ler arquivos locais.
6. Recuperação completa de senha, SMTP, origens/RP ID e funcionamento real de Passkeys continuam pendentes de validação. Não foram trocados credenciais nem configurações de domínio.
7. O bundle ainda excede 500 kB e o Vite avisa sobre __dirname na configuração. Esses avisos não impediram o build.

## Implantação segura

Antes de integrar, revisar o diff e testar login do proprietário, cliente, saída/troca de conta e preservação dos dados locais em homologação. Exportar os caches antigos antes de qualquer limpeza. Confirmar o schema remoto e as funções de autorização; fazer backup de dados, políticas, grants e triggers.

Revisar e autorizar separadamente o SQL, considerando a suspensão de inserções públicas. Executar primeiro em projeto descartável compatível. Somente após essa revisão planejar a aplicação ao Supabase e a publicação coordenada. A main e o Supabase permanecem inalterados por esta tarefa.
