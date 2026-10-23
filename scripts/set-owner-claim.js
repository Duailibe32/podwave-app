/**
 * PODWAVE — Script Seguro de Provisionamento de OWNER (Firebase Admin SDK)
 * 
 * USO SEGURO EM AMBIENTE ADMINISTRATIVO CONFIÁVEL (Servidor / CI / CLI Local):
 * 
 * Requisitos:
 * 1. Chave de conta de serviço (serviceAccountKey.json) baixada do console Firebase:
 *    Console Firebase > Configurações do Projeto > Contas de Serviço > Gerar nova chave privada.
 * 2. Variável de ambiente: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
 * 
 * Execução:
 *   node scripts/set-owner-claim.js <UID_DO_PROPRIETARIO>
 * 
 * Exemplo:
 *   node scripts/set-owner-claim.js 7xKj910PqAz88192837LmM
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const targetUid = process.argv[2];

if (!targetUid) {
  console.error('\x1b[31m[ERRO] É obrigatório fornecer o UID do proprietário.\x1b[0m');
  console.log('\nUso:');
  console.log('  node scripts/set-owner-claim.js <UID_DO_PROPRIETARIO>\n');
  process.exit(1);
}

// Inicializar Admin SDK com credenciais padrão da aplicação ou arquivo local
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    const serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else if (fs.existsSync('./serviceAccountKey.json')) {
    const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // Tenta inicialização padrão da GCP
    admin.initializeApp();
  }
} catch (error) {
  console.error('\x1b[31m[ERRO] Falha ao inicializar Firebase Admin SDK:\x1b[0m', error.message);
  console.log('\nCertifique-se de salvar sua chave "serviceAccountKey.json" na raiz do projeto');
  console.log('ou defina a variável GOOGLE_APPLICATION_CREDENTIALS.\n');
  process.exit(1);
}

async function assignOwnerClaim() {
  console.log(`\x1b[36m[PODWAVE SECURITY]\x1b[0m Buscando conta Firebase com UID: ${targetUid}...`);

  try {
    // 1. Verificar se o usuário existe no Firebase Auth
    const userRecord = await admin.auth().getUser(targetUid);
    console.log(`\x1b[32m[SUCESSO]\x1b[0m Usuário localizado com sucesso:`);
    console.log(` - UID:   ${userRecord.uid}`);
    console.log(` - Email: ${userRecord.email || '(Sem email cadastrado)'}`);
    console.log(` - Nome:  ${userRecord.displayName || '(Sem nome cadastrado)'}`);

    // 2. Preservar outras claims existentes e adicionar owner: true
    const currentClaims = userRecord.customClaims || {};
    const updatedClaims = {
      ...currentClaims,
      owner: true,
      role: 'owner',
      authorizedAt: new Date().toISOString()
    };

    // 3. Atribuir a custom claim privilegiada
    await admin.auth().setCustomUserClaims(targetUid, updatedClaims);
    console.log(`\x1b[32m[CONCLUÍDO]\x1b[0m Custom claim \x1b[33m{ owner: true }\x1b[0m atribuída exclusivamente ao UID ${targetUid}!`);

    // 4. Revogar tokens antigos para forçar atualização imediata do token no navegador
    await admin.auth().revokeRefreshTokens(targetUid);
    console.log(`\x1b[36m[SEGURANÇA]\x1b[0m Tokens anteriores revogados para exigir reautenticação com novos privilégios.`);

    console.log('\n\x1b[35m=== INSTRUÇÕES FINAIS ===\x1b[0m');
    console.log(`1. Adicione a seguinte linha ao seu arquivo .env:`);
    console.log(`   VITE_FIREBASE_OWNER_UID=${targetUid}`);
    console.log(`2. Faça login novamente no PodWave.`);
    console.log(`3. O painel administrativo em /admin estará liberado exclusivamente para esta conta.\n`);

    process.exit(0);
  } catch (err) {
    console.error('\x1b[31m[ERRO FATAL]\x1b[0m Não foi possível atribuir privilégios:', err.message);
    process.exit(1);
  }
}

assignOwnerClaim();
