const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { transformSync } = require('esbuild');
const fixture = {
  isOwner:true,configuredOwnerUid:'owner-id',currentUser:{id:'owner-id'},isAutoSyncEnabled:false,
  brands:[],models:[],coupons:[],supabaseUrl:'https://example.test',supabaseAnonKey:'PUBLIC_TEST_KEY',
  isSupabaseConfigured:true,supabaseStatus:'connected',supabaseStatusMessage:'Conexão ativa',
  pendingSyncCount:0,isSyncingPending:false,
};
function load(path,extra={}) {
  const module={exports:{}};
  const code=transformSync(fs.readFileSync(path,'utf8'),{loader:'tsx',format:'cjs'}).code;
  const localRequire = name => name.includes('CatalogContext') ? {useCatalog:() => fixture} : extra[name] || require(name);
  vm.runInNewContext(code,{module,exports:module.exports,require:localRequire});
  return module.exports;
}
const {SupabaseTab} = load('src/components/admin/SupabaseTab.tsx');
const {OwnerAdvancedSettings} = load('src/components/admin/OwnerAdvancedSettings.tsx',{'./SupabaseTab':{SupabaseTab}});
let html=renderToStaticMarkup(React.createElement(SupabaseTab));
assert.ok(html.includes('Sem pendências neste navegador'));
assert.ok(!html.includes('PUBLIC_TEST_KEY') && !html.includes('https://example.test'));
assert.ok(!html.includes('Copiar SQL') && !html.includes('CREATE TABLE'));
assert.ok(html.includes('disabled=""'));
html=renderToStaticMarkup(React.createElement(OwnerAdvancedSettings));
assert.ok(html.includes('Configurações avançadas'));
assert.ok(!html.includes('PUBLIC_TEST_KEY') && !html.includes('owner-id') && !html.includes('Restaurar catálogo local'));
html=renderToStaticMarkup(React.createElement(SupabaseTab,{mode:'advanced'}));
assert.ok(html.includes('type="password"') && html.includes('URL do projeto'));
fixture.isOwner=false;
assert.equal(renderToStaticMarkup(React.createElement(SupabaseTab,{mode:'advanced'})),'');
assert.equal(renderToStaticMarkup(React.createElement(OwnerAdvancedSettings)),'');
assert.ok(!renderToStaticMarkup(React.createElement(SupabaseTab)).includes('Sincronizar pendências'));

let resets=0;
const source=fs.readFileSync('src/components/admin/OwnerAdvancedSettings.tsx','utf8');
const handler=source.slice(source.indexOf('  const confirmReset ='),source.indexOf('  return <section'));
const sandbox={isOwner:false,isAutoSyncEnabled:false,confirmation:'RESTAURAR',resetAllData:() => resets++,setShowReset:()=>{},setConfirmation:()=>{},setNotice:()=>{}};
vm.runInNewContext(transformSync(handler+'\nglobalThis.confirmReset = confirmReset;',{loader:'tsx',format:'cjs'}).code,sandbox);
sandbox.confirmReset();assert.equal(resets,0);
sandbox.isOwner=true;sandbox.isAutoSyncEnabled=true;sandbox.confirmReset();assert.equal(resets,0);
sandbox.isAutoSyncEnabled=false;sandbox.confirmation='restaurar';sandbox.confirmReset();assert.equal(resets,0);
sandbox.confirmation='RESTAURAR';sandbox.confirmReset();assert.equal(resets,1);
console.log('PASS: owner-only advanced UI, no credentials in daily view, collapsed settings, no legacy SQL, and guarded reset. No data modified.');
