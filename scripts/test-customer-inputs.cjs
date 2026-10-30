// Exercises the production helpers and mocked ViaCEP responses. No network or Supabase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { transformSync } = require('esbuild');

function load(file, globals = {}) {
  const module = {exports: {}};
  const context = { module, exports: module.exports, AbortController, TypeError, SyntaxError, setTimeout, clearTimeout, ...globals };
  vm.runInNewContext(transformSync(fs.readFileSync(file, 'utf8'), { loader: 'ts', format: 'cjs' }).code, context);
  return module.exports;
}

(async () => {
  const { formatCep, formatBrazilianPhone } = load('src/utils/customerInputs.ts');
  assert.equal(formatCep('01001000'), '01001-000');
  assert.equal(formatCep('01.001-00099'), '01001-000');
  assert.equal(formatCep('abc'), '');
  assert.equal(formatBrazilianPhone('11987654321'), '(11) 98765-4321');
  assert.equal(formatBrazilianPhone('1132345678'), '(11) 3234-5678');
  assert.equal(formatBrazilianPhone('+55 (11) 98765-4321'), '(11) 98765-4321');
  assert.equal(formatBrazilianPhone(''), '');

  let calls = 0;
  let reply = { logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP' };
  let httpOk = true;
  let networkError = false;
  let invalidJson = false;
  const { lookupCep } = load('src/services/cep.ts', { fetch: async (url, options) => {
    calls++;
    assert.equal(url, 'https://viacep.com.br/ws/01001000/json/');
    assert.ok(options.signal);
    if (networkError) throw new TypeError('network unavailable');
    return { ok: httpOk, json: async () => { if (invalidJson) throw new SyntaxError('bad JSON'); return reply; } };
  } });
  await assert.rejects(lookupCep('123'), /8 dígitos/);
  assert.equal(calls, 0, 'invalid CEP must not be sent');
  const found = await lookupCep('01001-000');
  assert.equal(found.street, 'Praça da Sé'); assert.equal(found.state, 'SP');
  reply = { localidade: 'São Paulo', uf: 'SP', logradouro: '', bairro: '' };
  assert.equal((await lookupCep('01001000')).street, '', 'generic CEP can omit street');
  reply = { erro: true };
  await assert.rejects(lookupCep('01001000'), /não encontrado/);
  reply = {};
  await assert.rejects(lookupCep('01001000'), /inválida/);
  httpOk = false;
  await assert.rejects(lookupCep('01001000'), /manualmente/);
  networkError = true;
  await assert.rejects(lookupCep('01001000'), /manualmente/);
  networkError = false; httpOk = true; invalidJson = true;
  await assert.rejects(lookupCep('01001000'), /manualmente/);

  const aborting = load('src/services/cep.ts', { fetch: async (_, {signal}) => {
    if (signal.aborted) throw new Error('cancelled');
    return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('cancelled'))));
  } });
  const controller = new AbortController();
  const pending = aborting.lookupCep('01001000', controller.signal);
  controller.abort();
  await assert.rejects(pending, /cancelled/);

  // Run the actual hook with minimal hook primitives to test races and close/unmount.
  let state = [], refs = [], stateIndex, refIndex, effectDeps, cleanup, result, cep, enabled;
  let responses = [], applied = [];
  const react = {
    useState(initial) { const i = stateIndex++; if (!(i in state)) state[i] = initial; return [state[i], value => {state[i] = value;}]; },
    useRef(initial) { const i = refIndex++; return refs[i] || (refs[i] = {current: initial}); },
    useEffect(fn, deps) { if (!effectDeps || deps.some((d, i) => d !== effectDeps[i])) { cleanup?.(); effectDeps = deps; cleanup = fn(); } },
  };
  const hook = load('src/hooks/useCepLookup.ts', { require(name) {
    if (name === 'react') return react;
    if (name === '../services/cep') return {lookupCep: () => new Promise(resolve => responses.push(resolve))};
    throw new Error(name);
  } }).useCepLookup;
  function render(newCep, isEnabled = true) { cep = newCep; enabled = isEnabled; stateIndex = 0; refIndex = 0; result = hook(cep, a => applied.push(a), enabled); }
  render('01001-000');
  let first = result.handleLookupCep();
  render('02002-000');
  let second = result.handleLookupCep();
  responses[0]({street:'outdated'}); await first;
  assert.equal(applied.length, 0, 'old CEP must not replace the new address');
  responses[1]({street:'current'}); await second;
  assert.equal(applied[0].street, 'current');
  render('02002-000'); let closed = result.handleLookupCep();
  render('02002-000', false);
  responses[2]({street:'after close'}); await closed;
  assert.equal(applied.length, 1, 'closed form ignores pending results');
  cleanup?.();
  console.log('PASS: phone/CEP formatting, validation, lookup, generic/missing CEP, HTTP/network failures, cancellation and stale/closed-form responses. No real request sent.');
})().catch(error => { console.error(error); process.exitCode = 1; });
