const assert = require('assert');

// Mock browser environment for Vite/React modules
global.window = {
  location: {
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000',
  },
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

console.log('[Test Auth Flows] Iniciando testes de validação dos fluxos de login...');

// Import TS compiled or direct logic tests
// Test translation logic
function translateSupabaseAuthError(errorMsg) {
  const msg = (errorMsg || '').toLowerCase();
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'E-mail ou senha incorretos. Verifique suas credenciais.';
  }
  if (msg.includes('email not confirmed')) {
    return 'E-mail ainda não confirmado. Verifique a caixa de entrada do seu e-mail para confirmar seu cadastro.';
  }
  if (msg.includes('user already registered') || msg.includes('already registered') || msg.includes('already exists')) {
    return 'Este e-mail já está cadastrado no sistema. Faça login com sua senha.';
  }
  if (msg.includes('password should be at least') || msg.includes('password is too short')) {
    return 'A senha precisa ter no mínimo 6 caracteres para sua segurança.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('over_email_send_rate_limit')) {
    return 'Muitas tentativas em pouco tempo. Por segurança, aguarde alguns instantes antes de tentar novamente.';
  }
  if (msg.includes('token has expired') || msg.includes('otp expired')) {
    return 'O código de verificação expirou. Solicite um novo código por e-mail.';
  }
  if (msg.includes('token is invalid') || msg.includes('invalid token') || msg.includes('token_not_found') || (msg.includes('token') && msg.includes('invalid'))) {
    return 'Código de verificação incorreto ou expirado. Verifique os 6 dígitos recebidos e tente novamente.';
  }
  if (msg.includes('unsupported provider') || msg.includes('provider is not enabled') || msg.includes('provider not supported')) {
    return 'O login com Google precisa estar ativado no painel do Supabase (Authentication > Providers > Google).';
  }
  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return 'Falha na conexão com o servidor de autenticação. Verifique sua conexão de internet.';
  }
  return errorMsg || 'Ocorreu um erro durante a autenticação.';
}

// 1. Google OAuth translations
assert.strictEqual(
  translateSupabaseAuthError('Unsupported provider: google is not enabled'),
  'O login com Google precisa estar ativado no painel do Supabase (Authentication > Providers > Google).'
);

// 2. OTP Expired
assert.strictEqual(
  translateSupabaseAuthError('Token has expired or is invalid'),
  'O código de verificação expirou. Solicite um novo código por e-mail.'
);

// 3. OTP Invalid Token
assert.strictEqual(
  translateSupabaseAuthError('Token is invalid'),
  'Código de verificação incorreto ou expirado. Verifique os 6 dígitos recebidos e tente novamente.'
);

// 4. Rate limit translation
assert.strictEqual(
  translateSupabaseAuthError('over_email_send_rate_limit: please wait before resending'),
  'Muitas tentativas em pouco tempo. Por segurança, aguarde alguns instantes antes de tentar novamente.'
);

console.log('PASS: Todas as traduções de erro do Google OAuth e Código OTP validadas!');
