const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');

(async () => {
  // A missing live authorization dependency must abort before any schema changes.
  const missingDependencyDb = new PGlite();
  const migrationText = fs.readFileSync('supabase/migrations/20261030010000_atomic_sale_stock_and_audit.sql','utf8');
  await missingDependencyDb.exec('CREATE SCHEMA app_security');
  await assert.rejects(missingDependencyDb.exec(migrationText),/função de autorização.*não existe/);
  await missingDependencyDb.exec('ROLLBACK');
  assert.equal((await missingDependencyDb.query("SELECT to_regclass('public.business_audit_events') AS name")).rows[0].name,null);
  await missingDependencyDb.close();
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth; CREATE SCHEMA app_security;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '11111111-1111-1111-1111-111111111111'::uuid$$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT '{"email":"owner@example.test"}'::jsonb$$;
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql AS $$SELECT COALESCE(current_setting('podwave.test_admin',true),'true')='true'$$;
    CREATE FUNCTION app_security.is_podwave_finance_owner() RETURNS boolean LANGUAGE sql AS $$SELECT COALESCE(current_setting('podwave.test_finance_owner',true),'true')='true'$$;
    GRANT USAGE ON SCHEMA auth,app_security TO authenticated,anon;
    CREATE TABLE brands(id text PRIMARY KEY,name text);
    CREATE TABLE product_models(id text PRIMARY KEY,active boolean NOT NULL DEFAULT true);
    -- Column types and nullability confirmed from the deployed table on 2026-10-30.
    CREATE TABLE flavor_variants(
      id text PRIMARY KEY,model_id text NOT NULL REFERENCES product_models(id),
      name text NOT NULL,color_hex text NOT NULL,icon_emoji text NOT NULL,
      in_stock boolean NOT NULL,demo_quantity integer,low_quantity_threshold integer,custom_image text,
      created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE banners(id text PRIMARY KEY); CREATE TABLE coupons(id text PRIMARY KEY);
    INSERT INTO product_models VALUES ('model',true),('other',true);
    INSERT INTO flavor_variants(id,model_id,name,color_hex,icon_emoji,demo_quantity,in_stock)
      VALUES ('flavor','model','Sabor A','#123456','🍇',5,true),('second','model','Sabor B','#123456','🍇',2,true),('unknown','model','Sem quantidade','#123456','🍇',null,true);`);
  const schema = fs.readFileSync('supabase/migrations/20261030000000_definitive_security_and_rls_hardening.sql','utf8');
  const tables = ['manual_sales','manual_expenses','merchandise_purchases','cash_movements','initial_cash_balances','manual_commitments'];
  for (const t of tables) await db.exec(schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${t} \\([\\s\\S]*?\\n\\);`))[0]);
  await db.exec(`INSERT INTO manual_sales(id,date,customer_name,payment_method,items,total) VALUES('historical','2026-10-29','Antigo','Pix','[{"productName":"antigo","quantity":1}]',10);`);
  for (const t of [...tables,'flavor_variants','product_models']) {
    const authorization = tables.includes(t) ? 'app_security.is_podwave_finance_owner()' : 'public.is_admin()';
    await db.exec(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY; GRANT SELECT,INSERT,UPDATE,DELETE ON ${t} TO authenticated; CREATE POLICY allowed_access ON ${t} TO authenticated USING(${authorization}) WITH CHECK(${authorization});`);
  }
  const migration = fs.readFileSync('supabase/migrations/20261030010000_atomic_sale_stock_and_audit.sql','utf8');
  await db.exec(migration); await db.exec(migration); // Idempotent install; no stock backfill.
  await db.exec('SET ROLE authenticated');
  let request=0;
  const sale = (id,quantity=2,extra={}) => ({id,date:'2026-10-30',customer_name:'Cliente',items:[{productId:'model',flavorId:'flavor',quantity}],subtotal:20,discount:0,delivery_fee:0,total:20,payment_method:'Pix',payment_status:'pago',amount_received:20,amount_pending:0,order_status:'confirmado',stock_managed:true,notes:'nota',...extra});
  const call = async (payload,revision=0,token=`request-${++request}`,del=false) => (await db.query('SELECT public.save_sale_with_stock($1::jsonb,$2,$3,$4) AS result',[JSON.stringify(payload),revision,token,del])).rows[0].result;
  const qty = async (id='flavor') => (await db.query('SELECT demo_quantity FROM flavor_variants WHERE id=$1',[id])).rows[0].demo_quantity;
  assert.equal(await qty(),5);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM business_audit_events')).rows[0].n,0);
  await call(sale('a'),0,'stable-request'); assert.equal(await qty(),3);
  await call(sale('a'),0,'stable-request'); assert.equal(await qty(),3); // Lost response retry.
  await assert.rejects(call(sale('a',3),0),/outro dispositivo/); assert.equal(await qty(),3);
  await call(sale('a',3),1); assert.equal(await qty(),2); // Delta only.
  await call(sale('a',3,{order_status:'cancelado'}),2); assert.equal(await qty(),5);
  await call(sale('a',3,{order_status:'cancelado'}),3); assert.equal(await qty(),5); // No repeated restock.
  await call(sale('a',3),4); assert.equal(await qty(),2);
  await call({id:'a'},5,undefined,true); assert.equal(await qty(),5);
  await call({id:'a'},5,undefined,true); assert.equal(await qty(),5);
  await assert.rejects(call(sale('a'),0,'stable-request'),/excluída/); // No resurrection.
  await assert.rejects(call(sale('oversell',6)),/Estoque insuficiente/);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM manual_sales WHERE id='oversell'")).rows[0].n,0);
  await assert.rejects(call(sale('fraction',1.5)),/inteiro positivo/);
  await assert.rejects(call(sale('unlinked',1,{items:[{productId:'model',quantity:1}]})),/produto e sabor/);
  await assert.rejects(call(sale('wrong',1,{items:[{productId:'other',flavorId:'flavor',quantity:1}]})),/não pertence/);
  await assert.rejects(call(sale('nullstock',1,{items:[{productId:'model',flavorId:'unknown',quantity:1}]})),/não informado/);
  await assert.rejects(call(sale('duplicate',1,{items:[{productId:'model',flavorId:'flavor',quantity:3},{productId:'model',flavorId:'flavor',quantity:3}]})),/Estoque insuficiente/);
  await assert.rejects(call(sale('rollback',1,{items:[{productId:'model',flavorId:'flavor',quantity:1},{productId:'model',flavorId:'second',quantity:3}]})),/Estoque insuficiente/);
  assert.equal(await qty(),5); assert.equal(await qty('second'),2); // Entire operation rolls back.
  const two = await Promise.allSettled([call(sale('race1',4)),call(sale('race2',4))]);
  assert.equal(two.filter(r => r.status==='fulfilled').length,1); assert.equal(await qty(),1);
  await assert.rejects(db.exec("UPDATE flavor_variants SET demo_quantity=5 WHERE id='flavor'"),/Estoque alterado/);
  await assert.rejects(db.exec("DELETE FROM flavor_variants WHERE id='flavor'"),/vinculadas/);
  await assert.rejects(db.exec("DELETE FROM manual_sales WHERE id='race1'"),/Atualize o aplicativo/);
  const legacy = sale('historical',1,{stock_managed:false,items:[{productName:'antigo',quantity:1}]});
  await call(legacy); assert.equal(await qty(),1); // Financial edit does not consume historical stock.
  await assert.rejects(call({...legacy,items:[{productName:'alterado',quantity:2}]},1),/históricos/);
  await db.exec("INSERT INTO manual_commitments(id,commitment_type,title,person_or_supplier,category,issue_date,due_date,payment_method,account_channel) VALUES('c','a_pagar','Conta','Fornecedor','Outros','2026-10-30','','Pix','pix_banco'); DELETE FROM manual_commitments WHERE id='c';");
  const audit = (await db.query("SELECT * FROM business_audit_events WHERE entity='manual_commitments' ORDER BY id DESC LIMIT 1")).rows[0];
  assert.equal(audit.operation,'DELETE'); assert.equal(audit.actor_label,'owner@example.test'); assert.equal(audit.before_data.title,'Conta'); assert.equal(audit.after_data,null);
  await assert.rejects(db.exec('DELETE FROM business_audit_events'),/permission denied/);
  await assert.rejects(db.exec("INSERT INTO business_audit_events(operation,entity,record_id) VALUES('INSERT','fake','fake')"),/permission denied/);
  // A catalog admin without finance-owner access must not read financial audit or change sales.
  await db.exec("SELECT set_config('podwave.test_finance_owner','false',false)");
  assert.equal((await db.query('SELECT public.is_admin() AS admin')).rows[0].admin,true);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM business_audit_events')).rows[0].n,0);
  await assert.rejects(call(sale('forbidden')),/restrito/);
  // Trigger checks reserved units even when RLS hides the sale from a catalog admin.
  assert.equal((await db.query('SELECT count(*)::int AS n FROM manual_sales')).rows[0].n,0);
  await assert.rejects(db.exec("DELETE FROM flavor_variants WHERE id='flavor'"),/vinculadas/);
  await db.exec("SELECT set_config('podwave.test_admin','false',false)");
  await assert.rejects(call(sale('customer-forbidden')),/restrito/);
  await db.exec('RESET ROLE; SET ROLE anon');
  await assert.rejects(db.exec('SELECT * FROM business_audit_events'),/permission denied/);
  // The real order RPC wraps the existing sale RPC: a later order failure rolls stock back.
  await db.exec(`RESET ROLE;
    SELECT set_config('podwave.test_admin','true',false),set_config('podwave.test_finance_owner','true',false);
    CREATE TABLE customer_orders(id text PRIMARY KEY,status text NOT NULL,delivery_info jsonb NOT NULL DEFAULT '{}');
    ALTER TABLE customer_orders ENABLE ROW LEVEL SECURITY;
    GRANT SELECT,UPDATE ON customer_orders TO authenticated;
    CREATE POLICY order_admin ON customer_orders TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
    INSERT INTO customer_orders VALUES('atomic','recebido','{"version":1}'),('rollback-order','recebido','{"version":1}');`);
  const orderProposal=fs.readFileSync('supabase/proposals/20261102_atomic_order_sale.sql','utf8');
  await db.exec(orderProposal);await db.exec(orderProposal);
  const linkedGuard=fs.readFileSync('supabase/proposals/20261102_guard_linked_sale_deletion.sql','utf8');
  await db.exec(linkedGuard);await db.exec(linkedGuard);
  await db.exec(`CREATE FUNCTION reject_test_order() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN
    IF NEW.id='rollback-order' THEN RAISE EXCEPTION 'synthetic order refusal'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER reject_test_order BEFORE UPDATE ON customer_orders FOR EACH ROW EXECUTE FUNCTION reject_test_order();
    SET ROLE authenticated;`);
  const orderSale=(id)=>sale('sale-ord-'+id,1,{items:[{productId:'model',flavorId:'second',quantity:1}]});
  const mutate=async(id,version,status,payload,revision=0)=>(await db.query(
    'SELECT save_order_with_sale($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7) result',
    [id,version,status,JSON.stringify({version:version+1}),payload?JSON.stringify(payload):null,revision,'atomic-request-'+(++request)])).rows[0].result;
  assert.equal(await qty('second'),2);
  const addon={productId:'addon',flavorId:'addon-usbc-turbo',productName:'Cabo USB',quantity:1,unitPrice:16,subtotal:16};
  const mixedSale=id=>({...orderSale(id),items:[...orderSale(id).items,addon],subtotal:36,total:36,amount_received:36});
  // Reproduce the reported failure with the actual old RPC and a checkout accessory.
  await assert.rejects(mutate('atomic',1,'confirmado',mixedSale('atomic')),/não pertence/);
  assert.equal(await qty('second'),2); // Failed confirmation must not consume any stock.
  assert.equal((await db.query("SELECT status FROM customer_orders WHERE id='atomic'")).rows[0].status,'recebido');
  const addonPatch=fs.readFileSync('supabase/proposals/20261102_sale_stock_complementary_addons.sql','utf8');
  await db.exec('RESET ROLE');
  const signature="public.save_sale_with_stock(jsonb,integer,text,boolean)";
  const aclBefore=(await db.query('SELECT proacl::text acl,prosecdef FROM pg_proc WHERE oid=$1::regprocedure',[signature])).rows[0];
  await db.exec(addonPatch);await db.exec(addonPatch);
  const aclAfter=(await db.query('SELECT proacl::text acl,prosecdef FROM pg_proc WHERE oid=$1::regprocedure',[signature])).rows[0];
  assert.deepEqual(aclAfter,aclBefore,'Patch must preserve invoker authorization and grants');
  await db.exec('SET ROLE authenticated');
  for(const bad of [
    {...addon,flavorId:'invented'}, {...addon,flavorId:'second'}, {...addon,productId:'model'}, {...addon,quantity:0},
    {productId:'other',flavorId:'second',quantity:1},
  ]) await assert.rejects(call(sale('bad-addon-'+(++request),1,{items:[bad]})));
  assert.equal(await qty('second'),2);
  const confirmed=await mutate('atomic',1,'confirmado',mixedSale('atomic'));
  assert.equal(confirmed.sale.items.length,2,'Accessory must remain in the financial record');
  assert.equal(Number(confirmed.sale.total),36,'Accessory revenue must not be discarded');
  assert.deepEqual(confirmed.sale.stock_allocation,{second:1},'Only the real variant consumes stock');
  assert.equal(confirmed.sale.items[1].flavorId,'addon-usbc-turbo');

  assert.equal(confirmed.order.delivery_info.stockDeducted,true);assert.equal(confirmed.order.delivery_info.version,2);
  assert.equal(await qty('second'),1);
  // A stale frontend and hidden orders must not allow deleting the linked sale.
  const beforeAudit=(await db.query("SELECT count(*)::int n FROM business_audit_events")).rows[0].n;
  await db.exec('RESET ROLE; ALTER POLICY order_admin ON customer_orders USING(false); SET ROLE authenticated');
  assert.equal((await db.query('SELECT count(*)::int n FROM customer_orders')).rows[0].n,0);
  await assert.rejects(call({id:'sale-ord-atomic'},1,undefined,true),e=>e.code==='23503');
  assert.equal(await qty('second'),1,'Blocked deletion must roll back the restock');
  assert.equal((await db.query("SELECT stock_revision FROM manual_sales WHERE id='sale-ord-atomic'")).rows[0].stock_revision,1);
  assert.equal((await db.query("SELECT count(*)::int n FROM business_audit_events")).rows[0].n,beforeAudit);
  await db.exec('RESET ROLE; ALTER POLICY order_admin ON customer_orders USING(public.is_admin()); SET ROLE authenticated');
  assert.equal((await db.query("SELECT delivery_info->>'financialSaleId' link FROM customer_orders WHERE id='atomic'")).rows[0].link,'sale-ord-atomic');
  // Unlinked manual sales still support deletion and stock return.
  await call(sale('standalone-after-guard',1,{items:[{productId:'model',flavorId:'second',quantity:1}]}));
  assert.equal(await qty('second'),0);
  await call({id:'standalone-after-guard'},1,undefined,true);assert.equal(await qty('second'),1);
  await assert.rejects(db.query('SELECT save_order_with_sale($1,$2,$3,$4::jsonb)',
    ['atomic',2,'confirmado',JSON.stringify({version:3,paymentStatus:'pago'})]),/requires the linked sale/);
  await assert.rejects(mutate('atomic',1,'confirmado',orderSale('atomic')),e=>e.code==='40001');
  assert.equal(await qty('second'),1);
  await assert.rejects(mutate('atomic',2,'confirmado',orderSale('unrelated')),/does not belong/);
  await assert.rejects(mutate('rollback-order',1,'confirmado',orderSale('rollback-order')),/synthetic order refusal/);
  assert.equal(await qty('second'),1);
  assert.equal((await db.query("SELECT count(*)::int n FROM manual_sales WHERE id='sale-ord-rollback-order'")).rows[0].n,0);
  assert.equal((await db.query("SELECT status FROM customer_orders WHERE id='rollback-order'")).rows[0].status,'recebido');
  const cancelled=await mutate('atomic',2,'cancelado',mixedSale('atomic'),1);
  assert.equal(cancelled.order.delivery_info.stockDeducted,false);assert.equal(await qty('second'),2);
  await mutate('atomic',3,'cancelado',mixedSale('atomic'),2);assert.equal(await qty('second'),2);
  await db.exec("SELECT set_config('podwave.test_admin','false',false)");
  await assert.rejects(mutate('atomic',4,'cancelado',null),e=>e.code==='42501');
  await db.exec('RESET ROLE; SET ROLE anon');
  await assert.rejects(mutate('atomic',4,'cancelado',null),e=>e.code==='42501');
  await db.close();
  console.log('PASS: old accessory failure reproduced; targeted idempotent SQL patch preserves ACL/invoker, accessory revenue, variant-only stock, linked deletion guard and cancellation/restock; forged accessories rejected.');
  console.log('PASS: atomic stock, retry, stale edit, cancellation, deletion, rollback, competing requests, legacy sales, RLS, immutable audit and commitment delete. In-memory database only.');
  console.log('PASS: order + sale + stock transaction, late order rejection rollback, persistent revision, sale identity, cancellation retry, administrator/anonymous access and idempotent installation.');
})().catch(e => {console.error(e);process.exitCode=1;});
