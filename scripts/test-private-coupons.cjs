const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');

const proposal = fs.readFileSync('supabase/proposals/20261126_private_coupon_lookup.sql', 'utf8');

// Instala a proposta sobre um banco que usa a coluna indicada (produção usa "active",
// as migrações antigas usam "is_active") e confere o que cada perfil enxerga.
async function checkSchema(activeColumn) {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA app_security; GRANT USAGE ON SCHEMA app_security TO anon, authenticated;
      CREATE FUNCTION app_security.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS
        'SELECT current_setting(''request.test_role'', true) = ''admin''';
      CREATE TABLE public.coupons (id text PRIMARY KEY, code text, discount_type text, value numeric,
        ${activeColumn} boolean DEFAULT true, used_count integer DEFAULT 0, max_uses integer);
      INSERT INTO coupons VALUES ('1','VIPCLIENTE','percent',15,true,0,1),
        ('2','ANTIGO','fixed',5,false,0,NULL), ('3','frete','free_shipping',0,true,0,NULL);
      ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
      GRANT SELECT ON coupons TO anon, authenticated;
      CREATE POLICY "Public Read Coupons" ON public.coupons FOR SELECT USING (${activeColumn} = true OR app_security.is_admin());
    `);
    const as = async (role, sql, appRole = '') => {
      await db.exec(`SET request.test_role = '${appRole}'; SET ROLE ${role};`);
      try { return (await db.query(sql)).rows.map((row) => row.code); }
      finally { await db.exec('RESET ROLE'); }
    };

    assert.deepEqual(await as('anon', 'SELECT code FROM coupons ORDER BY id'), ['VIPCLIENTE', 'frete'],
      'fixture should reproduce the public coupon listing');

    await db.exec(proposal);
    await db.exec(proposal); // idempotente

    assert.deepEqual(await as('anon', 'SELECT code FROM coupons'), [], 'anon must not list coupons');
    assert.deepEqual(await as('authenticated', 'SELECT code FROM coupons', 'customer'), [], 'customers must not list coupons');
    assert.deepEqual(await as('authenticated', 'SELECT code FROM coupons ORDER BY id', 'admin'), ['VIPCLIENTE', 'ANTIGO', 'frete'],
      'admins keep the full list');

    const lookup = (code) => as('anon', `SELECT code FROM podwave_lookup_coupon(${code === null ? 'NULL' : `'${code}'`})`);
    assert.deepEqual(await lookup(' vipcliente '), ['VIPCLIENTE'], 'lookup is case and space insensitive');
    assert.deepEqual(await lookup('FRETE'), ['frete']);
    assert.deepEqual(await lookup('ANTIGO'), [], 'inactive coupons are not returned');
    assert.deepEqual(await lookup('NAOEXISTE'), []);
    assert.deepEqual(await lookup('%'), [], 'no pattern matching');
    assert.deepEqual(await lookup(''), []);
    assert.deepEqual(await lookup(null), []);
    assert.deepEqual(await lookup('X'.repeat(65)), [], 'oversized codes are rejected');
  } finally {
    await db.close();
  }
}

async function main() {
  await checkSchema('active');
  await checkSchema('is_active');

  const context = fs.readFileSync('src/context/CatalogContext.tsx', 'utf8');
  const service = fs.readFileSync('src/services/supabase.ts', 'utf8');
  assert.match(context, /const applyCoupon = async/, 'applyCoupon must be async');
  assert.match(context, /await lookupCouponByCode\(trimmed\)/, 'unknown codes are checked one at a time');
  assert.match(context, /isSupabaseEnvConfigured \? \[\] : AVAILABLE_COUPONS/, 'demo coupons only without Supabase');
  assert.match(service, /rpc\('podwave_lookup_coupon', \{ p_code: trimmed \}\)/);
  for (const file of ['src/components/CartDrawer.tsx', 'src/components/CheckoutDrawer.tsx']) {
    assert.match(fs.readFileSync(file, 'utf8'), /await applyCoupon\(/, `${file} must await applyCoupon`);
  }
  console.log('PASS: coupons hidden from anon and customers on both column layouts; admins keep the list; single-code lookup is exact, active-only and bounded; storefront awaits the lookup. Local PGlite only.');
}

main().catch((error) => { console.error(error); process.exit(1); });
