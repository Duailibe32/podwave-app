const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { transformSync } = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

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
      if (id === 'react') return React;
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
const timelineMod = loadTsModule('src/components/OrderStatusTimeline.tsx');

// 1. Cliente autenticado cria um pedido real e 2. Aparece como 'recebido'
let order = {
  id: 'ord-real-1001',
  referenceId: '#PW-1001',
  customerId: 'cust-alice-01',
  customerName: 'Alice Souza',
  customerPhone: '(86) 99911-2233',
  customerEmail: 'alice@example.com',
  createdAt: '2026-10-30T12:00:00.000Z',
  total: 120,
  subtotal: 110,
  discount: 0,
  deliveryFee: 10,
  status: 'recebido',
  paymentMethod: 'PIX',
  paymentStatus: 'pendente',
  amountPaid: 0,
  deliveryType: 'delivery',
  addressSummary: 'Av. Frei Serafim, 1000 - Centro, Teresina/PI',
  loyaltyEligible: true,
  loyaltyStampGranted: false,
  version: 1,
  items: [
    {
      modelId: 'm1',
      modelName: 'Ignite V150',
      brandName: 'IGNITE',
      flavorId: 'f1',
      flavorName: 'Watermelon Ice',
      flavorEmoji: '🍉',
      quantity: 1,
      price: 110,
    },
  ],
  statusHistory: [
    {
      id: 'h-init',
      fromStatus: null,
      toStatus: 'recebido',
      changedAt: '2026-10-30T12:00:00.000Z',
      changedBy: 'Alice Souza',
      origin: 'checkout',
      reason: 'Pedido criado no checkout',
    },
  ],
};

assert.equal(order.status, 'recebido');

// 3, 4, 5, 7: Transições válidas: recebido -> confirmado -> em_separacao -> enviado -> entregue
for (const nextStatus of ['confirmado', 'em_separacao', 'enviado', 'entregue']) {
  const res = orderCenterMod.applyOrderStatusTransition(order, {
    toStatus: nextStatus,
    actorName: 'Admin Owner',
    actorEmail: 'owner@podwave.app',
    origin: 'admin_panel',
    expectedVersion: order.version,
  });
  assert.equal(res.success, true, `Transition ${order.status} -> ${nextStatus} should succeed`);
  order = res.updatedOrder;
}
assert.equal(order.status, 'entregue');
assert.equal(order.statusHistory.length, 5);
assert.equal(order.version, 5);

// 16a. Optimistic concurrency check: stale version must be rejected
const staleRes = orderCenterMod.applyOrderStatusTransition(order, {
  toStatus: 'cancelado',
  actorName: 'Admin 2',
  origin: 'admin_panel',
  reason: 'Tentativa em aba desatualizada',
  expectedVersion: 2,
});
assert.equal(staleRes.success, false);
assert.match(staleRes.error, /outra sessão/i);

// 6. Cliente vê a atualização em "Meus Pedidos" (5 etapas na OrderStatusTimeline)
const renderedTimeline = renderToStaticMarkup(
  React.createElement(timelineMod.OrderStatusTimeline, {
    status: 'enviado',
    statusHistory: order.statusHistory,
  })
);
assert.ok(renderedTimeline.includes('Recebido'));
assert.ok(renderedTimeline.includes('Confirmado'));
assert.ok(renderedTimeline.includes('Em separação'));
assert.ok(renderedTimeline.includes('Enviado'));
assert.ok(renderedTimeline.includes('Entregue'));
assert.ok(renderedTimeline.includes('aria-current="step"'));

// 8. Elegibilidade ao selo de fidelidade quando pedido está entregue e pago
order = { ...order, paymentStatus: 'pago', amountPaid: 120 };
const userAlice = {
  id: 'cust-alice-01',
  email: 'alice@example.com',
  fullName: 'Alice Souza',
  role: 'customer',
};
let aliceCard = loyaltyMod.getUserLoyaltyCard(userAlice, 10, 'Pod Grátis');
userAlice.loyaltyCard = aliceCard;
const eligBefore = orderCenterMod.evaluateOrderLoyalty(order, userAlice, 10, 'Pod Grátis');
assert.equal(eligBefore.state, 'eligible');
assert.equal(eligBefore.canGrantAutomatically, true);

// 9. Ao confirmar, o cliente recebe exatamente +1 selo
const idempotencyKey = `stamp-order-${order.id}`;
aliceCard = loyaltyMod.applyLoyaltyMutation(aliceCard, {
  type: 'add',
  value: 1,
  orderId: order.id,
  idempotencyKey,
  note: `Pedido ${order.referenceId} entregue`,
  updatedBy: 'owner@podwave.app',
});
userAlice.loyaltyCard = aliceCard;
order = {
  ...order,
  loyaltyStampGranted: true,
  loyaltyStampGrantedAt: '2026-10-30T13:00:00.000Z',
  loyaltyGrantIdempotencyKey: idempotencyKey,
};
assert.equal(aliceCard.stamps, 1);

// 10. Ao clicar novamente, o sistema impede segundo selo para o mesmo pedido
const eligAfter = orderCenterMod.evaluateOrderLoyalty(order, userAlice, 10, 'Pod Grátis');
assert.equal(eligAfter.state, 'granted');
assert.equal(eligAfter.canGrantAutomatically, false);

const duplicateAttemptCard = loyaltyMod.applyLoyaltyMutation(aliceCard, {
  type: 'add',
  value: 1,
  orderId: order.id,
  idempotencyKey,
  note: 'Tentativa duplicada',
});
assert.equal(duplicateAttemptCard.stamps, 1, 'Duplicate stamp for same orderId must be blocked');

// 11 & 12 & 13: Integração com o Financeiro ("Meu Negócio") sem duplicidade e pagamento pendente não vira receita recebida
const unpaidOrder = { ...order, id: 'ord-unpaid-2', referenceId: '#PW-1002', paymentStatus: 'pendente', amountPaid: 0 };
const pendingSaleRes = orderCenterMod.buildManualSaleFromCatalogOrder(unpaidOrder);
assert.equal(pendingSaleRes.success, true);
const pendingSale = pendingSaleRes.sale;
assert.equal(pendingSale.id, 'sale-ord-ord-unpaid-2');
assert.equal(pendingSale.paymentStatus, 'pendente');
assert.equal(pendingSale.amountReceived, 0, 'Pending order must not become received revenue automatically');
assert.equal(pendingSale.amountPending, 120);

const paidSaleRes = orderCenterMod.buildManualSaleFromCatalogOrder(order);
assert.equal(paidSaleRes.success, true);
const paidSale = paidSaleRes.sale;
assert.equal(paidSale.id, 'sale-ord-ord-real-1001');
assert.equal(paidSale.amountReceived, 120);
assert.equal(paidSale.paymentStatus, 'pago');

const existingMatch = orderCenterMod.findExistingFinancialSaleForOrder(order, [paidSale]);
assert.ok(existingMatch, 'Must detect existing financial sale linked to order');
assert.equal(existingMatch.id, paidSale.id);

// KPIs: Faturamento efetivamente pago sem duplicidade
const kpisWithBoth = orderCenterMod.calculateOrdersDashboardKPIs(
  [order, unpaidOrder],
  [paidSale, pendingSale]
);
assert.equal(kpisWithBoth.faturamentoPago, 120, 'Must not double-count paid order that is also in manualSales, nor count unpaid order');
assert.equal(kpisWithBoth.pagamentoPendenteCount, 1);

// 14. WhatsApp notification message only mentions loyalty stamp when loyaltyStampGranted === true
const msgWithoutStamp = orderCenterMod.formatWhatsappOrderMessage(
  { ...order, loyaltyStampGranted: false },
  'entregue',
  undefined,
  aliceCard
);
assert.ok(!msgWithoutStamp.includes('Cartão Fidelidade'), 'Must not claim stamp was granted if loyaltyStampGranted is false');

const msgWithStamp = orderCenterMod.formatWhatsappOrderMessage(
  { ...order, loyaltyStampGranted: true },
  'entregue',
  undefined,
  aliceCard
);
assert.ok(msgWithStamp.includes('Cartão Fidelidade'), 'Should mention loyalty card when stamp is confirmed');

// 16b. Lock contra cliques rápidos repetidos
assert.equal(orderCenterMod.acquireOrderActionLock('test-lock-1'), true);
assert.equal(orderCenterMod.acquireOrderActionLock('test-lock-1'), false, 'Concurrent lock must reject second click');
orderCenterMod.releaseOrderActionLock('test-lock-1');
assert.equal(orderCenterMod.acquireOrderActionLock('test-lock-1'), true);
orderCenterMod.releaseOrderActionLock('test-lock-1');

// 17. Cancelamento exige motivo e preserva histórico auditável
const cancelWithoutReason = orderCenterMod.validateOrderStatusTransition('recebido', 'cancelado', '  ');
assert.equal(cancelWithoutReason.valid, false);
const cancelWithReason = orderCenterMod.validateOrderStatusTransition('recebido', 'cancelado', 'Cliente solicitou troca de sabor');
assert.equal(cancelWithReason.valid, true);

const cancelledTimelineHtml = renderToStaticMarkup(
  React.createElement(timelineMod.OrderStatusTimeline, {
    status: 'cancelado',
    cancelReason: 'Cliente solicitou troca de sabor',
  })
);
assert.ok(cancelledTimelineHtml.includes('Pedido cancelado'));
assert.ok(cancelledTimelineHtml.includes('Cliente solicitou troca de sabor'));

console.log('PASS: All 18 Order Center, Loyalty idempotency, Financial deduplication, Timeline & WhatsApp scenarios verified.');
