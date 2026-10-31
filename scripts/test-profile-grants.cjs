const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const sql=fs.readFileSync(process.argv[2] || path.resolve(__dirname,'../supabase/proposals/20261031_customer_profiles_least_privilege.sql'),'utf8');
async function fixture(){
 const db=new PGlite();
 await db.exec(`CREATE ROLE authenticated;
 CREATE TABLE public.customer_profiles(id text primary key,full_name text not null);
 INSERT INTO public.customer_profiles VALUES('synthetic-a','A'),('synthetic-b','B');
 ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
 CREATE POLICY own_read ON public.customer_profiles FOR SELECT TO authenticated USING(id=current_setting('test.uid',true));
 CREATE POLICY own_insert ON public.customer_profiles FOR INSERT TO authenticated WITH CHECK(id=current_setting('test.uid',true));
 CREATE POLICY own_update ON public.customer_profiles FOR UPDATE TO authenticated USING(id=current_setting('test.uid',true)) WITH CHECK(id=current_setting('test.uid',true));
 GRANT USAGE ON SCHEMA public TO authenticated;
 GRANT ALL PRIVILEGES ON public.customer_profiles TO authenticated;`);
 return db;
}
(async()=>{
 const db=await fixture();
 try{
  await db.exec(sql);await db.exec(sql);
  for(const p of ['SELECT','INSERT','UPDATE'])assert.equal((await db.query("SELECT has_table_privilege('authenticated','public.customer_profiles',$1) AS allowed",[p])).rows[0].allowed,true);
  for(const p of ['DELETE','TRUNCATE','TRIGGER','REFERENCES'])assert.equal((await db.query("SELECT has_table_privilege('authenticated','public.customer_profiles',$1) AS allowed",[p])).rows[0].allowed,false);
  assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.customer_profiles'::regclass")).rows[0].relrowsecurity,true);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='public' AND tablename='customer_profiles'")).rows[0].n,3);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.customer_profiles')).rows[0].n,2);
  await db.exec("SET ROLE authenticated; SET test.uid='synthetic-a';");
  assert.equal((await db.query('SELECT id FROM public.customer_profiles')).rows.length,1);
  assert.equal((await db.query("UPDATE public.customer_profiles SET full_name='Synthetic edited' WHERE id='synthetic-a' RETURNING id")).rows.length,1);
  assert.equal((await db.query("UPDATE public.customer_profiles SET full_name='Unauthorized' WHERE id='synthetic-b' RETURNING id")).rows.length,0);
  await assert.rejects(db.query("DELETE FROM public.customer_profiles WHERE id='synthetic-a'"),e=>e.code==='42501');
  await db.exec("SET test.uid='synthetic-c';");
  await db.query("INSERT INTO public.customer_profiles VALUES('synthetic-c','C')");
  console.log('PASS: idempotent grants reduction; RLS/policies/data preserved; own read/write allowed, cross-user update hidden, DELETE denied.');
 }finally{await db.close();}
 for(const mode of ['inherited','missing-essential']){
  const check=await fixture();
  try{
   await check.exec(mode==='inherited'?'GRANT DELETE ON public.customer_profiles TO PUBLIC':'REVOKE UPDATE ON public.customer_profiles FROM authenticated');
   await assert.rejects(check.exec(sql),e=>e.code==='P0001'&&e.message.includes(mode==='inherited'?'herdado':'essenciais'));
   await check.exec('ROLLBACK');
   assert.equal((await check.query("SELECT has_table_privilege('authenticated','public.customer_profiles','DELETE') AS allowed")).rows[0].allowed,true);
   if(mode==='missing-essential')assert.equal((await check.query("SELECT has_table_privilege('authenticated','public.customer_profiles','UPDATE') AS allowed")).rows[0].allowed,false);
   console.log('PASS: '+mode+' fails closed without changing the original grants.');
  }finally{await check.close();}
 }
 console.log('Disposable PGlite fixtures only. No Supabase calls or production deletions.');
})().catch(e=>{console.error(e);process.exitCode=1;});

