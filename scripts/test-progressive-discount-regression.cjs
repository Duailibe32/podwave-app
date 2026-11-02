const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {transformSync}=require('esbuild');
const source=fs.readFileSync('src/context/CatalogContext.tsx','utf8');
const start=source.indexOf('  const progCfg = {');
const code=source.slice(start,source.indexOf('  // Coupon application logic',start));
for(const [config,units,expected] of [
 [{tier3DiscountPercent:0},3,0],
 [{tier3DiscountPercent:10},3,30],
 [{tier3DiscountType:'fixed',tier3DiscountPercent:20},3,20],
 [{tier2DiscountType:'fixed',tier2DiscountPercent:20},2,20],
 [{enabled:false,tier3DiscountPercent:10},3,0],
]){
 const module={exports:{}};
 vm.runInNewContext(transformSync(code+'\nmodule.exports=progressiveDiscountAmount;',{loader:'ts',format:'cjs'}).code,{
  module,exports:module.exports,settings:{progressiveDiscountConfig:config},
  DEFAULT_PROGRESSIVE_DISCOUNT_CONFIG:{enabled:true,tier2MinUnits:2,tier2DiscountPercent:5,tier3MinUnits:3,tier3DiscountPercent:10},
  totalPodUnits:units,cartSubtotal:300,
 });
 assert.equal(module.exports,expected);
}
// Execute the actual footer expression with conflicting legacy rate to detect wrong labels.
const cart=fs.readFileSync('src/components/CartDrawer.tsx','utf8');
const expression=cart.match(/Pods \(\{([^\n]+)\}\):/)[1];
assert.equal(vm.runInNewContext(expression,{totalPodUnits:3,tier3Min:3,formattedTier3Discount:'R$ 20,00 OFF',formattedTier2Discount:'5% OFF',progressiveDiscountRate:20}),'R$ 20,00 OFF');
console.log('PASS: progressive discount preserves zero, fixed/percentage/disabled totals and fixed-currency footer. Actual calculation and label expression.');
