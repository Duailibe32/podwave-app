const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {transformSync}=require('esbuild');
const flush=()=>new Promise(setImmediate);

function setup({ userId = 'user-a', optedIn = true } = {}) {
  const effects = [], notices = [], storage = new Map();
  let stateIndex = 0, timer, callback, queries = 0, removed = 0, requested = 0, rows = [];
  const win = new EventTarget();
  win.setInterval = fn => (timer = fn, 1);
  win.clearInterval = () => { timer = undefined; };
  const doc = new EventTarget();
  doc.visibilityState = 'hidden';
  const registration = {
    active: { postMessage: () => assert.fail('Duplicate worker message') },
    showNotification: async (title, options) => notices.push({title, ...options}),
    getNotifications: async ({tag}) => notices.filter(notice => notice.tag === tag),
  };
  const worker = new EventTarget();
  worker.getRegistration = async () => registration;
  const client = {
    from(table) {
      assert.equal(table, 'customer_orders');
      return { select(columns) {
        assert.equal(columns, 'id,status,customer_id,order_code,delivery_info');
        return { async eq(column, id) {
          assert.equal(column, 'customer_id'); assert.equal(id, userId);
          queries++;
          return {data: rows, error: null};
        } };
      } };
    },
    channel() { return {
      on(type, filter, cb) { assert.equal(filter.filter, 'customer_id=eq.' + userId); callback = cb; return this; },
      subscribe() { return this; },
    }; },
    removeChannel: async () => { removed++; },
  };
  const fakeReact = {
    createContext: () => ({Provider:'provider'}),
    createElement: (tag, props) => props,
    useState: () => [[optedIn ? 'user-a' : undefined, false, 'granted', '', false][stateIndex++], () => {}],
    useRef: value => ({current:value}),
    useCallback: fn => fn,
    useEffect: fn => effects.push(fn),
  };
  const module = {exports:{}};
  const localRequire = name => {
    if (name === 'react') return fakeReact;
    if (name === './CatalogContext') return {useCatalog:()=>({
      currentUser: userId ? {id:userId} : null, supabaseClient:client, openProfileModal:()=>{},
    })};
    if (name === './ToastContext') return {useToast:()=>({info:()=>{}})};
    if (name.endsWith('/supabase')) return {};
    if (name.endsWith('/orderPush')) return {orderPushOwner:()=>null};
    return require(name);
  };
  const Notification = {permission:'granted', requestPermission:async()=>{requested++;return 'granted';}};
  win.Notification = Notification;
  const code = transformSync(fs.readFileSync('src/context/OrderNotificationsContext.tsx','utf8'),{loader:'tsx',format:'cjs'}).code;
  vm.runInNewContext(code, {
    module, exports:module.exports, require:localRequire, window:win, document:doc,
    navigator:{serviceWorker:worker}, Notification, Event, URL, Map,
    sessionStorage:{getItem:key=>storage.get(key), setItem:(key,value)=>storage.set(key,value)},
  });
  const value = module.exports.OrderNotificationsProvider({children:null}).value;
  const effect = marker => effects.find(fn => String(fn).includes(marker));
  return {
    notices, doc, value, setRows:value=>{rows=value;}, tick:()=>timer?.(), update:row=>callback?.({new:row}),
    startPolling:()=>effect('observeSupabaseRow')(),
    startEvents:()=>effect('onCustomEvent')(),
    event:(orderId,toStatus,customerId)=>{
      const event = new Event('podwave:order-status-changed');
      event.detail = {orderId,toStatus,customerId};
      win.dispatchEvent(event);
    },
    stats:()=>({queries,removed,requested}),
  };
}

(async()=>{
  const s = setup();
  const order = {id:'order-1', status:'recebido', customer_id:'user-a'};
  s.setRows([order]);
  const cleanup = s.startPolling(), cleanEvents = s.startEvents();
  await flush();
  assert.equal(s.notices.length,0);
  assert.equal(s.stats().requested,0);
  s.event('missing-owner','enviado');
  s.event('other-order','enviado','user-b');
  await flush();
  assert.equal(s.notices.length,0);
  s.update({...order,status:'enviado'});
  s.event(order.id,'enviado','user-a');
  await flush();
  assert.equal(s.notices.length,1);
  assert.equal(s.notices[0].data.url,'/?orders=1');
  s.setRows([{...order,status:'entregue'}]);
  s.tick(); await flush();
  assert.equal(s.stats().queries,1, 'No polling hidden tabs');
  s.doc.visibilityState='visible'; s.doc.dispatchEvent(new Event('visibilitychange')); await flush();
  assert.equal(s.notices.length,2);
  s.update({...order,status:'cancelado',customer_id:'user-b'}); await flush();
  assert.equal(s.notices.length,2);
  cleanup(); cleanEvents();
  s.update({...order,status:'cancelado'}); s.event(order.id,'cancelado','user-a'); await flush();
  assert.equal(s.notices.length,2);
  assert.equal(s.stats().removed,1);
  for (const opts of [{userId:'user-b'}, {userId:null}, {optedIn:false}]) {
    const off = setup(opts);
    assert.equal(off.startPolling(),undefined);
    assert.equal(off.startEvents(),undefined);
    assert.equal(off.stats().queries,0);
  }
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
  console.log('PASS: explicit opt-in, per-user isolation, realtime, foreground polling, duplicate suppression, cleanup and safe notification click. No real notifications sent.');
})().catch(e=>{console.error(e);process.exitCode=1;});
