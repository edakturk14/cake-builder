import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { applyCakePatch, createCake, estimateCake, type CakePatch } from '../src/shared/cake';
const cases: [string, CakePatch, CakePatch?][] = [
  ['3 candles', { candles: { style: 'plain', count: 3 } }],
  ['three candles', { candles: { style: 'plain', count: 3 } }],
  ['a 3 candle', { candles: { style: 'number', number: '3' } }],
  ['make it 6 candles', { candles: { style: 'plain', count: 6 } }, { candles: { style: 'plain', count: 3 } }],
  ["it's my 30th, add a number candle", { occasion: 'birthday', candles: { style: 'number', number: '30' } }],
  ['add birthday candles', { candles: { style: 'plain', count: 5 } }],
];
const rows = [];
for (const [index, [phrase, patch, initial]] of cases.entries()) {
  const before = createCake({ toppers: ['castle', 'princess'], inscription: 'Eda', ...initial });
  const started = performance.now();
  const response = await fetch('http://127.0.0.1:3001/api/interpret', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ turnId: `candles-${Date.now()}-${index}`, phrase, state: before }) });
  const body = await response.json();
  let pass = true, error = '';
  try {
    assert.equal(response.status, 200, body.error); assert.deepEqual(body.notices, []);
    const actual = applyCakePatch(before, body.patch).state, expected = applyCakePatch(before, patch).state;
    assert.deepEqual(actual, expected); assert.equal(estimateCake(actual).totalCents, estimateCake(expected).totalCents);
  } catch (e) { pass = false; error = String(e); }
  rows.push({ phrase, pass, notices: body.notices, patch: body.patch, providerMs: body.provider?.durationMs, httpMs: performance.now() - started, error });
}
console.log(JSON.stringify({ rows, noticeCount: rows.reduce((n, r) => n + (r.notices?.length ?? 0), 0) }, null, 2));
if (rows.some(row => !row.pass)) process.exitCode = 1;
