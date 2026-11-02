// Local PostgreSQL + service mocks only; never connects to Supabase.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {PGlite}=require('@electric-sql/pglite'),{transformSync}=require('esbuild');
(async()=>{
  const db=new PGlite();
  const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',admin='33333333-3333-4333-8333-333333333333';
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
    GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
    CREATE TABLE customer_profiles(id text PRIMARY KEY,email text,full_name text,phone text,role text DEFAULT 'customer',updated_at timestamptz);
    CREATE TABLE customer_orders(id text PRIMARY KEY,customer_id text REFERENCES customer_profiles(id),status text,created_at timestamptz DEFAULT now(),delivery_info jsonb DEFAULT '{}');`);
  for(const id of [a,b,admin])await db.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[id,id+'@test']);
  await db.query("INSERT INTO customer_profiles(id,email,role) VALUES($1,'admin@test','owner')",[admin]);
  const full=fs.readFileSync('supabase/proposals/20261102_fix_cross_device_orders_and_profiles.sql','utf8');
  const repair=fs.readFileSync('supabase/proposals/20261102_order_access_and_cleanup_hardening.sql','utf8');
  await db.exec(full); await db.exec(full); await db.exec(repair); await db.exec(repair);
  await db.exec(`GRANT SELECT,INSERT,UPDATE,DELETE ON customer_profiles,customer_orders TO authenticated;
    CREATE POLICY legacy_profile_access ON customer_profiles TO authenticated USING(true) WITH CHECK(true);
    CREATE POLICY legacy_order_access ON customer_orders TO authenticated USING(true) WITH CHECK(true);`);
  const identity=async id=>{await db.exec('RESET ROLE; SET ROLE authenticated');await db.query("SELECT set_config('test.uid',$1,false)",[id]);};
  await identity(a);
  await db.query("INSERT INTO customer_orders(id,customer_id,status) VALUES('own',$1,'recebido')",[a]);
  assert.equal((await db.query('SELECT count(*)::int n FROM customer_profiles')).rows[0].n,1);
  await assert.rejects(db.query("UPDATE customer_profiles SET role='owner' WHERE id=$1",[a]),e=>e.code==='42501');
  await assert.rejects(db.query("INSERT INTO customer_orders(id,customer_id,status) VALUES('fake',$1,'entregue')",[a]),e=>e.code==='42501');
  assert.equal((await db.query("UPDATE customer_orders SET status='entregue' WHERE id='own' RETURNING id")).rows.length,0);
  assert.equal((await db.query("DELETE FROM customer_orders WHERE id='own' RETURNING id")).rows.length,0);
  await db.query("INSERT INTO customer_orders(id,customer_id,status) VALUES('diag-rls-probe-test',$1,'recebido')",[a]);
  assert.equal((await db.query("DELETE FROM customer_orders WHERE id='diag-rls-probe-test' RETURNING id")).rows.length,1);
  await assert.rejects(db.query('SELECT cleanup_cancelled_orders(0)'),e=>e.code==='42501');
  await identity(b);assert.equal((await db.query('SELECT count(*)::int n FROM orders')).rows[0].n,0);
  await db.exec('RESET ROLE; SET ROLE anon');
  await assert.rejects(db.query('SELECT cleanup_cancelled_orders(0)'),e=>e.code==='42501');
  await identity(admin);
  assert.equal((await db.query("UPDATE customer_orders SET status='confirmado' WHERE id='own' RETURNING id")).rows.length,1);
  await db.query("INSERT INTO customer_orders(id,customer_id,status) VALUES('old',$1,'cancelado'),('recancelled',$1,'cancelado')",[b]);
  await db.exec(`UPDATE customer_orders SET created_at=now()-interval '3 days',delivery_info=jsonb_build_object('statusHistory',jsonb_build_array(
    jsonb_build_object('toStatus','cancelado','changedAt',(now()-interval '3 days')::text))) WHERE id='old';
    UPDATE customer_orders SET created_at=now()-interval '3 days',delivery_info=jsonb_build_object('statusHistory',jsonb_build_array(
    jsonb_build_object('toStatus','cancelado','changedAt',now()::text),
    jsonb_build_object('toStatus','cancelado','changedAt',(now()-interval '3 days')::text))) WHERE id='recancelled';`);
  assert.equal((await db.query('SELECT cleanup_cancelled_orders(24) n')).rows[0].n,1);
  assert.equal((await db.query("SELECT count(*)::int n FROM customer_orders WHERE id='recancelled'")).rows[0].n,1);
  assert.equal((await db.query('SELECT cleanup_cancelled_orders(0) n')).rows[0].n,1);
  await assert.rejects(db.query('SELECT cleanup_cancelled_orders(-1)'),e=>e.code==='22023');
  await db.close();
  let source=fs.readFileSync('src/services/supabase.ts','utf8').replace(/\r\n/g,'\n').replace(/export function getSupabaseClient\(\): SupabaseClient \| null \{[\s\S]*?\n\}/,'export function getSupabaseClient(){return globalThis.__client;}');
  function api(client){const module={exports:{}};vm.runInNewContext(transformSync(source,{loader:'ts',format:'cjs',define:{'import.meta.env':'{}'}}).code,{module,exports:module.exports,crypto:require('node:crypto').webcrypto,console,require:n=>n==='../utils/publicSupabaseConfig'?{}:require(n),__client:client});return module.exports;}
  const sale={id:'sale',stockManaged:true,items:[{flavorId:'f',quantity:2}]};
  for(const code of ['23514','42501','PGRST202','42883']){
    const service=api({rpc:async()=>({data:null,error:{code,message:'denied'}}),from(){throw Error('Unsafe direct write attempted');}});
    assert.equal((await service.saveSaleWithStock(sale)).success,false);
  }
  assert.equal((await api({rpc:async()=>({data:null,error:null}),from(){throw Error('Unsafe fallback');}}).saveSaleWithStock(sale)).success,false);
  let rpcCalls=0;
  const service=api({from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})}),rpc:async()=>{rpcCalls++;}});
  assert.equal(await service.deleteManualSaleFromSupabase('cache-only'),true);assert.equal(rpcCalls,0);
  const history=[{toStatus:'cancelado',changedAt:'2026-11-02T10:00:00Z'},{toStatus:'confirmado',changedAt:'2026-11-01T10:00:00Z'},{toStatus:'cancelado',changedAt:'2026-10-30T10:00:00Z'}];
  assert.equal(service.getCancelledOrderTimestampMs({statusHistory:history}),Date.parse('2026-11-02T10:00:00Z'));
  const candidate={id:'order',version:2,status:'confirmado',customerId:a,referenceId:'REF',createdAt:'2026-11-02T10:00:00Z',items:[],total:10};
  for(const mode of ['denied','empty','stale-response','confirmed']){
    const atomic=api({rpc:async(name,args)=>{
      assert.equal(name,'save_order_with_sale');assert.equal(args.p_expected_version,1);
      return {error:mode==='denied'?{code:'42501',message:'denied'}:null,data:mode==='empty'?null:{
        order:{id:'order',status:'confirmado',stock_deducted:false,
          delivery_info:{version:mode==='stale-response'?1:2,stockDeducted:true}},
      }};
    },from(){throw Error('Transactional order mutation must not perform direct writes');}});
    const result=await atomic.saveCatalogOrderMutation(candidate);
    assert.equal(result.success,mode==='confirmed');
    if(result.success)assert.equal(result.updatedOrder.stockDeducted,true,'use committed allocation, not stale flat column');
  }
  console.log('PASS: administrator-only cleanup, restrictive legacy-policy containment, self-promotion denial, initial order status, own diagnostic deletion, latest cancellation, retention, idempotent installation, fail-closed sale RPC and cache-only deletion. Local mocks/PGlite only.');
})().catch(e=>{console.error(e);process.exitCode=1});
