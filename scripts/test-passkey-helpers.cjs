function translateSupabaseAuthError(err) {
  if (!err) return 'Ocorreu um erro inesperado na autenticação.';
  const msg = (err.message || '').toLowerCase();
  const name = (err.name || '').toLowerCase();

  // WebAuthn / Passkeys specific errors
  if (name === 'notallowederror' || msg.includes('notallowederror') || msg.includes('the operation either timed out or was not allowed')) {
    return 'Autenticação biométrica cancelada pelo usuário ou janela fechada antes da confirmação.';
  }
  if (name === 'notfounderror' || msg.includes('notfounderror') || msg.includes('no credentials found') || msg.includes('no passkey found')) {
    return 'Nenhuma credencial/Passkey encontrada neste dispositivo para esta conta. Registre sua biometria primeiro em Minha Conta > Segurança.';
  }
  if (msg.includes('webauthn_challenge_expired') || msg.includes('challenge expired')) {
    return 'O tempo para confirmação biométrica expirou. Por favor, tente novamente.';
  }
  if (msg.includes('passkey authentication is not enabled') || msg.includes('webauthn is not enabled') || msg.includes('provider is disabled')) {
    return 'A autenticação por Passkey / WebAuthn ainda não foi ativada no Supabase Dashboard (Authentication > Providers > WebAuthn).';
  }
  if (name === 'securityerror' || msg.includes('relying party') || msg.includes('rp id') || msg.includes('origin')) {
    return 'Origem WebAuthn incompatível. As Passkeys exigem conexão HTTPS com o domínio configurado no Supabase como Relying Party ID.';
  }
  if (name === 'notsupportederror' || msg.includes('not supported') || msg.includes('unsupported')) {
    return 'Seu navegador ou dispositivo atual não suporta autenticação biométrica via WebAuthn/Passkey.';
  }
  if (msg.includes('user not authenticated') || msg.includes('session missing') || msg.includes('auth session missing')) {
    return 'Você precisa estar autenticado para registrar uma nova Passkey biométrica.';
  }

  // General auth errors
  if (msg.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('user already registered')) return 'Este e-mail já possui cadastro.';
  return err.message || 'Erro de autenticação.';
}

module.exports = { translateSupabaseAuthError };
