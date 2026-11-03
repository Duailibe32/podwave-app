const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const { transformSync } = require('esbuild');
const moduleObject = { exports: {} };
vm.runInNewContext(transformSync(fs.readFileSync('src/utils/reorder.ts','utf8'), { loader:'ts', format:'cjs' }).code, { module:moduleObject, exports:moduleObject.exports });
const { prepareReorder } = moduleObject.exports;
const model = { id:'m1', active:true, brandName:'Atual', modelName:'Modelo atual', startingPrice:120, imageUrl:'today.png', flavors:[{id:'f1',name:'Sabor atual',inStock:true,demoQuantity:5,colorHex:'#fff',iconEmoji:'❄️'}] };
const old = {id:'legacy-id',modelId:'m1',flavorId:'f1',brandName:'Antiga',modelName:'Modelo antigo',flavorName:'Antigo',quantity:2,price:1,imageUrl:'old.png'};
const unrelated = {...old,id:'other',modelId:'other',quantity:1};
const before = JSON.stringify({model,old,unrelated});
let result = prepareReorder([old],[model],[unrelated]);
assert.equal(result.addedUnits,2);assert.equal(result.warnings.length,0);
assert.equal(result.cart[0].price,120);assert.equal(result.cart[0].flavorName,'Sabor atual');assert.equal(result.cart[0].imageUrl,'today.png');assert.equal(result.cart[1],unrelated);
assert.equal(JSON.stringify({model,old,unrelated}),before,'Inputs must remain unchanged');
result = prepareReorder([old,old],[model],[]);
assert.equal(result.cart.length,1);assert.equal(result.cart[0].quantity,4);
result = prepareReorder([old],[model],[{...old,quantity:3}]);
assert.equal(result.cart.length,1);assert.equal(result.cart[0].quantity,5);assert.equal(result.cart[0].price,120);
for(const stock of [0,1,null,undefined,NaN,-1]) {
  result=prepareReorder([old],[{...model,flavors:[{...model.flavors[0],demoQuantity:stock}]}],[unrelated]);
  assert.equal(result.addedUnits,0);assert.equal(result.cart.length,1);assert.equal(result.warnings.length,1);
}
for(const quantity of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER]) assert.equal(prepareReorder([{...old,quantity}],[model],[]).addedUnits,0);
for(const models of [[],[{...model,active:false}],[{...model,flavors:[]}],[{...model,flavors:[{...model.flavors[0],inStock:false}]}],[{...model,startingPrice:NaN}],[{...model,startingPrice:-1}]]) assert.equal(prepareReorder([old],models,[]).addedUnits,0);
assert.equal(prepareReorder([{...old,flavorId:'removed'}],[model],[]).addedUnits,0,'Never match by flavor name');
result=prepareReorder([old],[model],[{...old,quantity:4}]);assert.equal(result.addedUnits,0);assert.equal(result.cart[0].quantity,4,'Existing cart counts against available stock');
result=prepareReorder([old,{...old,modelId:'deleted'}],[model],[]);assert.equal(result.addedUnits,2);assert.equal(result.warnings.length,1,'Partial order must report omissions');
result=prepareReorder([old,old,old],[model],[]);assert.equal(result.addedUnits,0,'Duplicate history lines aggregate before the stock check');
assert.equal(prepareReorder([],[model],[]).warnings.length,1);
// Execute the actual context callback with isolated state and fail if it attempts anything else.
const source=fs.readFileSync('src/context/CatalogContext.tsx','utf8');
const callback=source.slice(source.indexOf('  const repeatOrder ='),source.indexOf('  const clearReorderFeedback ='));
let nextCart, feedback, open=false;
const compiled=transformSync(callback+'\nmodule.exports=repeatOrder;',{loader:'ts',format:'cjs'}).code;
const callbackModule={exports:{}};
vm.runInNewContext(compiled,{module:callbackModule,exports:callbackModule.exports,prepareReorder,models:[model],cart:[unrelated],setCart:value=>{nextCart=value},setReorderFeedback:value=>{feedback=value},setIsCartOpen:value=>{open=value}});
assert.equal(callbackModule.exports([old]).addedUnits,2);assert.equal(open,true);assert.equal(nextCart.length,2);assert.equal(feedback.addedUnits,2);
nextCart=undefined;open=false;callbackModule.exports([{...old,modelId:'gone'}]);assert.equal(open,false);assert.equal(nextCart,undefined);assert.equal(feedback.warnings.length,1);
assert(!/submitOrder|recordCustomerOrder|supabase|saveCustomer|updateSettings/.test(callback),'Reorder must only change the local cart');
console.log('PASS: current prices/IDs, stock, existing cart, duplicates, unavailable/invalid items, partial warnings, immutable history and actual local-only context callback.');
