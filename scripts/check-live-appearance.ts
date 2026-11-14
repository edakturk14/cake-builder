import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { applyCakePatch, createCake, estimateCake, type CakePatch } from '../src/shared/cake';
import type { InterpretResponse } from '../src/shared/interpretation';
const before = createCake({ toppers: ['castle', 'princess'], inscription: 'Eda' });
const cases: [string, CakePatch][] = [
  ['make the icing pink', { colors: { frosting: 'blush-pink' } }],
  ['write it in gold', { colors: { inscription: 'gold' } }],
  ['make the castle bigger', { topperStyles: { castle: { size: 'large' } } }],
  ['put the princess on the left', { topperStyles: { princess: { position: 'left' } } }],
  ['write Eda in capitals', { inscriptionStyle: { letterCase: 'upper' } }],
  ['make the filling lavender', { colors: { filling: 'lavender' } }],
];
const rows = [];
for (const [index, [phrase, patch]] of cases.entries()) {
  const start = performance.now();
  const response = await fetch('http://127.0.0.1:3001/api/interpret', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ turnId: `appearance-${Date.now()}-${index}`, phrase, state: before }) });
  const body = await response.json() as InterpretResponse & { error?: string };
  let pass = true, error = '';
  try {
    assert.equal(response.status, 200, body.error);
    assert.deepEqual(body.notices, []);
    assert.deepEqual(applyCakePatch(before, body.patch).state, applyCakePatch(before, patch).state);
    assert.equal(estimateCake(applyCakePatch(before, body.patch).state).totalCents, 6200);
  } catch (e) { pass = false; error = String(e); }
  rows.push({ phrase, pass, status: response.status, providerMs: body.provider?.durationMs, httpMs: performance.now() - start,
    notices: body.notices ?? [], expectedPatch: patch, actualPatch: body.patch, error });
}
console.log(JSON.stringify({ rows, noticeCount: rows.reduce((n, row) => n + row.notices.length, 0) }, null, 2));
if (process.env.APPEARANCE_RESULTS_PATH) writeFileSync(process.env.APPEARANCE_RESULTS_PATH, JSON.stringify(rows, null, 2));
if (rows.some(row => !row.pass)) process.exitCode = 1;
