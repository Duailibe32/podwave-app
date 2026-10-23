/**
 * PODWAVE — Utilitário Oficial de Codificação e Compartilhamento para WhatsApp
 * 
 * ATENÇÃO: Utiliza rigorosamente a API nativa URL e URLSearchParams direcionando
 * para 'https://api.whatsapp.com/send'.
 * 
 * MOTIVO TÉCNICO: O encurtador legado 'https://wa.me/' realiza um redirect 302
 * cujo cabeçalho 'Location:' da Meta converte caracteres UTF-8 de 4 bytes (como
 * emojis de ondas, caixas, cartões) no caractere de substituição %EF%BF%BD ().
 * Ao utilizar diretamente a URL canônica com URLSearchParams, o navegador conecta
 * sem redirecionamentos destrutivos, preservando 100% da integridade Unicode.
 */

export const GENERIC_UNICODE_TEST_MESSAGE = 
`🌊 Teste Unicode
📅 Data
👤 Usuário
📍 Endereço
📦 Item
💳 Informação
✅ Concluído`;

/**
 * Constrói a URL oficial de compartilhamento no WhatsApp com telefone higienizado
 * e mensagem devidamente codificada em UTF-8 utilizando URL e URLSearchParams nativos.
 * 
 * Inclui validação rigorosa contra o caractere de substituição \uFFFD (%EF%BF%BD).
 */
export function buildWhatsAppUrl(rawPhone: string, message: string): string {
  if (!message) {
    throw new Error('A mensagem não pode estar vazia.');
  }

  // Higieniza o número mantendo apenas dígitos (ex: "5586999014685")
  const cleanPhone = (rawPhone || '').replace(/\D/g, '');

  // 1. Verificação de integridade prévia: impede que mensagens já corrompidas com \uFFFD sejam enviadas
  if (message.includes('\uFFFD') || message.includes('%EF%BF%BD')) {
    console.error('ERRO CRÍTICO: Tentativa de compartilhar mensagem com caractere corrompido (\\uFFFD / %EF%BF%BD).');
    throw new Error('Mensagem corrompida detectada com caractere de substituição (\\uFFFD). Envio bloqueado.');
  }

  // 2. Construção segura utilizando a API oficial URL e URLSearchParams
  // Evita o redirect HTTP 302 de wa.me que corrompia emojis nos cabeçalhos
  const url = new URL('https://api.whatsapp.com/send');
  url.searchParams.set('phone', cleanPhone);
  url.searchParams.set('text', message);

  const finalUrl = url.toString();

  // 3. Verificação de integridade pós-geração: valida que a URL não contém %EF%BF%BD
  if (finalUrl.includes('%EF%BF%BD')) {
    console.error('ERRO CRÍTICO: A URL gerada contém o caractere de substituição %EF%BF%BD!');
    throw new Error('A URL gerada contém %EF%BF%BD. Operação cancelada.');
  }

  return finalUrl;
}

/**
 * Executa a abertura do WhatsApp garantindo compatibilidade entre navegadores,
 * evitando bloqueadores de pop-up e problemas em iframes.
 */
export function openWhatsAppShare(rawPhone: string, message: string): boolean {
  if (typeof window === 'undefined') return false;

  const url = buildWhatsAppUrl(rawPhone, message);

  try {
    // 1. Tenta abrir via elemento <a> dinâmico com rel="noopener noreferrer"
    // Este método é o mais robusto para dispositivos móveis e restrições de iframes
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return true;
  } catch {
    // 2. Fallback via window.open
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    } catch {
      // 3. Fallback via navegação direta
      window.location.href = url;
      return true;
    }
  }
}
