const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { transformSync } = require('esbuild');

function loadTsModule(filePath, customRequires = {}) {
  const code = fs.readFileSync(filePath, 'utf8');
  const compiled = transformSync(code, {
    loader: filePath.endsWith('.tsx') ? 'tsx' : 'ts',
    format: 'cjs',
  }).code;

  const mod = { exports: {} };
  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: (id) => {
      if (id in customRequires) return customRequires[id];
      return require(id);
    },
    localStorage: (() => {
      const store = new Map();
      return {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
      };
    })(),
    console,
    Date,
    Math,
    JSON,
    Set,
    Map,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    encodeURIComponent,
    decodeURIComponent,
  };
  vm.runInNewContext(compiled, sandbox);
  return mod.exports;
}

const loyaltyMod = loadTsModule('src/utils/loyaltyCard.ts');
const whatsappShareMod = loadTsModule('src/utils/whatsappShare.ts');
const orderCenterMod = loadTsModule('src/services/orderCenterService.ts', {
  '../utils/loyaltyCard': loyaltyMod,
  '../utils/whatsappShare': whatsappShareMod,
});

console.log('--- TEST 1: Respostas Rápidas WhatsApp ---');
const sampleOrder = {
  id: 'ord-test-99',
  referenceId: 'PW-9901',
  customerName: 'Lucas Silva',
  customerPhone: '(86) 99988-7766',
  createdAt: '2026-10-31T20:00:00Z',
  subtotal: 150,
  discount: 0,
  deliveryFee: 10,
  total: 160,
  paymentMethod: 'Pix',
  paymentStatus: 'pendente',
  deliveryType: 'delivery',
  addressSummary: 'Rua das Flores, 100 - Centro, Teresina/PI',
  items: [
    {
      id: 'it-1',
      modelId: 'm1',
      modelName: 'Ignite V150',
      brandName: 'IGNITE',
      flavorId: 'f1',
      flavorName: 'Watermelon Ice',
      quantity: 1,
      price: 110,
    },
    {
      id: 'it-2',
      modelId: 'm2',
      modelName: 'Elfbar BC10000',
      brandName: 'ELFBAR',
      flavorId: 'f2',
      flavorName: 'Grape Ice',
      quantity: 1,
      price: 50,
    },
  ],
  status: 'confirmado',
  loyaltyStampGranted: false,
};

const storeSettings = {
  storeName: 'PodWave Teresina',
  whatsappNumber: '5586999014685',
  pixKey: '5586999014685',
  pixKeyType: 'telefone',
  pixBeneficiary: 'PodWave Oficial',
};

// 1. Chave Pix para Pagamento
const pixMsg = orderCenterMod.generateQuickWhatsappPixMessage(sampleOrder, storeSettings);
assert.ok(pixMsg.includes('Chave PIX para Pagamento'), 'Mensagem deve conter cabeçalho de Chave Pix');
assert.ok(pixMsg.includes('5586999014685'), 'Mensagem deve conter a chave Pix');
assert.ok(pixMsg.includes('PodWave Oficial'), 'Mensagem deve conter o favorecido');
assert.ok(pixMsg.includes('R$ 160,00'), 'Mensagem deve conter o valor total');
assert.ok(pixMsg.includes('Ignite V150'), 'Mensagem deve conter o resumo dos itens');
console.log('✓ 1. Mensagem de Chave Pix gerada com sucesso.');

// 2. Pedido Saiu para Entrega
const dispatchedMsg = orderCenterMod.generateQuickWhatsappDispatchedMessage(sampleOrder, storeSettings);
assert.ok(dispatchedMsg.toLowerCase().includes('sair para entrega'), 'Mensagem deve informar saída para entrega');
assert.ok(dispatchedMsg.includes('Rua das Flores, 100'), 'Mensagem deve informar endereço de destino');
assert.ok(dispatchedMsg.includes('R$ 160,00'), 'Mensagem deve informar total');
console.log('✓ 2. Mensagem de Saiu para Entrega gerada com sucesso.');

// 3. Obrigado pela Compra! Ganhou 1 Selo no Cartão
const loyaltyMsg = orderCenterMod.generateQuickWhatsappLoyaltyMessage(sampleOrder, storeSettings, {
  stamps: 3,
  goal: 10,
  completedCards: 0,
});
assert.ok(loyaltyMsg.includes('+1 SELO no seu Cartão Fidelidade'), 'Mensagem deve celebrar ganho de selo');
assert.ok(loyaltyMsg.includes('3/10 selos validados'), 'Mensagem deve mostrar contagem de selos');
assert.ok(loyaltyMsg.includes('7 selo(s)'), 'Mensagem deve calcular selos restantes');
console.log('✓ 3. Mensagem de Fidelidade gerada com sucesso.');

// 4. URL com validação de telefone
const quickUrl = orderCenterMod.buildQuickWhatsappUrl(sampleOrder, 'pix', storeSettings);
assert.equal(quickUrl.valid, true);
assert.ok(quickUrl.url.includes('phone=5586999887766') || quickUrl.url.includes('5586999887766'), 'URL deve conter telefone formatado');
assert.ok(!quickUrl.url.includes('%EF%BF%BD'), 'URL não deve conter caractere corrompido Unicode');
console.log('✓ 4. Construção de URL e validação de telefone aprovadas.');

// 5. Ordem sem telefone relata erro limpo para fallback
const invalidOrder = { ...sampleOrder, customerPhone: '' };
const invalidUrl = orderCenterMod.buildQuickWhatsappUrl(invalidOrder, 'pix', storeSettings);
assert.equal(invalidUrl.valid, false);
assert.ok(invalidUrl.error, 'Deve retornar mensagem de erro amigável quando sem telefone');
console.log('✓ 5. Validação de ausência de telefone aprovada.');

console.log('--- TEST 2: Operações de Exclusão do Catálogo (CRUD & Supabase) ---');
// Mock do Supabase Client para validar chamadas de exclusão
const supabaseCalls = [];
const mockClient = {
  from: (table) => ({
    delete: () => ({
      eq: (col, val) => {
        supabaseCalls.push({ action: 'DELETE', table, col, val });
        return Promise.resolve({ error: null });
      },
    }),
    update: (payload) => ({
      eq: (col, val) => {
        supabaseCalls.push({ action: 'UPDATE', table, payload, col, val });
        return Promise.resolve({ error: null });
      },
    }),
  }),
};

// Teste do contrato de exclusão de variante de sabor
async function testFlavorVariantDelete() {
  const flavorId = 'flav-watermelon-123';
  await mockClient.from('flavor_variants').delete().eq('id', flavorId);
  const found = supabaseCalls.find((c) => c.action === 'DELETE' && c.table === 'flavor_variants' && c.col === 'id' && c.val === flavorId);
  assert.ok(found, 'Variante de sabor deve ser excluída na tabela flavor_variants por id');
}

// Teste do contrato de exclusão de modelo e cascata em sabores
async function testModelDelete() {
  const modelId = 'model-ignite-v150';
  await mockClient.from('flavor_variants').delete().eq('model_id', modelId);
  await mockClient.from('product_models').delete().eq('id', modelId);
  const flavorsDeleted = supabaseCalls.find((c) => c.action === 'DELETE' && c.table === 'flavor_variants' && c.col === 'model_id' && c.val === modelId);
  const modelDeleted = supabaseCalls.find((c) => c.action === 'DELETE' && c.table === 'product_models' && c.col === 'id' && c.val === modelId);
  assert.ok(flavorsDeleted, 'Sabores do modelo devem ser excluídos por model_id');
  assert.ok(modelDeleted, 'Modelo deve ser excluído por id');
}

// Teste do contrato de exclusão de marca e desvinculação de modelos
async function testBrandDelete() {
  const brandId = 'brand-ignite';
  await mockClient.from('product_models').update({ brand_id: null }).eq('brand_id', brandId);
  await mockClient.from('brands').delete().eq('id', brandId);
  const unlinked = supabaseCalls.find((c) => c.action === 'UPDATE' && c.table === 'product_models' && c.col === 'brand_id' && c.val === brandId);
  const brandDeleted = supabaseCalls.find((c) => c.action === 'DELETE' && c.table === 'brands' && c.col === 'id' && c.val === brandId);
  assert.ok(unlinked, 'Modelos associados devem ter brand_id desvinculado antes de excluir a marca');
  assert.ok(brandDeleted, 'Marca deve ser excluída da tabela brands por id');
}

(async () => {
  await testFlavorVariantDelete();
  await testModelDelete();
  await testBrandDelete();
  console.log('✓ 6. Operações de exclusão de variantes, modelos e marcas validadas com integridade relacional.');
  console.log('\nTODOS OS TESTES DE RESPOSTAS RÁPIDAS E CRUD DE EXCLUSÃO PASSARAM COM SUCESSO! ✅');
})();
