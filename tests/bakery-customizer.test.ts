import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCakePatch, estimateCake } from '../src/shared/cake';
import { BAKERY_TEMPLATES, createTemplateCake } from '../src/shared/bakery';
import { interpretLocalCommand } from '../src/shared/localCommands';

test('starter cakes have fixed heights, prepared toppings, and known prices', () => {
  assert.equal(BAKERY_TEMPLATES.length, 3);
  for (const template of BAKERY_TEMPLATES) {
    const cake = createTemplateCake(template.id);
    assert.equal(cake.exists, true);
    assert.ok(cake.layers === 1 || cake.layers === 2);
    assert.equal(cake.customTopper, null);
    assert.equal(cake.toppers.length, 0);
    assert.equal(estimateCake(cake).requiresQuote, false);
  }
  assert.equal(createTemplateCake('chocolate').layers, 2);
});

test('typed or spoken color, topping and writing edits need no model', () => {
  const base = createTemplateCake('classic');
  const command = interpretLocalCommand('Make it pink, add strawberries and write Happy 30th on top', base);
  assert.equal(command.kind, 'edit');
  if (command.kind !== 'edit') return;
  const next = applyCakePatch(base, command.patch).state;
  assert.equal(next.colors.frosting, 'blush-pink');
  assert.deepEqual(next.toppings, ['strawberries']);
  assert.equal(next.inscription, 'Happy 30th');
  assert.equal(next.layers, 1);
  assert.equal(estimateCake(next).totalCents, estimateCake(base).totalCents + 700);
});

test('a castle topper is supported but turning the whole cake into a castle needs a quote', () => {
  const base = createTemplateCake('classic');
  const topper = interpretLocalCommand('Add a castle topper on top', base);
  assert.equal(topper.kind, 'edit');
  if (topper.kind === 'edit') assert.deepEqual(applyCakePatch(base, topper.patch).state.toppers, ['castle']);
  assert.equal(interpretLocalCommand('Turn the whole cake into a castle shape', base).kind, 'custom');
  assert.equal(interpretLocalCommand('Make the cake look like a castle', base).kind, 'custom');
});

test('one to three layers update the cake and sample prices', () => {
  const base = createTemplateCake('chocolate');
  const command = interpretLocalCommand('Make it three layers', base);
  assert.equal(command.kind, 'edit');
  if (command.kind === 'edit') {
    const next = applyCakePatch(base, command.patch).state;
    assert.equal(next.layers, 3);
    assert.deepEqual(next.toppings, base.toppings);
    assert.equal(estimateCake(next).totalCents, estimateCake(base).totalCents + 600);
  }
  const one = interpretLocalCommand('Make it one layer', base);
  assert.equal(one.kind, 'edit');
  if (one.kind === 'edit') assert.equal(applyCakePatch(base, one.patch).state.layers, 1);
  const extra = interpretLocalCommand('Add a layer', base);
  assert.equal(extra.kind, 'edit');
  if (extra.kind === 'edit') assert.equal(applyCakePatch(base, extra.patch).state.layers, 3);
  assert.equal(interpretLocalCommand('Add a layer', applyCakePatch(base, { layers: 3 }).state).kind, 'help');
  assert.equal(interpretLocalCommand('Make it three tiers', base).kind, 'custom');
  assert.equal(interpretLocalCommand('Make it two tiers', base).kind, 'custom');
});

test('replace prepared topper instead of overlapping multiple figures', () => {
  const base = applyCakePatch(createTemplateCake('classic'), { toppers: ['princess'] }).state;
  const command = interpretLocalCommand('Put a unicorn on top', base);
  assert.equal(command.kind, 'edit');
  if (command.kind === 'edit') assert.deepEqual(applyCakePatch(base, command.patch).state.toppers, ['unicorn']);
});

test('removing one topping does not accidentally remove another', () => {
  const base = applyCakePatch(createTemplateCake('classic'), { toppings: ['strawberries'] }).state;
  const command = interpretLocalCommand('Remove strawberries and add caramel', base);
  assert.equal(command.kind, 'edit');
  if (command.kind === 'edit') {
    const next = applyCakePatch(base, command.patch).state;
    assert.deepEqual(next.toppings, ['caramel']);
  }
});

test('candles and long inscriptions remain bounded', () => {
  const base = createTemplateCake('classic');
  const candles = interpretLocalCommand('Add a number 40 candle', base);
  assert.equal(candles.kind, 'edit');
  if (candles.kind === 'edit') assert.deepEqual(applyCakePatch(base, candles.patch).state.candles, { style: 'number', number: '40', count: null });
  assert.equal(interpretLocalCommand('Write Happy birthday to my beautiful best friend forever', base).kind, 'help');
});

test('unrecognized prompts stay unpriced and never invent decorations', () => {
  const base = createTemplateCake('classic');
  assert.equal(interpretLocalCommand('Give it a midnight masquerade mood', base).kind, 'help');
  assert.equal(interpretLocalCommand('Build a spaceship-shaped cake', base).kind, 'custom');
});
