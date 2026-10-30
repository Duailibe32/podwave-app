// In-memory PostgreSQL only: never connects to Supabase or changes browser data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { transformSync } = require('esbuild');
const { PGlite } = require('@electric-sql/pglite');

(async () => {
  const db = new PGlite();
  const tables = ['manual_sales', 'manual_expenses', 'merchandise_purchases', 'cash_movements', 'initial_cash_balances', 'manual_commitments'];
  const schema = fs.readFileSync('supabase/migrations/20261030000000_definitive_security_and_rls_hardening.sql', 'utf8');
  for (const table of tables) {
    const statement = schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table} \\([\\s\\S]*?\\n\\);`))?.[0];
    assert.ok(statement, table);
    await db.exec(statement);
  }
  let denied = false;
  const client = { async rpc(name,args) {
    assert.equal(name,'save_sale_with_stock');
    const {order_status,stock_managed,...row} = args.p_sale;
    const result = await client.from('manual_sales').upsert(row);
    return {error:result.error,data:result.error ? null : {sale:{...row,stock_managed,stock_revision:1}}};
  }, from(table) {
    assert.ok(tables.includes(table));
    return {
      select() { return { async order(column, options) {
        if (denied) return { data: null, error: { code: '42501', message: 'permission denied' } };
        try {
          const { rows } = await db.query(`SELECT * FROM ${table} ORDER BY ${column} ${options.ascending ? 'ASC' : 'DESC'}`);
          return { data: rows, error: null };
        } catch (error) { return { data: null, error }; }
      } }; },
      async upsert(input, options) {
        if (denied) return { error: { code: '42501', message: 'permission denied' } };
        try {
          for (const row of Array.isArray(input) ? input : [input]) {
            const keys = Object.keys(row), values = Object.values(row).map(v => Array.isArray(v) ? JSON.stringify(v) : v);
            const conflict = options?.onConflict || 'id';
            await db.query(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map((_,i) => '$'+(i+1)).join(',')}) ON CONFLICT (${conflict}) DO UPDATE SET ${keys.map(k => `${k}=EXCLUDED.${k}`).join(',')}`, values);
          }
          return { error: null };
        } catch (error) { return { error }; }
      },
    };
  } };
  let source = fs.readFileSync('src/services/supabase.ts', 'utf8').replace(/\r\n/g, '\n');
  source = source.replace(/export function getSupabaseClient\(\): SupabaseClient \| null \{[\s\S]*?\n\}/, 'export function getSupabaseClient() { return globalThis.__testClient; }');
  const code = transformSync(source, { loader: 'ts', format: 'cjs', define: { 'import.meta.env': '{}' } }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require, console, crypto:require('node:crypto').webcrypto, __testClient: client });
  const api = module.exports;
  const date = '2026-10-30';
  const note = 'Observação original\nacentuação e {JSON}';
  const cases = [
    ['ManualSale', { id:'sale', saleDate:date+'T14:30:00-03:00', customerPhone:'123', deliveryType:'Retirada no Local', deliveryFee:5, discount:10, grossTotal:100, netTotal:95, amountReceived:20, amountPending:75, paymentStatus:'parcial', paymentMethod:'Pix', orderStatus:'cancelado', receivedDate:date, dueDate:date, items:[{productName:'item',quantity:1,unitPrice:100,subtotal:100}], receipts:[{id:'r1',amount:20,receiptDate:date,paymentMethod:'Pix'}], installments:[], notes:note }],
    ['ManualExpense', { id:'expense', expenseDate:date, category:'Outros', description:'Despesa', amount:40, amountPaid:0, amountPending:40, paymentStatus:'a_pagar', paymentMethod:'Boleto', payments:[], installments:[], notes:note }],
    ['MerchandisePurchase', { id:'purchase', purchaseDate:date, supplierName:'Fornecedor', supplierContact:'123', invoiceOrRef:'NF123', itemsSubtotal:0, shippingCost:12, otherCosts:3, discount:0, totalCost:15, amountPaid:0, amountPending:15, paymentStatus:'pendente', paymentMethod:'Boleto', receivingStatus:'parcialmente_recebido', items:[], payments:[], installments:[], notes:note }],
    ['CashMovement', { id:'movement', movementDate:date+'T14:30:00-03:00', type:'saida', originType:'transferencia', referenceId:'ref', accountChannel:'pix_banco', destinationAccountChannel:'dinheiro_caixa', amount:50, description:'Transferência', notes:note }],
    ['ManualCommitment', { id:'commitment', type:'a_receber', description:'Conta', counterpartyName:'Cliente', counterpartyContact:'123', category:'Outros', totalAmount:30, amountPaid:0, amountPending:30, issueDate:date, paymentMethod:'Pix', accountChannel:'pix_banco', paymentStatus:'pendente', installments:[], payments:[], notes:note }],
  ];
  const plurals = { ManualSale:'ManualSales', ManualExpense:'ManualExpenses', MerchandisePurchase:'MerchandisePurchases', CashMovement:'CashMovements', ManualCommitment:'ManualCommitments' };
  for (const [name, entry] of cases) {
    assert.equal(await api[`save${name}ToSupabase`](entry), true, name+' save');
    let [loaded] = await api[`fetch${plurals[name]}FromSupabase`]();
    for (const [key,value] of Object.entries(entry)) assert.deepEqual(JSON.parse(JSON.stringify(loaded[key])), value, name+'.'+key);
    assert.equal(await api[`save${name}ToSupabase`](loaded), true, name+' update');
    [loaded] = await api[`fetch${plurals[name]}FromSupabase`]();
    assert.equal(loaded.notes, note, name+' notes after edit');
  }
  const balance = {id:'init_pix_banco',accountChannel:'pix_banco',amount:0,referenceDate:date,notes:note};
  assert.equal(await api.saveInitialCashBalancesToSupabase([balance]), true);
  assert.equal((await api.fetchInitialCashBalancesFromSupabase())[0].amount, 0);
  assert.equal(await api.saveInitialCashBalancesToSupabase([{...balance, amount:25}]), true);
  assert.equal((await api.fetchInitialCashBalancesFromSupabase())[0].amount, 25);
  // Existing plain notes and deployed combined freight remain readable; zero subtotal stays zero.
  await db.exec("UPDATE merchandise_purchases SET notes='texto antigo', subtotal=0, freight_or_extra_cost=9");
  let [purchase] = await api.fetchMerchandisePurchasesFromSupabase();
  assert.equal(purchase.notes, 'texto antigo'); assert.equal(purchase.shippingCost,9); assert.equal(purchase.otherCosts,0); assert.equal(purchase.itemsSubtotal,0);
  await db.exec("UPDATE manual_sales SET notes='podwave:financial-notes:v1:broken'");
  assert.equal((await api.fetchManualSalesFromSupabase())[0].notes, 'podwave:financial-notes:v1:broken');
  assert.equal(api.isMissingTableError({code:'PGRST204',message:'column not found in schema cache'}),false);
  assert.equal(api.isMissingTableError({code:'PGRST205'}),true);
  // Remote-only fields must survive an app edit without being replaced by defaults.
  await db.exec("UPDATE merchandise_purchases SET stock_added=true, account_channel='outro', payment_date='2026-10-29'");
  [purchase] = await api.fetchMerchandisePurchasesFromSupabase();
  assert.equal(await api.saveMerchandisePurchaseToSupabase(purchase),true);
  const preserved = (await db.query('SELECT stock_added, account_channel, payment_date FROM merchandise_purchases')).rows[0];
  assert.deepEqual(preserved,{stock_added:true,account_channel:'outro',payment_date:'2026-10-29'});
  // Exercise the actual context merge helper for pending local balances.
  const context = fs.readFileSync('src/context/CatalogContext.tsx','utf8').replace(/\r\n/g,'\n');
  const mergeSource = context.slice(context.indexOf('  const mergeFinancialRecords ='),context.indexOf('  const [isSyncingPending,'));
  const mergeCode = transformSync(mergeSource+'\n globalThis.testMerge = mergeFinancialRecords;', {loader:'tsx',format:'cjs'}).code;
  const sandbox = { getTombstones: () => [], testMerge: null };
  vm.runInNewContext(mergeCode,sandbox);
  const pending = {...balance,amount:99,_syncStatus:'pending_sync'};
  assert.equal(sandbox.testMerge([balance],[pending])[0].amount,99);
  assert.equal(sandbox.testMerge([],[pending])[0].amount,99);
  assert.equal(sandbox.testMerge([balance],[])[0]._syncStatus,'synced');
  denied = true;
  for (const [name, entry] of cases) assert.equal(await api[`save${name}ToSupabase`](entry),false);
  assert.equal(await api.saveInitialCashBalancesToSupabase([balance]),false);
  await db.close();
  console.log('PASS: six financial tables, PostgreSQL constraints, save/load/edit, optional fields, zero values, notes, transfers and denied writes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
