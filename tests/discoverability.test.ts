import test from 'node:test';
import assert from 'node:assert/strict';
import { CANDLE_OPTIONS, CHEESECAKE_LAYERS, DESIGN_EXAMPLES, EMPTY_CAKE, FLAVORS, LABELS, PRICING, SPONGE_LAYERS, THEMES, TOPPINGS, createCake } from '../src/shared/cake';
import { TOPPER_CATALOG } from '../src/shared/toppers';
import { getAskOptions, getCakeSuggestions } from '../src/shared/discoverability';
import { COLOR_TARGETS, PALETTE, POSITION_OPTIONS, SIZE_OPTIONS, WRITING_CASE_OPTIONS, WRITING_FONT_OPTIONS, WRITING_PLACEMENT_OPTIONS } from '../src/shared/appearance';
import { OCCASIONS } from '../src/shared/occasions';

test('discoverable options and prices derive from every shared catalog, without a separate option list', () => {
  const groups = getAskOptions();
  const options = (id: string) => groups.find(group => group.id === id)!.options;
  assert.equal(groups[0].label, 'Occasions');
  assert.deepEqual(options('occasions'), OCCASIONS.map(({ id, label }) => ({ id, label, priceCents: 0, detail: 'included' })));
  assert.deepEqual(options('flavors').map(option => [option.id, option.priceCents]), FLAVORS.map(id => [id, PRICING.flavors[id]]));
  assert.deepEqual(options('layers').map(option => option.priceCents), [...SPONGE_LAYERS.map(count => (count - 1) * PRICING.additionalLayer), 0]);
  assert.ok(options('layers').some(option => option.label.includes(`Cheesecake: ${CHEESECAKE_LAYERS}`)));
  assert.deepEqual(options('toppings'), TOPPINGS.map(id => ({ id, label: LABELS[id], priceCents: PRICING.toppings[id] })));
  assert.deepEqual(options('candles'), CANDLE_OPTIONS);
  assert.equal(groups.find(group => group.id === 'themes')?.label, 'Designs you can describe');
  assert.deepEqual(options('themes'), THEMES.map(id => ({ id, label: DESIGN_EXAMPLES[id], priceCents: PRICING.themes[id] })));
  assert.deepEqual(options('toppers'), TOPPER_CATALOG.map(({ id, label, priceCents }) => ({ id, label, priceCents })));
  assert.equal(options('custom')[0].priceCents, null);
  for (const [group, catalog] of [['colors', PALETTE], ['color-targets', COLOR_TARGETS], ['sizes', SIZE_OPTIONS], ['positions', POSITION_OPTIONS]] as const) {
    assert.deepEqual(options(group).map(option => [option.id, option.label, option.priceCents]), catalog.map(option => [option.id, option.label, 0]));
  }
  assert.deepEqual(options('writing').map(option => option.id), [
    ...WRITING_FONT_OPTIONS.map(option => `font:${option.id}`), ...WRITING_CASE_OPTIONS.map(option => `case:${option.id}`), ...WRITING_PLACEMENT_OPTIONS.map(option => `placement:${option.id}`),
  ]);
});
test('suggestions are deterministic, contextual and never offer existing decorations or unsupported extra layers', () => {
  assert.deepEqual(getCakeSuggestions(EMPTY_CAKE), ['A birthday cake', 'I want a chocolate cake', 'I want a classic cheesecake']);
  const cake = createCake({ layers: 3, toppings: [...TOPPINGS], toppers: ['castle', 'unicorn'], inscription: 'Ada', candles: { style: 'plain', number: null } });
  const suggestions = getCakeSuggestions(cake);
  assert.equal(suggestions.length, 4);
  assert.equal(new Set(suggestions).size, 4);
  assert.deepEqual(suggestions, getCakeSuggestions(cake));
  assert.ok(suggestions.every(text => !/Add |layers|Write /.test(text)));
  const cheesecake = getCakeSuggestions(createCake({ base: 'cheesecake', inscription: 'Ada' }));
  assert.ok(cheesecake.every(text => !/layers|cheesecake|Write /.test(text)));
});
test('topper suggestions rotate with confirmed state and exclude toppers already present', () => {
  const suggested = new Set<string>();
  for (const flavor of FLAVORS.filter(flavor => flavor !== 'classic')) {
    const cake = createCake({ flavor, toppers: ['castle'] });
    const texts = getCakeSuggestions(cake);
    assert.equal(texts.length, 4);
    assert.ok(texts.every(text => !/^Add a castle topper/.test(text)));
    for (const text of texts.filter(text => /topper|on top/.test(text) && !text.startsWith('Write'))) suggested.add(text);
  }
  assert.ok(suggested.size > 2);
});
