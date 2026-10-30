const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {transformSync}=require('esbuild');
const flush=()=>new Promise(setImmediate);
function render(loading=false){
  const setters=[],effects=[],refs=[];let state=0,ref=0,saves=0;
  const values=[[], '',false,loading,'Observação ainda não salva','Motivo digitado','2026-10-30','source-key',null,false,1];
  const refValues=[{current:'stable-operation-id'},{current:0},{current:null},{current:null}];
  const React={createElement:(type,props,...children)=>({type,props:props||{},children}),useState:()=>{const i=state++;return [values[i],value=>setters.push({i,value})];},useEffect:fn=>effects.push(fn),useRef:()=>{const r=refValues[ref++];refs.push(r);return r;}};
  const services={listServiceNotes:async()=>[],createServiceNote:async()=>{saves++;},updateServiceNote:async()=>{saves++;}};
  const module={exports:{}};
  const requireLocal=name=>name==='react'?React:name.includes('CatalogContext')?{useCatalog:()=>({isOwner:true})}:name.includes('customerServiceNotes')?services:require(name);
  vm.runInNewContext(transformSync(fs.readFileSync('src/components/admin/CustomerServiceHistory.tsx','utf8'),{loader:'tsx',format:'cjs'}).code,{module,exports:module.exports,require:requireLocal,crypto:require('node:crypto').webcrypto});
  const tree=module.exports.CustomerServiceHistory({customer:{key:'customer',records:[{id:'sale',origin:'venda',syncStatus:'synced',key:'source-key'}]}});
  const find=(node,type)=>{if(!node||typeof node!=='object')return null;if(node.type===type)return node;for(const child of (node.children||[]).flat(Infinity)){const found=find(child,type);if(found)return found;}return null;};
  return {effects,setters,refs,form:find(tree,'form'),saves:()=>saves};
}
(async()=>{
  const r=render();r.effects[1]();await flush();
  assert.ok(!r.setters.some(s=>[4,5,6,7,8,9].includes(s.i)));assert.equal(r.refs[0].current,'stable-operation-id');
  const loading=render(true);let prevented=false;await loading.form.props.onSubmit({preventDefault:()=>{prevented=true;}});
  assert.equal(prevented,true);assert.equal(loading.saves(),0);assert.ok(!loading.setters.some(s=>s.i===2&&s.value===true));
  console.log('PASS: list refresh preserves unsaved service-note fields/retry ID and saving waits for query completion. No real data touched.');
})().catch(e=>{console.error(e);process.exitCode=1;});
