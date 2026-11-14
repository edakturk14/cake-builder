import test from 'node:test';
import assert from 'node:assert/strict';
import { OCCASIONS, OCCASION_BY_ID, matchOccasion } from '../src/shared/occasions';
import { applyCakePatch, createBasketItem, createCake, estimateCake, parseBasket, type CakePatch } from '../src/shared/cake';
import { getCakeSuggestions } from '../src/shared/discoverability';

test('occasion catalog has all seventeen requested bounded labels and useful suggestions', () => {
  assert.deepEqual(OCCASIONS.map(option => option.id), ['birthday', 'wedding', 'anniversary', 'engagement', 'graduation', 'promotion', 'retirement', 'baby-shower', 'christening', 'housewarming', 'christmas', 'new-year', 'valentines-day', 'mothers-day', 'fathers-day', 'thank-you', 'just-because']);
  for (const option of OCCASIONS) {
    assert.ok(option.label && option.jevDescription);
    assert.ok(option.suggestions.length >= 2);
    assert.equal(matchOccasion(option.id), option.id);
    assert.equal(matchOccasion(` ${option.label.toUpperCase()} `), option.id);
  }
  assert.equal(matchOccasion('Mother’s Day'), 'mothers-day');
  assert.equal(matchOccasion('Unexpected free occasion'), null);
});
test('setting an occasion changes only its free label, never adds implied decorations', () => {
  const cake = createCake({ layers: 2, toppers: ['castle'], inscription: 'Eda', toppings: ['strawberries'], theme: 'tennis' });
  for (const option of OCCASIONS) {
    const edited = applyCakePatch(cake, { occasion: option.id }).state;
    assert.deepEqual(edited, { ...cake, occasion: option.id });
    assert.equal(estimateCake(edited).totalCents, estimateCake(cake).totalCents);
    assert.deepEqual(applyCakePatch(edited, { occasion: null }).state, { ...cake, occasion: null });
  }
  assert.throws(() => applyCakePatch(cake, { occasion: 'Birthday' } as unknown as CakePatch));
});
test('saved occasion strings migrate by supported label match, unknown labels become null without losing the cake', () => {
  const item = createBasketItem(createCake({ layers: 2, inscription: 'Eda', occasion: 'birthday' }), 'occasion-migration');
  for (const [old, expected] of [['Birthday', 'birthday'], ['Wedding', 'wedding'], ['new-year', 'new-year'], ["Father's Day", 'fathers-day'], ['A secret celebration', null]] as const) {
    const restored = parseBasket(JSON.stringify([{ ...item, design: { ...item.design, occasion: old } }]))[0];
    assert.equal(restored.design.occasion, expected);
    assert.equal(restored.design.inscription, 'Eda');
    assert.equal(restored.estimate.totalCents, 4800);
  }
});
test('occasion chips prefer meaningful suggestions and skip satisfied decorations, writing and colors', () => {
  const wedding = createCake({ occasion: 'wedding' });
  assert.deepEqual(getCakeSuggestions(wedding).slice(0, 2), OCCASION_BY_ID.wedding.suggestions.slice(0, 2));
  const finished = createCake({ occasion: 'wedding', toppers: ['bride-and-groom'], inscription: 'Mr & Mrs', colors: { frosting: 'ivory' } });
  for (const suggestion of OCCASION_BY_ID.wedding.suggestions) assert.ok(!getCakeSuggestions(finished).includes(suggestion));
  const graduation = createCake({ occasion: 'graduation', toppers: ['graduation-cap'], inscription: 'Ada' });
  assert.equal(getCakeSuggestions(graduation)[0], 'Add gold stars');
  const birthday = createCake({ occasion: 'birthday', candles: { style: 'number', number: '40' }, inscription: 'Ada', toppers: ['balloons'] });
  for (const suggestion of OCCASION_BY_ID.birthday.suggestions) assert.ok(!getCakeSuggestions(birthday).includes(suggestion));
});
