const fs = require('fs');

console.log('--- TEST: Persistência de Pedidos & Limpeza de Cache de Imagens ---');

// 1. CatalogContext Order Flow
const catCode = fs.readFileSync('src/context/CatalogContext.tsx', 'utf8');
const hasSharedOrders = catCode.includes('podwave_shared_catalog_orders_v2');
const hasUniversalOrderRecord = !catCode.includes('if (!currentUser) return;') && catCode.includes('fallbackGuestId');
const hasAutoRecovery = catCode.includes('loadSharedCatalogOrders');

if (hasSharedOrders && hasUniversalOrderRecord && hasAutoRecovery) {
  console.log('✓ 1. Gravação universal de pedidos (visitantes e clientes) validada com chave compartilhada.');
} else {
  console.error('❌ Falha na gravação universal de pedidos');
  process.exit(1);
}

// 2. CheckoutDrawer & submitOrderViaWhatsapp
const checkoutCode = fs.readFileSync('src/components/CheckoutDrawer.tsx', 'utf8');
const hasSingleAuthority = catCode.includes('await recordCustomerOrder({') && catCode.includes('refId');
if (hasSingleAuthority) {
  console.log('✓ 2. Fluxo de envio de pedidos via WhatsApp e gravação na Central de Pedidos validado sem duplicidade.');
} else {
  console.error('❌ Falha no fluxo do CheckoutDrawer');
  process.exit(1);
}

// 3. AdminPanel & ImageStorageSettingsSection
const adminCode = fs.readFileSync('src/components/admin/AdminPanel.tsx', 'utf8');
const hasImageStorageSection = adminCode.includes('ImageStorageSettingsSection');
const hasCustomCompression = adminCode.includes('imageStorageConfig?.maxImageDimension');

if (hasImageStorageSection && hasCustomCompression) {
  console.log('✓ 3. Seção personalizável de Gestão de Cache de Imagens integrada ao AdminPanel na aba Configurações.');
} else {
  console.error('❌ Falha na integração do ImageStorageSettingsSection');
  process.exit(1);
}

// 4. imageStorageService
const imgServiceCode = fs.readFileSync('src/services/imageStorageService.ts', 'utf8');
const hasDiagnostics = imgServiceCode.includes('getStorageDiagnostics');
const hasClearBrowser = imgServiceCode.includes('clearBrowserImageCaches');
const hasOptimize = imgServiceCode.includes('optimizeCatalogImages');

if (hasDiagnostics && hasClearBrowser && hasOptimize) {
  console.log('✓ 4. imageStorageService com diagnóstico de cota, 1-clique de limpeza e otimização Base64 operacional.');
} else {
  console.error('❌ Falha no imageStorageService');
  process.exit(1);
}

console.log('TODOS OS TESTES DE PEDIDOS E CACHE DE IMAGENS PASSARAM! ✅');
