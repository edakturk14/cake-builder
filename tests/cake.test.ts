import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_CAKE, applyCakePatch, cakeReducer, cloneCake, createBasketItem, createCake, estimateCake, formatMoney, parseBasket, validateCakePatch, type CakePatch } from '../src/shared/cake';
import { CAKE_FIXTURES, DEMO_TURNS } from '../src/shared/fixtures';
import { TOPPER_CATALOG, type TopperId } from '../src/shared/toppers';

for (const fixture of CAKE_FIXTURES) {
  test(`fixture ${fixture.id}: ${fixture.title} (local state/pricing, not Jev)`, () => {
    let cake = cloneCake(EMPTY_CAKE);
    for (const turn of fixture.turns) {
      cake = applyCakePatch(cake, turn.patch).state;
      assert.equal(estimateCake(cake).totalCents, turn.expectedCents, turn.text);
    }
  });
}
test('four-step demo preserves earlier edits and estimate', () => {
  let state = { cake: cloneCake(EMPTY_CAKE), history: [] as ReturnType<typeof cloneCake>[] };
  assert.equal(estimateCake(state.cake).totalCents, 0);
  for (const turn of DEMO_TURNS.slice(0, 4)) {
    state = cakeReducer(state, { type: 'apply', patch: turn.patch });
    assert.equal(estimateCake(state.cake).totalCents, turn.expectedCents);
  }
  assert.equal(state.cake.inscription, 'Eda');
  assert.deepEqual(state.cake.toppers, ['princess']);
  state = cakeReducer(state, { type: 'apply', patch: { inscription: 'Ada' } });
  state = cakeReducer(state, { type: 'apply', patch: { removeToppers: ['princess'] } });
  assert.equal(estimateCake(state.cake).totalCents, 4800);
  state = cakeReducer(state, { type: 'undo' });
  assert.equal(estimateCake(state.cake).totalCents, 5800);
  assert.equal(state.cake.inscription, 'Ada');
});
test('six-step local replay supports Ada correction, princess removal and exact Undo', () => {
  let replay = { cake: cloneCake(EMPTY_CAKE), history: [] as ReturnType<typeof cloneCake>[] };
  assert.equal(DEMO_TURNS.length, 6);
  for (const turn of DEMO_TURNS.slice(0, 5)) replay = cakeReducer(replay, { type: 'apply', patch: turn.patch });
  assert.equal(replay.cake.inscription, 'Ada');
  assert.equal(estimateCake(replay.cake).totalCents, 5800);
  replay = cakeReducer(replay, { type: 'undo' });
  assert.equal(replay.cake.inscription, 'Eda');
  assert.deepEqual(replay.cake.toppers, ['princess']);
  assert.equal(replay.cake.layers, 2);
  assert.equal(estimateCake(replay.cake).totalCents, 5800);
  replay = cakeReducer(replay, { type: 'apply', patch: DEMO_TURNS[4].patch });
  replay = cakeReducer(replay, { type: 'apply', patch: DEMO_TURNS[5].patch });
  assert.deepEqual(replay.cake.toppers, []);
  assert.equal(replay.cake.inscription, 'Ada');
  assert.equal(estimateCake(replay.cake).totalCents, 4800);
  replay = cakeReducer(replay, { type: 'undo' });
  assert.deepEqual(replay.cake.toppers, ['princess']);
  assert.equal(replay.cake.inscription, 'Ada');
  assert.equal(estimateCake(replay.cake).totalCents, 5800);
});
test('toppings are idempotent, precise removals preserve unrelated options', () => {
  const cake = createCake({ theme: 'tennis', addToppers: ['princess'], customTopper: { request: 'Miso' }, addToppings: ['caramel', 'strawberries'], candles: { style: 'number', number: '40' } });
  const edited = applyCakePatch(cake, { addToppings: ['strawberries', 'ganache'], removeToppings: ['strawberries'] }).state;
  assert.deepEqual(edited.toppings, ['caramel', 'ganache']);
  assert.equal(edited.theme, 'tennis');
  assert.deepEqual(edited.toppers, ['princess']);
  assert.equal(edited.customTopper?.request, 'Miso');
  assert.equal(edited.candles.number, '40');
  assert.deepEqual(cake.toppings, ['caramel', 'strawberries']);
});
test('cheesecake preserves decorations and enforces a single baked layer', () => {
  const cake = createCake({ layers: 3, inscription: 'Eda', addToppings: ['strawberries'], candles: { style: 'number', number: '21' } });
  const result = applyCakePatch(cake, { base: 'cheesecake', layers: 2 });
  assert.equal(result.state.layers, 1);
  assert.equal(result.state.flavor, 'classic');
  assert.equal(result.state.inscription, 'Eda');
  assert.equal(result.state.candles.number, '21');
  assert.equal(result.notes.length, 1);
  const sponge = applyCakePatch(result.state, { base: 'sponge', flavor: 'lemon', layers: 2 }).state;
  assert.equal(sponge.flavor, 'lemon');
  assert.equal(sponge.layers, 2);
});
test('invalid model edits reject atomically and exact text remains plain text', () => {
  const cake = createCake();
  for (const patch of [{ layers: 4 }, { tier: 2 }, { toppings: ['unknown'] }, { candles: { style: 'number', number: '2026' } }, { inscription: 'a'.repeat(81) }, { base: null }, { exists: undefined }]) {
    assert.throws(() => applyCakePatch(cake, patch as CakePatch));
  }
  assert.equal(cake.layers, 1);
  const text = '<script>alert("hi")</script>';
  assert.equal(applyCakePatch(cake, { inscription: text }).state.inscription, text);
  assert.doesNotThrow(() => validateCakePatch({ inscription: 'a'.repeat(80), customTopper: { request: 'b'.repeat(120) } }));
});
test('candles replace price rather than accumulate, inscription and occasion are included', () => {
  const cake = createCake({ candles: { style: 'plain', number: null } });
  const edited = applyCakePatch(cake, { candles: { style: 'number', number: '40' }, inscription: 'Happy 40th, Ada', occasion: 'birthday' }).state;
  assert.equal(estimateCake(cake).totalCents, 4500);
  assert.equal(estimateCake(edited).totalCents, 4700);
  assert.equal(estimateCake(edited).lines.filter(line => line.id === 'candles').length, 1);
});
test('basket snapshots keep exact design, known subtotal and unpriced custom request', () => {
  const cake = createCake({ layers: 2, flavor: 'vanilla', customTopper: { request: 'My cat Miso' }, inscription: 'Eda', toppings: ['strawberries'] });
  const item = createBasketItem(cake, 'snapshot');
  cake.inscription = 'Ada';
  cake.layers = 1;
  cake.toppings.length = 0;
  assert.equal(item.design.inscription, 'Eda');
  assert.equal(item.design.layers, 2);
  assert.deepEqual(item.design.toppings, ['strawberries']);
  assert.equal(item.estimate.totalCents, 5100);
  assert.equal(item.estimate.requiresQuote, true);
  assert.deepEqual(item.estimate.quoteItems, ['My cat Miso']);
  assert.ok(Object.isFrozen(item.design.toppings));
  assert.throws(() => createBasketItem(EMPTY_CAKE));
});
test('basket reload validates state and recomputes prices, rejects corrupt storage', () => {
  const item = createBasketItem(createCake({ layers: 2, addToppers: ['princess'] }), 'restored');
  const restored = parseBasket(JSON.stringify([item]));
  assert.deepEqual(restored, [item]);
  const tampered = JSON.parse(JSON.stringify([item]));
  tampered[0].estimate.totalCents = 1;
  assert.equal(parseBasket(JSON.stringify(tampered))[0].estimate.totalCents, 5800);
  for (const input of ['not json', '{}', '[{}]', JSON.stringify([{ ...item, design: { ...item.design, layers: 7 } }]), JSON.stringify([item, item])]) {
    assert.deepEqual(parseBasket(input), []);
  }
});
test('history snapshots are immutable, undo restores exact state, reset clears history', () => {
  const initial = { cake: createCake(), history: [] };
  const updated = cakeReducer(initial, { type: 'apply', patch: { addToppings: ['strawberries'] } });
  initial.cake.inscription = 'later mutation';
  assert.equal(updated.history[0].inscription, '');
  assert.ok(Object.isFrozen(updated.history[0]));
  const undone = cakeReducer(updated, { type: 'undo' });
  assert.deepEqual(undone.cake.toppings, []);
  assert.equal(undone.cake.inscription, '');
  const reset = cakeReducer(updated, { type: 'reset' });
  assert.equal(reset.cake.exists, false);
  assert.equal(reset.history.length, 0);
});
test('sample money formatting and deduplicated kit estimate', () => {
  assert.equal(formatMoney(5800), '$58');
  assert.equal(formatMoney(5850), '$58.50');
  const cake = createCake({ theme: 'mario', toppings: ['strawberries', 'strawberries'] });
  assert.equal(estimateCake(cake).totalCents, 6100);
  assert.equal(estimateCake(cake).lines.filter(line => line.id === 'theme').length, 1);
});

test('prepared topper catalog has all 41 requested unique options at $10 each', () => {
  const expected = [
    'princess', 'castle', 'unicorn', 'dinosaur', 'dragon', 'rainbow', 'butterfly', 'flower-bouquet', 'heart', 'crown', 'star-wand', 'balloons',
    'cat', 'dog', 'bunny', 'teddy-bear', 'panda', 'lion', 'elephant', 'mermaid', 'fairy', 'knight', 'wizard', 'ballerina',
    'astronaut', 'rocket', 'robot', 'pirate-ship', 'fire-truck', 'train', 'airplane', 'race-car', 'superhero', 'boy-figurine', 'girl-figurine',
    'bride-and-groom', 'snowman', 'christmas-tree', 'pumpkin', 'graduation-cap', 'baby-bootie',
  ];
  assert.deepEqual(TOPPER_CATALOG.map(topper => topper.id), expected);
  for (const topper of TOPPER_CATALOG) {
    assert.ok(topper.label.length > 0);
    assert.ok(topper.jevDescription.length > 0);
    assert.equal(topper.priceCents, 1000);
    const estimate = estimateCake(createCake({ addToppers: [topper.id] }));
    assert.equal(estimate.totalCents, 5200);
    assert.deepEqual(estimate.lines.find(line => line.id === `topper:${topper.id}`), { id: `topper:${topper.id}`, label: `${topper.label} topper`, amountCents: 1000 });
    assert.equal(estimate.requiresQuote, false);
  }
});
test('castle adds $10, princess plus castle preserve order, removal keeps the other', () => {
  const castle = applyCakePatch(createCake(), { addToppers: ['castle'] }).state;
  assert.deepEqual(castle.toppers, ['castle']);
  assert.equal(estimateCake(castle).totalCents, 5200);
  const pair = applyCakePatch(castle, { addToppers: ['princess', 'castle'] }).state;
  assert.deepEqual(pair.toppers, ['castle', 'princess']);
  assert.equal(estimateCake(pair).totalCents, 6200);
  const edited = applyCakePatch(pair, { removeToppers: ['castle'], inscription: 'Eda' }).state;
  assert.deepEqual(edited.toppers, ['princess']);
  assert.equal(estimateCake(edited).totalCents, 5200);
  assert.deepEqual(pair.toppers, ['castle', 'princess']);
});
test('third topper rejects whole turn and explains cap; removing then adding remains valid', () => {
  const pair = createCake({ toppers: ['princess', 'castle'], inscription: 'Eda' });
  const rejected = applyCakePatch(pair, { addToppers: ['unicorn'], inscription: 'Ada', addToppings: ['strawberries'] });
  assert.deepEqual(rejected.state, pair);
  assert.deepEqual(rejected.notes, ['Up to two toppers in this demo']);
  const replaced = applyCakePatch(pair, { removeToppers: ['castle'], addToppers: ['unicorn'] }).state;
  assert.deepEqual(replaced.toppers, ['princess', 'unicorn']);
  const explicit = applyCakePatch(pair, { toppers: ['castle', 'princess', 'castle'] }).state;
  assert.deepEqual(explicit.toppers, ['castle', 'princess']);
  assert.deepEqual(applyCakePatch(pair, { toppers: ['princess', 'castle', 'unicorn'] }).state, pair);
  assert.throws(() => applyCakePatch(pair, { addToppers: ['unknown' as TopperId] }));
});
test('topper snapshots, Undo and legacy basket migration preserve placement and old prices', () => {
  const original = createCake({ layers: 2, toppers: ['princess', 'castle'], candles: { style: 'number', number: '6' } });
  const item = createBasketItem(original, 'topper-pair');
  original.toppers.reverse();
  assert.deepEqual(item.design.toppers, ['princess', 'castle']);
  assert.equal(item.estimate.totalCents, 7300);
  assert.ok(Object.isFrozen(item.design.toppers));
  assert.deepEqual(parseBasket(JSON.stringify([item])), [item]);
  const edited = cakeReducer({ cake: item.design, history: [] }, { type: 'apply', patch: { removeToppers: ['princess'] } });
  assert.deepEqual(cakeReducer(edited, { type: 'undo' }).cake.toppers, ['princess', 'castle']);
  for (const topper of ['princess', null] as const) {
    const { toppers: _removed, ...design } = createCake({ layers: 2, inscription: 'Eda' });
    const legacy = { ...item, id: `legacy-${topper}`, design: { ...design, topper } };
    const restored = parseBasket(JSON.stringify([legacy]))[0];
    assert.deepEqual(restored.design.toppers, topper ? ['princess'] : []);
    assert.equal(restored.estimate.totalCents, topper ? 5800 : 4800);
    assert.equal(restored.design.inscription, 'Eda');
    assert.equal(Object.hasOwn(restored.design, 'topper'), false);
  }
  assert.deepEqual(parseBasket(JSON.stringify([{ ...item, design: { ...item.design, toppers: ['princess', 'castle', 'unicorn'] } }])), []);
});
