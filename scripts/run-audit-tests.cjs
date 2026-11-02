const {spawnSync}=require('node:child_process');
const tests=[
  'test-financial-compat','test-sale-stock','test-audit-safety','test-security-hardening',
  'test-write-confirmations','test-order-center','test-order-placement-and-image-cache',
  'test-crud-deletion-and-quick-whatsapp','test-profile-schema-default','test-profile-grants',
  'test-profile-trigger-repair','test-order-notifications','test-webpush-and-coupons',
  'test-signup-confirmation',
  'test-order-history-reconciliation',
  'test-product-images',
  'test-diagnostic-no-replay',
  'test-progressive-discount-regression',
];
for(const name of tests){
  const result=spawnSync(process.execPath,[`scripts/${name}.cjs`],{stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status ?? 1);
}
console.log(`PASS: ${tests.length} audit test scripts. No production writes.`);
