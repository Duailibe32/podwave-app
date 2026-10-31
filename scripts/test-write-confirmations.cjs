const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {transformSync} = require('esbuild');
const sourcePath = process.argv[2] || path.resolve(__dirname, '../src/context/CatalogContext.tsx');

function extract(file, name) {
  const source = fs.readFileSync(sourcePath,'utf8');
  const match = source.match(new RegExp('^  const '+name+' = ([\\s\\S]*?\\n  });','m'));
  assert.ok(match,name);
  const arrow = match[1];
  return transformSync('module.exports=('+arrow+');',{loader:'ts',format:'cjs'}).code;
}

async function run(file,name,{configured=true,save=true,throws=false}={}) {
 const record={id:'synthetic-record',customerId:'synthetic-customer',status:'cancelado',version:1,total:10,items:[],createdAt:'2026-01-01T00:00:00Z'};
 const calls={save:0,read:0,state:0,persist:0,logs:0,release:0};
 const context={
  isAdmin:true,currentUser:{id:'synthetic-operator',fullName:'Synthetic'},
  allCatalogOrders:[record],manualSales:[],
  supabaseCreds:{isConfigured:configured},activeSupabaseClient:configured?{}:null,
  acquireOrderActionLock:()=>true,releaseOrderActionLock:()=>{calls.release++;},
  applyOrderStatusTransition:(r,i)=>({success:true,updatedOrder:{...r,status:i.toStatus,version:2}}),
  findExistingFinancialSaleForOrder:()=>null,
  buildManualSaleFromCatalogOrder:()=>({success:true,sale:{id:'synthetic-financial-record',total:10,netTotal:10,items:[]}}),
  saveSaleWithStock:async()=>({success:true,stockRevision:1}),
  setManualSales:()=>{},
  saveCustomerOrderToSupabase:async()=>{calls.save++;if(throws)throw Error('synthetic network');return save;},
  fetchAllCustomerOrdersFromSupabase:async()=>{calls.read++;return {orders:[record]};},
  setAllCatalogOrders:()=>{calls.state++;},persistLocalCatalogOrders:()=>{calls.persist++;},
  setCurrentUser:()=>{},addActivityLog:()=>{calls.logs++;},
  Date,Math,Number,Boolean,console,
  module:{exports:{}},
 };
 vm.runInNewContext(extract(file,name),context);
 let result,error;
 try { result=await context.module.exports(record.id,name==='updateCatalogOrderStatus'?'cancelado':name==='updateCatalogOrderPayment'?'pendente':{}); }
 catch(e){error=e;}
 return {result,error,calls};
}

(async()=>{
 const names=['updateCatalogOrderStatus','updateCatalogOrderPayment','recordOrderInFinancialSales'];
 for(const name of names){
  for(const configured of [true,false]){
   const patched=await run('CatalogContext.after.tsx',name,{configured,save:false});
   assert.ifError(patched.error);
   assert.equal(patched.result.success,false);
   assert.equal(patched.calls.state,0);
   assert.equal(patched.calls.persist,0);
   assert.equal(patched.calls.logs,0);
   assert.equal(patched.calls.save,configured?1:0);
   assert.equal(patched.calls.read,0,'no blind retry onto another revision');
   assert.equal(patched.calls.release,1);
  }
  const network=await run('CatalogContext.after.tsx',name,{throws:true});
  assert.ok(network.error);
  assert.equal(network.calls.state,0);
  assert.equal(network.calls.logs,0);
  assert.equal(network.calls.release,1);
  console.log('PASS: '+name+' does not falsely confirm denied, unconfigured or exceptional writes.');
 }
 const servicePath = process.argv[3] || path.resolve(__dirname, '../src/services/supabase.ts');
 const serviceSource = fs.readFileSync(servicePath,'utf8');
 const deletion = serviceSource.match(/^export async function deleteCustomerProfileFromSupabase\([\s\S]*?^}/m);
 assert.ok(deletion, 'production deletion callback');
 for(const mode of ['empty','denied','wrong-id','confirmed']) {
  const answer={data:mode==='confirmed'?[{id:'synthetic-id'}]:mode==='wrong-id'?[{id:'other-id'}]:[],error:mode==='denied'?{message:'synthetic denial'}:null};
  const query={delete(){return this;},eq(){return this;},select(){return this;},then(resolve){return Promise.resolve(answer).then(resolve);}};
  const mod={exports:{}};
  vm.runInNewContext(transformSync(deletion[0],{loader:'ts',format:'cjs'}).code,{module:mod,exports:mod.exports,getSupabaseClient:()=>({from:()=>query}),console:{warn(){}}});
  assert.equal(await mod.exports.deleteCustomerProfileFromSupabase('synthetic-id'),mode==='confirmed');
 }
 console.log('PASS: deletion requires confirmed affected ID; empty/denied/wrong-ID results do not claim deletion. Mocks only.');
 console.log('Exact callback bodies extracted at source boundaries and transpiled; mocked services only, no remote writes. Coupled transactions are outside this test.');
})().catch(e=>{console.error(e);process.exitCode=1;});

