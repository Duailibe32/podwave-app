const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {transformSync}=require('esbuild');
const flush=()=>new Promise(setImmediate);

function setup(preference={userId:'user-a',enabled:true}) {
  const effects=[], notices=[], feedback=[];
  let stateIndex=0, timer, callback, queries=0, removed=0, requested=0, rows=[];
  const win=new EventTarget(); win.isSecureContext=true; win.setInterval=fn=>(timer=fn,1);win.clearInterval=()=>{};
  const doc=new EventTarget();doc.visibilityState='hidden';
  const registration={active:{},showNotification:async(title,options)=>notices.push({title,...options}),getNotifications:async()=>[]};
  const worker=new EventTarget();worker.getRegistration=async()=>registration;
  const client={from(table){assert.equal(table,'customer_orders');return {select(columns){assert.equal(columns,'id,status,customer_id');return {async eq(column,id){assert.equal(column,'customer_id');assert.equal(id,'user-a');queries++;return {data:rows,error:null};}};}};},channel(){return {on(type,filter,cb){assert.equal(filter.filter,'customer_id=eq.user-a');callback=cb;return this;},subscribe(){return this;}};},removeChannel:async()=>{removed++;}};
  const fakeReact={createContext:()=>({Provider:'provider'}),createElement:(tag,props)=>props,useContext:()=>({}),useState:initial=>{
    const values=[preference,false,'granted',''];const i=stateIndex++;return [values[i],value=>feedback.push(value)];
  },useEffect:fn=>effects.push(fn)};
  const module={exports:{}};
  const localRequire=name=>name==='react'?fakeReact:name.includes('CatalogContext')?{useCatalog:()=>({currentUser:{id:'user-a'},supabaseClient:client,openProfileModal:()=>{}})}:name.includes('services/supabase')?{}:require(name);
  const Notification={permission:'granted',requestPermission:async()=>{requested++;return 'granted';}};
  const code=transformSync(fs.readFileSync('src/context/OrderNotificationsContext.tsx','utf8'),{loader:'tsx',format:'cjs'}).code;
  vm.runInNewContext(code,{module,exports:module.exports,require:localRequire,window:win,document:doc,navigator:{serviceWorker:worker},Notification,localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},Event,URL,Map});
  win.Notification=Notification;
  const value=module.exports.OrderNotificationsProvider({children:null}).value;
  return {effects,notices,feedback,doc,value,setRows:value=>{rows=value;},tick:()=>timer?.(),update:()=>callback?.(),stats:()=>({queries,removed,requested})};
}
(async()=>{
  const s=setup();s.setRows([{id:'order-1',status:'recebido',customer_id:'user-a'}]);
  const cleanup=s.effects[2]();await flush();assert.equal(s.notices.length,0);assert.equal(s.stats().requested,0);
  s.setRows([{id:'order-1',status:'enviado',customer_id:'user-a'}]);s.update();await flush();
  assert.equal(s.notices.length,1);assert.equal(s.notices[0].data.url,'/?orders=1');
  s.tick();await flush();assert.equal(s.notices.length,1);
  s.doc.visibilityState='visible';s.setRows([{id:'order-1',status:'entregue',customer_id:'user-a'}]);s.tick();await flush();assert.equal(s.notices.length,1);
  s.doc.visibilityState='hidden';s.setRows([{id:'order-1',status:'changed',customer_id:'user-b'}]);s.tick();await flush();assert.equal(s.notices.length,1);
  cleanup();s.setRows([{id:'order-1',status:'cancelado',customer_id:'user-a'}]);s.tick();await flush();assert.equal(s.notices.length,1);assert.equal(s.stats().removed,1);
  const notOptedIn=setup({userId:'different-user',enabled:true});assert.equal(notOptedIn.effects[2](),undefined);assert.equal(notOptedIn.stats().queries,0);
  const disabled=setup({userId:'user-a',enabled:false});assert.equal(disabled.effects[2](),undefined);assert.equal(disabled.stats().queries,0);
  // Worker only handles our own notification type and opens a fixed same-origin route.
  let clickHandler,opened;
  const self={location:{origin:'https://example.test'},addEventListener:(name,fn)=>{if(name==='notificationclick')clickHandler=fn;},clients:{matchAll:async()=>[],openWindow:async(url)=>{opened=url;}}};
  vm.runInNewContext(fs.readFileSync('public/order-notifications-sw.js','utf8'),{self,URL});
  let clicked=false,pending;
  clickHandler({notification:{data:{type:'podwave-order',url:'https://evil.test'},close:()=>{clicked=true;}},waitUntil:p=>{pending=p;}});await pending;
  assert.equal(clicked,true);assert.equal(opened,'https://example.test/?orders=1');
  for (const url of ['https://evil.test/','javascript:alert(1)','//evil.test/']) {
    clickHandler({notification:{data:{url},close(){}},waitUntil:p=>{pending=p;}});await pending;
    assert.equal(opened,'https://example.test/');
  }
  clickHandler({notification:{data:{url:'/catalog?test=1'},close(){}},waitUntil:p=>{pending=p;}});await pending;
  assert.equal(opened,'https://example.test/catalog?test=1');
  console.log('PASS: explicit opt-in, per-user isolation, hidden-page updates, duplicate suppression, cleanup and safe notification click. No real notifications sent.');
})().catch(e=>{console.error(e);process.exitCode=1;});
