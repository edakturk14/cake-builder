import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { applyCakePatch, cloneCake, createCake, EMPTY_CAKE, estimateCake, type CakePatch, type CakeState } from '../src/shared/cake';
import type { InterpretResponse } from '../src/shared/interpretation';

const cases: { id: string; phrase: string; before: CakeState; expected: CakeState; expectedCents: number; clarification?: boolean; limit?: boolean }[] = [];
function scenario(id: string, phrase: string, before: CakeState, patch: CakePatch, expectedCents: number, extras = {}) {
  cases.push({ id, phrase, before, expected: applyCakePatch(before, patch).state, expectedCents, ...extras });
}
scenario('castle', 'Add a castle.', cloneCake(EMPTY_CAKE), { exists: true, addToppers: ['castle'] }, 5200);
scenario('unicorn', 'Add a unicorn.', cloneCake(EMPTY_CAKE), { exists: true, addToppers: ['unicorn'] }, 5200);
scenario('knight-beside-princess', 'Put a knight next to the princess.', createCake({ layers: 2, toppers: ['princess'], inscription: 'Eda' }), { addToppers: ['knight'] }, 6800);
scenario('replace-only-castle', 'Swap the castle for a dragon.', createCake({ toppers: ['castle', 'princess'], inscription: 'Eda' }), { removeToppers: ['castle'], addToppers: ['dragon'] }, 6200);
scenario('remove-only-castle', 'Remove the castle.', createCake({ toppers: ['castle', 'unicorn'], inscription: 'Eda' }), { removeToppers: ['castle'] }, 5200);
scenario('spaceship-synonym', 'Add a spaceship.', cloneCake(EMPTY_CAKE), { exists: true, addToppers: ['rocket'] }, 5200);
scenario('grandma-custom', "Add my grandma's face.", cloneCake(EMPTY_CAKE), { exists: true, customTopper: { request: "my grandma's face", assetId: null } }, 4200);
scenario('generic-character', 'Add a character.', createCake(), {}, 4200, { clarification: true });
scenario('generic-figure', 'Put a figure on top.', createCake({ toppers: ['castle'] }), {}, 5200, { clarification: true });
scenario('two-new-toppers', 'Add a castle and a unicorn.', createCake(), { addToppers: ['castle', 'unicorn'] }, 6200);
scenario('two-removals', 'Remove the castle and the unicorn.', createCake({ toppers: ['castle', 'unicorn'] }), { removeToppers: ['castle', 'unicorn'] }, 4200);
scenario('third-topper-limit', 'Make it two layers and add a unicorn.', createCake({ toppers: ['castle', 'princess'] }), {}, 6200, { limit: true });
scenario('three-new-topper-limit', 'Add a castle, a unicorn, and a princess.', createCake(), {}, 4200, { limit: true });

const rows = [];
for (const [index, item] of cases.entries()) {
  const started = performance.now();
  let status: number | undefined, body: Partial<InterpretResponse> & { error?: string } = {};
  try {
    const response = await fetch('http://127.0.0.1:3001/api/interpret', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turnId: `live-topper-${Date.now()}-${index}`, phrase: item.phrase, state: item.before }),
    });
    status = response.status;
    body = await response.json();
  } catch (error) { body.error = error instanceof Error ? error.message : 'Request failed'; }
  const totalMs = performance.now() - started;
  const actual = status === 200 && body.patch ? applyCakePatch(item.before, body.patch).state : item.before;
  const wrongFields = Object.keys(item.expected).flatMap(key => {
    const field = key as keyof CakeState;
    const a = field === 'toppings' ? [...actual.toppings].sort() : actual[field];
    const e = field === 'toppings' ? [...item.expected.toppings].sort() : item.expected[field];
    return JSON.stringify(a) === JSON.stringify(e) ? [] : [{ field, expected: e, actual: a }];
  });
  const notices = body.notices ?? [];
  const actualCents = estimateCake(actual).totalCents;
  const pass = status === 200 && !wrongFields.length && actualCents === item.expectedCents
    && (!item.clarification || notices.some(note => /which topper|clarify/i.test(note)))
    && (!item.limit || notices.includes('Up to two toppers in this demo'));
  rows.push({ id: item.id, phrase: item.phrase, status, model: body.provider?.model,
    expectedCents: item.expectedCents, actualCents, expectedToppers: item.expected.toppers, actualToppers: actual.toppers,
    expectedCustom: item.expected.customTopper, actualCustom: actual.customTopper, requiresQuote: estimateCake(actual).requiresQuote,
    providerMs: body.provider?.durationMs, totalMs, pass, wrongFields, notices, error: body.error });
}
console.table(rows.map(row => ({ ...row, wrongFields: JSON.stringify(row.wrongFields), notices: row.notices.join('; ') })));
const report = { date: new Date().toISOString(), rows };
if (process.env.TOPPER_RESULTS_PATH) writeFileSync(process.env.TOPPER_RESULTS_PATH, JSON.stringify(report, null, 2));
console.log('Real Jev HTTP checks only; no microphone or browser paint measured.');
if (rows.some(row => !row.pass)) process.exitCode = 1;
