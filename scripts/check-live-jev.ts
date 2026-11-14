import dotenv from 'dotenv';
import assert from 'node:assert/strict';
import { interpret } from '../server/jev';
import { applyCakePatch, cloneCake, EMPTY_CAKE, estimateCake, type CakeState } from '../src/shared/cake';
import { CAKE_FIXTURES, DEMO_TURNS } from '../src/shared/fixtures';

dotenv.config({ path: '.env.local', quiet: true });
if (!process.env.TYPESAFE_API_KEY) {
  console.error('PENDING: set TYPESAFE_API_KEY in .env.local, then run npx tsx scripts/check-live-jev.ts. No fixture fallback was run.');
  process.exit(2);
}
const rows: { example: string; turn: number; model: string; providerMs: number; totalCents: number; result: string; notices: string[]; topperNoticeCount: number }[] = [];
const initialNotices: string[] = [];
let sequence = 0;
async function run(phrase: string, state: CakeState) {
  return interpret({ turnId: `live-check-${++sequence}`, phrase, state });
}
let failures = 0;
// Run the shared six-step live path first, including name correction and princess removal.
let state = cloneCake(EMPTY_CAKE);
const history: CakeState[] = [];
for (const turn of DEMO_TURNS) {
  const response = await run(turn.text, state);
  if (response.action === 'undo') state = history.pop() ?? state;
  else { history.push(cloneCake(state)); state = applyCakePatch(state, response.patch).state; }
  assert.equal(estimateCake(state).totalCents, turn.expectedCents, turn.text);
  initialNotices.push(...response.notices);
  console.log(JSON.stringify({ phase: 'initial-live-flow', turn: sequence, action: response.action, providerMs: Math.round(response.provider.durationMs), model: response.provider.model, totalCents: estimateCake(state).totalCents, notices: response.notices }));
}
assert.equal(state.inscription, 'Ada');
assert.equal(state.layers, 2);
assert.deepEqual(state.toppers, []);

for (const fixture of CAKE_FIXTURES) {
  let actual = cloneCake(EMPTY_CAKE);
  let expected = cloneCake(EMPTY_CAKE);
  for (const [index, turn] of fixture.turns.entries()) {
    const result = await run(turn.text, actual);
    actual = applyCakePatch(actual, result.patch).state;
    expected = applyCakePatch(expected, turn.patch).state;
    // Fixture 12 historically capitalizes "My"; live must preserve the customer's exact span.
    if (expected.customTopper?.request === 'My cat Miso') expected.customTopper.request = 'my cat Miso';
    let success = true;
    try {
      assert.equal(result.action, 'edit');
      assert.deepEqual({ ...actual, toppings: [...actual.toppings].sort() }, { ...expected, toppings: [...expected.toppings].sort() });
      assert.equal(estimateCake(actual).totalCents, turn.expectedCents);
      assert.equal(result.notices.filter(note => /topper/i.test(note)).length, 0, 'Original examples must not produce topper notices');
    } catch { success = false; failures++; }
    rows.push({ example: fixture.id, turn: index + 1, model: result.provider.model, providerMs: Math.round(result.provider.durationMs), totalCents: estimateCake(actual).totalCents, result: success ? 'PASS' : 'FAIL: attributes, price or unexpected notice differ', notices: result.notices, topperNoticeCount: result.notices.filter(note => /topper/i.test(note)).length });
  }
}
console.table(rows);
console.log(JSON.stringify({ initialNoticeCount: initialNotices.length, initialTopperNoticeCount: initialNotices.filter(note => /topper/i.test(note)).length, catalogNoticeCount: rows.reduce((n, row) => n + row.notices.length, 0), catalogTopperNoticeCount: rows.reduce((n, row) => n + row.topperNoticeCount, 0) }));
console.log('Real provider request durations only. Browser final-transcript-to-paint requires the app timing table. No audio or paint was measured here.');
if (failures) process.exitCode = 1;
