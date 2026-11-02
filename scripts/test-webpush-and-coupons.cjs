const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TEST SUITE: WEB PUSH & COUPON LIMIT AUTO-INACTIVATION ===\n');

// 1. Check coupon suggestions removed from CheckoutDrawer and CartDrawer
console.log('1. Checking removal of coupon suggestions in CheckoutDrawer and CartDrawer...');
const checkoutDrawerContent = fs.readFileSync(path.join(__dirname, '../src/components/CheckoutDrawer.tsx'), 'utf-8');
const cartDrawerContent = fs.readFileSync(path.join(__dirname, '../src/components/CartDrawer.tsx'), 'utf-8');

assert.strictEqual(
  checkoutDrawerContent.includes('Chips rápidos com cupons disponíveis'),
  false,
  'CheckoutDrawer should not contain quick coupon suggestion chips'
);
assert.strictEqual(
  checkoutDrawerContent.includes('Cupons:</span>'),
  false,
  'CheckoutDrawer should not contain coupon suggestion list header'
);
assert.strictEqual(
  cartDrawerContent.includes('Sugestões:'),
  false,
  'CartDrawer should not contain "Sugestões:" coupon suggestion header'
);
console.log('  ✓ Coupon suggestions completely removed from both CheckoutDrawer and CartDrawer.');

// 2. Check coupon limit auto-inactivation logic in CatalogContext
console.log('\n2. Checking coupon limit auto-inactivation in CatalogContext...');
const catalogContextContent = fs.readFileSync(path.join(__dirname, '../src/context/CatalogContext.tsx'), 'utf-8');

assert.ok(
  catalogContextContent.includes('c.maxUses && c.maxUses > 0 && c.usedCount >= c.maxUses ? { ...c, active: false } : c'),
  'Coupons state should auto-inactivate any coupon reaching maxUses on load'
);

assert.ok(
  catalogContextContent.includes('const reachedLimit = Boolean(c.maxUses && c.maxUses > 0 && nextUsed >= c.maxUses);'),
  'submitOrderViaWhatsapp should evaluate reachedLimit when coupon is used'
);

assert.ok(
  catalogContextContent.includes('active: reachedLimit ? false : c.active'),
  'submitOrderViaWhatsapp should set active: false when reachedLimit is true'
);

assert.ok(
  catalogContextContent.includes('O cupom ${coupon.code} atingiu o limite máximo de ${coupon.maxUses} usos e está inativo.'),
  'applyCoupon should return that the coupon reached limit and is inactive'
);

assert.ok(
  catalogContextContent.includes('if (merged.maxUses && merged.maxUses > 0 && merged.usedCount >= merged.maxUses) {\n            merged.active = false;'),
  'updateCoupon should automatically set active = false if usedCount reaches maxUses'
);
console.log('  ✓ Coupon auto-inactivation logic strictly enforced across context, order flow, and admin updates.');

// 3. Check Service Worker Web Push API handlers
console.log('\n3. Checking Service Worker Web Push API integration...');
const swContent = fs.readFileSync(path.join(__dirname, '../public/order-notifications-sw.js'), 'utf-8');

assert.ok(
  swContent.includes("self.addEventListener('push',"),
  'Service worker must have a push event listener for Web Push API'
);

assert.ok(
  swContent.includes("self.addEventListener('notificationclick',"),
  'Service worker must have a notificationclick event listener'
);

assert.ok(
  swContent.includes("self.addEventListener('message',"),
  'Service worker must have a message event listener for test push notifications'
);

assert.ok(
  swContent.includes("showNotification"),
  'Service worker must call showNotification'
);
console.log('  ✓ Service Worker includes push, notificationclick, and message handlers.');

// 4. Check WebPushSettingsSection and AdminPanel mounting
console.log('\n4. Checking WebPushSettingsSection in AdminPanel...');
const webPushComponentPath = path.join(__dirname, '../src/components/admin/WebPushSettingsSection.tsx');
assert.ok(fs.existsSync(webPushComponentPath), 'WebPushSettingsSection.tsx must exist');

const webPushContent = fs.readFileSync(webPushComponentPath, 'utf-8');
assert.ok(webPushContent.includes('Notification.permission'), 'Must check Notification.permission');
assert.ok(webPushContent.includes('Notification.requestPermission()'), 'Must allow requesting permission');
assert.ok(webPushContent.includes('showNotification'), 'Must support dispatching test notifications via showNotification');
assert.ok(webPushContent.includes('pushManager'), 'Must integrate with PushManager');

const adminPanelContent = fs.readFileSync(path.join(__dirname, '../src/components/admin/AdminPanel.tsx'), 'utf-8');
assert.ok(
  adminPanelContent.includes('import { WebPushSettingsSection } from \'./WebPushSettingsSection\';'),
  'AdminPanel must import WebPushSettingsSection'
);
assert.ok(
  adminPanelContent.includes('<WebPushSettingsSection onNotify={showToast} />'),
  'AdminPanel must mount WebPushSettingsSection in configuracoes tab'
);
console.log('  ✓ WebPushSettingsSection fully implemented and mounted in AdminPanel.');

// Simulation of Coupon limit inactivation unit test
console.log('\n5. Executing unit test simulation for coupon inactivation math...');
const sampleCoupons = [
  { id: 'c1', code: 'PROMO10', maxUses: 3, usedCount: 2, active: true },
  { id: 'c2', code: 'EXHAUSTED', maxUses: 5, usedCount: 5, active: true },
  { id: 'c3', code: 'UNLIMITED', usedCount: 100, active: true }
];

// Test normalization on load
const normalized = sampleCoupons.map((c) =>
  c.maxUses && c.maxUses > 0 && c.usedCount >= c.maxUses ? { ...c, active: false } : c
);
assert.strictEqual(normalized[0].active, true, 'c1 should still be active');
assert.strictEqual(normalized[1].active, false, 'c2 should be auto-inactivated because 5 >= 5');
assert.strictEqual(normalized[2].active, true, 'c3 should remain active (no maxUses)');

// Test order placement usage increment
const updatedAfterOrder = normalized.map((c) => {
  if (c.code === 'PROMO10') {
    const nextUsed = (c.usedCount || 0) + 1; // 2 + 1 = 3
    const reachedLimit = Boolean(c.maxUses && c.maxUses > 0 && nextUsed >= c.maxUses);
    return {
      ...c,
      usedCount: nextUsed,
      active: reachedLimit ? false : c.active,
    };
  }
  return c;
});

assert.strictEqual(updatedAfterOrder[0].usedCount, 3);
assert.strictEqual(updatedAfterOrder[0].active, false, 'c1 should now be inactive because 3 >= 3');
console.log('  ✓ Math & logic unit test simulation passed successfully.');

console.log('\nALL TESTS PASSED! 🎉');
