import test from 'node:test';
import assert from 'node:assert/strict';
import { DesignerQueue, type Transport } from '../src/lib/designerQueue';
import { EMPTY_CAKE, estimateCake, applyCakePatch, cloneCake, type CakePatch } from '../src/shared/cake';
import { CAKE_FIXTURES } from '../src/shared/fixtures';
import { buildQuestions, extractCandidates, normalizeAnswers, validateRequest, interpret, InterpretationError } from '../server/jev';
import type { InterpretResponse } from '../src/shared/interpretation';
import { createSpeechResultCollector } from '../src/lib/speechResults';
import { TOPPER_CATALOG } from '../src/shared/toppers';

const tick = () => new Promise(resolve => setImmediate(resolve));
const makeResult = (id: string, patch: InterpretResponse['patch'] = {}, action: InterpretResponse['action'] = 'edit'): InterpretResponse => ({
  turnId: id, action, patch, notices: [], provider: { model: 'fixture-not-live-jev', durationMs: 12, status: 200 },
});

test('fixture only: initial chocolate/layers/princess/Eda/Ada/undo sequence', async () => {
  const patches: CakePatch[] = [{ exists: true }, { layers: 2 }, { addToppers: ['princess'] }, { occasion: 'birthday', inscription: 'Eda' }, { inscription: 'Ada' }];
  let index = 0;
  const queue = new DesignerQueue(async request => makeResult(request.turnId, patches[index++] || {}, index > patches.length ? 'undo' : 'edit'));
  const prices = [4200, 4800, 5800, 5800, 5800, 5800];
  for (let i = 0; i < 6; i++) {
    queue.submit(['I want a cake.', 'Make it two layers.', 'Add a princess on top.', 'Make it a birthday cake and write Eda on top.', 'Change the name to Ada.', 'Undo.'][i]);
    await tick();
    assert.equal(estimateCake(queue.getSnapshot().cake).totalCents, prices[i]);
  }
  assert.equal(queue.getSnapshot().cake.inscription, 'Eda');
  assert.deepEqual(queue.getSnapshot().cake.toppers, ['princess']);
  assert.equal(queue.getSnapshot().cake.layers, 2);
  assert.equal(queue.getSnapshot().timings.length, 6);
});

test('rapid finalized turns serialize and second receives newly confirmed state; duplicate utterance ignored', async () => {
  const calls: Parameters<Transport>[0][] = [];
  let release!: (value: InterpretResponse) => void;
  const queue = new DesignerQueue(async request => {
    calls.push(request);
    if (calls.length === 1) return new Promise(resolve => { release = resolve; });
    return makeResult(request.turnId, { layers: 2 });
  });
  queue.submit('cake', { utteranceId: 'speech-1-0' });
  queue.submit('cake', { utteranceId: 'speech-1-0' });
  queue.submit('two layers', { utteranceId: 'speech-1-1' });
  assert.equal(calls.length, 1);
  assert.equal(queue.getSnapshot().pendingCount, 2);
  release(makeResult(calls[0].turnId, { exists: true, flavor: 'vanilla' }));
  await tick();
  assert.equal(calls.length, 2);
  assert.equal(calls[1].state.flavor, 'vanilla');
  assert.equal(calls[1].state.exists, true);
  assert.equal(queue.getSnapshot().cake.layers, 2);
  queue.undo();
  await tick();
  assert.equal(queue.getSnapshot().cake.layers, 1);
});

test('reset ignores an eventual late response and clears queued old turns', async () => {
  let release!: (value: InterpretResponse) => void;
  let oldId = '';
  const queue = new DesignerQueue(async request => {
    oldId = request.turnId;
    return new Promise(resolve => { release = resolve; });
  });
  queue.submit('cake');
  queue.submit('princess');
  queue.reset();
  release(makeResult(oldId, { exists: true, addToppers: ['princess'] }));
  await tick();
  assert.deepEqual(queue.getSnapshot().cake, EMPTY_CAKE);
  assert.equal(queue.getSnapshot().pending, false);
  assert.equal(queue.getSnapshot().timings.length, 0);
  assert.equal(queue.getSnapshot().canUndo, false);
});

test('provider failures preserve design and expose status without fake success', async () => {
  let calls = 0;
  const queue = new DesignerQueue(async request => {
    if (++calls === 1) return makeResult(request.turnId, { exists: true, inscription: 'Eda' });
    throw Object.assign(new Error('Jev returned HTTP 429 Too Many Requests. Please retry shortly.'), { status: 429 });
  });
  queue.submit('cake Eda'); await tick();
  queue.submit('Ada'); await tick();
  assert.equal(queue.getSnapshot().cake.inscription, 'Eda');
  assert.equal(queue.getSnapshot().status, 'error');
  assert.match(queue.getSnapshot().error!, /429/);
});

test('candidate extraction preserves exact requested strings and stays under provider bound', () => {
  for (const [text, expected] of [
    ['Make it a birthday cake and write Eda on top.', 'Eda'],
    ['Change the name to Ada.', 'Ada'],
    ['Write Happy New Year, Eda.', 'Happy New Year, Eda'],
    ['Write Game, Set, Match.', 'Game, Set, Match'],
    ['Make a topper shaped like my cat Miso.', 'my cat Miso'],
  ]) assert.ok(extractCandidates(text).includes(expected), `${expected} candidate`);
  for (const question of Object.values(buildQuestions(extractCandidates('a '.repeat(300)))) ) assert.ok(Object.keys(question.criteria).length <= 255);
});

function fixtureAnswers(phrase: string, values: Record<string, string>) {
  const candidates = extractCandidates(phrase);
  const questions = buildQuestions(candidates);
  const answers = Object.fromEntries(Object.entries(questions).map(([id, question]) => {
    const raw = values[id] || (id === 'scope_topperOperation' && values.topperOperation && values.topperOperation !== 'keep' ? 'mentioned'
      : id === 'scope_inscription' && values.inscription && values.inscription !== 'keep' ? 'mentioned'
      : id === 'scope_occasion' && values.occasion && values.occasion !== 'keep' ? 'mentioned'
      : id.startsWith('scope_') ? 'unmentioned'
      : /^topper(?:Incoming|Outgoing)/.test(id) ? 'none'
      : id === 'customTopperAction' && values.customTopper?.startsWith('exact:') ? 'add'
      : id === 'customTopperAction' && values.customTopper === 'remove' ? 'remove' : 'keep');
    const choice = raw.startsWith('exact:') ? `span_${candidates.indexOf(raw.slice(6))}` : raw;
    return [id, { type: 'choice', choice, confidence: 1, probabilities: Object.fromEntries(Object.keys(question.criteria).map(option => [option, option === choice ? 1 : 0])) }];
  }));
  return { candidates, questions, payload: { model: 'fixture-not-live-jev', answers } };
}

test('fixture only: normalization applies compound edits and copies Jev-selected exact spans', () => {
  const f = fixtureAnswers('Make a two-layer chocolate birthday cake with princess. Write Eda.', { action: 'edit', exists: 'yes', layers: '2', flavor: 'chocolate', topperOperation: 'add', topperIncomingFirst: 'princess', occasion: 'birthday', inscription: 'exact:Eda' });
  const result = normalizeAnswers(f.payload, f.questions, f.candidates, EMPTY_CAKE);
  assert.equal(result.patch.layers, 2);
  assert.deepEqual(result.patch.addToppers, ['princess']);
  assert.equal(result.patch.inscription, 'Eda');
  assert.throws(() => normalizeAnswers({ model: 'bad', answers: {} }, f.questions, f.candidates, EMPTY_CAKE), InterpretationError);
});

test('fixture only: tier requests preserve layers; unknown topper stays exact custom request', () => {
  const f = fixtureAnswers("Two tiers with a topper shaped like my grandpa's face.", { action: 'edit', tiers: 'yes', layers: '2', customTopper: "exact:my grandpa's face" });
  const result = normalizeAnswers(f.payload, f.questions, f.candidates, EMPTY_CAKE);
  assert.equal(result.patch.layers, undefined);
  assert.deepEqual(result.patch.customTopper, { request: "my grandpa's face" });
  assert.match(result.notices.join(' '), /Tiers/);
});

test('request validation rejects malformed state and missing key produces genuine local 503', async () => {
  assert.throws(() => validateRequest({ turnId: 'ok', phrase: 'cake', state: {} }));
  assert.throws(() => validateRequest({ turnId: 'ok', phrase: ' ', state: EMPTY_CAKE }));
  const request = validateRequest({ turnId: 'ok', phrase: 'cake', state: EMPTY_CAKE });
  const saved = process.env.TYPESAFE_API_KEY;
  delete process.env.TYPESAFE_API_KEY;
  try { await assert.rejects(interpret(request), error => error instanceof InterpretationError && error.status === 503); }
  finally { if (saved !== undefined) process.env.TYPESAFE_API_KEY = saved; }
});

function boundedSelections(patch: CakePatch): Record<string, string> {
  const selections: Record<string, string> = { action: 'edit' };
  if (patch.exists) selections.exists = 'yes';
  for (const key of ['base', 'flavor', 'layers', 'theme'] as const) {
    if (key in patch) selections[key] = patch[key] === null ? 'remove' : String(patch[key]);
  }
  if ('occasion' in patch) selections.occasion = patch.occasion ?? 'none';
  if ('customTopper' in patch) selections.customTopper = patch.customTopper === null ? 'remove' : `exact:${patch.customTopper?.request === 'My cat Miso' ? 'my cat Miso' : patch.customTopper?.request}`;
  if ('inscription' in patch) selections.inscription = patch.inscription ? `exact:${patch.inscription}` : 'remove';
  if (patch.candles) {
    selections.candles = patch.candles.style === 'none' ? 'remove' : patch.candles.style ?? 'keep';
    if (patch.candles.number) selections.candleNumber = `exact:${patch.candles.number}`;
  }
  patch.addToppings?.forEach(topping => { selections[`topping_${topping}`] = 'add'; });
  patch.removeToppings?.forEach(topping => { selections[`topping_${topping}`] = 'remove'; });
  const added = patch.addToppers ?? patch.toppers ?? [];
  const removed = patch.removeToppers ?? [];
  if (added.length || removed.length) {
    selections.topperOperation = added.length && removed.length ? 'replace' : added.length ? 'add' : 'remove';
    if (added[0]) selections.topperIncomingFirst = added[0];
    if (added[1]) selections.topperIncomingSecond = added[1];
    if (removed[0]) selections.topperOutgoingFirst = removed[0];
    if (removed[1]) selections.topperOutgoingSecond = removed[1];
  }
  return selections;
}

for (const fixture of CAKE_FIXTURES) test(`bounded provider-response fixture ${fixture.id}: ${fixture.title}, NOT live Jev`, () => {
  let state = cloneCake(EMPTY_CAKE);
  let expected = cloneCake(EMPTY_CAKE);
  for (const turn of fixture.turns) {
    const fixtureResponse = fixtureAnswers(turn.text, boundedSelections(turn.patch));
    const result = normalizeAnswers(fixtureResponse.payload, fixtureResponse.questions, fixtureResponse.candidates, state);
    state = applyCakePatch(state, result.patch).state;
    expected = applyCakePatch(expected, turn.patch).state;
    if (expected.customTopper?.request === 'My cat Miso') expected.customTopper.request = 'my cat Miso';
    assert.deepEqual({ ...state, toppings: [...state.toppings].sort() }, { ...expected, toppings: [...expected.toppings].sort() }, turn.text);
    assert.equal(estimateCake(state).totalCents, turn.expectedCents);
    assert.equal(estimateCake(state).requiresQuote, Boolean(expected.customTopper));
    assert.deepEqual(estimateCake(state).quoteItems, expected.customTopper ? [expected.customTopper.request] : []);
  }
});

test('age correction, spelling, low confidence and New Year candle separation', () => {
  const initial = { ...cloneCake(EMPTY_CAKE), exists: true, candles: { style: 'number' as const, number: '40', count: null } };
  const correction = fixtureAnswers('Actually make it forty one.', { action: 'edit', candleNumber: 'exact:forty one' });
  assert.equal(normalizeAnswers(correction.payload, correction.questions, correction.candidates, initial).patch.candles?.number, '41');
  const newYear = fixtureAnswers('A New Year 2026 cake, write Happy 40th, Ada.', { action: 'edit', occasion: 'new-year', inscription: 'exact:Happy 40th, Ada' });
  const result = normalizeAnswers(newYear.payload, newYear.questions, newYear.candidates, EMPTY_CAKE);
  assert.equal(result.patch.candles, undefined);
  assert.equal(result.patch.inscription, 'Happy 40th, Ada');
  const uncertain = fixtureAnswers('Change the flavor.', { action: 'edit', flavor: 'vanilla', scope_flavor: 'mentioned' });
  uncertain.payload.answers.flavor.confidence = 0.2;
  const kept = normalizeAnswers(uncertain.payload, uncertain.questions, uncertain.candidates, initial);
  assert.equal(kept.patch.flavor, undefined);
  assert.match(kept.notices.join(' '), /clarify flavor/);
});

test('quoted inscriptions preserve exact punctuation, including trailing exclamation and question marks', () => {
  for (const inscription of ['Happy Birthday, Eda!', 'Ready, Ada?', 'Eda.']) {
    const phrase = `Write "${inscription}" on top.`;
    const f = fixtureAnswers(phrase, { action: 'edit', inscription: `exact:${inscription}` });
    assert.equal(normalizeAnswers(f.payload, f.questions, f.candidates, EMPTY_CAKE).patch.inscription, inscription);
  }
  assert.ok(extractCandidates('Write Happy Birthday, Eda! on top.').includes('Happy Birthday, Eda!'));
});

test('ambiguous candle style cannot be overridden by a confident numeric candidate', () => {
  for (const style of ['plain', 'number'] as const) {
    const state = { ...cloneCake(EMPTY_CAKE), exists: true, candles: { style, number: style === 'number' ? '21' : null, count: style === 'plain' ? 5 : null } };
    const f = fixtureAnswers('Maybe 30 candles?', { action: 'edit', candles: 'clarify', candleNumber: 'exact:30' });
    assert.equal(normalizeAnswers(f.payload, f.questions, f.candidates, state).patch.candles, undefined);
    f.payload.answers.candles.choice = 'number';
    f.payload.answers.candles.confidence = 0.2;
    assert.equal(normalizeAnswers(f.payload, f.questions, f.candidates, state).patch.candles, undefined);
  }
});

test('queue fixture: removing princess changes only topper and Undo restores it and estimate', async () => {
  let calls = 0;
  const queue = new DesignerQueue(async request => makeResult(request.turnId, ++calls === 1
    ? { exists: true, layers: 2, addToppers: ['princess'], inscription: 'Ada', addToppings: ['strawberries'] }
    : { removeToppers: ['princess'] }));
  queue.submit('Create decorated cake'); await tick();
  assert.equal(estimateCake(queue.getSnapshot().cake).totalCents, 6500);
  queue.submit('Remove the princess'); await tick();
  assert.equal(estimateCake(queue.getSnapshot().cake).totalCents, 5500);
  assert.equal(queue.getSnapshot().cake.inscription, 'Ada');
  assert.deepEqual(queue.getSnapshot().cake.toppings, ['strawberries']);
  queue.undo(); await tick();
  assert.deepEqual(queue.getSnapshot().cake.toppers, ['princess']);
  assert.equal(estimateCake(queue.getSnapshot().cake).totalCents, 6500);
});

test('browser speech result events: interim stays visible, repeated finals deliver once, restarts remain distinct', () => {
  let now = 10;
  const collect = createSpeechResultCollector('session1', () => now++);
  const interim = collect({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: ' I want ' } }] });
  assert.equal(interim.interimTranscript, 'I want');
  assert.equal(interim.finals.length, 0);
  const event = { resultIndex: 0, results: [{ isFinal: true, 0: { transcript: ' I want a cake. ' } }] };
  const final = collect(event);
  assert.equal(final.interimTranscript, '');
  assert.equal(final.finals[0].text, 'I want a cake.');
  assert.equal(final.finals[0].meta.firstInterimAt, 10);
  assert.equal(final.finals[0].meta.finalAt, 11);
  assert.equal(collect(event).finals.length, 0);
  const second = collect({ resultIndex: 1, results: [...event.results, { isFinal: true, 0: { transcript: 'Two layers.' } }] });
  assert.equal(second.finals.length, 1);
  assert.equal(second.finals[0].text, 'Two layers.');
  const restart = createSpeechResultCollector('session2', () => now++);
  assert.notEqual(restart(event).finals[0].meta.utteranceId, final.finals[0].meta.utteranceId);
});

test('real-answer regressions: supported Jensen Huang and Mario spans never duplicate into custom quotes', () => {
  // Captured Jev 1.14 answers before correction chose these spans at confidence .46 and .51.
  for (const [name, theme, confidence] of [['Jensen Huang', 'jensen-huang', 0.46], ['Mario', 'mario', 0.51]] as const) {
    const f = fixtureAnswers(`Add ${name} on top.`, { action: 'edit', exists: 'yes', theme, customTopper: `exact:${name}`, customTopperAction: 'add' });
    f.payload.answers.customTopper.confidence = confidence;
    const result = normalizeAnswers(f.payload, f.questions, f.candidates, EMPTY_CAKE);
    assert.equal(result.patch.customTopper, undefined);
    const cake = applyCakePatch(EMPTY_CAKE, result.patch).state;
    assert.equal(cake.theme, theme);
    assert.equal(estimateCake(cake).requiresQuote, false);
  }
});

test('real-answer regressions: absent-field clarify/low-confidence keep answers are silent', () => {
  const f = fixtureAnswers('Remove the princess.', { action: 'edit', topperOperation: 'remove', topperOutgoingFirst: 'princess', theme: 'clarify', tiers: 'keep', scope_topperOperation: 'mentioned' });
  f.payload.answers.tiers.confidence = 0.3;
  const result = normalizeAnswers(f.payload, f.questions, f.candidates, { ...EMPTY_CAKE, exists: true, toppers: ['princess'] });
  assert.deepEqual(result.patch.removeToppers, ['princess']);
  assert.deepEqual(result.notices, []);
});

test('real-request regressions: generic candles are plain and exact Miso topper creates a quote', () => {
  for (const phrase of [
    'I have a New Year’s birthday. Give me a two-layer chocolate cake with gold stars and candles. Write Happy New Year, Eda.',
    'Give me a three-layer red velvet cake with raspberries and birthday candles. Write Happy Birthday, Mira.',
  ]) {
    const f = fixtureAnswers(phrase, { action: 'edit', exists: 'yes', candles: 'plain', scope_candles: 'mentioned' });
    assert.match(f.questions.candles.criteria.plain, /birthday candles/);
    assert.deepEqual(normalizeAnswers(f.payload, f.questions, f.candidates, EMPTY_CAKE).patch.candles, { style: 'plain', number: null });
  }
  const f = fixtureAnswers('Make a two-layer vanilla birthday cake with a topper shaped like my cat Miso.', { action: 'edit', exists: 'yes', customTopperAction: 'add', customTopper: 'exact:my cat Miso', scope_customTopper: 'mentioned' });
  const added = normalizeAnswers(f.payload, f.questions, f.candidates, EMPTY_CAKE);
  const cake = applyCakePatch(EMPTY_CAKE, added.patch).state;
  assert.deepEqual(cake.customTopper, { request: 'my cat Miso', assetId: null });
  assert.deepEqual(estimateCake(cake).quoteItems, ['my cat Miso']);
  const removed = fixtureAnswers('Actually remove the cat and put a 30 candle there.', { action: 'edit', customTopperAction: 'remove', customTopper: 'remove', candles: 'number', candleNumber: 'exact:30' });
  // The old combined operation/span answer was remove at confidence .26; independent operation wins.
  removed.payload.answers.customTopper.confidence = 0.26;
  const patch = normalizeAnswers(removed.payload, removed.questions, removed.candidates, cake).patch;
  assert.equal(patch.customTopper, null);
  assert.equal(patch.candles?.number, '30');
});

test('prepared topper choices use the shared catalog descriptions and bounded named edits', () => {
  const cases = [
    { phrase: 'Add a castle.', before: { toppers: [] }, choices: { topperOperation: 'add', topperIncomingFirst: 'castle' }, expected: ['castle'] },
    { phrase: 'Add a unicorn.', before: { toppers: [] }, choices: { topperOperation: 'add', topperIncomingFirst: 'unicorn' }, expected: ['unicorn'] },
    { phrase: 'Put a knight next to the princess.', before: { toppers: ['princess'] }, choices: { topperOperation: 'add', topperIncomingFirst: 'knight' }, expected: ['princess', 'knight'] },
    { phrase: 'Swap the castle for a dragon.', before: { toppers: ['castle', 'princess'] }, choices: { topperOperation: 'replace', topperIncomingFirst: 'dragon', topperOutgoingFirst: 'castle' }, expected: ['princess', 'dragon'] },
    { phrase: 'Remove the castle.', before: { toppers: ['castle', 'unicorn'] }, choices: { topperOperation: 'remove', topperOutgoingFirst: 'castle' }, expected: ['unicorn'] },
    { phrase: 'Add a spaceship.', before: { toppers: [] }, choices: { topperOperation: 'add', topperIncomingFirst: 'rocket' }, expected: ['rocket'] },
  ];
  for (const item of cases) {
    const f = fixtureAnswers(item.phrase, { action: 'edit', ...item.choices } as Record<string, string>);
    for (const topper of TOPPER_CATALOG) {
      assert.equal(f.questions.topperIncomingFirst.criteria[topper.id], topper.jevDescription);
      assert.ok(f.questions.topperOperation.instructions.includes(topper.label));
    }
    const before = { ...cloneCake(EMPTY_CAKE), exists: true, ...item.before } as typeof EMPTY_CAKE;
    const result = normalizeAnswers(f.payload, f.questions, f.candidates, before);
    const actual = applyCakePatch(before, result.patch).state;
    assert.deepEqual(actual.toppers, item.expected);
    assert.equal(actual.customTopper, null);
  }
});

test('vague character/figure asks for clarification, exact custom portrait is preserved, third topper rejects whole turn', () => {
  const before = { ...cloneCake(EMPTY_CAKE), exists: true, toppers: ['castle', 'princess'] as const };
  const state = { ...before, toppers: [...before.toppers] };
  const generic = fixtureAnswers('Add a character.', { action: 'edit', topperOperation: 'clarify', topperIncomingFirst: 'clarify', scope_topperOperation: 'mentioned' });
  const unclear = normalizeAnswers(generic.payload, generic.questions, generic.candidates, state);
  assert.deepEqual(applyCakePatch(state, unclear.patch).state, state);
  assert.ok(unclear.notices.some(note => note.includes('Which topper')));
  const portrait = fixtureAnswers("Add my grandma's face.", { action: 'edit', topperIncomingFirst: 'no_match', customTopperAction: 'add', customTopper: "exact:my grandma's face" });
  assert.deepEqual(normalizeAnswers(portrait.payload, portrait.questions, portrait.candidates, EMPTY_CAKE).patch.customTopper, { request: "my grandma's face" });
  const over = fixtureAnswers('Make it two layers and add a unicorn.', { action: 'edit', layers: '2', topperOperation: 'add', topperIncomingFirst: 'unicorn' });
  const rejected = normalizeAnswers(over.payload, over.questions, over.candidates, state);
  assert.deepEqual(applyCakePatch(state, rejected.patch).state, state);
  assert.ok(rejected.notices.includes('Up to two toppers in this demo'));
});

test('real topper regression: a validated unicorn or rocket addition creates the empty default cake even if existence chose keep', () => {
  for (const id of ['unicorn', 'rocket'] as const) {
    const f = fixtureAnswers(`Add a ${id}.`, { action: 'edit', exists: 'keep', topperOperation: 'add', topperIncomingFirst: id });
    const patch = normalizeAnswers(f.payload, f.questions, f.candidates, EMPTY_CAKE).patch;
    const state = applyCakePatch(EMPTY_CAKE, patch).state;
    assert.equal(state.exists, true);
    assert.deepEqual(state.toppers, [id]);
    assert.equal(estimateCake(state).totalCents, 5200);
  }
});

test('untrusted requests reject legacy, unknown, duplicate or excessive prepared toppers', () => {
  for (const badState of [
    { ...EMPTY_CAKE, topper: 'princess' },
    { ...EMPTY_CAKE, toppers: ['castle', 'castle'] },
    { ...EMPTY_CAKE, toppers: ['castle', 'princess', 'unicorn'] },
    { ...EMPTY_CAKE, toppers: ['not-in-catalog'] },
  ]) assert.throws(() => validateRequest({ turnId: 'bad-topper', phrase: 'cake', state: badState }));
});

test('three newly requested toppers are rejected as one whole turn, never silently truncated to two', () => {
  const f = fixtureAnswers('Add a castle, unicorn and princess.', {
    action: 'edit', topperOperation: 'add', topperIncomingFirst: 'castle', topperIncomingSecond: 'unicorn', topperIncomingThird: 'princess',
  });
  const before = { ...cloneCake(EMPTY_CAKE), exists: true };
  const result = normalizeAnswers(f.payload, f.questions, f.candidates, before);
  assert.deepEqual(applyCakePatch(before, result.patch).state, before);
  assert.ok(result.notices.includes('Up to two toppers in this demo'));
});

test('exact gold-star request and non-topper phrases silently ignore hypothetical topper ambiguity and selections', () => {
  for (const phrase of [
    'I want a three-layer chocolate cake with gold stars.',
    'Add strawberries.',
    'Write Happy Birthday, Eda.',
    'Make it two layers.',
    'Add birthday candles.',
    'Give me a vanilla Mario cake.',
  ]) {
    for (const operation of ['keep', 'add', 'clarify']) {
      const f = fixtureAnswers(phrase, {
        action: 'edit', topperOperation: operation, topperIncomingFirst: operation === 'add' ? 'castle' : 'clarify',
        scope_topperOperation: 'unmentioned', flavor: 'chocolate', layers: '3', 'topping_gold-stars': 'add',
      });
      if (operation === 'keep') f.payload.answers.topperOperation.confidence = 0.3;
      const before = { ...cloneCake(EMPTY_CAKE), exists: true, toppers: ['princess' as const] };
      const result = normalizeAnswers(f.payload, f.questions, f.candidates, before);
      assert.deepEqual(result.notices, [], phrase);
      assert.equal(result.patch.addToppers, undefined);
      assert.equal(result.patch.removeToppers, undefined);
      assert.deepEqual(applyCakePatch(before, result.patch).state.toppers, ['princess']);
    }
  }
});

test('a resolved custom portrait does not report prepared-topper ambiguity when no prepared target was selected', () => {
  const f = fixtureAnswers('Make a topper shaped like my cat Miso.', {
    action: 'edit', customTopperAction: 'add', customTopper: 'exact:my cat Miso',
    topperOperation: 'keep', scope_topperOperation: 'mentioned',
  });
  f.payload.answers.topperOperation.confidence = 0.3;
  const result = normalizeAnswers(f.payload, f.questions, f.candidates, EMPTY_CAKE);
  assert.deepEqual(result.patch.customTopper, { request: 'my cat Miso' });
  assert.deepEqual(result.notices, []);
});

test('plain candles make the number silently inapplicable, even if the speculative number question is uncertain', () => {
  for (const phrase of ['Add birthday candles.', 'Add candles']) {
    for (const numberDecision of ['keep', 'clarify']) {
      const f = fixtureAnswers(phrase, {
        action: 'edit', candles: 'plain', candleNumber: numberDecision,
        scope_candles: 'mentioned', scope_candleNumber: 'mentioned',
      });
      f.payload.answers.candleNumber.confidence = 0.2;
      const before = { ...cloneCake(EMPTY_CAKE), exists: true };
      const result = normalizeAnswers(f.payload, f.questions, f.candidates, before);
      assert.deepEqual(result.notices, [], phrase);
      assert.deepEqual(result.patch.candles, { style: 'plain', number: null });
      assert.equal(estimateCake(applyCakePatch(before, result.patch).state).totalCents, 4500);
    }
  }
});

test('an unmentioned candle number is silent, but explicitly ambiguous numeric values still clarify', () => {
  const quiet = fixtureAnswers('Add strawberries.', { action: 'edit', candleNumber: 'clarify', scope_candleNumber: 'unmentioned' });
  assert.deepEqual(normalizeAnswers(quiet.payload, quiet.questions, quiet.candidates, EMPTY_CAKE).notices, []);
  const asked = fixtureAnswers('Change the candle number to one of those two ages.', {
    action: 'edit', candles: 'number', candleNumber: 'clarify', scope_candleNumber: 'mentioned',
  });
  const state = { ...cloneCake(EMPTY_CAKE), exists: true, candles: { style: 'number' as const, number: '21', count: null } };
  const result = normalizeAnswers(asked.payload, asked.questions, asked.candidates, state);
  assert.ok(result.notices.some(note => /clarify candle number/i.test(note)));
  assert.equal(applyCakePatch(state, result.patch).state.candles.number, '21');
});

test('equivalent ordinal and digit candle candidates are one bounded numeric option, not competing decisions', () => {
  const candidates = extractCandidates('It is my 40th birthday. Add a 40 candle, not a 41 candle.');
  const q = buildQuestions(candidates).candleNumber;
  const selectedSpans = Object.keys(q.criteria).filter(key => key.startsWith('span_')).map(key => candidates[Number(key.slice(5))]);
  assert.deepEqual(selectedSpans.sort(), ['40', '41']);
  assert.ok(!Object.values(q.criteria).some(description => description.includes('span: "40th"')));
});

test('appearance decisions are field-scoped and preserve other toppers, writing and price', () => {
  const before = { ...cloneCake(EMPTY_CAKE), exists: true, toppers: ['castle', 'princess'] as const, inscription: 'Eda' };
  const state = { ...before, toppers: [...before.toppers] };
  const checks: [string, Record<string, string>, CakePatch][] = [
    ['make the icing pink', { appearance_color_frosting: 'blush-pink', scope_appearance_color_frosting: 'mentioned', inscription: 'exact:pink', scope_inscription: 'unmentioned' }, { colors: { frosting: 'blush-pink' } }],
    ['write it in gold', { appearance_color_inscription: 'gold', scope_appearance_color_inscription: 'mentioned', inscription: 'exact:gold', scope_inscription: 'unmentioned' }, { colors: { inscription: 'gold' } }],
    ['make the castle bigger', { appearance_topper_1_target: 'castle', appearance_topper_1_size: 'large', scope_appearance_topper_1_size: 'mentioned' }, { topperStyles: { castle: { size: 'large' } } }],
    ['put the princess on the left', { appearance_topper_1_target: 'princess', appearance_topper_1_position: 'left', scope_appearance_topper_1_position: 'mentioned' }, { topperStyles: { princess: { position: 'left' } } }],
    ['write Eda in capitals', { inscription: 'exact:Eda', appearance_writing_case: 'upper', scope_appearance_writing_case: 'mentioned' }, { inscriptionStyle: { letterCase: 'upper' } }],
    ['make the filling lavender', { appearance_color_filling: 'lavender', scope_appearance_color_filling: 'mentioned' }, { colors: { filling: 'lavender' } }],
  ];
  for (const [phrase, choices, expected] of checks) {
    const f = fixtureAnswers(phrase, { action: 'edit', ...choices });
    const result = normalizeAnswers(f.payload, f.questions, f.candidates, state);
    assert.deepEqual(result.notices, [], phrase);
    assert.deepEqual(applyCakePatch(state, result.patch).state, applyCakePatch(state, expected).state);
    assert.equal(estimateCake(applyCakePatch(state, result.patch).state).totalCents, 6200);
  }
});

test('unmentioned appearance ambiguity is silent and explicitly ambiguous color preserves that field', () => {
  const f = fixtureAnswers('Add strawberries.', { action: 'edit', appearance_color_frosting: 'clarify',
    appearance_topper_1_target: 'clarify', appearance_writing_font: 'clarify' });
  assert.deepEqual(normalizeAnswers(f.payload, f.questions, f.candidates, EMPTY_CAKE).notices, []);
  const asked = fixtureAnswers('Make the icing an unknown color.', { action: 'edit', appearance_color_frosting: 'clarify', scope_appearance_color_frosting: 'mentioned' });
  const result = normalizeAnswers(asked.payload, asked.questions, asked.candidates, EMPTY_CAKE);
  assert.equal(result.patch.colors, undefined);
  assert.deepEqual(result.notices, ['Please clarify frosting color; I kept it unchanged.']);
});

test('occasion output uses bounded IDs, is silent unless relevant, and never adds theme/decoration from the label alone', () => {
  for (const [phrase, occasion] of [
    ['make it a wedding cake', 'wedding'], ["it's for my promotion", 'promotion'],
    ['graduation cake with a cap', 'graduation'], ['change it to an anniversary cake', 'anniversary'],
  ]) {
    const f = fixtureAnswers(phrase, { action: 'edit', occasion });
    const result = normalizeAnswers(f.payload, f.questions, f.candidates, EMPTY_CAKE);
    assert.equal(result.patch.occasion, occasion); assert.deepEqual(result.notices, []);
    assert.equal(result.patch.theme, undefined); assert.deepEqual(result.patch.addToppers ?? [], []);
  }
  const f = fixtureAnswers('Make the frosting pink.', { action: 'edit', occasion: 'wedding', scope_occasion: 'unmentioned' });
  const result = normalizeAnswers(f.payload, f.questions, f.candidates, EMPTY_CAKE);
  assert.equal(result.patch.occasion, undefined); assert.deepEqual(result.notices, []);
});

test('Jev numeric-role decisions distinguish ordinary candle quantities from numeral/age candles, including spoken counts', () => {
  for (const [phrase, span, role, expected] of [
    ['3 candles', '3', 'plain-count', { style: 'plain', number: null, count: 3 }],
    ['three candles', 'three', 'plain-count', { style: 'plain', number: null, count: 3 }],
    ['make it 6 candles', '6', 'plain-count', { style: 'plain', number: null, count: 6 }],
    ['a 3 candle', '3', 'numeral', { style: 'number', number: '3', count: null }],
    ["it's my 30th, add a number candle", '30th', 'numeral', { style: 'number', number: '30', count: null }],
  ] as const) {
    // Deliberately inject the old incorrect coarse style for a plural count:
    // the explicit bounded numeric-role decision must resolve that contradiction.
    const f = fixtureAnswers(phrase, { action: 'edit', candles: 'number', candleNumericRole: role, candleNumber: `exact:${span}` });
    const result = normalizeAnswers(f.payload, f.questions, f.candidates, EMPTY_CAKE);
    assert.deepEqual(result.patch.candles, expected, phrase); assert.deepEqual(result.notices, []);
    assert.deepEqual(applyCakePatch(EMPTY_CAKE, result.patch).state.candles, expected);
  }
  const limit = fixtureAnswers('13 candles', { action: 'edit', candles: 'plain', candleNumericRole: 'plain-count', candleNumber: 'exact:13' });
  const result = normalizeAnswers(limit.payload, limit.questions, limit.candidates, EMPTY_CAKE);
  assert.equal(result.patch.candles, undefined); assert.match(result.notices.join(' '), /1 and 12/);
});
