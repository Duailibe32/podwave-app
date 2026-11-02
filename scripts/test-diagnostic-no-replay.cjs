const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {transformSync}=require('esbuild');
const source=fs.readFileSync('src/services/supabase.ts','utf8');
const start=source.indexOf('export async function diagnoseSupabaseOrdersConnectionAndRLS(');
const fn=source.slice(start,source.indexOf("\nif (typeof window !== 'undefined')",start));
(async()=>{
 for(const mode of ['default','read-only','missing-profile','read-denied','probe','cleanup-denied']){
  const writes=[],deletes=[],repairs=[];
  const client={auth:{getSession:async()=>({data:{session:{user:{id:'synthetic-owner',email:'owner@example.test'}}},error:null})},
   from(){return {select(){return this},order(){return this},eq(){return this},delete(){deletes.push(1);this.deleting=true;return this},
    maybeSingle:async()=>({data:mode==='missing-profile'?null:{role:'owner'},error:null}),
    limit:async()=>({data:[],error:mode==='read-denied'?{code:'42501',message:'denied'}:null}),
    then(resolve){return Promise.resolve({data:mode==='cleanup-denied'?[]:[{id:writes[0]?.id}],error:null}).then(resolve)}}}};
  const mod={exports:{}};
  vm.runInNewContext(transformSync(fn,{loader:'ts',format:'cjs'}).code,{
   module:mod,exports:mod.exports,console:{group(){},groupEnd(){},log(){},warn(){},error(){},table(){}},
   getSupabaseCredentials:()=>({url:'https://synthetic.example.test',isConfigured:true}),getSupabaseClient:()=>client,
   isMissingTableError:()=>false,
   fetchAllCustomerOrdersFromSupabase:async()=>assert.fail('Diagnostics must not reconcile cache'),
   ensureCustomerProfileForOrder:async()=>{repairs.push(1);return true},
   saveCustomerOrderToSupabase:async order=>{writes.push(order);return true},getLastSupabaseOrderDiagnostic:()=>null,
  });
  const options={localOrdersToReconcile:[{id:'old',customerId:'guest-old',_syncStatus:'synced'}]};
  if(mode!=='default')options.runWriteProbe=['probe','cleanup-denied'].includes(mode);
  const report=await mod.exports.diagnoseSupabaseOrdersConnectionAndRLS(options);
  assert.equal(writes.length,options.runWriteProbe?1:0);
  assert.equal(deletes.length,options.runWriteProbe?1:0);
  assert.equal(repairs.length,0,'Read-only diagnosis must not repair a missing profile');
  assert.equal(report.reconciledLocalOrders.syncedNow,0);
  if(writes.length)assert.ok(writes[0].id.startsWith('diag-rls-probe-'));
  if(mode==='cleanup-denied'||mode==='missing-profile')assert.equal(report.overallStatus,'warning');
  else if(mode==='read-denied')assert.equal(report.overallStatus,'error');
  else if(!options.runWriteProbe)assert.match(report.summaryMessage,/Escrita não testada/);
 }
 console.log('PASS: diagnostic defaults to read-only, never replays legacy cache, does not repair profiles on read, and warns when probe cleanup is unconfirmed. Actual function, mocked services.');
})().catch(e=>{console.error(e);process.exitCode=1});
