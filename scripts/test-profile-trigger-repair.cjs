const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const repair=fs.readFileSync(process.argv[2] || path.resolve(__dirname,'../supabase/proposals/20261031_profile_guard_repair.sql'),'utf8');
(async()=>{
 const db=new PGlite();
 const ids={owner:'00000000-0000-0000-0000-000000000001',customer:'00000000-0000-0000-0000-000000000002',admin:'00000000-0000-0000-0000-000000000003',fresh:'00000000-0000-0000-0000-000000000004'};
 try{
  await db.exec(`CREATE SCHEMA auth; CREATE SCHEMA app_security;
   CREATE ROLE authenticated;
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   CREATE TABLE public.customer_profiles(id text primary key,full_name text not null,email text not null,role text not null default 'customer',vip_discount_custom numeric,vip_benefit_note text);
   CREATE TABLE app_security.test_owner_list(user_id uuid primary key);
   CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$SELECT EXISTS(SELECT 1 FROM public.customer_profiles WHERE id=auth.uid()::text AND role IN ('admin','owner'))$$;
   CREATE FUNCTION app_security.is_podwave_finance_owner() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$SELECT EXISTS(SELECT 1 FROM app_security.test_owner_list o JOIN public.customer_profiles p ON p.id=o.user_id::text WHERE o.user_id=auth.uid() AND p.role='owner')$$;
   CREATE FUNCTION app_security.podwave_guard_profile_permissions() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$BEGIN RETURN NEW; END$$;
   CREATE TRIGGER podwave_guard_profile_permissions BEFORE INSERT OR UPDATE ON public.customer_profiles FOR EACH ROW EXECUTE FUNCTION app_security.podwave_guard_profile_permissions();
   GRANT USAGE ON SCHEMA public,auth,app_security TO authenticated;
   GRANT SELECT,INSERT,UPDATE ON public.customer_profiles TO authenticated;
  `);
  for(const [role,id] of Object.entries(ids).filter(([r])=>r!=='fresh'))await db.query('INSERT INTO public.customer_profiles(id,full_name,email,role) VALUES($1,$2,$3,$4)',[id,'Synthetic',role+'@example.test',role]);
  await db.query('INSERT INTO app_security.test_owner_list VALUES($1)',[ids.owner]);
  await db.exec(repair);await db.exec(repair);
  await db.exec('SET ROLE authenticated');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)",[ids.customer]);
  await db.query('UPDATE public.customer_profiles SET full_name=$1 WHERE id=$2',['Synthetic edited',ids.customer]);
  for(const [column,value] of [['role','owner'],['vip_discount_custom',99],['vip_benefit_note','synthetic protected value'],['id',ids.fresh]]){
   await assert.rejects(db.query('UPDATE public.customer_profiles SET '+column+'=$1 WHERE id=$2',[value,ids.customer]),e=>e.code==='42501');
  }
  await assert.rejects(db.query('UPDATE public.customer_profiles SET full_name=$1 WHERE id=$2',['Tampered',ids.owner]),e=>e.code==='42501');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[ids.fresh]);
  await assert.rejects(db.query('INSERT INTO public.customer_profiles(id,full_name,email,role) VALUES($1,$2,$3,$4)',[ids.fresh,'Synthetic','fresh@example.test','owner']),e=>e.code==='42501');
  await db.query('INSERT INTO public.customer_profiles(id,full_name,email) VALUES($1,$2,$3)',[ids.fresh,'Synthetic','fresh@example.test']);
  await db.exec('RESET ROLE');
  assert.equal((await db.query('SELECT role FROM public.customer_profiles WHERE id=$1',[ids.customer])).rows[0].role,'customer');
  assert.equal((await db.query('SELECT full_name FROM public.customer_profiles WHERE id=$1',[ids.owner])).rows[0].full_name,'Synthetic');
  console.log('PASS: repair installs twice; ordinary own edits/signup succeed; role/discount/protected-field/ID tampering and cross-user edits fail, even with function owned by postgres.');
  console.log('Isolated PGlite fixture tests trigger authorization, not live RLS/JWT verification. No remote writes or real customer data.');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

