const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const { transformSync } = require('esbuild');
const moduleObject = { exports: {} };
vm.runInNewContext(transformSync(fs.readFileSync('src/utils/featuredProducts.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code, { module: moduleObject, exports: moduleObject.exports });
const { pickFeaturedModels } = moduleObject.exports;

const flavor = (inStock, demoQuantity = 2) => ({ id: Math.random().toString(36), name: 'Sabor', inStock, demoQuantity });
const model = (id, badge, flavors = [flavor(true)], active = true) => ({ id, badge, active, flavors });
const ids = (list) => list.map((m) => m.id);

const catalog = [
  model('novo', 'NOVO'),
  model('sem-selo', undefined),
  model('top', '★ TOP'),
  model('esgotado', '★ MAIS VENDIDO', [flavor(false, 0), flavor(true, 0)]),
  model('inativo', '★ MAIS VENDIDO', [flavor(true)], false),
  model('vendido', '★ MAIS VENDIDO', [flavor(false, 0), flavor(true, 1)]),
  model('lancamento', '★ LANÇAMENTO'),
  model('estoque-nao-informado', 'DESTAQUE', [flavor(true, null)]),
];
const before = JSON.stringify(catalog);

assert.deepEqual(ids(pickFeaturedModels(catalog)), ['vendido', 'top', 'lancamento', 'estoque-nao-informado', 'novo', 'sem-selo'],
  'badge priority, catalog order as tie-break, sold-out and inactive models excluded');
assert.deepEqual(ids(pickFeaturedModels(catalog, 2)), ['vendido', 'top'], 'limit respected');
assert.deepEqual(pickFeaturedModels([]), []);
assert.equal(JSON.stringify(catalog), before, 'input is not mutated');
assert.deepEqual(ids(pickFeaturedModels([model('a', 'STOP'), model('b', 'TOP')])), ['b', 'a'], 'TOP is matched as a word');

const hero = fs.readFileSync('src/components/HeroBanner.tsx', 'utf8');
assert.match(hero, /<FeaturedProducts \/>/, 'featured strip is rendered in the hero');
assert.match(hero, /hidden lg:flex lg:col-span-5/, 'banner showcase hidden on phones');
const pwa = fs.readFileSync('src/components/PWAInstallButton.tsx', 'utf8');
assert.match(pwa, /bannerDismissed \|\| !hasOrdered/, 'smart banner waits for the first order');
assert.doesNotMatch(fs.readFileSync('src/components/Header.tsx', 'utf8'), /variant="header"/, 'no install button in the header bar');
assert.match(fs.readFileSync('index.html', 'utf8'), /<script defer src="\/_vercel\/insights\/script\.js"><\/script>/);
console.log('PASS: featured strip picks available active models by badge priority with stable order and limit; hero, install prompt and analytics wiring verified. Local only.');
