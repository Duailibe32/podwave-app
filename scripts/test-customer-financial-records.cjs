const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {transformSync}=require('esbuild');
const moduleFor = {exports:{}};
vm.runInNewContext(transformSync(fs.readFileSync('src/utils/customerFinancialRecords.ts','utf8'),{loader:'ts',format:'cjs'}).code,{module:moduleFor,exports:moduleFor.exports});
const {buildCustomerFinancialFiles:build,normalizeCustomerContact:phone}=moduleFor.exports;
assert.equal(phone('(86) 99999-1234'),'+5586999991234');
assert.equal(phone('+55 86 99999-1234'),'+5586999991234');
assert.equal(phone('5586999991234'),'+5586999991234');
assert.equal(phone('+1 (212) 555-1234'),'+12125551234');
assert.equal(phone('123'),undefined);
assert.equal(phone('00000000000'),undefined);
assert.equal(phone('++55 86 99999-1234'),undefined);
assert.equal(phone('+55 123456789'),undefined);
assert.equal(phone('nome@example.test'),undefined);
const sale=(id,extra={})=>({id,customerName:'José Silva',customerPhone:'(86) 99999-1234',saleDate:'2026-10-30',netTotal:100,grossTotal:100,amountReceived:20,amountPending:80,orderStatus:'confirmado',paymentStatus:'parcial',receipts:[{id:'p1',amount:20,receiptDate:'2026-10-30',paymentMethod:'Pix'}],_syncStatus:'synced',...extra});
const account=(id,extra={})=>({id,counterpartyName:'JOSE SILVA',counterpartyContact:'+55 86 99999-1234',type:'a_receber',description:'Conta antiga',issueDate:'2026-10-29',totalAmount:50,amountPaid:10,amountPending:40,paymentStatus:'parcial',payments:[{id:'p1',amount:10,paymentDate:'2026-10-29',paymentMethod:'Dinheiro'}],_syncStatus:'synced',...extra});
const sales=[sale('s1'),sale('s2',{customerName:'  JOSE  SILVA ',customerPhone:'+55 86 99999-1234',netTotal:10.01,amountReceived:0.01,amountPending:10,receipts:[]}),sale('s3',{orderStatus:'cancelado',netTotal:900,amountReceived:900,amountPending:0})];
const accounts=[account('c1'),account('payable',{type:'a_pagar',totalAmount:999,amountPending:999}),account('cancelled',{paymentStatus:'cancelado',amountPaid:999,amountPending:999})];
const snapshot=JSON.stringify({sales,accounts});
let files=build(sales,accounts);
assert.equal(files.length,1);
let file=files[0];
assert.equal(file.salesCount,2);assert.equal(file.purchasesCents,11001);assert.equal(file.salesReceivedCents,2001);
assert.equal(file.standaloneReceivedCents,1000);assert.equal(file.pendingCents,13000);
assert.equal(file.records.length,5);assert.equal(file.unconfirmedCount,0);
assert.equal(file.records.flatMap(r=>r.payments).length,4); // Details do not increase received balances.
assert.equal(JSON.stringify({sales,accounts}),snapshot); // Pure read, no mutations.
assert.equal(build([sale('free',{netTotal:0,grossTotal:100,amountReceived:0,amountPending:0})],[])[0].purchasesCents,0);
// Same names without a reliable phone must not be silently merged.
files=build([sale('a',{customerPhone:undefined}),sale('b',{customerPhone:undefined})],[]);
assert.equal(files.length,2);assert.ok(files.every(f=>!f.groupedByContact));
assert.equal(build([sale('a'),sale('b',{customerPhone:'(86) 98888-1234'})],[]).length,2);
assert.equal(build([sale('a'),sale('b',{customerName:'Maria Silva'})],[]).length,2);
assert.equal(build([sale('a',{customerName:undefined}),sale('b',{customerName:undefined})],[]).length,2);
files=build([sale('same'),sale('same')],[account('same')]);assert.equal(files[0].records.length,2); // IDs are scoped to their source.
file=build([sale('detailed',{receipts:[{id:'p1',amount:20,receiptDate:'2026-10-30',paymentMethod:'Pix'},{id:'p1',amount:20,receiptDate:'2026-10-30',paymentMethod:'Pix'}],_syncStatus:'pending_sync'})],[])[0];
assert.equal(file.records[0].payments.length,1);assert.equal(file.unconfirmedCount,1);assert.equal(file.salesReceivedCents,2000);
assert.equal(build([],[]).length,0);
file=build([sale('utc',{saleDate:'2026-10-30T01:00:00Z'}),sale('local',{saleDate:'2026-10-29T23:00:00-03:00'})],[])[0];
assert.equal(file.records[0].id,'local'); // Compare instants, not lexicographic dates.
assert.equal(build([sale('legacy-null',{receipts:[null]})],[])[0].records[0].payments.length,0);
// Server render enforces owner-only access and handles an empty real-data state.
const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
let fixture={isOwner:false,manualSales:sales,manualCommitments:accounts,isLoadingBusinessData:false};
const ui={exports:{}};
vm.runInNewContext(transformSync(fs.readFileSync('src/components/admin/CustomerFinancialSection.tsx','utf8'),{loader:'tsx',format:'cjs'}).code,{module:ui,exports:ui.exports,require:name=>name==='react'?React:name.includes('CatalogContext')?{useCatalog:()=>fixture}:name.includes('customerFinancialRecords')?moduleFor.exports:name.includes('CustomerServiceHistory')?{CustomerServiceHistory:()=>null}:require(name)});
let html=renderToStaticMarkup(React.createElement(ui.exports.CustomerFinancialSection));
assert.ok(html.includes('restrita ao proprietário'));assert.ok(!html.includes('José'));
fixture={...fixture,isOwner:true};html=renderToStaticMarkup(React.createElement(ui.exports.CustomerFinancialSection));
assert.ok(html.includes('José Silva'));assert.ok(html.includes('130,00'));
fixture={...fixture,manualSales:[],manualCommitments:[]};html=renderToStaticMarkup(React.createElement(ui.exports.CustomerFinancialSection));
assert.ok(html.includes('Nenhum cliente encontrado'));
console.log('PASS: safe identity grouping, separate unidentified records, cents/zero totals, cancellation, receivables only, no double counting, payment deduplication, read-only input, owner access and empty state. No real data modified.');
