# Ajustes para celular e carregamento

Base: main 11cc6acb80f506efd8e23fec7c55d4db7165173d.

- Carrinho e checkout ocupam a largura disponível, com altura dinâmica e rolagem interna.
- GPS: link longo quebra linha; cartões podem encolher; ações têm altura mínima de 44px.
- Campos menores que 380px ficam em uma coluna; controles usam fonte de 16px no celular para evitar zoom automático do Safari.
- Busca móvel abre abaixo do cabeçalho.
- Painel administrativo carregado sob demanda. PWA não baixa antecipadamente esse painel ou todas as imagens de produtos; armazena esses recursos quando utilizados.

Validação local: TypeScript e build aprovados; testes existentes de estoque/UI, Central de Pedidos, notificações e configurações aprovados. Bundle inicial: 2084,75 -> 1014,53 kB (gzip 518,16 -> 273,82 kB). Precache: 18539,75 -> 1197,16 KiB.

Validação visual pendente: o navegador automatizado não alcançou o servidor Windows; o controle nativo foi interrompido por não conseguir confirmar a URL. Não houve teste em aparelho físico.

Antes de integrar: abrir a prévia Vercel em 320, 360, 390 e 430px; testar GPS autorizado, negado, atualizar e remover, endereço longo, teclado, busca, carrinho, resumo e total. Testar também tablet/desktop. Sem confirmar pedido de teste em produção. Coordenadas fictícias devem ser usadas na homologação. Conferir atualização do service worker com uma instalação antiga do PWA.

Nenhum SQL, dado do Supabase ou main foi alterado.
