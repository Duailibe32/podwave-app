const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {transformSync}=require('esbuild');
function compile(source,globals={}){const module={exports:{}};vm.runInNewContext(transformSync(source,{loader:'ts',format:'cjs'}).code,{module,exports:module.exports,...globals});return module.exports;}
const {selectProductDiscount}=compile(fs.readFileSync('src/utils/productDiscount.ts','utf8'));
const {isCouponEligibleForCart}=compile(fs.readFileSync('src/utils/checkoutTotals.ts','utf8'));
const source=fs.readFileSync('src/context/CatalogContext.tsx','utf8');
const start=source.indexOf('  const progCfg = {');
const calculation=source.slice(start,source.indexOf('  const getCheckoutSummary',start));
const baseCoupon={id:'qa',code:'QA',active:true,usedCount:0,discountType:'fixed',value:0};
for(const [isVip,coupon,expected,origin] of [
 [true,null,22,'vip'],[true,{...baseCoupon,value:5},22,'vip'],
 [true,{...baseCoupon,value:30},30,'coupon'],[true,{...baseCoupon,value:22},22,'vip'],
 [false,null,11,'progressive'],[false,{...baseCoupon,value:5},11,'progressive'],
 [false,{...baseCoupon,value:15},15,'coupon'],
 [true,{...baseCoupon,discountType:'free_shipping'},22,'vip'],
 [true,{...baseCoupon,value:500,active:false},22,'vip'],
]){
 const result=compile(calculation+'\nmodule.exports={discountAmount,cartTotal,vipDiscountAmount,progressiveDiscountAmount,couponDiscountAmount,chosenDiscount};',{
  settings:{progressiveDiscountConfig:{tier2DiscountPercent:5},vipDiscountPercent:10},
  DEFAULT_PROGRESSIVE_DISCOUNT_CONFIG:{enabled:true,tier2MinUnits:2,tier2DiscountPercent:5,tier3MinUnits:3,tier3DiscountPercent:10},
  totalPodUnits:2,cartSubtotal:219.98,rawTotal:270.98,isVip,currentUser:{vipDiscountCustom:10},
  appliedCoupon:coupon,cart:[{modelId:'qa',price:109.99,quantity:2}],selectProductDiscount,isCouponEligibleForCart,
 });
 assert.equal(result.discountAmount,expected);assert.equal(result.chosenDiscount.source,origin);
 assert.equal(Math.round(result.cartTotal*100),Math.round((270.98-expected)*100));
 assert.equal([result.vipDiscountAmount,result.progressiveDiscountAmount,result.couponDiscountAmount].filter(x=>x>0).length,1);
 // Actual checkout consumption condition must preserve an unused monetary coupon.
 const gate=source.match(/const couponWasUsed = [\s\S]*?;\n/)[0];
 for(const freeShippingSource of [undefined,'coupon']){
  const used=compile(gate+'\nmodule.exports=!!couponWasUsed;',{
   appliedCoupon:coupon,cart:[{modelId:'qa'}],cartSubtotal:219.98,
   checkoutSummary:{freeShippingSource},couponDiscountAmount:result.couponDiscountAmount,isCouponEligibleForCart,
  });
  assert.equal(used,!!coupon&&coupon.active!==false&&(coupon.discountType==='free_shipping'?freeShippingSource==='coupon':origin==='coupon'));
 }
}
assert.equal(selectProductDiscount({subtotal:100,vip:10,progressive:10,coupon:10}).source,'vip');
assert.equal(selectProductDiscount({subtotal:100,vip:0,progressive:10,coupon:10}).source,'progressive');
assert.equal(selectProductDiscount({subtotal:100,vip:Infinity,progressive:-1,coupon:500}).total,100);
console.log('PASS: real context reproduces screenshot with only R$22 VIP and R$248.98 total; best monetary benefit, ties, non-VIP, shipping coupon separation, and no consumption of losing coupons. Synthetic data only.');
