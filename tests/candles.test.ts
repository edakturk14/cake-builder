import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PLAIN_CANDLE_COUNT, PLAIN_CANDLE_COUNTS, applyCakePatch, cakeReducer, createBasketItem, createCake, estimateCake, parseBasket, type CakePatch } from '../src/shared/cake';

test('three plain candles and a numeral three are distinct designs and prices', () => {
  const plain = createCake({ candles: { style: 'plain', count: 3 } });
  assert.deepEqual(plain.candles, { style: 'plain', number: null, count: 3 });
  assert.equal(estimateCake(plain).totalCents, 4500);
  const numeral = applyCakePatch(plain, { candles: { style: 'number', number: '3' } }).state;
  assert.deepEqual(numeral.candles, { style: 'number', number: '3', count: null });
  assert.equal(estimateCake(numeral).totalCents, 4700);
  assert.equal(estimateCake(numeral).lines.filter(line => line.id === 'candles').length, 1);
});
test('plain counts accept each bound, default to five and update partially without resetting unrelated design', () => {
  const base = createCake({ layers: 2, toppers: ['princess'], inscription: 'Eda', candles: { style: 'plain' } });
  assert.equal(base.candles.count, DEFAULT_PLAIN_CANDLE_COUNT);
  for (const count of PLAIN_CANDLE_COUNTS) {
    const cake = applyCakePatch(base, { candles: { count } }).state;
    assert.deepEqual(cake.candles, { style: 'plain', number: null, count });
    assert.equal(cake.inscription, 'Eda');
    assert.deepEqual(cake.toppers, ['princess']);
    assert.equal(estimateCake(cake).totalCents, 6100);
  }
  const numeric = applyCakePatch(base, { candles: { style: 'number', number: '40' } }).state;
  assert.deepEqual(applyCakePatch(numeric, { candles: { number: '41' } }).state.candles, { style: 'number', number: '41', count: null });
  assert.deepEqual(applyCakePatch(numeric, { candles: { style: 'plain' } }).state.candles, { style: 'plain', number: null, count: 5 });
  assert.deepEqual(applyCakePatch(numeric, { candles: { style: 'none' } }).state.candles, { style: 'none', number: null, count: null });
});
test('invalid or mixed count/numeral requests reject atomically', () => {
  const cake = createCake({ candles: { style: 'plain', count: 3 } });
  for (const candles of [
    { count: 0 }, { count: 13 }, { count: 1.5 }, { count: '3' }, { style: 'plain', number: '3' },
    { style: 'number', number: '3', count: 3 }, { style: 'none', count: 3 }, { style: 'number', number: null },
  ]) assert.throws(() => applyCakePatch(cake, { candles } as CakePatch));
  assert.deepEqual(cake.candles, { style: 'plain', number: null, count: 3 });
});
test('basket and Undo preserve candle counts; old plain and numeral sets migrate without price changes', () => {
  const original = createCake({ candles: { style: 'plain', count: 3 } });
  const item = createBasketItem(original, 'three-candles');
  const edited = cakeReducer({ cake: original, history: [] }, { type: 'apply', patch: { candles: { style: 'number', number: '3' } } });
  assert.equal(cakeReducer(edited, { type: 'undo' }).cake.candles.count, 3);
  assert.deepEqual(parseBasket(JSON.stringify([item]))[0].design.candles, original.candles);
  for (const [style, number, count, price] of [['plain', null, 5, 4500], ['number', '3', null, 4700], ['none', null, null, 4200]] as const) {
    const legacy = { ...item, design: { ...item.design, candles: { style, number } } };
    const restored = parseBasket(JSON.stringify([legacy]))[0];
    assert.deepEqual(restored.design.candles, { style, number, count });
    assert.equal(restored.estimate.totalCents, price);
  }
});
