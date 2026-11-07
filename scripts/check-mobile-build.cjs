// Run after `npm run build -- --manifest`. Checks actual output, including shared chunks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '../dist');
const manifest = JSON.parse(fs.readFileSync(path.join(root, '.vite/manifest.json'), 'utf8'));
const initial = new Set();
function visit(key) {
  if (initial.has(key)) return;
  assert(manifest[key], `Missing manifest dependency: ${key}`);
  initial.add(key);
  for (const dependency of manifest[key].imports || []) visit(dependency);
}
const entry = Object.keys(manifest).find(key => manifest[key].isEntry);
assert(entry, 'Missing application entry');
visit(entry);
const files = [...initial].map(key => manifest[key].file);
const gzipBytes = files.reduce((total, file) => total + zlib.gzipSync(fs.readFileSync(path.join(root, file))).length, 0);
// Baseline before this change: 291,427 bytes gzip. Allow some growth, retain meaningful savings.
assert(gzipBytes < 250 * 1024, `Initial JavaScript exceeds 250 KiB gzip: ${gzipBytes}`);
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
for (const name of ['ProductDetailModal', 'CheckoutDrawer', 'AuthModal', 'CustomerProfileModal', 'AdminPanel']) {
  const key = Object.keys(manifest).find(key => key.endsWith(`/${name}.tsx`));
  assert(key, `Missing deferred screen: ${name}`);
  assert(!initial.has(key), `${name} must load on demand`);
  assert(!sw.includes(manifest[key].file), `${name} must not be precached`);
}
const adminKey = Object.keys(manifest).find(key => key.endsWith('/AdminPanel.tsx'));
const excelKey = Object.keys(manifest).find(key => /\/xlsx\.[cm]?js$/.test(key) || manifest[key].name === 'xlsx');
assert(excelKey, 'Excel should load as a separate module');
assert(!(manifest[adminKey].imports || []).includes(excelKey), 'Excel must load only when exporting');
assert(!initial.has(excelKey), 'Excel must be deferred for mobile');
assert(!sw.includes(manifest[excelKey].file), 'Excel must not be precached');
console.log('PASS: Excel loaded only on demand.');
console.log(`PASS: ${files.length} initial JS files, ${gzipBytes} bytes gzip; five screens deferred and excluded from precache.`);
