const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');

async function main() {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS text LANGUAGE sql STABLE AS
        'SELECT current_setting(''request.test_uid'', true)';
      SET request.test_uid = 'client';
      CREATE TABLE public.product_models (id text PRIMARY KEY, starting_price numeric, active boolean,
        model_name text, brand_name text, image_url text);
      CREATE TABLE public.flavor_variants (id text PRIMARY KEY, model_id text, in_stock boolean, demo_quantity integer, name text);
      CREATE TABLE public.store_settings (id text PRIMARY KEY, legal_notice text);
      CREATE TABLE public.customer_profiles (id text PRIMARY KEY, role text, vip_discount_custom numeric);
      CREATE TABLE public.coupons (id text PRIMARY KEY, code text, discount_type text, value numeric,
        active boolean, used_count integer DEFAULT 0, max_uses integer, min_order_value numeric, applicable_model_id text);
      CREATE TABLE public.customer_orders (id text PRIMARY KEY, customer_id text REFERENCES public.customer_profiles,
        status text, items jsonb, subtotal numeric, discount numeric, total numeric, delivery_info jsonb);
      INSERT INTO product_models VALUES ('model',100,true,'Modelo','Marca','/img.png'),('other',110,true,'Outro','Marca','/img.png');
      INSERT INTO flavor_variants VALUES ('mint','model',true,4,'Menta'),('berry','other',true,1,'Frutas');
      INSERT INTO customer_profiles VALUES ('client','customer',NULL),('vip','vip',NULL);
      INSERT INTO coupons VALUES ('c','ONCE','percent',20,true,0,1,0,'all'),
        ('f','FRETE','free_shipping',0,true,0,3,0,'all'),
        ('b','BATCH','percent',20,true,0,1,0,'all');
      GRANT USAGE ON SCHEMA auth TO authenticated;
      GRANT INSERT, SELECT ON customer_orders TO authenticated;
      ALTER TABLE customer_orders ENABLE ROW LEVEL SECURITY;
      CREATE POLICY customer_inserts ON customer_orders FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
      CREATE POLICY customer_reads ON customer_orders FOR SELECT TO authenticated USING (customer_id = auth.uid());
    `);
    await db.exec(fs.readFileSync('supabase/proposals/20261107_checkout_pricing.sql','utf8'));
    const product = {modelId:'model', flavorId:'mint', quantity:1, price:100, modelName:'Falsificado'};
    const params = ({
      id, customer = 'client', items = [product], subtotal = 100, discount = 0, total = subtotal - discount,
      info = {deliveryType:'pickup'},
    }) => [id, customer, JSON.stringify(items), subtotal, discount, total, JSON.stringify(info)];
    const insert = input => db.query(`
      INSERT INTO customer_orders VALUES ($1,$2,'recebido',$3,$4,$5,$6,$7) RETURNING *
    `, params(input));
    const couponInfo = code => ({deliveryType:'pickup', couponCode:code});
    const count = async id => (await db.query('SELECT used_count FROM coupons WHERE id = $1',[id])).rows[0].used_count;
    await db.exec('SET ROLE authenticated');
    await assert.rejects(insert({id:'forged',items:[{...product,price:1}],subtotal:1,total:1}),{code:'PWA01'});
    await assert.rejects(insert({id:'wrong-flavor',items:[{...product,flavorId:'berry'}]}),{code:'PWA01'});
    await assert.rejects(insert({id:'split',items:[product,{...product,quantity:4}],subtotal:500}),{code:'PWA01'});
    await assert.rejects(insert({id:'overstock',items:[{...product,quantity:5}],subtotal:500}),{code:'PWA01'});
    await assert.rejects(insert({id:'other-account',customer:'vip'}),{code:'PWA01'});
    await assert.rejects(insert({id:'coupon-wrong',discount:20,total:1,info:couponInfo('ONCE')}),{code:'PWA01'});
    const first = (await insert({id:'coupon-ok',discount:20,info:couponInfo('ONCE')})).rows[0];
    assert.equal(first.items[0].modelName,'Modelo');
    await assert.rejects(insert({id:'coupon-maxed',discount:20,info:couponInfo('ONCE')}),{code:'PWA02'});
    const batch = params({id:'batch1',discount:20,info:couponInfo('BATCH')});
    await assert.rejects(db.query(`
      INSERT INTO customer_orders VALUES ($1,$2,'recebido',$3,$4,$5,$6,$7),
      ('batch2',$2,'recebido',$3,$4,$5,$6,$7)
    `, batch),{code:'PWA02'});
    await db.query(`
      INSERT INTO customer_orders VALUES ($1,$2,'recebido',$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING
    `, params({id:'coupon-ok',discount:20,info:couponInfo('BATCH')}));
    await db.exec('RESET ROLE');
    assert.equal(await count('c'),1);
    assert.equal(await count('b'),0);
    await db.exec("UPDATE coupons SET used_count=0 WHERE id='c'; SET request.test_uid='vip'");
    assert.equal(await count('c'),1);
    await db.exec('SET ROLE authenticated');
    await assert.rejects(insert({id:'stacked',customer:'vip',items:[{...product,quantity:2}],subtotal:200,discount:30}),{code:'PWA01'});
    const vip = (await insert({id:'vip-ok',customer:'vip',items:[{...product,quantity:2}],subtotal:200,discount:20})).rows[0];
    assert.equal(vip.delivery_info.vipDiscountAmount,20);
    await db.exec("RESET ROLE; SET request.test_uid='client'");
    const config = {deliveryPricingMode:'per_km',deliveryRatePerKm:2,deliveryMinimumFee:5,
      deliveryCities:[{city:'Codó',state:'MA',originId:'base-codo',distanceKm:5}],
      flashSale:{enabled:true,modelId:'model',flavorId:'mint',percent:15,
        startsAt:new Date(Date.now()-60000).toISOString(),endsAt:new Date(Date.now()+60000).toISOString()}};
    const saveConfig = () => db.query("INSERT INTO store_settings VALUES ('promotions_config',$1) ON CONFLICT(id) DO UPDATE SET legal_notice=excluded.legal_notice",[
      JSON.stringify({progressiveDiscountConfig:config})
    ]);
    await saveConfig();
    await db.exec('SET ROLE authenticated');
    const delivery = {deliveryType:'delivery', destinationCity:'  CODÓ   - MA ', deliveryFee:10};
    await assert.rejects(insert({id:'fake-shipping',discount:15,info:{...delivery,deliveryFee:0}}),{code:'PWA01'});
    await insert({id:'flash',discount:15,total:95,info:delivery});
    await insert({id:'legacy-freight',discount:15,total:95,info:{
      deliveryType:'delivery', addressSummary:'Rua QA - 42 - Centro - Codó - MA', deliveryFee:10,
    }});
    await insert({id:'frete',discount:15,info:{...delivery,deliveryFee:0,couponCode:'FRETE'}});
    await insert({id:'addon',items:[product,{modelId:'addon',flavorId:'addon-usbc-turbo',quantity:1,price:16}],subtotal:116,discount:15});
    await db.exec('RESET ROLE');
    assert.equal(await count('f'),1);
    config.flashSale.startsAt = new Date(Date.now()-120000).toISOString();
    config.flashSale.endsAt = new Date(Date.now()-60000).toISOString();
    await saveConfig();
    await assert.rejects(insert({id:'expired',discount:15}),{code:'PWA01'});
    await insert({id:'regular'});
    await db.exec(fs.readFileSync('supabase/proposals/20261107_order_push.sql','utf8'));
    await db.exec('SET ROLE authenticated');
    const endpoint = 'https://fcm.googleapis.com/fcm/send/test';
    const register = (address, auth = 'b'.repeat(22)) =>
      db.query('SELECT podwave_register_order_push($1,$2,$3) AS ok',[address,'a'.repeat(87),auth]);
    assert.equal((await register('https://internal.test/private')).rows[0].ok,false);
    assert.equal((await register(endpoint)).rows[0].ok,true);
    await assert.rejects(db.query('SELECT * FROM order_push_devices'),{code:'42501'});
    await assert.rejects(db.query('SELECT * FROM podwave_claim_order_push()'),{code:'42501'});
    await db.exec("SET request.test_uid='vip'");
    assert.equal((await register(endpoint,'c'.repeat(22))).rows[0].ok,false);
    await db.exec("RESET ROLE; UPDATE customer_orders SET status='confirmado' WHERE id='regular'; SET ROLE service_role");
    const jobs = (await db.query('SELECT * FROM podwave_claim_order_push()')).rows;
    assert.equal(jobs.length,1);
    assert.equal(jobs[0].customer_id,'client');
    assert.equal(jobs[0].status,'confirmado');
    assert.equal((await db.query('SELECT * FROM podwave_claim_order_push()')).rows.length,0,'Claimed job is leased');
    await db.exec("RESET ROLE; SET ROLE authenticated");
    assert.equal((await register(endpoint)).rows[0].ok,true);
    await db.exec('RESET ROLE');
    assert.equal((await db.query('SELECT * FROM order_push_queue')).rows.length,0,'Account transfer removes stale jobs');
    console.log('PASS: push device ownership, approved endpoints, restricted queue and job leasing.');
    console.log('PASS: checkout rejects manipulated prices, mismatched flavors and stock; applies exclusive VIP/flash, freight and atomic coupon limits.');
  } finally {
    await db.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
