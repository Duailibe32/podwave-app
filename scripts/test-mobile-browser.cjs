// Isolated headless browser QA, with synthetic identity/GPS and no Supabase connection.
// Run from repository root after npm run build. Uses an installed Chromium browser.
const fs=require('node:fs');const path=require('node:path');const http=require('node:http');
const {spawn}=require('node:child_process');const {build}=require('esbuild');
const assert=require('node:assert/strict');
const browser=process.env.CHROMIUM_PATH||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe'].find(p=>fs.existsSync(p))||'';
const root=path.resolve('.mobile-qa');
const browserProfile=path.join(root,'browser-'+path.basename(browser)+'-'+process.pid);
const scenarioContext=`
const mode=new URLSearchParams(location.search).get('mode');
const noop=()=>{};
const profile={id:'qa-user',email:'qa@example.test',role:'customer',fullName:'Pessoa de teste com um nome bastante comprido',phoneWhatsapp:'(11) 99999-0000',address:{street:'Rua de teste',number:'123',bairro:'Bairro de teste',city:'Cidade de teste',state:'SP'}};
export const useCatalog=()=>({isCheckoutOpen:true,isAuthModalOpen:true,authModalMode:'signup',isProfileModalOpen:true,currentUser:mode==='profile'?profile:null,cart:[],coupons:[],appliedCoupon:null,isUsbCableAdded:false,discountAmount:0,vipDiscountAmount:0,vipDiscountRate:0,cartSubtotal:0,cartTotal:0,cablePrice:0,settings:{storeName:'Teste local',supportPhone:'',whatsappNumber:''},isOwner:false,isAdmin:false,isVip:false,closeAuthModal:noop,closeProfileModal:noop,setIsCheckoutOpen:noop,openAuthModal:noop,openProfileModal:noop,applyCoupon:()=>({success:false}),removeCoupon:noop,updateCustomerProfile:noop,recordCustomerOrder:noop,submitOrderViaWhatsapp:noop,listPasskeys:async()=>({success:true,passkeys:[]}),checkPasskeySupport:async()=>({supported:false}),logoutUser:noop});
`;
const entry=`
import React from 'react';import {createRoot} from 'react-dom/client';
import {CheckoutDrawer} from './src/components/CheckoutDrawer';
import {AuthModal} from './src/components/auth/AuthModal';
import {CustomerProfileModal} from './src/components/auth/CustomerProfileModal';
Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(success){success({coords:{latitude:-3.73,longitude:-38.52,accuracy:10}});}},configurable:true});
const mode=new URLSearchParams(location.search).get('mode');
createRoot(document.getElementById('root')).render(mode==='signup'?<AuthModal/>:mode==='profile'?<CustomerProfileModal/>:<CheckoutDrawer/>);
setTimeout(()=>{
 if(mode==='checkout')Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Usar minha localização atual'))?.click();
 setTimeout(()=>{
  const form=document.querySelector('form');
  const bad=Array.from(form?.querySelectorAll('input,select,textarea')||[]).filter(e=>{const r=e.getBoundingClientRect(),f=form.getBoundingClientRect();return r.width&& (r.right>f.right+1||r.left<f.left-1);}).map(e=>e.name||e.placeholder);
  const result={mode,width:innerWidth,documentWidth:document.documentElement.scrollWidth,formWidth:form?.clientWidth,formScrollWidth:form?.scrollWidth,bad,gps:mode!=='checkout'||document.body.textContent.includes('https://www.google.com/maps?q=')};
  result.pass=!!form&&result.documentWidth<=innerWidth+1&&result.formScrollWidth<=result.formWidth+1&&!bad.length&&result.gps;
  const output=document.createElement('output');output.id='qa-result';output.textContent=JSON.stringify(result);document.body.appendChild(output);
  parent.postMessage(result,location.origin);
 },200);
},200);
`;
const authEntry=`
import React from 'react';import {createRoot} from 'react-dom/client';import {CatalogProvider,useCatalog} from './src/context/CatalogContext';
localStorage.setItem('podwave_logged_in_user_v3',JSON.stringify({id:'forged-owner',role:'owner',email:'forged@example.test'}));
localStorage.setItem('podwave_local_manual_sales',JSON.stringify([{id:'legacy-pending',_syncStatus:'pending_sync'}]));
function Probe(){const c=useCatalog();return <output id="auth-result">{JSON.stringify({admin:c.isAdmin,owner:c.isOwner,identity:c.currentUser?.id||null,privateRecords:c.manualSales.length,legacyPreserved:localStorage.getItem('podwave_local_manual_sales')?.includes('legacy-pending')})}</output>}
createRoot(document.getElementById('root')).render(<CatalogProvider><Probe/></CatalogProvider>);
`;
function run(args){return new Promise((resolve,reject)=>{const child=spawn(browser,args,{windowsHide:true});let stdout='',stderr='';child.stdout.on('data',s=>stdout+=s);child.stderr.on('data',s=>stderr+=s);const timer=setTimeout(()=>{child.kill();reject(new Error('headless browser timeout'));},30000);child.on('error',reject);child.on('exit',code=>{clearTimeout(timer);code===0?resolve(stdout):reject(new Error('Browser exit '+code+' '+stderr.slice(-500)));});});}
(async()=>{
 assert.ok(fs.existsSync(browser),'Set CHROMIUM_PATH to an installed Chromium executable.');fs.mkdirSync(root,{recursive:true});
 const css=fs.readdirSync('dist/assets').find(n=>/^index-.*\.css$/.test(n));assert.ok(css,'Run npm run build first');fs.copyFileSync('dist/assets/'+css,root+'/app.css');
 await build({stdin:{contents:entry,loader:'tsx',resolveDir:process.cwd()},bundle:true,format:'iife',outfile:root+'/app.js',platform:'browser',define:{'import.meta.env':'{}'},plugins:[{name:'synthetic-context',setup(b){b.onResolve({filter:/context\/CatalogContext$/},()=>({path:'context',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:scenarioContext,loader:'js'}));}}]});
 await build({stdin:{contents:authEntry,loader:'tsx',resolveDir:process.cwd()},bundle:true,format:'iife',outfile:root+'/auth.js',platform:'browser',define:{'import.meta.env':'{}'}});
 fs.writeFileSync(root+'/frame.html','<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/app.css"><body><div id="root"></div><script src="/app.js"></script></body></html>');
 // Desktop Chrome enforces a minimum window width. A same-origin iframe gives an
 // exact CSS viewport for each mobile breakpoint without changing any app styles.
 fs.writeFileSync(root+'/index.html',`<!doctype html><html><style>html,body{margin:0;background:#080811}iframe{display:block;border:0}output{display:none}</style><body><iframe id="mobile" height="900"></iframe><script>
 const q=new URLSearchParams(location.search), frame=document.getElementById('mobile');
 const width=Number(q.get('width'));frame.width=[320,360,390,430].includes(width)?width:320;
 frame.src='/frame.html?mode='+encodeURIComponent(q.get('mode')||'checkout');
 addEventListener('message',event=>{if(event.source!==frame.contentWindow||event.origin!==location.origin)return;const output=document.createElement('output');output.id='qa-result';output.textContent=JSON.stringify(event.data);document.body.appendChild(output);});
 </script></body></html>`);
 fs.writeFileSync(root+'/auth.html','<!doctype html><div id="root"></div><script src="/auth.js"></script>');
 const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname;const target=path.join(root,name==='/'?'index.html':name);if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}if(!fs.existsSync(target)||fs.statSync(target).isDirectory()){res.writeHead(404).end();return;}res.setHeader('Content-Type',target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(target));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const results=[];
 try{
  for(const width of [320,360,390,430])for(const mode of ['checkout','signup','profile']){
   const html=await run(['--headless=new','--disable-gpu','--disable-background-networking','--no-first-run','--no-default-browser-check','--hide-scrollbars','--user-data-dir='+browserProfile,'--window-size=520,940','--virtual-time-budget=1500','--screenshot='+root+'/'+mode+'-'+width+'.png','--dump-dom',origin+'/?mode='+mode+'&width='+width]);
   fs.writeFileSync(root+'/'+mode+'-'+width+'.html',html);
   const match=html.match(/<output id="qa-result">([^<]+)<\/output>/);assert.ok(match,'Missing QA result for '+mode+' '+width);
   const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));results.push(result);console.log(JSON.stringify(result));
   assert.equal(result.width,width,'Browser viewport differs from requested mobile width');
  }
  const html=await run(['--headless=new','--disable-gpu','--no-first-run','--user-data-dir='+browserProfile,'--virtual-time-budget=1200','--dump-dom',origin+'/auth.html']);
  const auth=html.match(/<output id="auth-result">([^<]+)<\/output>/);assert.ok(auth,'Missing auth probe');const identity=JSON.parse(auth[1].replaceAll('&quot;','"'));
  assert.equal(identity.admin,false);assert.equal(identity.owner,false);assert.equal(identity.identity,null);
  assert.equal(identity.privateRecords,0);assert.equal(identity.legacyPreserved,true);
  console.log('PASS: forged cached owner cannot restore administrative identity.');
  fs.writeFileSync(root+'/results.json',JSON.stringify({results,identity},null,2));
  assert.ok(results.every(r=>r.pass),'Mobile layout overflow detected; inspect .mobile-qa/results.json');
  console.log('PASS: 12 headless mobile-layout scenarios with synthetic GPS. Not a physical-device/WebAuthn test.');
 }finally{server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
