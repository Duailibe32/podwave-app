const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {transformSync}=require('esbuild');
function compile(source,globals={}){const module={exports:{}};vm.runInNewContext(transformSync(source,{loader:'tsx',format:'cjs'}).code,{module,exports:module.exports,console,...globals});return module.exports;}
const flash=compile(fs.readFileSync('src/utils/flashSale.ts','utf8'));
const {selectProductDiscount}=compile(fs.readFileSync('src/utils/productDiscount.ts','utf8'));
const {calculateCheckoutTotals,isCouponEligibleForCart}=compile(fs.readFileSync('src/utils/checkoutTotals.ts','utf8'));
let now=Date.parse('2026-11-03T12:00:00Z');
class Clock extends Date {static now(){return now}}
const model={id:'m1',active:true,modelName:'Atual',startingPrice:109.99,flavors:[{id:'f1',demoQuantity:10,inStock:true},{id:'f2',demoQuantity:5,inStock:true}]};
const sale={enabled:true,modelId:'m1',flavorId:'f1',percent:20,startsAt:new Date(now-1000).toISOString(),endsAt:new Date(now+1000).toISOString()};
const cart=[{modelId:'m1',flavorId:'f1',quantity:2,price:109.99},{modelId:'m1',flavorId:'f2',quantity:1,price:109.99},{modelId:'addon',flavorId:'f1',quantity:1,price:20}];
assert.equal(flash.calculateFlashSaleDiscount(sale,cart,[model],now),44);
assert.equal(flash.calculateFlashSaleDiscount({...sale,flavorId:undefined},cart,[model],now),65.99);
for(const changes of [{enabled:false},{percent:0},{percent:101},{percent:NaN},{endsAt:'bad'},{modelId:'gone'},{flavorId:'gone'},{startsAt:new Date(now+500).toISOString()},{endsAt:new Date(now).toISOString()},{endsAt:new Date(now+flash.FLASH_SALE_MAX_MS).toISOString()}]) assert.equal(flash.getActiveFlashSale({...sale,...changes},[model],now),null);
for(const stock of [0,-1,null,undefined,NaN]) assert.equal(flash.getActiveFlashSale(sale,[{...model,flavors:[{...model.flavors[0],demoQuantity:stock}]}],now),null);
assert.equal(flash.getActiveFlashSale(sale,[{...model,active:false}],now),null);
assert.equal(flash.getActiveFlashSale(sale,[{...model,flavors:[{...model.flavors[0],inStock:false}]}],now),null);
assert.equal(flash.getActiveFlashSale(sale,[model],Date.parse(sale.startsAt))?.sale,sale);
assert.equal(flash.getActiveFlashSale(sale,[model],Date.parse(sale.endsAt)),null);
assert.equal(flash.formatFlashCountdown(86400000),'24:00:00');assert.equal(flash.formatFlashCountdown(1001),'00:00:02');assert.equal(flash.formatFlashCountdown(-1),'00:00:00');
assert.equal(flash.calculateFlashSaleDiscount(sale,[{...cart[0],quantity:-1}],[model],now),0);
for(const [vip,progressive,coupon,discount,expected] of [[22,11,15,44,'flash'],[60,11,15,44,'vip'],[22,70,15,44,'progressive'],[22,11,80,44,'coupon'],[0,0,44,44,'flash']]){
 const choice=selectProductDiscount({subtotal:400,vip,progressive,coupon,flash:discount});assert.equal(choice.source,expected);assert.equal([choice.vip,choice.progressive,choice.coupon,choice.flash].filter(n=>n>0).length,1);
}
const ctx=fs.readFileSync('src/context/CatalogContext.tsx','utf8').replace(/\r\n/g,'\n');
const calculation=ctx.slice(ctx.indexOf('  const progCfg = {'),ctx.indexOf('  const getCheckoutSummary'));
const summaryBody=ctx.match(/  const getCheckoutSummary = [\s\S]*?^  };/m)[0];
const env={Date:Clock,settings:{progressiveDiscountConfig:{enabled:false,flashSale:sale},vipDiscountPercent:10},DEFAULT_PROGRESSIVE_DISCOUNT_CONFIG:{enabled:false},cart:cart.slice(0,2),models:[model],cartSubtotal:329.97,rawTotal:329.97,addonsPrice:0,totalPodUnits:3,isVip:true,currentUser:{role:'vip'},appliedCoupon:null,selectProductDiscount,isCouponEligibleForCart,calculateFlashSaleDiscount:flash.calculateFlashSaleDiscount,calculateCheckoutTotals,isUsbCableAdded:false,isLanyardAdded:false,isSiliconeCoverAdded:false,usbAddonConfig:{},lanyardAddonConfig:{},siliconeAddonConfig:{}};
const state=compile(calculation+summaryBody+'\nmodule.exports={getCheckoutSummary,discountAmount,couponDiscountAmount,vipDiscountAmount};',env);
let quote=state.getCheckoutSummary(true);assert.equal(quote.discountAmount,44);assert.equal(quote.flashSaleDiscountAmount,44);assert.equal(quote.totalAmount,285.97);assert.equal(quote.vipDiscountAmount,0);
now+=2000;quote=state.getCheckoutSummary(true);assert.equal(quote.flashSaleDiscountAmount,0);assert.equal(quote.discountAmount,33);assert.equal(quote.vipDiscountAmount,33,'Fresh quote falls back to best eligible benefit without waiting for render');assert.equal(quote.totalAmount,296.97);
now-=2000;
const submit=ctx.match(/  const submitOrderViaWhatsapp = [\s\S]*?^  };/m)[0];
const warnings=[];
const send=compile(submit+'\nmodule.exports=submitOrderViaWhatsapp;',{
 ...env,discountAmount:44,getCheckoutSummary:state.getCheckoutSummary,
 fetchStockAvailability:async()=>{now+=2000;return []},cartStockError:()=>null,
 toast:{warning:(...args)=>warnings.push(args),error:()=>assert.fail('Unexpected error')},
 // Any side effect after the expiration guard would fail because it is intentionally not provided.
});
(async()=>{
 assert.equal(await send({isPickup:true}),false);assert.equal(warnings.length,1);assert.equal(warnings[0][0],'Oferta encerrada');
 warnings.length=0;assert.equal(await send({isPickup:true}),false);assert.equal(warnings[0][0],'Oferta atualizada');
 // Real admin persistence handler never announces success or updates local rules on a failed write.
 const admin=fs.readFileSync('src/components/admin/FlashSaleSettings.tsx','utf8');
 const persist=admin.match(/  const persist = [\s\S]*?^  };/m)[0];
 for(const status of ['ok','denied','exception']){
  const updates=[],feedback=[],writes=[];
  const save=compile(persist+'\nmodule.exports=persist;',{
   settings:{progressiveDiscountConfig:{baseDeliveryFee:8},complementaryAddons:[{id:'keep'}]},DEFAULT_PROGRESSIVE_DISCOUNT_CONFIG:{enabled:true},
   setBusy:()=>{},setFeedback:f=>feedback.push(f),savePromotionsConfigToSupabase:async(...args)=>{writes.push(args);if(status==='exception')throw Error('offline');return {success:status==='ok',error:'denied'}},updateSettings:(...args)=>updates.push(args),
  });
  await save(sale);assert.equal(writes.length,1);assert.equal(writes[0][0].flashSale,sale);assert.equal(writes[0][0].baseDeliveryFee,8);assert.equal(writes[0][1][0].id,'keep');assert.equal(updates.length,status==='ok'?1:0);assert.equal(feedback.at(-1).ok,status==='ok');if(status==='ok')assert.equal(updates[0][1].persistPromotions,false);
 }
 // Actual existing Supabase serializer preserves absolute timestamps and targeting in JSON.
 const service=fs.readFileSync('src/services/supabase.ts','utf8');
 const writer=service.match(/export async function savePromotionsConfigToSupabase\([\s\S]*?^\}/m)[0];
 let payload;
 const save=compile(writer,{getSupabaseClient:()=>({from:table=>{assert.equal(table,'store_settings');return {upsert:async data=>{payload=data;return {error:null}}}}})}).savePromotionsConfigToSupabase;
 assert.equal((await save({flashSale:sale},[{id:'keep'}])).success,true);assert.equal(payload.id,'promotions_config');const decoded=JSON.parse(payload.legal_notice);assert.deepEqual(decoded.progressiveDiscountConfig.flashSale,sale);assert.equal(decoded.complementaryAddons[0].id,'keep');
 const normalized=service.replace(/\r\n/g,'\n');const mapping=normalized.slice(normalized.indexOf('    const settingsRows ='),normalized.indexOf('    return {\n      data:',normalized.indexOf('    const settingsRows =')));
 const loaded=compile(mapping+'\nmodule.exports=mappedSettings;', {settingsRes:{data:[{id:'main',progressive_discount_config:{flashSale:{...sale,enabled:false}}},payload]}});
 assert.equal(loaded.progressiveDiscountConfig.flashSale.enabled,true,'Dedicated promotions row takes precedence over stale legacy columns');
 // Actual hook schedules boundary changes, not a provider-wide per-second interval.
 now=Date.parse(sale.startsAt)+1000;let cleanup,revision=0;const timers=[],listeners=new Map();
 const hook=compile(fs.readFileSync('src/hooks/useFlashSaleBoundary.ts','utf8'),{Date:Clock,
  require:name=>{assert.equal(name,'react');return {useState:()=>[revision,fn=>{revision=fn(revision)}],useEffect:fn=>{cleanup=fn()}}},
  setTimeout:(fn,delay)=>{timers.push({fn,delay});return timers.length},clearTimeout:()=>{},
  document:{visibilityState:'visible',addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)},
  window:{addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)},
 });
 hook.useFlashSaleBoundary(sale);assert.equal(timers.length,1);assert.equal(timers[0].delay,1010);
 timers[0].fn();assert.equal(revision,1);listeners.get('visibilitychange')();assert.equal(revision,2);cleanup();assert.equal(listeners.size,0);
 now=Date.parse(sale.endsAt);hook.useFlashSaleBoundary(sale);assert.equal(timers.length,1,'Expired offers must not schedule a repeating timer');cleanup();
 console.log('PASS: fixed deadline, bounds, stock/IDs, model/flavor scope, cent rounding, exclusive discounts/ties, fresh quote after expiry, expiry during stock await blocks side effects, confirmed admin save and JSON persistence. No remote requests.');
})().catch(error=>{console.error(error);process.exitCode=1});
