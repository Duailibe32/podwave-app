/**
 * Test suite for PodWave Passkey / WebAuthn Biometric Authentication
 */
const assert = require('assert');

// 1. Validate error translation function mapping
const { translateSupabaseAuthError } = require('./test-passkey-helpers.cjs');

console.log('🧪 Iniciando testes de Autenticação por Passkey / Biometria (WebAuthn)...\n');

// Test 1: User cancelled biometric dialog (NotAllowedError)
const errCancel = { name: 'NotAllowedError', message: 'The operation either timed out or was not allowed.' };
const transCancel = translateSupabaseAuthError(errCancel);
assert(transCancel.includes('cancelada pelo usuário'), `Esperado mensagem amigável de cancelamento, recebido: ${transCancel}`);
console.log('✅ Teste 1: Cancelamento da janela biométrica (NotAllowedError) tratado com sucesso.');

// Test 2: Passkey not found on device (NotFoundError)
const errNotFound = { name: 'NotFoundError', message: 'No credentials found for this account.' };
const transNotFound = translateSupabaseAuthError(errNotFound);
assert(transNotFound.includes('Nenhuma credencial') || transNotFound.includes('Passkey'), `Esperado mensagem de credencial não encontrada, recebido: ${transNotFound}`);
console.log('✅ Teste 2: Passkey ainda não cadastrada ou não encontrada no dispositivo tratada com sucesso.');

// Test 3: Domain / Relying Party mismatch (SecurityError)
const errSecurity = { name: 'SecurityError', message: 'The relying party ID is not a valid domain string.' };
const transSecurity = translateSupabaseAuthError(errSecurity);
assert(transSecurity.includes('domínio') || transSecurity.includes('origem') || transSecurity.includes('HTTPS'), `Esperado aviso sobre domínio/RP ID, recebido: ${transSecurity}`);
console.log('✅ Teste 3: Domínio ou origem WebAuthn incompatível tratado com clareza.');

// Test 4: WebAuthn challenge expired
const errExpired = { message: 'webauthn_challenge_expired' };
const transExpired = translateSupabaseAuthError(errExpired);
assert(transExpired.includes('expirou'), `Esperado mensagem de desafio expirado, recebido: ${transExpired}`);
console.log('✅ Teste 4: Desafio WebAuthn expirado tratado com instrução de nova tentativa.');

// Test 5: Passkeys disabled in Supabase project
const errDisabled = { message: 'Passkey authentication is not enabled for this project.' };
const transDisabled = translateSupabaseAuthError(errDisabled);
assert(transDisabled.includes('desativada no Supabase') || transDisabled.includes('Supabase Dashboard'), `Esperado instrução sobre painel do Supabase, recebido: ${transDisabled}`);
console.log('✅ Teste 5: Recurso desativado no Supabase tratado com orientação administrativa.');

// Test 6: Unsupported browser
const errUnsupported = { name: 'NotSupportedError', message: 'The implementation does not support the requested operation.' };
const transUnsupported = translateSupabaseAuthError(errUnsupported);
assert(transUnsupported.includes('não suporta') || transUnsupported.includes('incompatível'), `Esperado aviso de navegador sem suporte, recebido: ${transUnsupported}`);
console.log('✅ Teste 6: Navegador sem suporte a WebAuthn tratado corretamente.');

// Test 7: Verify preservation of Owner / Admin roles and Loyalty Card data
const mockOwnerUser = {
  id: 'usr_owner_001',
  email: 'contato@podwave.com.br',
  role: 'owner',
  fullName: 'Proprietário PodWave',
  loyaltyCard: { stamps: 8, goal: 10, totalRedeemed: 2 },
  orderHistory: [{ id: 'ord_1', total: 150 }]
};

// Simulate real Supabase profile sync logic without touching localStorage mock role
function preserveUserProfile(existingSession, remoteProfile) {
  // Never downgrade or overwrite real role with unauthenticated fallback
  const finalRole = remoteProfile?.role || existingSession?.role || 'customer';
  return {
    ...existingSession,
    ...remoteProfile,
    role: finalRole,
    // Loyalty and orders are preserved intact
    loyaltyCard: remoteProfile?.loyaltyCard || existingSession.loyaltyCard,
    orderHistory: remoteProfile?.orderHistory || existingSession.orderHistory
  };
}

const preserved = preserveUserProfile(mockOwnerUser, { fullName: 'Proprietário PodWave' });
assert.strictEqual(preserved.role, 'owner', 'Role de proprietário deve ser estritamente preservado!');
assert.strictEqual(preserved.loyaltyCard.stamps, 8, 'Selos de fidelidade devem ser preservados!');
assert.strictEqual(preserved.orderHistory.length, 1, 'Histórico de pedidos deve ser preservado!');
console.log('✅ Teste 7: Preservação de conta de proprietário, fidelidade e pedidos validada.');

// Test 8: Device name auto-detection logic
function detectDeviceLabel(userAgent) {
  const ua = userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iPhone / iPad (Face ID / Touch ID)';
  if (/Macintosh/i.test(ua)) return 'MacBook / Mac (Touch ID)';
  if (/Android/i.test(ua)) return 'Dispositivo Android (Digital / Biometria)';
  if (/Windows/i.test(ua)) return 'PC Windows (Windows Hello)';
  return 'Chave de Segurança / Dispositivo WebAuthn';
}

assert.strictEqual(detectDeviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), 'iPhone / iPad (Face ID / Touch ID)');
assert.strictEqual(detectDeviceLabel('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), 'MacBook / Mac (Touch ID)');
assert.strictEqual(detectDeviceLabel('Mozilla/5.0 (Linux; Android 14; Pixel 8)'), 'Dispositivo Android (Digital / Biometria)');
assert.strictEqual(detectDeviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'PC Windows (Windows Hello)');
console.log('✅ Teste 8: Detecção e etiquetagem amigável de dispositivos validada.');

console.log('\n🎉 TODOS OS TESTES DE PASSEKEYS E WEBAUTHN PASSARAM COM SUCESSO!\n');
