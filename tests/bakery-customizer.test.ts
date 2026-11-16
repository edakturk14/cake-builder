import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCakePatch, createBasketItem, estimateCake, parseBasket } from '../src/shared/cake';
import { BAKERY_STARTING_PRICE_CENTS, BAKERY_TEMPLATES, createTemplateCake, estimateBakeryCake, priceBakeryBasketItem } from '../src/shared/bakery';
import { interpretLocalCommand } from '../src/shared/localCommands';

test('starter cakes have fixed heights, prepared toppings, and known prices', () => {
  assert.equal(BAKERY_TEMPLATES.length, 4);
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

test('typed or spoken topping and writing edits need no model', () => {
  const base = createTemplateCake('classic');
  const command = interpretLocalCommand('Add strawberries and write Happy 30th on top', base);
  assert.equal(command.kind, 'edit');
  if (command.kind !== 'edit') return;
  const next = applyCakePatch(base, command.patch).state;
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
  const command = interpretLocalCommand('Remove strawberries and add gold stars', base);
  assert.equal(command.kind, 'edit');
  if (command.kind === 'edit') {
    const next = applyCakePatch(base, command.patch).state;
    assert.deepEqual(next.toppings, ['gold-stars']);
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

test('freeform ganache and caramel drips are no longer selectable through text or templates', () => {
  for (const template of BAKERY_TEMPLATES) {
    const toppings = createTemplateCake(template.id).toppings;
    assert.equal(toppings.includes('ganache'), false);
    assert.equal(toppings.includes('caramel'), false);
  }
  const cake = createTemplateCake('chocolate');
  assert.equal(interpretLocalCommand('Add chocolate ganache', cake).kind, 'help');
  assert.equal(interpretLocalCommand('Add caramel drizzle', cake).kind, 'help');
  assert.equal(interpretLocalCommand('Remove caramel drizzle', cake).kind, 'edit');
});

test('holiday, birthday and racing fondant toppers are available as prepared designs', async () => {
  const { BAKERY_TOPPERS, BAKERY_TOPPINGS } = await import('../src/shared/bakery');
  assert.deepEqual(BAKERY_TOPPINGS.map(item => item.id), ['strawberries', 'raspberries', 'gold-stars']);
  for (const id of ['christmas-tree', 'snowman', 'balloons', 'castle', 'race-car']) {
    assert.ok(BAKERY_TOPPERS.some(item => item.id === id), id);
  }
  const cake = createTemplateCake('classic');
  const request = interpretLocalCommand('Add a Christmas tree on top', cake);
  assert.equal(request.kind, 'edit');
  if (request.kind === 'edit') assert.deepEqual(applyCakePatch(cake, request.patch).state.toppers, ['christmas-tree']);
});

test('NYC bakery prices start at $58 for every sponge flavor, with extras charged separately', () => {
  assert.equal(BAKERY_STARTING_PRICE_CENTS, 5800);
  for (const flavor of ['vanilla', 'chocolate', 'red-velvet', 'lemon'] as const) {
    const cake = applyCakePatch(createTemplateCake('classic'), { flavor }).state;
    const priced = estimateBakeryCake(cake);
    assert.equal(priced.totalCents, 5800, flavor);
    assert.equal(priced.lines[0].id, 'base');
    assert.equal(priced.lines[0].amountCents, 5800);
    assert.equal(priced.lines.reduce((total, line) => total + line.amountCents, 0), priced.totalCents);
  }
  assert.equal(estimateBakeryCake(createTemplateCake('chocolate')).totalCents, 6400);
  assert.equal(estimateBakeryCake(createTemplateCake('red-velvet')).totalCents, 6400);
  assert.equal(estimateBakeryCake(createTemplateCake('sprinkles')).totalCents, 6200);
  const decorated = applyCakePatch(createTemplateCake('classic'), {
    layers: 3, addToppings: ['strawberries'], toppers: ['unicorn'],
  }).state;
  const priced = estimateBakeryCake(decorated);
  assert.equal(priced.totalCents, 5800 + 1200 + 700 + 1000);
  assert.equal(priced.lines.reduce((total, line) => total + line.amountCents, 0), priced.totalCents);
  assert.equal(estimateBakeryCake(createTemplateCake('classic')).requiresQuote, false);
});

test('NYC bakery pricing survives basket saves and reloads without changing old demo fixtures', () => {
  const cake = applyCakePatch(createTemplateCake('classic'), {
    layers: 2, addToppings: ['raspberries'], inscription: 'Eda',
  }).state;
  const original = createBasketItem(cake, 'nyc-cake');
  const saved = priceBakeryBasketItem(original);
  assert.equal(saved.estimate.totalCents, 5800 + 600 + 700);
  assert.equal(saved.design.inscription, 'Eda');
  const reloaded = priceBakeryBasketItem(parseBasket(JSON.stringify([saved]))[0]);
  assert.equal(reloaded.estimate.totalCents, saved.estimate.totalCents);
  assert.deepEqual(reloaded.estimate.lines, saved.estimate.lines);
  assert.equal(estimateCake(cake).totalCents, 3800 + 600 + 700,
    'The older shared demo fixtures keep their original prices');
});

test('starter gallery has four prepared cakes including red velvet and birthday sprinkles, with no cheesecake', () => {
  assert.deepEqual(BAKERY_TEMPLATES.map(item => item.id), ['classic', 'chocolate', 'red-velvet', 'sprinkles']);
  assert.deepEqual(BAKERY_TEMPLATES.map(item => item.name), ['Classic Birthday', 'Chocolate Party', 'Red Velvet', 'Birthday with Sprinkles']);
  const redVelvet = createTemplateCake('red-velvet');
  assert.equal(redVelvet.exists, true);
  assert.equal(redVelvet.base, 'sponge');
  assert.equal(redVelvet.flavor, 'red-velvet');
  assert.equal(redVelvet.layers, 2);
  assert.deepEqual(redVelvet.toppings, []);
  assert.equal(redVelvet.colors.frosting, 'white');
  assert.equal(estimateBakeryCake(redVelvet).totalCents, 6400);
  assert.equal(BAKERY_TEMPLATES.some(template => template.id === ('cheesecake' as string)), false);
  const birthday = createTemplateCake('sprinkles');
  assert.equal(birthday.flavor, 'vanilla');
  assert.equal(birthday.layers, 1);
  assert.deepEqual(birthday.toppings, ['sprinkles']);
  assert.equal(estimateBakeryCake(birthday).totalCents, 6200);
  const chocolate = createTemplateCake('chocolate');
  assert.equal(chocolate.colors.filling, 'ivory', 'Chocolate Party has vanilla cream, not pink filling');
});

test('the limited bakery prototype ignores voice recoloring and can add/remove sprinkles', () => {
  const classic = createTemplateCake('classic');
  const change = interpretLocalCommand('Make it pink', classic);
  assert.equal(change.kind, 'help');
  if (change.kind === 'help') assert.match(change.message, /Frosting colors are fixed/);
  const add = interpretLocalCommand('Add sprinkles', classic);
  assert.equal(add.kind, 'edit');
  if (add.kind === 'edit') {
    const withSprinkles = applyCakePatch(classic, add.patch).state;
    assert.deepEqual(withSprinkles.toppings, ['sprinkles']);
    assert.equal(estimateBakeryCake(withSprinkles).totalCents, 6200);
    const remove = interpretLocalCommand('Remove sprinkles', withSprinkles);
    assert.equal(remove.kind, 'edit');
    if (remove.kind === 'edit') {
      assert.deepEqual(applyCakePatch(withSprinkles, remove.patch).state.toppings, []);
    }
  }
});
