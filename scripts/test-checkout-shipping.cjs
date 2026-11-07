const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {transformSync}=require('esbuild');
function compile(source,globals={}) {
 const module={exports:{}};
 vm.runInNewContext(transformSync(source,{loader:'tsx',format:'cjs'}).code,{module,exports:module.exports,console,...globals});
 return module.exports;
}
const totals=compile(fs.readFileSync('src/utils/checkoutTotals.ts','utf8'));
const pricing=compile(fs.readFileSync('src/utils/pricing.ts','utf8'));
const formatter=compile(fs.readFileSync('src/utils/recordFormatter.ts','utf8'),{require:id=>{
 if(id==='./pricing')return pricing;throw Error('Unexpected import '+id);
}});
const config={enabled:true,tier2MinUnits:2,tier2FreeShipping:true,baseDeliveryFee:10};
for(const [changes,fee,total] of [
 [{totalPodUnits:1},10,116],
 [{totalPodUnits:2},0,106],
 [{totalPodUnits:3},0,106],
 [{isPickup:true,totalPodUnits:1},0,106],
 [{config:{...config,enabled:false},totalPodUnits:2},10,116],
 [{config:{...config,tier2FreeShipping:false},totalPodUnits:2},10,116],
 [{config:{...config,baseDeliveryFee:undefined,tier2FreeShipping:false}},0,106],
 [{config:{...config,baseDeliveryFee:-10,tier2FreeShipping:false}},0,106],
 [{config:{...config,baseDeliveryFee:Infinity,tier2FreeShipping:false}},0,106],
]){
 const result=totals.calculateCheckoutTotals({itemsSubtotal:100,addonAmount:16,discountAmount:10,totalPodUnits:1,isPickup:false,config,...changes});
 assert.equal(result.deliveryFee,fee);assert.equal(result.totalAmount,total);
}
const capped=totals.calculateCheckoutTotals({itemsSubtotal:0.1,addonAmount:0.2,discountAmount:100,totalPodUnits:1,isPickup:false,config});
assert.equal(capped.discountAmount,0.3);assert.equal(capped.totalAmount,10,'Discounts must not absorb shipping');
const distanceConfig={...config,tier2FreeShipping:false,deliveryPricingMode:'per_km',deliveryRatePerKm:2,deliveryMinimumFee:8,
 deliveryOrigins:[{id:'codo',city:'Codó',state:'MA'},{id:'bernardo',city:'São Bernardo',state:'MA'}],
 deliveryCities:[
  {id:'a',originId:'codo',city:'Vizinha',state:'MA',distanceKm:12},
  {id:'b',originId:'bernardo',city:'Vizinha',state:'MA',distanceKm:40},
  {id:'c',originId:'bernardo',city:'São Bernardo',state:'MA',distanceKm:0},
  {id:'d',originId:'codo',city:'São Bernardo',state:'MA',distanceKm:150},
 ]};
const distanceQuote=(changes={})=>totals.calculateCheckoutTotals({itemsSubtotal:100,addonAmount:0,discountAmount:0,
 totalPodUnits:1,isPickup:false,config:distanceConfig,destinationCity:'Vizinha - MA',...changes});
assert.equal(distanceQuote().deliveryFee,24);assert.equal(distanceQuote().deliveryOriginCity,'Codó - MA');
assert.equal(distanceQuote().deliveryDistanceKm,12);
const local=distanceQuote({destinationCity:'sao bernardo - ma'});
assert.equal(local.deliveryFee,8);assert.equal(local.deliveryOriginCity,'São Bernardo - MA');
assert.equal(distanceQuote({isPickup:true}).deliveryFee,0);
assert.equal(distanceQuote({destinationCity:'Vizinha - PI'}).shippingNeedsQuote,true,'Same city name in another state must not match');
assert.equal(distanceQuote({destinationCity:''}).shippingNeedsQuote,true);
assert.equal(distanceQuote({config:{...distanceConfig,deliveryRatePerKm:0}}).shippingNeedsQuote,true);
assert.equal(distanceQuote({config:{...distanceConfig,tier2FreeShipping:true},totalPodUnits:2}).deliveryFee,0);
const unknown=distanceQuote({config:{...distanceConfig,tier2FreeShipping:true},totalPodUnits:10,destinationCity:'Sem cadastro - MA'});
assert.equal(unknown.shippingNeedsQuote,true);assert.equal(unknown.freeShippingApplied,false);
const freeCoupon={id:'free',code:'ENTREGAGRATIS',discountType:'free_shipping',value:0,active:true,usedCount:0};
for(const [coupon,expected] of [
 [freeCoupon,0],[{...freeCoupon,active:false},24],[{...freeCoupon,maxUses:1,usedCount:1},24],
 [{...freeCoupon,minOrderValue:101},24],[{...freeCoupon,applicableModelId:'another'},24],
]){
 const q=distanceQuote({coupon,cart:[{modelId:'model'}]});
 assert.equal(q.deliveryFee,expected);assert.equal(q.discountAmount,0,'Free shipping never discounts products');
 if(expected===0)assert.equal(q.freeShippingSource,'coupon');
}
assert.equal(distanceQuote({coupon:freeCoupon,destinationCity:'Fora da cobertura - MA'}).shippingNeedsQuote,true);
assert.equal(distanceQuote({coupon:freeCoupon,isPickup:true}).freeShippingSource,undefined);
assert.equal(pricing.calculateOrderFinancials({cart:[],isUsbCableAdded:false,cablePrice:0,appliedCoupon:{...freeCoupon,value:999},isPickup:false,deliveryFee:10}).discountAmount,0);
const ctx=fs.readFileSync('src/context/CatalogContext.tsx','utf8');
const summaryBody=ctx.match(/  const getCheckoutSummary = [\s\S]*?^  };/m)[0];
const cart=[{id:'pod',modelId:'model',brandName:'QA',modelName:'Model',flavorId:'flavor',flavorName:'QA',flavorEmoji:'🧊',price:100,quantity:2}];
const addons=[{id:'addon-usbc-turbo',name:'USB',price:16},{id:'addon-lanyard',name:'Cordão',price:12},{id:'addon-silicone-cover',name:'Chaveiro',price:35}];
const getSummary=compile(summaryBody+'\nmodule.exports=getCheckoutSummary;',{
 cart,cartSubtotal:200,addonsPrice:63,discountAmount:20,totalPodUnits:2,progCfg:config,appliedCoupon:null,
 calculateCheckoutTotals:totals.calculateCheckoutTotals,
 getProductDiscountChoice:()=>({total:20,vip:0,coupon:0,flash:0}),
 isUsbCableAdded:true,isLanyardAdded:true,isSiliconeCoverAdded:true,
 usbAddonConfig:addons[0],lanyardAddonConfig:addons[1],siliconeAddonConfig:addons[2],
});
const summary=getSummary(false);
assert.equal(summary.totalAmount,243);assert.equal(summary.items.length,4);
const form={fullName:'QA',phoneWhatsapp:'99999999999',isPickup:false,paymentMethod:'Pix',address:'QA',notes:''};
const message=formatter.formatAttendanceRecord({referenceId:'QA',dateTimeBrasilia:{date:'01/01/2026',time:'12:00'},form,
 cart:summary.items,isUsbCableAdded:false,cablePrice:16,appliedCoupon:null,financials:summary});
assert.match(message,/Grátis \(Promoção\)/);
assert.ok(message.includes(pricing.formatCurrency(summary.totalAmount)));
for(const addon of addons)assert.ok(message.includes(addon.name),'Every selected accessory must be present');
assert.equal((message.match(/Cabo USB Tipo C Turbo 1m/g)||[]).length,0,'No duplicate legacy cable');
const admin=fs.readFileSync('src/components/admin/CombosAndAddonsTab.tsx','utf8');
(async()=>{
 const submitHandler=ctx.match(/  const submitOrderViaWhatsapp = [\s\S]*?^  };/m)[0];
 const placed = [], shared = [], errors = [], tickets = [];
 let quote = {...unknown, discountAmount:summary.discountAmount}, resolveOrder, clearCount = 0, blockWhatsapp = false;
 const send = compile(submitHandler+'\nmodule.exports=submitOrderViaWhatsapp;', {
   cart, currentUser:{id:'client'}, submittingOrderRef:{current:false}, checkoutAttemptRef:{current:null},
   authenticatedIdentityRef:{current:{id:'client'}}, setIsSubmittingOrder:()=>{},
   settings:{}, models:[], cablePrice:16, appliedCoupon:null, isVip:false, vipDiscountAmount:0,
   couponDiscountAmount:0, cartSubtotal:200, isCouponEligibleForCart:totals.isCouponEligibleForCart, cartStockError:()=>null,
   discountAmount:summary.discountAmount, getCheckoutSummary:()=>quote,
   crypto:{randomUUID:()=>String(placed.length)}, generateReferenceId:()=> 'PW-QA', getBrasiliaDateTime:()=>({}),
   formatAttendanceRecord:()=> 'message', openWhatsAppShare:(...args)=>{
     if (blockWhatsapp) throw Error('Bloqueio de popup simulado');
     shared.push(args);
   }, setIsCheckoutOpen:()=>{},
   openOrderTicket:order=>tickets.push(order), openAuthModal:()=>assert.fail('Authenticated flow must not prompt for login'), clearCart:()=>clearCount++, getLastSupabaseOrderDiagnostic:()=>null,
   recordCustomerOrder: row => { placed.push(row); return new Promise(resolve=>{resolveOrder=resolve;}); },
   toast:{warning:()=>{}, error:(...args)=>errors.push(args), success:()=>{}},
 });
 assert.equal(await send(form), false);
 assert.equal(errors[0][0], 'Frete a combinar');
 assert.equal(placed.length, 0);
 quote = summary;
 const first = send(form);
 assert.equal(await send(form), false, 'A simultaneous tap does not start another save');
 assert.equal(placed.length, 1);
 resolveOrder(null);
 assert.equal(await first, false);
 assert.equal(shared.length, 0);
 assert.equal(tickets.length, 0);
 assert.equal(clearCount, 0);
 const retry = send(form);
 assert.equal(placed[0].id, placed[1].id, 'Retry uses the same id');
 resolveOrder({id:placed[1].id});
 assert.equal(await retry, true);
 assert.equal(clearCount, 1);
 assert.equal(shared.length, 1);
 assert.equal(tickets[0].id, placed[1].id);
 const persisted = placed[0];
 assert.equal(persisted.deliveryFee, summary.deliveryFee);
 assert.equal(persisted.total, summary.totalAmount);
 assert.equal(persisted.subtotal, 263);
 assert.equal(persisted.discount, 20);
 blockWhatsapp = true;
 const confirmedWithoutWhatsApp = send(form);
 resolveOrder({id:placed.at(-1).id});
 assert.equal(await confirmedWithoutWhatsApp,true,'Popup failure cannot undo a confirmed order');
 assert.equal(tickets.at(-1).id,placed.at(-1).id);
 assert.equal(clearCount,2);
 assert.equal(shared.length,1);
 const ticket = compile(fs.readFileSync('src/utils/orderTicket.ts','utf8'),{require:name=>{
   assert.equal(name,'./pricing');
   return pricing;
 }});
 const ticketOrder = {referenceId:'PW-QA',id:'id',customerId:'client',createdAt:'2026-11-07T13:54:00Z',
   items:summary.items,deliveryType:'delivery',addressSummary:'Rua QA - Vizinha - MA',destinationCity:'Vizinha - MA',
   paymentMethod:'Pix',total:243,discount:20,status:'recebido',version:1};
 assert.match(ticket.ticketDelivery(ticketOrder).title,/10 a 20/);
 assert.match(ticket.ticketDelivery(ticketOrder,distanceConfig).detail,/Prazo a confirmar/);
 assert.equal(ticket.ticketDelivery({...ticketOrder,deliveryType:'pickup'},distanceConfig).title,'Retirada no local');
 assert.ok(!ticket.ticketSummary(ticketOrder).includes('Rua QA'));
 assert.ok(ticket.ticketSummary(ticketOrder,true).includes('Rua QA'));
 assert.equal(ticket.newestTicketOrder(ticketOrder,{...ticketOrder,version:2,status:'enviado'}).status,'enviado');
 assert.equal(ticket.newestTicketOrder(ticketOrder,{...ticketOrder,customerId:'other',version:2,status:'enviado'}).status,'recebido');
 // Execute the actual save handler: one confirmed DB write before applying local settings.
 const handler=admin.match(/  const handleSaveAll = [\s\S]*?^  };/m)[0];
 for(const success of [true,false]){
  const writes=[],updates=[],logs=[];
  const fn=compile(handler+'\nmodule.exports=handleSaveAll;',{
   settings:{}, progForm:{...config,tier2DiscountPercent:0,tier3DiscountPercent:0,baseDeliveryFee:7.55},addonsForm:[],models:[],
   setIsSavingSupabase:()=>{},setSavedBanner:()=>{},onNotify:()=>{},setTimeout:()=>{},
   savePromotionsConfigToSupabase:async rule=>{writes.push(rule);return {success,error:'denied'}},
   updateSettings:(...args)=>updates.push(args),addActivityLog:()=>logs.push(1),logSupabaseAuditEvent:async()=>{},
  });
  await fn({preventDefault(){}});
  assert.equal(writes.length,1);assert.equal(writes[0].tier2FreeShipping,true);assert.equal(writes[0].baseDeliveryFee,7.55);
  assert.equal(updates.length,success?1:0);assert.equal(logs.length,success?1:0);
  if(success)assert.equal(updates[0][1].persistPromotions,false);
 }
 // Actual coupon creation/edit handler always saves shipping coupons with monetary value zero.
 const panel=fs.readFileSync('src/components/admin/AdminPanel.tsx','utf8');
 const couponHandler=panel.match(/  const handleSaveCoupon = [\s\S]*?^  };/m)[0];
 for(const editingCoupon of [null,{id:'free'}]){
  const writes=[];
  const fn=compile(couponHandler+'\nmodule.exports=handleSaveCoupon;',{
   couponForm:{...freeCoupon,value:999,description:'QA'},editingCoupon,models:[],
   updateCoupon:(id,coupon)=>writes.push(coupon),addCoupon:coupon=>writes.push(coupon),showToast:()=>{},setIsCouponModalOpen:()=>{},
  });
  fn({preventDefault(){}});assert.equal(writes.length,1);assert.equal(writes[0].value,0);
 }
 const {PGlite}=require('@electric-sql/pglite');const db=new PGlite();
 await db.exec("CREATE TABLE coupons(id text PRIMARY KEY,code text UNIQUE,discount_type text CONSTRAINT coupons_discount_type_check CHECK(discount_type IN ('percent','fixed')),value numeric);INSERT INTO coupons VALUES('old','OLD','percent',10);");
 const schemaPatch=fs.readFileSync('supabase/proposals/20261102_free_shipping_coupons.sql','utf8');
 await db.exec(schemaPatch);await db.exec(schemaPatch);
 await db.exec("INSERT INTO coupons VALUES('free','FREE','free_shipping',0)");
 await assert.rejects(db.exec("INSERT INTO coupons VALUES('bad','BAD','free_shipping',1)"),e=>e.code==='23514');
 await assert.rejects(db.exec("INSERT INTO coupons VALUES('unknown','UNKNOWN','unknown',0)"),e=>e.code==='23514');
 assert.equal((await db.query("SELECT value FROM coupons WHERE id='old'")).rows[0].value,'10');
 await db.close();
 const normalize=ctx.match(/  const normalizeLoadedPromotionsInSettings = [\s\S]*?^  };/m)[0];
 const read=compile(normalize+'\nmodule.exports=normalizeLoadedPromotionsInSettings;',{
  DEFAULT_COMPLEMENTARY_ADDONS:[],DEFAULT_PROGRESSIVE_DISCOUNT_CONFIG:{},
 });
 const reloaded=read({progressiveDiscountConfig:{...distanceConfig,tier2FreeShipping:true,tier2Label:'Frete Grátis ✓'}});
 assert.equal(reloaded.progressiveDiscountConfig.tier2FreeShipping,true,'Legacy labels must not disable saved shipping');
 assert.equal(reloaded.progressiveDiscountConfig.deliveryCities.length,4);
 assert.equal(reloaded.progressiveDiscountConfig.deliveryOrigins.length,2);
 console.log('PASS: promotional shipping, paid delivery, pickup, disabled promotion, cents, discounts, accessory inclusion, attendance/order total equality, and confirmed single promotion save. Actual code, synthetic data only.');
})().catch(e=>{console.error(e);process.exitCode=1});
