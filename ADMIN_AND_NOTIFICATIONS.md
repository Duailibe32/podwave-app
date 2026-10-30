# Organização do painel e avisos de pedidos

## Painel

Base visual preservada a partir do commit 3fc1d85 enviado pelo AI Studio. As tabelas, cores e ajustes globais de tipografia dessa versão permanecem no projeto.

- Dashboard renomeado para Resumo do catálogo; Supabase & SQL renomeado para Sincronização.
- Retirados o selo Novo em Meu Negócio, o contador de auditoria que somava somente registros antigos e o card que apresentava o armazenamento local como permanente/definitivo.
- URL/chave pública, identificação local do proprietário e restauração movidas para Configurações → Configurações avançadas do proprietário. A área começa recolhida e seu conteúdo só é montado ao abrir. Administradores sem papel de proprietário não recebem essa interface.
- Identificação local descrita como preferência do navegador; não há referência a Firebase nem promessa de conceder permissões por esse campo. Autenticação e políticas do Supabase não foram alteradas.
- Restauração disponível somente ao proprietário, com envio automático do catálogo desligado e confirmação digitada RESTAURAR. A janela explica catálogo, configurações e sacola afetados e preservação do financeiro. Nenhuma restauração foi executada neste trabalho.
- Scripts antigos embutidos e atalhos para copiar SQL/seed removidos da interface. Os arquivos do repositório continuam preservados. Nenhum SQL é necessário para esta atualização.
- Situação financeira descrita como ausência/presença de pendências neste navegador. Detalhes técnicos ficam recolhidos. Funções existentes de envio/recarregamento do catálogo e sincronização financeira são reutilizadas.
- Confirmações de recarregamento/desconexão são internas ao site, adequadas ao iframe da prévia.

## Avisos de pedidos — versão simples com aplicativo aberto

Em Minha conta, o usuário pode ativar/desativar Avisos de pedidos. A permissão nativa só é pedida após clicar em Ativar avisos. A preferência é separada por conta e dispositivo; o listener não acompanha outra conta durante troca de sessão.

Requisitos: HTTPS, navegador compatível, service worker ativo, login e permissão concedida. Na prévia do AI Studio ou em navegadores incompatíveis a interface explica a indisponibilidade. Alguns celulares exigem instalar o PWA.

O aplicativo acompanha somente customer_orders do cliente autenticado, sujeito às políticas existentes do banco. Usa leitura periódica (60 segundos, sujeita à limitação de timers do navegador) e mudanças Realtime, se a tabela já estiver habilitada. Não altera publicação Realtime, tabelas ou políticas. A primeira leitura estabelece a referência e não dispara avisos antigos. Leituras repetidas do mesmo status não repetem notificações. Erros de acompanhamento aparecem na área de avisos.

Quando a página está oculta e o status de um pedido já conhecido muda, exibe um aviso genérico, sem nome, produtos, valores ou número do pedido na tela bloqueada. O clique abre/foca o site na área Meus pedidos. Logout/desativação cancela acompanhamento e tenta fechar avisos dessa conta. Não são disparadas notificações reais nos testes.

Esta implementação não é Web Push: depende da página continuar executando. O sistema operacional pode suspender o PWA em segundo plano, especialmente no celular. Com o aplicativo fechado ou suspenso não há garantia de aviso. Para isso é necessário um serviço Push no servidor, inscrição Push por dispositivo, credenciais e hospedagem estável, fora desta versão simples. Não há notificações promocionais.

Referências: https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API e https://developer.mozilla.org/en-US/docs/Web/API/Push_API.

## Validação

- scripts/test-admin-settings.cjs: interface diária sem credenciais/SQL, restrição ao proprietário, opções recolhidas e proteção de restauração.
- scripts/test-order-notifications.cjs: opt-in, isolamento entre contas, status em segundo plano, deduplicação, encerramento do acompanhamento e clique com destino fixo no mesmo site.
- Testes existentes de estoque, financeiro e confirmação de exclusão.
- Verificação de tipos e compilação de produção.

Sem alterações no banco, permissões, registros reais, regras financeiras ou estoque. A conferência visual e dos avisos nativos no dispositivo real permanece pendente na prévia publicada.
