import test from 'node:test';
import assert from 'node:assert/strict';
import { CAKE_FIXTURES } from '../src/shared/fixtures';
import { EMPTY_CAKE, applyCakePatch, cloneCake, createBasketItem, createCake, estimateCake, parseBasket, type CakeState } from '../src/shared/cake';

// Expectations transcribed from docs/build-brief.md, not fixture.expectedCents
// or PRICING. These exercise local fixture patches, not Jev interpretation.
const expectations: { prices: number[]; final: Partial<CakeState> }[] = [
  { prices: [4400, 5100], final: { base: 'cheesecake', layers: 1, flavor: 'classic', toppings: ['strawberries'], inscription: 'Eda' } },
  { prices: [5800], final: { layers: 2, flavor: 'chocolate', occasion: 'birthday', toppers: ['princess'], inscription: 'Eda' } },
  { prices: [5600, 5600], final: { layers: 2, flavor: 'vanilla', toppings: ['strawberries'], candles: { style: 'number', number: '41', count: null } } },
  { prices: [5500], final: { layers: 2, flavor: 'chocolate', toppings: ['gold-stars'], candles: { style: 'plain', number: null, count: 5 }, inscription: 'Happy New Year, Eda' } },
  { prices: [5600, 6100], final: { layers: 2, flavor: 'vanilla', theme: 'mario', candles: { style: 'number', number: '7', count: null } } },
  { prices: [6000, 6000], final: { layers: 2, flavor: 'chocolate', theme: 'formula-one', inscription: 'Eda' } },
  { prices: [5600], final: { layers: 2, flavor: 'vanilla', theme: 'spain-world-cup' } },
  { prices: [5600], final: { layers: 2, flavor: 'lemon', theme: 'tennis', inscription: 'Game, Set, Match' } },
  { prices: [6300], final: { layers: 2, flavor: 'chocolate', theme: 'jensen-huang' } },
  { prices: [6600], final: { layers: 3, flavor: 'red-velvet', toppings: ['raspberries'], candles: { style: 'plain', number: null, count: 5 }, inscription: 'Happy Birthday, Mira' } },
  { prices: [5900, 5700], final: { layers: 2, flavor: 'chocolate', toppings: ['caramel', 'ganache'] } },
  { prices: [4400, 4900], final: { layers: 2, flavor: 'vanilla', customTopper: null, candles: { style: 'number', number: '30', count: null } } },
  { prices: [6300, 6500], final: { layers: 2, flavor: 'chocolate', toppers: [], theme: 'mario', candles: { style: 'number', number: '6', count: null }, inscription: 'Luca' } },
  { prices: [5200, 5600], final: { base: 'cheesecake', layers: 1, flavor: 'classic', toppings: ['strawberries'], candles: { style: 'number', number: '21', count: null }, inscription: 'Happy birthday, Selin' } },
];

test('local acceptance catalog contains all fourteen numbered examples and twenty-two turns', () => {
  assert.deepEqual(CAKE_FIXTURES.map(fixture => fixture.id), Array.from({ length: 14 }, (_, index) => String(index + 1).padStart(2, '0')));
  assert.equal(CAKE_FIXTURES.reduce((count, fixture) => count + fixture.turns.length, 0), 22);
});

for (const [index, expected] of expectations.entries()) {
  test(`local acceptance example ${String(index + 1).padStart(2, '0')}: independent prices, quote flags, and final attributes (not Jev)`, () => {
    const fixture = CAKE_FIXTURES[index];
    assert.equal(fixture.turns.length, expected.prices.length);
    let cake = cloneCake(EMPTY_CAKE);
    for (const [turnIndex, turn] of fixture.turns.entries()) {
      cake = applyCakePatch(cake, turn.patch).state;
      assert.equal(cake.exists, true);
      const estimate = estimateCake(cake);
      assert.equal(estimate.totalCents, expected.prices[turnIndex], turn.text);
      assert.equal(estimate.requiresQuote, index === 11 && turnIndex === 0, turn.text);
      if (index === 11 && turnIndex === 0) {
        assert.match(cake.customTopper!.request, /cat Miso/i);
        assert.deepEqual(estimate.quoteItems, [cake.customTopper!.request]);
      } else assert.deepEqual(estimate.quoteItems, []);
      if (index === 2 && turnIndex === 0) assert.equal(cake.candles.number, '40');
      if (index === 10 && turnIndex === 0) assert.deepEqual(cake.toppings, ['caramel', 'strawberries']);
      if (index === 12 && turnIndex === 0) assert.deepEqual(cake.toppers, ['princess']);
      if (index === 13 && turnIndex === 0) assert.equal(cake.flavor, 'lemon');
    }
    for (const [field, value] of Object.entries(expected.final)) {
      assert.deepEqual(cake[field as keyof CakeState], value, `${fixture.id}: ${field}`);
    }
  });
}

test('basket acceptance: compound snapshot and reload retain exact design and derive trusted estimates', () => {
  const cake = createCake({
    layers: 3, flavor: 'red-velvet', theme: 'spain-world-cup',
    toppings: ['strawberries', 'caramel'], toppers: ['princess'],
    customTopper: { request: 'My cat Miso <img src=x onerror=alert(1)>', assetId: null },
    candles: { style: 'number', number: '21' }, inscription: 'Happy birthday, Selin!',
  });
  const item = createBasketItem(cake, 'acceptance-snapshot');
  const serialized = JSON.stringify(item);
  applyCakePatch(cake, { base: 'cheesecake', removeToppings: ['strawberries'], removeToppers: ['princess'], inscription: 'Ada' });
  cake.toppings.push('raspberries');
  cake.candles.number = '30';
  cake.customTopper = null;
  assert.equal(JSON.stringify(item), serialized);
  assert.deepEqual(parseBasket(JSON.stringify([item])), [item]);
  const tampered = JSON.parse(JSON.stringify([item]));
  tampered[0].estimate = { totalCents: 1, requiresQuote: false, quoteItems: [], lines: [] };
  const restored = parseBasket(JSON.stringify(tampered))[0];
  assert.deepEqual(restored.design, item.design);
  assert.deepEqual(restored.estimate, item.estimate);
  assert.ok(Object.isFrozen(restored.design.candles));
  assert.ok(Object.isFrozen(restored.estimate.lines));
  for (const design of [
    { ...item.design, base: 'cheesecake', layers: 3 },
    { ...item.design, toppings: ['strawberries', 'strawberries'] },
    { ...item.design, candles: { style: 'number', number: '2026' } },
  ]) assert.deepEqual(parseBasket(JSON.stringify([{ ...item, design }])), []);
});
