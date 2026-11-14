import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { applyCakePatch, EMPTY_CAKE, estimateCake, type CakeState } from '../src/shared/cake';

const API = 'http://127.0.0.1:3001';

async function health() {
  const body = await (await fetch(`${API}/api/health`)).json();
  return body as { textModel: string; fallbackAttempts: number; imageConfigured: boolean };
}

async function turn(phrase: string, state: CakeState, index: number) {
  const started = performance.now();
  const response = await fetch(`${API}/api/interpret`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ turnId: `fallback-${Date.now()}-${index}`, phrase, state }) });
  const body = await response.json();
  return { status: response.status, body, httpMs: performance.now() - started };
}

const FRUIT = new Set(['strawberries', 'blueberries', 'raspberries', 'cherries', 'lemon-zest', 'passion-fruit', 'mango', 'berries', 'red currants']);

const rows: Record<string, unknown>[] = [];
let state = EMPTY_CAKE;
let pass = true;

// Non-trigger probes must never call the fallback, even in fallback-heavy sessions.
for (const [index, phrase] of ['make it two layers', 'add a princess topper'].entries()) {
  const { status, body, httpMs } = await turn(phrase, state, index);
  try {
    assert.equal(status, 200, body.error);
    assert.equal(body.provider.interpreter ?? 'jev', 'jev');
    assert.equal(body.provider.fallback, undefined, `${phrase} unexpectedly used the fallback`);
    state = applyCakePatch(state, body.patch).state;
    rows.push({ phrase, interpreter: 'jev', pass: true, httpMs: Math.round(httpMs), patch: body.patch });
  } catch (error) { pass = false; rows.push({ phrase, pass: false, error: String(error), body }); }
}

const before = await health();

// Phrases Jev cannot map to bounded questions; each may cost at most one real fallback call.
const openPhrases: [string, (next: CakeState, prev: CakeState, patch: Record<string, unknown>) => void][] = [
  ['something fruity for summer', (next, prev) => {
    assert.ok(next.exists, 'cake should exist');
    assert.ok(next.toppings.some(topping => [...FRUIT].some(fruit => topping.includes(fruit)))
      || ['lemon', 'vanilla', 'strawberry', 'raspberry', 'passion-fruit', 'mango'].includes(next.flavor),
      `expected a fruity direction, got ${JSON.stringify({ flavor: next.flavor, toppings: next.toppings })}`);
    assert.notDeepEqual(next, prev);
  }],
  ['make it look fancy', (next, prev) => assert.notDeepEqual(next, prev, 'fancy should change something bounded')],
  ['surprise me with a birthday cake for a 5-year-old', (next, prev) => {
    assert.ok(next.exists, 'cake should exist');
    assert.notDeepEqual(next, prev);
  }],
  ['I changed my mind, no fruit', (next, prev) => {
    const removedFruit = prev.toppings.filter(topping => !next.toppings.includes(topping));
    assert.ok(removedFruit.length > 0 || !prev.toppings.some(t => next.toppings.includes(t)),
      `expected fruit removal, before=${JSON.stringify(prev.toppings)} after=${JSON.stringify(next.toppings)}`);
  }],
  ['make it a winter wonderland cake', (next, prev) => assert.notDeepEqual(next, prev, 'winter wonderland should change something bounded')],
  ["something elegant for my parents' anniversary", (next, prev) => assert.notDeepEqual(next, prev, 'anniversary should change something bounded')],
];

let fallbackCalls = 0;
let totalCost = 0;
for (const [offset, [phrase, check]] of openPhrases.entries()) {
  const prev = state;
  const { status, body, httpMs } = await turn(phrase, prev, offset + 10);
  const interpreter = body.provider?.interpreter ?? 'jev';
  const usedFallback = interpreter === 'fallback';
  if (body.provider?.fallback) fallbackCalls += 1;
  if (typeof body.provider?.fallback?.costUsd === 'number') totalCost += body.provider.fallback.costUsd;
  try {
    assert.equal(status, 200, body.error);
    const next = applyCakePatch(prev, body.patch).state;
    if (usedFallback) {
      assert.equal(body.action, 'edit');
      assert.equal(typeof body.provider.fallback.durationMs, 'number');
      check(next, prev, body.patch);
    } else {
      // Jev handled it after all (e.g. bounded fruit removal): outcome must still be correct.
      check(next, prev, body.patch);
    }
    state = next;
    rows.push({ phrase, interpreter, pass: true, action: body.action, httpMs: Math.round(httpMs),
      jevMs: Math.round(body.provider.durationMs), fallbackMs: body.provider.fallback ? Math.round(body.provider.fallback.durationMs) : undefined,
      costUsd: body.provider.fallback?.costUsd, patch: body.patch, notices: body.notices,
      price: estimateCake(next).totalCents });
  } catch (error) {
    pass = false;
    rows.push({ phrase, interpreter, pass: false, error: String(error), patch: body.patch, notices: body.notices });
    state = applyCakePatch(prev, body.patch ?? {}).state;
  }
}

const after = await health();
const attempts = after.fallbackAttempts - before.fallbackAttempts;
try {
  assert.equal(attempts, fallbackCalls, 'health counter must match observed fallback calls');
  assert.ok(attempts <= 6, `fallback budget exceeded: ${attempts} calls`);
} catch (error) { pass = false; rows.push({ phrase: 'counter audit', pass: false, error: String(error), before: before.fallbackAttempts, after: after.fallbackAttempts }); }

console.log(JSON.stringify({ textModel: after.textModel, fallbackCalls, attempts, totalCostUsd: Number(totalCost.toFixed(6)),
  passCount: rows.filter(row => row.pass).length, failCount: rows.filter(row => !row.pass).length, rows }, null, 2));
if (!pass) process.exitCode = 1;
