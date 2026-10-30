const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { transformSync } = require('esbuild');
const stockModule = {exports:{}};
vm.runInNewContext(transformSync(fs.readFileSync('src/utils/stock.ts','utf8'),{loader:'ts',format:'cjs'}).code,{module:stockModule,exports:stockModule.exports});
const check = stockModule.exports.cartStockError;
const models = [{id:'m',active:true,flavors:[{id:'f',demoQuantity:3,inStock:true}]}];
const item = {modelId:'m',flavorId:'f',modelName:'Modelo',flavorName:'Sabor',quantity:3};
assert.equal(check([item],models),null);
assert.ok(check([{...item,quantity:4}],models));
assert.ok(check([{...item,quantity:2},{...item,quantity:2}],models));
assert.ok(check([{...item,quantity:1.5}],models));
assert.ok(check([item],[{...models[0],active:false}]));
assert.ok(check([item],[{...models[0],flavors:[{id:'f',demoQuantity:null,inStock:true}]}]));
assert.ok(check([item],[{...models[0],flavors:[]}]));

(async () => {
  const source = fs.readFileSync('src/components/admin/MyPendingAccountsSection.tsx','utf8');
  const handler = source.slice(source.indexOf('  const handleDeleteCommitment ='),source.indexOf('  // Edição de compromisso avulso'));
  let calls=0;
  const sandbox = {
    deletingItem:null,isDeleting:false,error:'',
    setDeletingItem:(item) => {sandbox.deletingItem=item;},
    setIsDeleting:(value) => {sandbox.isDeleting=value;},
    setDeleteError:(value) => {sandbox.error=value;},
    removeManualCommitment:async (id) => {assert.equal(id,'account');calls++;return {success:true};},
  };
  const compiled = transformSync(handler+'\nglobalThis.openDelete = handleDeleteCommitment;globalThis.confirmDelete = confirmDeleteCommitment;',{loader:'tsx',format:'cjs'}).code;
  vm.runInNewContext(compiled,sandbox);
  const account={originType:'avulso',originId:'account',description:'Conta real'};
  await sandbox.openDelete(account); assert.equal(calls,0); assert.equal(sandbox.deletingItem.originId,'account');
  await sandbox.confirmDelete(); assert.equal(calls,1); assert.equal(sandbox.deletingItem,null);
  await sandbox.openDelete(account);
  sandbox.removeManualCommitment=async () => ({success:false,error:'Permissão negada'});
  await sandbox.confirmDelete(); assert.equal(sandbox.error,'Permissão negada'); assert.equal(sandbox.deletingItem.originId,'account');
  sandbox.removeManualCommitment=async () => {throw new Error('offline');};
  await sandbox.confirmDelete(); assert.ok(sandbox.error.includes('conexão')); assert.equal(sandbox.isDeleting,false);
  sandbox.deletingItem=null;
  await sandbox.openDelete({...account,originType:'venda'}); assert.equal(sandbox.deletingItem,null);
  console.log('PASS: cart stock limits, duplicate quantities, inactive/unknown stock, in-app delete confirmation and visible deletion errors. No browser or database data modified.');
})().catch(e => {console.error(e);process.exitCode=1;});
