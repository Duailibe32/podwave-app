const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {transformSync}=require('esbuild');
const sourcePath=process.argv[2] || path.resolve(__dirname,'../src/services/supabase.ts');
async function check(file,{legacy=false,existing=false,denied=false}={}){
 const source=fs.readFileSync(sourcePath,'utf8');
 const fn=source.match(/^export async function upsertCustomerProfileToSupabase\([\s\S]*?^}/m)[0];
 const writes=[],errors=[];
 const row=existing?(legacy?{id:'synthetic',name:'Old',default_address:{}}:{id:'synthetic',full_name:'Old',address_cep:''}):null;
 const flat=['id','email','full_name','phone','cpf','address_cep','address_street','address_number','address_neighborhood','address_complement','address_city','address_state','updated_at'];
 const cols=legacy?['id','email','name','phone','cpf','default_address','updated_at']:flat;
 class Q{
  select(){return this;} eq(){return this;}
  async maybeSingle(){return {data:row,error:null};}
  upsert(p){this.payload=p;return this;}
  then(resolve,reject){
   writes.push(this.payload);
   const missing=Object.keys(this.payload).find(k=>!cols.includes(k));
   const error=denied?{code:'42501',message:'synthetic denied'}:missing?{code:'PGRST204',message:'synthetic missing column '+missing}:null;
   if(error)errors.push(error);
   return Promise.resolve({data:error?null:[{id:'synthetic'}],error}).then(resolve,reject);
  }
 }
 const mod={exports:{}};
 vm.runInNewContext(transformSync(fn,{loader:'ts',format:'cjs'}).code,{module:mod,exports:mod.exports,
  getSupabaseClient:()=>({auth:{getUser:async()=>({data:{user:{id:'synthetic',email:'synthetic@example.test'}},error:null})},from:()=>new Q()}),
  recordProfileDiagnostic:()=>{},classifyPostgrestError:()=>({}),isMissingColumnError:e=>['42703','PGRST204'].includes(e.code),Date,Array,console});
 const result=await mod.exports.upsertCustomerProfileToSupabase({id:'synthetic',email:'synthetic@example.test',fullName:'Synthetic',address:{cep:'00000000'},role:'owner',vipDiscountCustom:99,loyaltyCard:{stamps:99}});
 for(const p of writes)for(const key of ['role','is_vip','vip_discount_custom','vip_benefit_note','loyaltyCard'])assert.equal(key in p,false,'ordinary profile payload must not contain '+key);
 return {result,writes,errors};
}
(async()=>{
 for(const existing of [true,false]){const r=await check('supabase.after.ts',{existing});assert.equal(r.result,true);assert.equal(r.errors.length,0);assert.equal(r.writes.length,1);assert.ok('full_name' in r.writes[0]);}
 for(const existing of [true,false]){const r=await check('supabase.after.ts',{legacy:true,existing});assert.equal(r.result,true);assert.equal(r.writes.length,existing?1:2);}
 const denied=await check('supabase.after.ts',{denied:true});assert.equal(denied.result,false);assert.equal(denied.writes.length,1);
 console.log('PASS: verified flat schema uses one valid profile request. Legacy compatibility retained; permission denial not retried; privileged fields never sent.');
 console.log('Production function bodies with mocked schema validation; no remote calls, accounts or real records.');
})().catch(e=>{console.error(e);process.exitCode=1;});

