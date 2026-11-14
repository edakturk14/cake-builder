import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { applyCakePatch, createCake, estimateCake, type CakePatch } from '../src/shared/cake';
const before = createCake({ theme: 'tennis', inscription: 'Eda', colors: { filling: 'lavender' } });
const cases: [string, CakePatch][] = [
  ['make it a wedding cake', { occasion: 'wedding' }],
  ["it's for my promotion", { occasion: 'promotion' }],
  ['graduation cake with a cap', { occasion: 'graduation', addToppers: ['graduation-cap'] }],
  ['change it to an anniversary cake', { occasion: 'anniversary' }],
];
const rows = [];
for (const [index, [phrase, patch]] of cases.entries()) {
  const started = performance.now();
  const response = await fetch('http://127.0.0.1:3001/api/interpret', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ turnId: `occasion-${Date.now()}-${index}`, phrase, state: before }) });
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
