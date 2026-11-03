const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildSync } = require('esbuild');
const code = buildSync({ entryPoints: ['src/hooks/useBodyScrollLock.ts'], bundle: true, write: false, platform: 'node', format: 'cjs', external: ['react'] }).outputFiles[0].text;
const effects = [], document = { body: { style: { overflow: 'clip' } } };
const moduleObject = { exports: {} };
vm.runInNewContext(code, { module: moduleObject, exports: moduleObject.exports, document, require: name => {
  assert.equal(name, 'react');
  return { useEffect: callback => effects.push(callback()) };
}});
const lock = active => { moduleObject.exports.useBodyScrollLock(active); return effects.pop(); };
assert.equal(lock(false), undefined);
assert.equal(document.body.style.overflow, 'clip');
const cart = lock(true), installGuide = lock(true);
assert.equal(document.body.style.overflow, 'hidden');
cart(); // Closing the first dialog must not unlock the second.
assert.equal(document.body.style.overflow, 'hidden');
installGuide();
assert.equal(document.body.style.overflow, 'clip');
const checkout = lock(true), account = lock(true);
account(); // Reverse close order also preserves the lock.
assert.equal(document.body.style.overflow, 'hidden');
checkout();
assert.equal(document.body.style.overflow, 'clip');
lock(true)(); // StrictMode setup / cleanup / setup.
const again = lock(true);
assert.equal(document.body.style.overflow, 'hidden');
again();
assert.equal(document.body.style.overflow, 'clip');
console.log('PASS: inactive dialogs, overlapping dialogs in both close orders, original overflow restoration and effect remount. Actual hook, mocked DOM/effect scheduler.');
