const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/components/admin/CombosAndAddonsTab.tsx','utf8').replace(/\r\n/g,'\n');
const blocks=[...source.matchAll(/const isLegacyThird =[\s\S]*?const merged =[\s\S]*?;\n/g)].map(m=>m[0]);
assert.equal(blocks.length,2,'Test constructor and remote refresh independently');
const def={id:'addon-silicone-cover',name:'Carregador portátil',price:35,active:true,applicableModelIds:['all']};
for(const block of blocks){
 for(const name of ['Protetor Higiênico de Bocal','Capinha de Silicone Protetora','Nome personalizado']){
  for(const active of [false,true]){
   const found={...def,name,price:0,active,applicableModelId:'restricted',applicableModelIds:['restricted']};
   const merged=JSON.parse(vm.runInNewContext(block+'\nJSON.stringify(merged)',{idx:2,found,def}));
   assert.equal(merged.active,active,'Old labels must never reset an explicit inactive flag');
   assert.equal(merged.price,0,'A configured zero price must survive');
   assert.deepEqual(merged.applicableModelIds,['restricted'],'Product restrictions must survive');
  }
 }
 const absent=JSON.parse(vm.runInNewContext(block+'\nJSON.stringify(merged)',{idx:2,found:undefined,def}));
 assert.equal(absent.active,true,'Defaults only apply when no saved accessory exists');
}
console.log('PASS: both real admin loading paths preserve active/inactive, zero price and model restrictions for legacy/custom third accessories. No production writes.');
