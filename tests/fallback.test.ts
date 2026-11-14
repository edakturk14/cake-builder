import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCakePatch, EMPTY_CAKE, estimateCake, cloneCake, createCake } from '../src/shared/cake';
import type { CakePatch } from '../src/shared/cake';
import { buildQuestions, extractCandidates, interpret } from '../server/jev';
import { fallbackSchema, isIntentionalNotice, shouldUseFallback, systemPrompt, userPayload } from '../server/fallback';
import { catalogTopperForRequest, CUSTOM_TOPPER_OBJECT_NOTICE } from '../server/customTopperIntent';
import { TOPPER_CATALOG } from '../src/shared/toppers';

function jevPayload(phrase: string, values: Record<string, string>) {
  const questions = buildQuestions(extractCandidates(phrase));
  const answers = Object.fromEntries(Object.entries(questions).map(([id, question]) => {
    const choice = values[id] ?? (id.startsWith('scope_') ? 'unmentioned' : /^topper(?:Incoming|Outgoing)/.test(id) ? 'none' : 'keep');
    return [id, { type: 'choice', choice, confidence: 1,
      probabilities: Object.fromEntries(Object.keys(question.criteria).map(option => [option, option === choice ? 1 : 0])) }];
  }));
  return JSON.stringify({ model: 'jev-mock', answers });
}

const NULL_PATCH_KEYS = ['exists', 'base', 'flavor', 'layers', 'occasion', 'theme', 'toppings', 'toppers', 'customTopper', 'colors',
  'topperStyles', 'inscriptionStyle', 'candles', 'inscription', 'addToppings', 'removeToppings', 'addToppers', 'removeToppers'];

function fallbackPayload(overrides: Record<string, unknown>, usage?: unknown) {
  const patch = completeWirePatch(overrides);
  return JSON.stringify({
    choices: [{ message: { content: JSON.stringify(patch) } }],
    ...(usage === undefined ? {} : { usage }),
  });
}

type Schema = { type?: string; enum?: unknown[]; anyOf?: Schema[]; properties?: Record<string, Schema> };
function completeWirePatch(overrides: Record<string, unknown>): Record<string, unknown> {
  function complete(schema: Schema, value: unknown): unknown {
    if (value === undefined) return schema.anyOf?.some(branch => branch.enum?.includes('keep')) ? 'keep' : null;
    const objectSchema = schema.type === 'object' ? schema : schema.anyOf?.find(branch => branch.type === 'object');
    if (value && typeof value === 'object' && !Array.isArray(value) && objectSchema?.properties) {
      const object = value as Record<string, unknown>;
      return { ...object, ...Object.fromEntries(Object.entries(objectSchema.properties).map(([key, child]) => [key, complete(child, object[key])])) };
    }
    return value;
  }
  return complete(fallbackSchema(), overrides) as Record<string, unknown>;
}

function mockFetch(t: test.TestContext, options: { jev?: string; fallback?: { body?: string; status?: number; error?: Error } }) {
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: unknown) => {
    const url = String(input);
    calls.push(url);
    if (url.includes('typesafe.ai')) return new Response(options.jev ?? jevPayload('test phrase', {}), { status: 200 });
    if (url.includes('openrouter.ai')) {
      if (options.fallback?.error) throw options.fallback.error;
      return new Response(options.fallback?.body ?? fallbackPayload({}), { status: options.fallback?.status ?? 200 });
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
  t.after(() => { globalThis.fetch = original; });
  return calls;
}

function withEnv(t: test.TestContext, textModel?: string, openrouterKey: string | null = 'test-openrouter-key') {
  const saved = { typesafe: process.env.TYPESAFE_API_KEY, key: process.env.OPENROUTER_API_KEY, model: process.env.OPENROUTER_TEXT_MODEL };
  process.env.TYPESAFE_API_KEY = 'test-typesafe-key';
  if (openrouterKey === null) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = openrouterKey;
  if (textModel === undefined) delete process.env.OPENROUTER_TEXT_MODEL; else process.env.OPENROUTER_TEXT_MODEL = textModel;
  t.after(() => {
    process.env.TYPESAFE_API_KEY = saved.typesafe;
    if (saved.key === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = saved.key;
    if (saved.model === undefined) delete process.env.OPENROUTER_TEXT_MODEL; else process.env.OPENROUTER_TEXT_MODEL = saved.model;
  });
}

const request = { turnId: 'fallback-turn', phrase: 'something fruity for summer', state: cloneCake(EMPTY_CAKE) };
const JEV_CLARIFY = () => jevPayload('something fruity for summer', {});

test('fallback interprets a phrase Jev could not, through the same patch validation', async t => {
  withEnv(t);
  const calls = mockFetch(t, {
    jev: JEV_CLARIFY(),
    fallback: { body: fallbackPayload({ exists: true, addToppings: ['strawberries'] }, { cost: 0.00042 }) },
  });
  const response = await interpret(request);
  assert.equal(response.action, 'edit');
  assert.equal(response.provider.interpreter, 'fallback');
  assert.equal(response.provider.fallback?.model, 'openai/gpt-4.1-nano');
  assert.equal(response.provider.fallback?.status, 200);
  assert.ok(typeof response.provider.fallback?.durationMs === 'number');
  assert.equal(response.provider.fallback?.costUsd, 0.00042);
  assert.deepEqual(applyCakePatch(request.state, response.patch).state.toppings, ['strawberries']);
  const expected = applyCakePatch(EMPTY_CAKE, { exists: true, addToppings: ['strawberries'] }).state;
  assert.deepEqual(applyCakePatch(request.state, response.patch).state, expected);
  assert.equal(estimateCake(applyCakePatch(request.state, response.patch).state).totalCents, estimateCake(expected).totalCents);
  assert.equal(calls.length, 2, 'Jev plus exactly one fallback call per turn');
  assert.ok(calls[0].includes('typesafe.ai') && calls[1].includes('openrouter.ai'));
});

test('successful Jev edits never trigger the fallback', async t => {
  withEnv(t);
  const calls = mockFetch(t, {
    jev: jevPayload('make it two layers', { action: 'edit', layers: '2', scope_layers: 'mentioned' }),
  });
  const response = await interpret({ turnId: 'fallback-turn', phrase: 'make it two layers', state: cloneCake(EMPTY_CAKE) });
  assert.equal(response.action, 'edit');
  assert.equal(response.provider.interpreter, 'jev');
  assert.equal(response.provider.fallback, undefined);
  assert.equal(calls.filter(url => url.includes('openrouter.ai')).length, 0);
});

test('intentional Jev clarification notices never trigger the fallback', async t => {
  withEnv(t);
  const calls = mockFetch(t, {
    jev: jevPayload('add tiers', { action: 'edit', tiers: 'yes' }),
  });
  const response = await interpret({ turnId: 'fallback-turn', phrase: 'add tiers', state: cloneCake(EMPTY_CAKE) });
  assert.equal(response.provider.interpreter, 'jev');
  assert.equal(response.provider.fallback, undefined);
  assert.equal(calls.filter(url => url.includes('openrouter.ai')).length, 0);
  assert.ok(response.notices.some(note => note.includes("Tiers aren't")));
});

test('an invalid fallback patch becomes a bounded error and preserves the design', async t => {
  withEnv(t);
  mockFetch(t, { jev: JEV_CLARIFY(), fallback: { body: fallbackPayload({ exists: 'yes', layers: 9, unknownField: true }) } });
  const response = await interpret(request);
  assert.equal(response.action, 'clarify');
  assert.deepEqual(applyCakePatch(request.state, response.patch).state, request.state);
  assert.equal(response.provider.interpreter, 'jev');
  assert.equal(response.provider.fallback?.status, 502);
  assert.ok(response.notices.some(note => note.includes('backup interpreter returned an invalid cake edit')));
});

test('a fallback timeout becomes a bounded 504 and preserves the design', async t => {
  withEnv(t);
  const abort = new Error('aborted'); abort.name = 'AbortError';
  mockFetch(t, { jev: JEV_CLARIFY(), fallback: { error: abort } });
  const response = await interpret(request);
  assert.equal(response.action, 'clarify');
  assert.deepEqual(applyCakePatch(request.state, response.patch).state, request.state);
  assert.equal(response.provider.fallback?.status, 504);
  assert.ok(response.notices.some(note => note.includes('backup interpreter timed out')));
});

test('no-change fallback output becomes a bounded 422 and preserves the design', async t => {
  withEnv(t);
  mockFetch(t, { jev: JEV_CLARIFY(), fallback: { body: fallbackPayload({}) } });
  const response = await interpret(request);
  assert.deepEqual(applyCakePatch(request.state, response.patch).state, request.state);
  assert.equal(response.provider.fallback?.status, 422);
});

test('a customTopper naming a catalog topper is remapped to the catalog id', async t => {
  withEnv(t);
  const phrase = 'Add a Snowman.';
  mockFetch(t, {
    jev: jevPayload(phrase, {}),
    fallback: { body: fallbackPayload({ exists: true, customTopper: { request: 'Snowman' } }) },
  });
  const response = await interpret({ ...request, phrase });
  assert.equal(response.action, 'edit');
  assert.equal((response.patch as CakePatch).customTopper, undefined, 'catalog figures must not trigger image generation');
  assert.deepEqual((response.patch as CakePatch).addToppers, ['snowman']);
});

test('a model-supplied assetId is stripped before validation', async t => {
  withEnv(t);
  const phrase = 'Add a fox.';
  mockFetch(t, {
    jev: jevPayload(phrase, {}),
    fallback: { body: fallbackPayload({ exists: true, customTopper: { request: 'a fox', assetId: 'a'.repeat(64) } }) },
  });
  const response = await interpret({ ...request, phrase });
  assert.equal(response.action, 'edit');
  assert.deepEqual((response.patch as CakePatch).customTopper, { request: 'a fox' });
});

test('without an OpenRouter key the Jev answer stands and no fallback is attempted', async t => {
  withEnv(t, undefined, null);
  const calls = mockFetch(t, { jev: JEV_CLARIFY() });
  const response = await interpret(request);
  assert.equal(response.action, 'clarify');
  assert.equal(response.provider.interpreter, 'jev');
  assert.equal(response.provider.fallback, undefined);
  assert.equal(calls.filter(url => url.includes('openrouter.ai')).length, 0);
});

test('shouldUseFallback trigger rules are narrow and order-independent', () => {
  const emptyPatch: CakePatch = { addToppings: [], removeToppings: [], addToppers: [], removeToppers: [] };
  assert.equal(shouldUseFallback('clarify', emptyPatch, ['Please describe the cake or the change you would like.'], false), true);
  assert.equal(shouldUseFallback('edit', emptyPatch, [], false), true);
  assert.equal(shouldUseFallback('edit', { layers: 2 }, [], true), false, 'real change applied');
  assert.equal(shouldUseFallback('edit', emptyPatch, [], true), false, 'state changed even with empty patch');
  assert.equal(shouldUseFallback('undo', emptyPatch, [], false), false, 'control actions excluded');
  assert.equal(shouldUseFallback('edit', emptyPatch, ["Tiers aren't in this demo; I kept the existing layer count."], false), false);
  assert.equal(shouldUseFallback('edit', emptyPatch, ['Which topper would you like? Try a castle, unicorn, or knight.'], false), false);
  assert.equal(shouldUseFallback('edit', emptyPatch, ['Some totally novel notice.'], false), true);
});

test('isIntentionalNotice covers every emitted clarification shape verbatim', () => {
  for (const notice of [
    'Up to two toppers in this demo',
    'Which topper would you like? Try a castle, unicorn, or knight.',
    'Which existing topper should I replace?',
    'Which topper should I restyle?',
    'Which number should go on the candles? I kept them unchanged.',
    'Do you mean ordinary candles or a numeral-shaped candle? I kept them unchanged.',
    'How many plain candles would you like? I kept them unchanged.',
    'Use between 1 and 12 plain candles. I kept them unchanged.',
    'Please use an inscription of 60 characters or fewer.',
    'Please describe the custom topper in 120 characters or fewer.',
    "Tiers aren't in this demo; I kept the existing layer count.",
    'Cheesecake has one baked layer in this demo. Sponge cakes support up to three layers.',
    'Add the gold stars before changing its appearance.',
  ]) assert.equal(isIntentionalNotice(notice), true, notice);
  assert.equal(isIntentionalNotice('Please describe the cake or the change you would like.'), false);
  assert.equal(isIntentionalNotice('Please clarify red velvet; I kept it unchanged.'), false, 'bounded-option vagueness goes to the fallback');
  assert.equal(isIntentionalNotice('Please clarify blush pink; I kept it unchanged.'), false);
});

test('fallback schema mirrors the CakePatch contract with strict enums', () => {
  const schema = fallbackSchema() as { type: string; required: string[]; properties: Record<string, unknown>; additionalProperties: boolean };
  assert.equal(schema.type, 'object');
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual([...schema.required].sort(), [...NULL_PATCH_KEYS].sort());
  assert.equal(Object.keys(schema.properties).length, NULL_PATCH_KEYS.length);
  assert.ok(JSON.stringify(schema).length < 64 * 1024, 'schema stays comfortably under provider limits');
});

test('queue timing records interpreter and fallback duration', async () => {
  const { DesignerQueue } = await import('../src/lib/designerQueue');
  const queue = new DesignerQueue(async (queued: { turnId: string }) => ({
    turnId: queued.turnId, action: 'edit' as const, patch: { exists: true, addToppings: ['strawberries'] }, notices: [],
    provider: { model: 'jev-1.14.0', durationMs: 12, status: 200, interpreter: 'fallback' as const,
      fallback: { model: 'openai/gpt-4.1-nano', durationMs: 456, status: 200, costUsd: 0.0004 } },
  }));
  queue.submit('something fruity for summer');
  await new Promise(resolve => setTimeout(resolve, 30));
  const snapshot = queue.getSnapshot();
  assert.deepEqual(snapshot.timings[0].interpreter, 'fallback');
  assert.equal(snapshot.timings[0].fallbackMs, 456);
  assert.deepEqual(snapshot.cake.toppings, ['strawberries']);
});

const richCake = () => createCake({
  layers: 3, flavor: 'lemon', occasion: 'anniversary', theme: 'tennis', inscription: 'Ada',
  toppings: ['strawberries', 'caramel'], toppers: ['castle', 'princess'],
  colors: { frosting: 'navy', filling: 'lavender', inscription: 'gold', accents: 'white' },
  topperStyles: { castle: { size: 'large', position: 'left', tint: 'gold' }, princess: { position: 'right', tint: 'white' } },
  candles: { style: 'number', number: '40' }, customTopper: { request: 'my cat Miso', assetId: 'a'.repeat(64) },
});

const resetCases: [string, CakePatch][] = [
  ['empty toppings replacement', { toppings: [] }],
  ['empty toppers replacement', { toppers: [] }],
  ['both empty replacements', { toppings: [], toppers: [] }],
  ['explicit removal lists', { removeToppings: ['strawberries', 'caramel'], removeToppers: ['castle', 'princess'] }],
  ['occasion reset', { occasion: null }],
  ['theme reset', { theme: null }],
  ['custom topper reset', { customTopper: null }],
  ['frosting reset', { colors: { frosting: null } }],
  ['filling reset', { colors: { filling: null } }],
  ['writing color reset', { colors: { inscription: null } }],
  ['accents reset', { colors: { accents: null } }],
  ['topper tint reset', { topperStyles: { castle: { tint: null } } }],
  ['whole topper appearance reset', { topperStyles: { castle: null } }],
  ['clear writing', { inscription: '' }],
  ['remove candles and clear numeral', { candles: { style: 'none', number: null, count: null } }],
];
for (const [name, patch] of resetCases) test(`fallback preserves reset semantics: ${name}`, async t => {
  withEnv(t);
  const before = richCake(), phrase = `Please make this edit: ${name}.`;
  mockFetch(t, { jev: jevPayload(phrase, {}), fallback: { body: fallbackPayload(patch) } });
  const response = await interpret({ ...request, phrase, state: before });
  assert.equal(response.provider.interpreter, 'fallback');
  assert.deepEqual(response.patch, patch, 'only explicitly changed keys are decoded');
  assert.deepEqual(applyCakePatch(before, response.patch).state, applyCakePatch(before, patch).state);
});

test('keep sentinels and unchanged nulls preserve every unrelated rich-state field', async t => {
  withEnv(t);
  const before = richCake(), phrase = 'Make the frosting ivory.';
  mockFetch(t, { jev: jevPayload(phrase, {}), fallback: { body: fallbackPayload({ colors: { frosting: 'ivory' } }) } });
  const response = await interpret({ ...request, phrase, state: before });
  assert.deepEqual(response.patch, { colors: { frosting: 'ivory' } });
  assert.deepEqual(applyCakePatch(before, response.patch).state, applyCakePatch(before, { colors: { frosting: 'ivory' } }).state);
});

test('partial topper edits preserve size/position while resetting only tint', async t => {
  withEnv(t);
  const before = richCake(), phrase = 'Reset just the castle tint.';
  mockFetch(t, { jev: jevPayload(phrase, {}), fallback: { body: fallbackPayload({ topperStyles: { castle: { tint: null } } }) } });
  const response = await interpret({ ...request, phrase, state: before });
  const actual = applyCakePatch(before, response.patch).state;
  assert.deepEqual(actual.topperStyles.castle, { size: 'large', position: 'left', tint: null });
  assert.deepEqual(actual.topperStyles.princess, before.topperStyles.princess);
});

test('plain candle count null resets to default without clearing other fields', async t => {
  withEnv(t);
  const before = createCake({ ...richCake(), candles: { style: 'plain', count: 9 } });
  const phrase = 'Reset the candle count to the default.';
  mockFetch(t, { jev: jevPayload(phrase, {}), fallback: { body: fallbackPayload({ candles: { count: null } }) } });
  const response = await interpret({ ...request, phrase, state: before });
  assert.deepEqual(applyCakePatch(before, response.patch).state, applyCakePatch(before, { candles: { count: null } }).state);
});

test('keep is literal inscription text, not a global magic string', async t => {
  withEnv(t);
  const phrase = 'Write keep.';
  mockFetch(t, { jev: jevPayload(phrase, {}), fallback: { body: fallbackPayload({ inscription: 'keep' }) } });
  const response = await interpret({ ...request, phrase, state: richCake() });
  assert.deepEqual(response.patch, { inscription: 'keep' });
});

test('composed invalid candle reset is a bounded error, not an uncaught apply error', async t => {
  withEnv(t);
  const before = richCake(), phrase = 'Clear the numeral but keep numeral candles.';
  mockFetch(t, { jev: jevPayload(phrase, {}), fallback: { body: fallbackPayload({ candles: { number: null } }) } });
  const response = await interpret({ ...request, phrase, state: before });
  assert.equal(response.provider.fallback?.status, 502);
  assert.deepEqual(applyCakePatch(before, response.patch).state, before);
});

const semanticCases: [string, Record<string, unknown>, boolean][] = [
  ['Something fruity for summer.', { addToppings: ['strawberries', 'raspberries'] }, true],
  ['Add a spaceship.', { addToppers: ['rocket'] }, true],
  ["Something elegant for my parents' anniversary.", { occasion: 'anniversary', colors: { accents: 'gold' } }, true],
  ['My child is turning five.', { occasion: 'birthday' }, true],
  ['Give it a moonlit, restrained mood.', { colors: { frosting: 'navy', accents: 'gold' } }, true],
  ['Give it a winter palette.', { addToppers: ['snowman'] }, false],
  ['Give it a gown-inspired mood.', { addToppers: ['princess'] }, false],
  ['Use a palette inspired by clouds.', { addToppers: ['rainbow'] }, false],
  ['Add a snowman.', { addToppers: ['snowman'] }, true],
  ['Make it a winter wonderland scene.', { addToppers: ['snowman'] }, true],
  ['Make it a midnight masquerade.', { addToppers: ['snowman'], occasion: 'just-because' }, false],
  ['Make it a midnight masquerade.', { customTopper: { request: 'Snowman' } }, false],
  ['Make it a moonlit ball.', { customTopper: { request: 'a penguin' } }, false],
  ['Give it a relaxed coastal palette.', { occasion: 'just-because' }, false],
];
for (const [phrase, patch, accepted] of semanticCases) test(`fallback support guard (${accepted ? 'accept' : 'reject'}): ${phrase} ${JSON.stringify(patch)}`, async t => {
  withEnv(t);
  const before = createCake({ layers: 2, inscription: 'Eda' });
  const calls = mockFetch(t, { jev: jevPayload(phrase, {}), fallback: { body: fallbackPayload(patch) } });
  const response = await interpret({ ...request, phrase, state: before });
  if (accepted) {
    assert.equal(response.provider.interpreter, 'fallback');
    assert.deepEqual(applyCakePatch(before, response.patch).state, applyCakePatch(before, patch as CakePatch).state);
  } else {
    const filteredCustom = response.notices.includes(CUSTOM_TOPPER_OBJECT_NOTICE);
    assert.equal(response.provider.fallback?.status, filteredCustom ? 200 : 422);
    assert.ok(filteredCustom || response.notices.some(note => note.includes('Please clarify')));
    assert.deepEqual(applyCakePatch(before, response.patch).state, before);
  }
  assert.equal(calls.filter(url => url.includes('openrouter.ai')).length, 1, 'no retry');
});

for (const [name, patch] of [
  ['unknown field', { unsupported: true }], ['unknown enum', { colors: { frosting: 'ultraviolet' } }],
  ['wrong empty primitive', { layers: [] }], ['unknown nested field', { colors: { frosting: 'gold', assetId: 'secret' } }],
] as const) test(`wire validation rejects ${name} before applying`, async t => {
  withEnv(t);
  mockFetch(t, { jev: JEV_CLARIFY(), fallback: { body: fallbackPayload(patch) } });
  const before = richCake();
  const response = await interpret({ ...request, state: before });
  assert.equal(response.provider.fallback?.status, 502);
  assert.deepEqual(applyCakePatch(before, response.patch).state, before);
});

test('wire validator rejects missing top-level or nested required keys', async t => {
  withEnv(t);
  const patch = completeWirePatch({ colors: { frosting: 'gold' } });
  delete (patch.colors as Record<string, unknown>).filling;
  mockFetch(t, { jev: JEV_CLARIFY(), fallback: { body: JSON.stringify({ choices: [{ message: { content: JSON.stringify(patch) } }] }) } });
  const response = await interpret(request);
  assert.equal(response.provider.fallback?.status, 502);
});

test('prompt/catalog context favors general palette inference, not a tuned scene-to-object rule', () => {
  const prompt = systemPrompt();
  assert.ok(prompt.includes('do NOT echo'));
  assert.ok(prompt.includes('[] to explicitly clear'));
  assert.ok(!prompt.includes('winter wonderland ->'));
  const payload = JSON.parse(userPayload(request));
  assert.ok(payload.catalogs.palette.every((item: { meaning: string }) => item.meaning));
  assert.ok(payload.catalogs.toppers.every((item: { meaning: string }) => item.meaning));
  const wire = completeWirePatch({});
  assert.equal(wire.occasion, 'keep');
  assert.equal(wire.theme, 'keep');
  assert.equal(wire.customTopper, 'keep');
  assert.equal(wire.toppers, null);
});

const unsafeCustomCases = [
  ['Can you make it look a bit more grown-up and fancy?', 'more grown-up and fancy'],
  ['Please make it more elegant.', 'more elegant'],
  ['I would like something sophisticated.', 'something sophisticated'],
  ['Add some sophistication.', 'sophistication'],
  ['Add a little elegance.', 'elegance'],
  ['Add a blue color.', 'a blue color'],
  ['Add a little blue.', 'blue'],
  ['Make it elegant and add a fox.', 'elegant'],
  ['Add a topper of something sophisticated.', 'something sophisticated'],
  ['Add a tiny fondant lighthouse.', 'tiny fondant'],
  ["Don't add a lighthouse.", 'a lighthouse'],
  ['Remove a topper of our golden retriever.', 'our golden retriever'],
  ['Would you make it fancier for an adult party?', 'fancier'],
  ['Give the cake a classy look please.', 'a classy look'],
  ['I want something special on top.', 'something special'],
  ['Make it feel polished and mature.', 'polished and mature'],
] as const;

for (const [phrase, description] of unsafeCustomCases) {
  test(`backup omits only unsafe custom object: ${phrase}`, async t => {
    withEnv(t);
    const before = richCake();
    const calls = mockFetch(t, {
      jev: jevPayload(phrase, {}),
      fallback: { body: fallbackPayload({ exists: true, customTopper: { request: description } }, { cost: 0.0001 }) },
    });
    const response = await interpret({ ...request, phrase, state: before });
    assert.equal(response.provider.interpreter, 'fallback');
    assert.equal(response.provider.fallback?.status, 200);
    assert.equal(response.provider.fallback?.costUsd, 0.0001, 'rejected custom output does not erase paid text usage');
    assert.equal(response.patch.customTopper, undefined, 'cannot initiate image generation');
    assert.deepEqual(applyCakePatch(before, response.patch).state, before, 'including its existing custom asset');
    assert.ok(response.notices.includes(CUSTOM_TOPPER_OBJECT_NOTICE));
    assert.equal(calls.length, 2, 'only mocked Jev and one backup, never an image request');
  });

  test(`Jev omits only unsafe custom object: ${phrase}`, async t => {
    withEnv(t);
    const index = extractCandidates(phrase).indexOf(description);
    assert.ok(index >= 0, 'model selects an actual source span');
    const calls = mockFetch(t, { jev: jevPayload(phrase, {
      action: 'edit', customTopperAction: 'add', customTopper: `span_${index}`, scope_customTopper: 'mentioned',
    }) });
    const before = richCake();
    const response = await interpret({ ...request, phrase, state: before });
    assert.equal(response.provider.interpreter, 'jev');
    assert.equal(response.patch.customTopper, undefined);
    assert.deepEqual(applyCakePatch(before, response.patch).state, before);
    assert.ok(response.notices.includes(CUSTOM_TOPPER_OBJECT_NOTICE));
    assert.equal(calls.length, 1, 'intentional object clarification must not trigger a backup or image request');
  });
}

for (const provider of ['jev', 'fallback'] as const) {
  test(`${provider} preserves a valid color edit and existing custom asset when rejecting a style topper`, async t => {
    withEnv(t);
    const phrase = 'Make it more elegant and make the frosting gold.';
    const index = extractCandidates(phrase).indexOf('more elegant');
    assert.ok(index >= 0);
    const calls = mockFetch(t, provider === 'jev' ? { jev: jevPayload(phrase, {
      action: 'edit', customTopperAction: 'add', customTopper: `span_${index}`,
      scope_customTopper: 'mentioned', appearance_color_frosting: 'gold', scope_appearance_color_frosting: 'mentioned',
    }) } : {
      jev: jevPayload(phrase, {}),
      fallback: { body: fallbackPayload({ colors: { frosting: 'gold' }, customTopper: { request: 'more elegant' } }) },
    });
    const before = richCake();
    const response = await interpret({ ...request, phrase, state: before });
    assert.equal(response.provider.interpreter, provider);
    assert.equal(response.patch.customTopper, undefined);
    assert.deepEqual(applyCakePatch(before, response.patch).state, applyCakePatch(before, { colors: { frosting: 'gold' } }).state);
    assert.ok(response.notices.includes(CUSTOM_TOPPER_OBJECT_NOTICE));
    assert.equal(calls.length, provider === 'jev' ? 1 : 2);
  });
}

const physicalCustomCases = [
  ['Add a little fondant lighthouse.', 'a little fondant lighthouse'],
  ['I want a topper of our golden retriever.', 'our golden retriever'],
  ['Add a racing pigeon on top.', 'a racing pigeon'],
  ["Add my grandma's face.", "my grandma's face"],
] as const;

for (const provider of ['jev', 'fallback'] as const) for (const [phrase, description] of physicalCustomCases) {
  test(`${provider} retains a concrete custom object: ${description}`, async t => {
    withEnv(t);
    const index = extractCandidates(phrase).indexOf(description);
    assert.ok(index >= 0);
    const calls = mockFetch(t, provider === 'jev' ? { jev: jevPayload(phrase, {
      action: 'edit', customTopperAction: 'add', customTopper: `span_${index}`, scope_customTopper: 'mentioned',
    }) } : {
      jev: jevPayload(phrase, {}),
      fallback: { body: fallbackPayload({ customTopper: { request: description } }) },
    });
    const response = await interpret({ ...request, phrase, state: richCake() });
    assert.equal(response.provider.interpreter, provider);
    assert.deepEqual(response.patch.customTopper, { request: description }, 'preserve the object description, not an adjacent style span');
    assert.ok(!response.notices.includes(CUSTOM_TOPPER_OBJECT_NOTICE));
    assert.equal(calls.length, provider === 'jev' ? 1 : 2, 'all provider fetches mocked, no image generation');
  });
}

test('Jev explicit custom-topper removal bypasses the addition guard', async t => {
  withEnv(t);
  const phrase = 'Remove the custom topper.';
  const calls = mockFetch(t, { jev: jevPayload(phrase, { action: 'edit', customTopperAction: 'remove', scope_customTopper: 'mentioned' }) });
  const before = richCake();
  const response = await interpret({ ...request, phrase, state: before });
  assert.equal(response.patch.customTopper, null);
  assert.equal(applyCakePatch(before, response.patch).state.customTopper, null);
  assert.ok(!response.notices.includes(CUSTOM_TOPPER_OBJECT_NOTICE));
  assert.equal(calls.length, 1);
});

test('exact m01 state and backup output cannot create a custom-topper image request', async t => {
  withEnv(t);
  const phrase = 'Can you make it look a bit more grown-up and fancy?';
  const before = createCake({
    flavor: 'chocolate', layers: 2, inscription: 'Nora',
    colors: { frosting: 'white', filling: 'ivory', inscription: 'navy', accents: 'gold' },
  });
  const calls = mockFetch(t, {
    jev: jevPayload(phrase, {}),
    fallback: { body: fallbackPayload({ exists: true, customTopper: { request: 'more grown-up and fancy' } }) },
  });
  const response = await interpret({ ...request, phrase, state: before });
  assert.equal(response.provider.interpreter, 'fallback');
  assert.equal(response.patch.customTopper, undefined);
  assert.deepEqual(applyCakePatch(before, response.patch).state, before);
  assert.equal(applyCakePatch(before, response.patch).state.customTopper, null);
  assert.ok(response.notices.includes(CUSTOM_TOPPER_OBJECT_NOTICE));
  assert.equal(calls.length, 2, 'mocked text only, never an image request');
});

const ordinaryObjectCases = [
  ['Please add a fondant sailboat on top.', 'a fondant sailboat'],
  ['Add a figure of my grandma on top.', 'my grandma'],
  ['Put our cat Miso as a topper.', 'our cat Miso'],
  ['Use our cat Miso as the topper.', 'our cat Miso'],
  ['I would like a topper of my cat Miso.', 'my cat Miso'],
  ['Please place a miniature violin on top.', 'a miniature violin'],
  ['Add a clay-style hedgehog on top.', 'a clay-style hedgehog'],
  ['Could you sculpt a fondant sailboat for the top?', 'a fondant sailboat'],
  ['I want a figure of grandma on top.', 'grandma'],
  ['Add an astronaut holding a flag.', 'an astronaut holding a flag'],
  ['Please make a sugar telescope for the top.', 'a sugar telescope'],
  ['Could you do a tiny windmill on top?', 'a tiny windmill'],
  ['Put Miso on it.', 'Miso'],
  ['Use our spaniel as the cake topper.', 'our spaniel'],
  ['Please create a fondant microscope on top.', 'a fondant microscope'],
  ['Make a tiny koala topper.', 'a tiny koala'],
] as const;

for (const provider of ['jev', 'fallback'] as const) for (const priorAsset of [false, true]) {
  for (const [phrase, description] of ordinaryObjectCases) {
    test(`${provider} accepts ordinary object request (${priorAsset ? 'ready asset' : 'no asset'}): ${phrase}`, async t => {
      withEnv(t);
      const index = extractCandidates(phrase).indexOf(description);
      assert.ok(index >= 0, 'Jev selects an actual source span');
      const before = createCake(priorAsset ? { customTopper: { request: 'my dog Biscuit', assetId: 'a'.repeat(64) } } : {});
      const calls = mockFetch(t, provider === 'jev' ? { jev: jevPayload(phrase, {
        action: 'edit', customTopperAction: 'add', customTopper: `span_${index}`, scope_customTopper: 'mentioned',
      }) } : {
        jev: jevPayload(phrase, {}),
        fallback: { body: fallbackPayload({ customTopper: { request: description } }) },
      });
      const response = await interpret({ ...request, phrase, state: before });
      assert.equal(response.provider.interpreter, provider);
      assert.deepEqual(response.patch.customTopper, { request: description });
      assert.ok(!response.notices.includes(CUSTOM_TOPPER_OBJECT_NOTICE));
      assert.equal(applyCakePatch(before, response.patch).state.customTopper?.request, description);
      assert.equal(calls.length, provider === 'jev' ? 1 : 2, 'mocked text only; no image endpoint');
    });
  }

  for (const [phrase, description, id] of [
    ['Put a dinosaur on top please.', 'dinosaur', 'dinosaur'],
    ['Please add a castle to the cake.', 'a castle', 'castle'],
    ['Use a Flower bouquet on top.', 'Flower bouquet', 'flower-bouquet'],
  ] as const) {
    test(`${provider} remaps custom-only ${description} to catalog (${priorAsset ? 'ready asset' : 'no asset'})`, async t => {
      withEnv(t);
      const index = extractCandidates(phrase).indexOf(description);
      assert.ok(index >= 0);
      const before = createCake(priorAsset ? { customTopper: { request: 'my dog Biscuit', assetId: 'a'.repeat(64) } } : {});
      const calls = mockFetch(t, provider === 'jev' ? { jev: jevPayload(phrase, {
        action: 'edit', customTopperAction: 'add', customTopper: `span_${index}`, scope_customTopper: 'mentioned',
        // Deliberately no prepared incoming slot, the reviewer's asymmetric case.
      }) } : {
        jev: jevPayload(phrase, {}),
        fallback: { body: fallbackPayload({ customTopper: { request: description } }) },
      });
      const response = await interpret({ ...request, phrase, state: before });
      assert.equal(response.provider.interpreter, provider);
      assert.equal(response.patch.customTopper, undefined);
      assert.deepEqual(response.patch.addToppers, [id]);
      const after = applyCakePatch(before, response.patch).state;
      assert.deepEqual(after.toppers, [id]);
      assert.deepEqual(after.customTopper, before.customTopper, 'catalog remapping preserves an existing custom asset');
      assert.equal(calls.length, provider === 'jev' ? 1 : 2);
    });
  }
}

test('shared custom-name matcher covers every prepared catalog id and label, not portrait descriptions', () => {
  for (const topper of TOPPER_CATALOG) {
    for (const name of [topper.id, topper.label, `a ${topper.label}`, `the ${topper.label.toUpperCase()}`]) {
      assert.equal(catalogTopperForRequest(name), topper.id);
    }
  }
  for (const name of ['my cat Miso', 'our golden retriever', 'an astronaut holding a flag']) {
    assert.equal(catalogTopperForRequest(name), undefined);
  }
});

test('Jev custom-only catalog remapping deduplicates a separately selected prepared slot', async t => {
  withEnv(t);
  const phrase = 'Add a dinosaur.';
  const index = extractCandidates(phrase).indexOf('dinosaur');
  assert.ok(index >= 0);
  const calls = mockFetch(t, { jev: jevPayload(phrase, {
    action: 'edit', customTopperAction: 'add', customTopper: `span_${index}`, scope_customTopper: 'mentioned',
    topperOperation: 'add', topperIncomingFirst: 'dinosaur', scope_topperOperation: 'mentioned',
  }) });
  const response = await interpret({ ...request, phrase, state: createCake() });
  assert.equal(response.patch.customTopper, undefined);
  assert.deepEqual(response.patch.addToppers, ['dinosaur']);
  assert.equal(calls.length, 1);
});
