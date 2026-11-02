const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {transformSync}=require('esbuild');
function compile(source,globals={},name){
 const module={exports:{}};
 vm.runInNewContext(transformSync(source+(name?'\nmodule.exports='+name:''),{loader:'tsx',format:'cjs'}).code,{module,exports:module.exports,...globals});
 return module.exports;
}
const storage=new Map();
const localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
const sync=compile(fs.readFileSync('src/utils/orderSync.ts','utf8'),{localStorage});
const draft={id:'new',referenceId:'NEW',customerId:'me',createdAt:'2026-11-02T12:00:00Z',status:'recebido',version:1,paymentStatus:'pendente',amountPaid:0,_syncStatus:'pending_sync',items:[]};
const ghosts=Array.from({length:5},(_,i)=>({...draft,id:'ghost-'+i,referenceId:'OLD-'+i,_syncStatus:undefined}));
assert.equal(sync.reconcileOrderSnapshot([],ghosts,'me').length,0,'Five legacy ghosts must not remain pending');
assert.equal(sync.reconcileOrderSnapshot([],[...ghosts,draft],'me').length,1,'A genuinely unsent checkout must survive');
assert.equal(sync.reconcileOrderSnapshot([],[{...draft,customerId:'other'}],'me').length,0);
assert.equal(sync.reconcileOrderSnapshot([],[{...draft,customerId:'guest-123'}],'me').length,0);
for(const changes of [{version:2},{status:'cancelado'},{paymentStatus:'pago'},{amountPaid:1},{financialSaleId:'sale'},{stockDeducted:true},{loyaltyStampGranted:true}]) {
 assert.equal(sync.isPendingOrderDraft({...draft,...changes},'me'),false);
}
const remote={...draft,version:2,status:'confirmado',_syncStatus:undefined};
const snapshot=sync.reconcileOrderSnapshot([remote],[{...draft,version:9,_syncStatus:'synced'}],'me');
assert.equal(snapshot[0].version,2,'Server owns state even when browser version is higher');
assert.equal(snapshot[0]._syncStatus,'synced');
sync.archiveUnconfirmedOrderCache(ghosts,[]);
assert.equal(JSON.parse(storage.get('podwave_order_cache_review_v1')).length,5,'Excluded cache remains available for review');
const service=fs.readFileSync('src/services/supabase.ts','utf8');
const reader=service.match(/^export async function fetchCustomerOrdersFromSupabase\([\s\S]*?^}/m)[0];
const mapRow=service.match(/^export function mapSupabaseRowToCustomerOrder\([\s\S]*?^}/m)[0];
async function readHistory(primary,fallback){
 const calls=[],filters=[];
 const client={from(table){calls.push(table);return {select(){return this},eq(key,value){filters.push([key,value]);return this},order(){return this},async limit(){return table==='customer_orders'?primary:fallback}}}};
 const read=compile(mapRow+'\n'+reader,{
  getSupabaseClient:()=>client,customerOrdersSupportedColumnsCache:null,
  isMissingTableError:error=>error?.code==='PGRST205',
 },'fetchCustomerOrdersFromSupabase');
 const result=await read('me','same@example.test','99999999');
 return {result,calls,filters};
}
(async()=>{
 let read=await readHistory({data:[],error:null});assert.equal(read.result.length,0);assert.deepEqual(read.calls,['customer_orders']);
 assert.deepEqual(read.filters,[['customer_id','me']]);
 read=await readHistory({data:null,error:{code:'42501'}});assert.equal(read.result,null);assert.equal(read.calls.length,1);
 read=await readHistory({data:null,error:{code:'PGRST205'}},{data:[],error:null});assert.equal(read.result.length,0);assert.equal(read.calls.length,2);
 read=await readHistory({data:[{id:'foreign',customer_id:'other',customer_email:'same@example.test'}],error:null});assert.equal(read.result.length,0);
 const profile=fs.readFileSync('src/components/auth/CustomerProfileModal.tsx','utf8');
 const body=profile.match(/const loadAuthenticatedOrders = React.useCallback\(async \(\) => \{([\s\S]*?)\n  }, \[/)[1];
 for(const response of [null,[],[remote]]){
  const shown=[],errors=[];
  const load=compile('async function load(){'+body+'\n}',{
   currentUser:{id:'me',email:'qa@example.test'},activeOrdersReqRef:{current:0},
   setIsLoadingCustomerOrders:()=>{},setCustomerOrdersError:error=>errors.push(error),
   getLocalMatchingOrders:()=>ghosts,fetchCustomerOrdersFromSupabase:async()=>response,
   reconcileOrderSnapshot:sync.reconcileOrderSnapshot,setRemoteOrders:rows=>shown.push(rows),
   saveCustomerOrderToSupabase:()=>assert.fail('Opening history must never insert an order'),
  },'load');
  await load();
  if(response===null){assert.equal(shown.length,0);assert.ok(errors.at(-1));}
  else assert.equal(shown[0].length,response.length);
 }
 const retrySource=profile.match(/  const retryPendingOrder = async \([\s\S]*?^  };/m)[0];
 for(const scenario of ['saved','denied','legacy']) {
  const writes=[],marked=[],errors=[];
  const retry=compile(retrySource,{
   currentUser:{id:'me'},retryingOrderId:null,setRetryingOrderId:()=>{},
   isPendingOrderDraft:sync.isPendingOrderDraft,
   saveCustomerOrderToSupabase:async order=>{writes.push(order);return scenario==='saved'},
   markOrderCacheSynced:id=>marked.push(id),setRemoteOrders:fn=>fn([]),
   reconcileOrderSnapshot:sync.reconcileOrderSnapshot,loadAuthenticatedOrders:async()=>{},
   setCustomerOrdersError:error=>errors.push(error),getLastSupabaseOrderDiagnostic:()=>({message:'Denied'}),
  },'retryPendingOrder');
  await retry(scenario==='legacy'?ghosts[0]:draft);
  assert.equal(writes.length,scenario==='legacy'?0:1);
  assert.equal(marked.length,scenario==='saved'?1:0);
  assert.equal(errors.length,scenario==='denied'?1:0);
 }
 const context=fs.readFileSync('src/context/CatalogContext.tsx','utf8');
 const adminBody=context.match(/const fetchAllCatalogOrders = React.useCallback\(async \(\) => \{([\s\S]*?)\n  }, \[isAdmin/)[1];
 const listed=[],persisted=[];
 const admin=compile('async function load(){'+adminBody+'\n}',{
  authenticatedIdentityRef:{current:{id:'me',role:'owner'}},getSupabaseCredentials:()=>({url:'test'}),getDeletedOrderIds:()=>new Set(),
  isAdmin:true,allUsers:[{id:'me'}],setIsLoadingCatalogOrders:()=>{},setCatalogOrdersError:()=>{},
  fetchAllCustomerOrdersFromSupabase:async()=>({orders:[]}),loadSharedCatalogOrders:()=>ghosts,
  reconcileOrderSnapshot:sync.reconcileOrderSnapshot,archiveUnconfirmedOrderCache:sync.archiveUnconfirmedOrderCache,
  enrichOrderWithProfile:order=>order,setAllCatalogOrders:rows=>listed.push(rows),persistSharedCatalogOrders:rows=>persisted.push(rows),
  saveCustomerOrderToSupabase:()=>assert.fail('Admin reads must not recreate orders'),cleanupExpiredCancelledOrdersInSupabase:()=>assert.fail('Admin reads must not delete orders'),
 },'load');
 await admin();assert.equal(listed[0].length,0);assert.equal(persisted[0].length,0);
 console.log('PASS: five ghost cache records excluded and preserved for review; pending drafts retained; UUID ownership; authoritative empty history; failed-read preservation; legacy fallback only on missing table; customer/admin read handlers never insert or clean up. Local mocks only.');
})().catch(e=>{console.error(e);process.exitCode=1});
