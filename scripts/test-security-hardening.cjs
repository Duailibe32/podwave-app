const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {transformSync} = require('esbuild');
const {PGlite} = require('@electric-sql/pglite');
function compile(path, extra = {}, env = {}) {
  const module = {exports:{}};
  vm.runInNewContext(transformSync(fs.readFileSync(path,'utf8'),{loader:'ts',format:'cjs',define:{'import.meta.env':JSON.stringify(env)}}).code,
    {module,exports:module.exports,require,URL,atob,console,crypto:require('node:crypto').webcrypto,...extra});
  return module.exports;
}
(async()=>{
  const config = compile('src/utils/publicSupabaseConfig.ts');
  const jwt = role => 'header.'+Buffer.from(JSON.stringify({role})).toString('base64url')+'.signature';
  assert.equal(config.isPublicSupabaseConfig('https://example.test',jwt('anon')),true);
  assert.equal(config.isPublicSupabaseConfig('https://example.test',jwt('service_role')),false);
  assert.equal(config.isPublicSupabaseConfig('https://example.test','sb_secret_untrusted_private_key'),false);
  assert.equal(config.isPublicSupabaseConfig('http://example.test',jwt('anon')),false);
  assert.equal(config.isPublicSupabaseConfig('https://user:password@example.test',jwt('anon')),false);

  const user={id:'customer',email:'customer@example.test',user_metadata:{role:'owner'}};
  let verifiedUser=user,created=0,denied=false,emptyUpdate=false;
  let writes=[];
  const rows={customer_profiles:[{id:user.id,email:user.email,name:'Customer',phone:'',role:'customer',default_address:{loyaltyCard:{stamps:10,completedCards:99}}}],customer_orders:[{id:'old',customer_id:user.id,order_code:'REF',delivery_info:{version:1},status:'recebido'}]};
  class Query {
    constructor(table){this.table=table;this.filters=[];this.mode='read';}
    select(){return this;} limit(n){this.limitCount=n;return this;}
    eq(key,value){this.filters.push([key,value]);return this;}
    is(key,value){return this.eq(key,value);}
    update(data){this.mode='update';this.data=data;return this;}
    insert(data){this.mode='insert';this.data=data;return this;}
    upsert(data){this.mode='upsert';this.data=data;return this;}
    async maybeSingle(){const result=await this.execute();return {data:result.data?.[0]||null,error:result.error};}
    async execute(){
      if(this.mode!=='read')writes.push({table:this.table,mode:this.mode,data:this.data,filters:this.filters});
      if(denied&&this.mode!=='read')return {data:null,error:{code:'42501'}};
      const found=(rows[this.table]||[]).filter(row=>this.filters.every(([key,value])=>{
        const actual=key==='delivery_info->>version' ? (row.delivery_info?.version==null?null:String(row.delivery_info.version)):row[key];
        return actual===value;
      }));
      if(this.mode==='update')return {data:emptyUpdate?[]:found.map(row=>({id:row.id})),error:null};
      if(this.mode==='insert'||this.mode==='upsert')return {data:[{id:this.data.id}],error:null};
      return {data:this.limitCount===0?[]:found,error:null};
    }
    then(resolve,reject){return this.execute().then(resolve,reject);}
  }
  const client={auth:{getUser:async()=>({data:{user:verifiedUser},error:null}),stopAutoRefresh(){}},removeAllChannels:async()=>{},from:t=>new Query(t)};
  const store=new Map([['podwave_supabase_url','https://example.test'],['podwave_supabase_anon_key',jwt('anon')]]);
  const api=compile('src/services/supabase.ts',{
    window:{},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
    require:name=>name==='../utils/publicSupabaseConfig'?config:name==='@supabase/supabase-js'?{createClient:()=>{created++;return client;}}:require(name),
  });
  assert.equal(api.getSupabaseClient(),client); assert.equal(api.getSupabaseClient(),client);assert.equal(created,1);
  assert.equal(api.saveSupabaseCredentials('https://example.test',jwt('service_role')),false);
  assert.equal((await api.createAdminOrVipUserInSupabase({email:'new@example.test',fullName:'Test',role:'owner'})).success,false);
  const profile=await api.supabaseGetCurrentAuthUser();
  assert.equal(profile.role,'customer','client metadata is not an administrative role');
  assert.equal(profile.loyaltyCard,undefined,'address JSON is not a trusted reward source');
  verifiedUser=null;assert.equal(await api.supabaseGetCurrentAuthUser(),null);verifiedUser=user;
  rows.customer_profiles[0].default_address={};
  assert.equal(await api.upsertCustomerProfileToSupabase({...profile,role:'owner',loyaltyCard:{stamps:10},address:{street:'Rua',loyaltyCard:{stamps:10}}}),true);
  let payload=writes.at(-1).data;
  assert.ok(!('role'in payload)&&!('is_vip'in payload)&&!('vip_benefit_note'in payload));
  assert.ok(!('loyaltyCard'in payload.default_address));
  denied=true;writes=[];
  assert.equal(await api.updateCustomerLoyaltyInSupabase(user.id,{stamps:1},{stamps:0,completedCards:0}),false);
  assert.ok(writes.every(w=>!('default_address'in w.data)),'denial must not fall back to address JSON');
  assert.equal(await api.upsertManualSaleDirectToSupabase({id:'blocked'}),false);
  assert.equal((await api.syncOrderFlavorStockInSupabase([], 'deduct')).success,false);
  denied=false;writes=[];
  const record={id:'old',customerId:user.id,referenceId:'REF',version:2,status:'confirmado',items:[],subtotal:0,discount:0,total:0};
  assert.equal(await api.saveCustomerOrderToSupabase(record,user.id),true);
  assert.ok(writes[0].filters.some(([key,value])=>key==='delivery_info->>version'&&value==='1'));
  emptyUpdate=true;writes=[];
  assert.equal(await api.saveCustomerOrderToSupabase(record,user.id),false);
  assert.equal(writes.filter(w=>w.mode==='insert'||w.mode==='upsert').length,0,'conflict never becomes an INSERT');

  const db=new PGlite();
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE SCHEMA app_security;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '11111111-1111-1111-1111-111111111111'::uuid$$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT '{"email":"audit@example.test","role":"authenticated"}'::jsonb$$;
    CREATE FUNCTION app_security.is_admin() RETURNS boolean LANGUAGE sql AS $$SELECT COALESCE(current_setting('test.admin',true),'off')='on'$$;
    GRANT USAGE ON SCHEMA auth,app_security TO authenticated;`);
  const baseline=fs.readFileSync('supabase/migrations/20261030000000_definitive_security_and_rls_hardening.sql','utf8');
  for(const table of ['customer_profiles','customer_orders'])await db.exec(baseline.match(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table} \\([\\s\\S]*?\\n\\);`))[0]);
  await db.exec(`INSERT INTO customer_profiles(id,name,email,phone) VALUES(auth.uid()::text,'Audit','audit@example.test','');
    INSERT INTO customer_orders(id,order_code,customer_id,status,subtotal,total,payment_method,delivery_info) VALUES('old','REF',auth.uid()::text,'recebido',10,10,'Pix','{"version":1}');
    ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
    GRANT SELECT,INSERT,UPDATE ON customer_profiles,customer_orders TO authenticated;
    INSERT INTO customer_profiles(id,name,email,phone) VALUES('other','Other','other@example.test','');
    CREATE POLICY profile_access ON customer_profiles TO authenticated USING(true) WITH CHECK(true);
    CREATE POLICY order_access ON customer_orders TO authenticated USING(true) WITH CHECK(true);`);
  const proposal=fs.readFileSync('supabase/proposals/20261030_security_write_guards.sql','utf8');
  await db.exec(proposal);await db.exec(proposal);
  await db.exec('SET ROLE authenticated');
  assert.equal((await db.query("SELECT id FROM customer_profiles WHERE id='other'")).rows.length,0,'restrictive policy contains permissive legacy reads');
  assert.equal((await db.query("UPDATE customer_orders SET status='entregue' WHERE id='old' RETURNING id")).rows.length,0,'customer cannot update protected records');
  await assert.rejects(db.exec(`UPDATE customer_profiles SET default_address='{"loyaltyCard":{"stamps":10}}'`),/forbidden/);
  await assert.rejects(db.exec(`UPDATE customer_profiles SET role='owner'`),/protected/);
  await assert.rejects(db.exec(`UPDATE customer_profiles SET email='other@example.test'`),/identity/);
  await db.exec(`UPDATE customer_profiles SET default_address='{"street":"Rua de teste"}'`);
  await assert.rejects(db.exec(`INSERT INTO customer_orders(id,order_code,customer_id,status,subtotal,total,payment_method) VALUES('fake','FAKE',auth.uid()::text,'entregue',0,0,'Pix')`),/row-level security/);
  await db.exec(`SET test.admin='on'; UPDATE customer_orders SET delivery_info='{"version":2}' WHERE id='old'`);
  await assert.rejects(db.exec(`UPDATE customer_orders SET status='entregue' WHERE id='old'`),/Stale/);
  await assert.rejects(db.exec(`UPDATE customer_orders SET customer_id='other',delivery_info='{"version":3}' WHERE id='old'`),/immutable/);
  await db.close();
  console.log('PASS: public-key guards, shared client, verified identity, privilege-free profile writes, no address loyalty bypass, no unsafe stock writes, record CAS, RLS containment and immutable revisions. Local mocks/PGlite only.');
})().catch(error=>{console.error(error);process.exitCode=1;});
