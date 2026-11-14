import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_COLORS, DEFAULT_INSCRIPTION_STYLE, DEFAULT_TOPPER_STYLE, PALETTE, PALETTE_IDS, getTopperStyle, paletteHex } from '../src/shared/appearance';
import { EMPTY_CAKE, applyCakePatch, cakeReducer, cloneCake, createBasketItem, createCake, estimateCake, fulfillBasketAsset, isAssetId, normalizeCustomRequest, parseBasket, type CakePatch } from '../src/shared/cake';

test('named appearance options have bounded IDs, valid color hexes and artwork-default fallbacks', () => {
  assert.equal(PALETTE.length, 17);
  assert.equal(new Set(PALETTE_IDS).size, PALETTE.length);
  for (const color of PALETTE) {
    assert.match(color.hex, /^#[0-9a-f]{6}$/i);
    assert.ok(color.label && color.jevDescription);
    assert.equal(paletteHex(color.id, '#123456'), color.hex);
  }
  assert.equal(paletteHex(null, '#123456'), '#123456');
  assert.deepEqual(EMPTY_CAKE.colors, DEFAULT_COLORS);
  assert.deepEqual(EMPTY_CAKE.inscriptionStyle, DEFAULT_INSCRIPTION_STYLE);
  assert.deepEqual(getTopperStyle({}, 'castle'), DEFAULT_TOPPER_STYLE);
});
test('appearance patches merge per field, preserve exact writing and add no price', () => {
  const initial = createCake({ toppers: ['castle', 'princess'], inscription: 'Eda', toppings: ['strawberries'] });
  const painted = applyCakePatch(initial, {
    colors: { frosting: 'blush-pink', filling: 'ivory', inscription: 'gold' },
    topperStyles: { castle: { size: 'large', position: 'left', tint: 'sky-blue' } },
    inscriptionStyle: { font: 'print', letterCase: 'upper', size: 'large' },
  }).state;
  const edited = applyCakePatch(painted, { colors: { frosting: null, accents: 'coral' }, topperStyles: { castle: { position: 'right' }, princess: { size: 'small' } }, inscriptionStyle: { placement: 'center' } }).state;
  assert.deepEqual(edited.colors, { frosting: null, filling: 'ivory', inscription: 'gold', accents: 'coral' });
  assert.deepEqual(edited.topperStyles.castle, { size: 'large', position: 'right', tint: 'sky-blue' });
  assert.deepEqual(edited.topperStyles.princess, { ...DEFAULT_TOPPER_STYLE, size: 'small' });
  assert.deepEqual(edited.inscriptionStyle, { font: 'print', letterCase: 'upper', size: 'large', placement: 'center' });
  assert.equal(edited.inscription, 'Eda');
  assert.equal(estimateCake(edited).totalCents, estimateCake(initial).totalCents);
  assert.deepEqual(initial.colors, DEFAULT_COLORS);
  assert.deepEqual(initial.topperStyles, {});
});
test('topper removal clears only its style and adding it again starts with artwork defaults', () => {
  const original = createCake({ toppers: ['princess', 'castle'], topperStyles: { princess: { tint: 'lavender', size: 'small' }, castle: { position: 'right' } } });
  const removed = applyCakePatch(original, { removeToppers: ['princess'] }).state;
  assert.equal(removed.topperStyles.princess, undefined);
  assert.deepEqual(removed.topperStyles.castle, original.topperStyles.castle);
  const restored = applyCakePatch(removed, { addToppers: ['princess'] }).state;
  assert.deepEqual(getTopperStyle(restored.topperStyles, 'princess'), DEFAULT_TOPPER_STYLE);
  assert.equal(applyCakePatch(original, { topperStyles: { castle: null } }).state.topperStyles.castle, undefined);
});
test('untrusted appearance and asset values reject atomically rather than enter CSS or URLs', () => {
  const cake = createCake({ inscription: 'Eda' });
  const bad = [
    { colors: { frosting: 'url(https://example.com)' } }, { colors: { unknown: 'red' } },
    { colors: null }, { topperStyles: { castle: { size: 'huge' } } }, { topperStyles: { unknown: { size: 'large' } } },
    { inscriptionStyle: { font: 'html' } }, { inscriptionStyle: { letterCase: 'lower' } }, { inscriptionStyle: { placement: 'side' } },
    { customTopper: { request: '' } }, { customTopper: { request: 'Miso', assetId: '../secret' } },
    { customTopper: { request: 'Miso', assetId: 'https://example.com/image.png' } }, { customTopper: { request: 'Miso', assetId: 'a'.repeat(129) } },
  ];
  for (const patch of bad) assert.throws(() => applyCakePatch(cake, patch as CakePatch));
  assert.throws(() => applyCakePatch(cake, { customTopper: { assetId: 'asset-only' } }));
  assert.equal(cake.inscription, 'Eda');
  assert.deepEqual(cake.colors, DEFAULT_COLORS);
  assert.ok(isAssetId('a'.repeat(128)));
  assert.equal(isAssetId(''), false);
});
test('custom preview updates retain the exact request and quoted subtotal; a different request clears its old asset', () => {
  const initial = createCake({ customTopper: { request: 'My cat Miso' } });
  assert.deepEqual(initial.customTopper, { request: 'My cat Miso', assetId: null });
  const ready = applyCakePatch(initial, { customTopper: { assetId: 'miso_123' } }).state;
  assert.deepEqual(ready.customTopper, { request: 'My cat Miso', assetId: 'miso_123' });
  assert.equal(estimateCake(ready).totalCents, 4200);
  assert.equal(estimateCake(ready).requiresQuote, true);
  assert.deepEqual(estimateCake(ready).quoteItems, ['My cat Miso']);
  assert.equal(applyCakePatch(ready, { customTopper: { request: 'My dog Poppy' } }).state.customTopper?.assetId, null);
  assert.equal(applyCakePatch(ready, { customTopper: { request: 'MY  CAT MISO' } }).state.customTopper?.assetId, 'miso_123');
  assert.equal(applyCakePatch(ready, { customTopper: null }).state.customTopper, null);
});
test('assetReady hydrates current and matching history without an Undo step; stale completions cannot restore a removed request', () => {
  let state = { cake: createCake({ customTopper: { request: 'My cat Miso' }, inscription: 'Eda' }), history: [] as ReturnType<typeof cloneCake>[] };
  state = cakeReducer(state, { type: 'apply', patch: { inscription: 'Ada', colors: { frosting: 'red' } } });
  const beforeHistoryLength = state.history.length;
  state = cakeReducer(state, { type: 'assetReady', request: 'my  CAT miso', assetId: 'miso-ready' });
  assert.equal(state.history.length, beforeHistoryLength);
  assert.equal(state.cake.customTopper?.assetId, 'miso-ready');
  assert.equal(state.cake.customTopper?.request, 'My cat Miso');
  assert.equal(state.history[0].customTopper?.assetId, 'miso-ready');
  assert.ok(Object.isFrozen(state.history[0].customTopper));
  const undone = cakeReducer(state, { type: 'undo' });
  assert.equal(undone.cake.inscription, 'Eda');
  assert.equal(undone.cake.customTopper?.assetId, 'miso-ready');
  const removed = cakeReducer(state, { type: 'apply', patch: { customTopper: null } });
  assert.strictEqual(cakeReducer(removed, { type: 'assetReady', request: 'My cat Miso', assetId: 'late' }), removed);
  const changed = cakeReducer(state, { type: 'apply', patch: { customTopper: { request: 'Dragon' } } });
  assert.strictEqual(cakeReducer(changed, { type: 'assetReady', request: 'My cat Miso', assetId: 'late' }), changed);
});
test('basket fills only a missing exact-request preview, including after builder reset, with no other saved changes', () => {
  const pending = createBasketItem(createCake({ customTopper: { request: ' My cat Miso ' }, colors: { frosting: 'lavender' }, inscription: 'Eda' }), 'pending');
  const ready = createBasketItem(createCake({ customTopper: { request: 'My cat Miso', assetId: 'already-saved' } }), 'ready');
  const other = createBasketItem(createCake({ customTopper: { request: 'Another cat' } }), 'other');
  const basket = [pending, ready, other];
  cakeReducer({ cake: pending.design, history: [] }, { type: 'reset' });
  const completed = fulfillBasketAsset(basket, 'my  CAT miso', 'generated-preview');
  assert.equal(completed[0].design.customTopper?.assetId, 'generated-preview');
  assert.equal(completed[0].design.customTopper?.request, ' My cat Miso ');
  assert.deepEqual(completed[0].estimate, pending.estimate);
  assert.deepEqual(completed[0].design.colors, pending.design.colors);
  assert.equal(completed[0].design.inscription, 'Eda');
  assert.equal(pending.design.customTopper?.assetId, null);
  assert.strictEqual(completed[1], ready);
  assert.strictEqual(completed[2], other);
  assert.strictEqual(fulfillBasketAsset(completed, 'my cat Miso', 'different'), completed);
  assert.deepEqual(parseBasket(JSON.stringify(completed)), completed);
});
test('basket migration upgrades both historical custom strings and missing appearance fields while preserving saved asset IDs', () => {
  const current = createBasketItem(createCake({ customTopper: { request: 'Miso', assetId: 'saved-asset' }, colors: { filling: 'mint' }, toppers: ['castle'], topperStyles: { castle: { tint: 'gold' } } }), 'current');
  assert.deepEqual(parseBasket(JSON.stringify([current])), [current]);
  const { colors: _colors, topperStyles: _styles, inscriptionStyle: _writing, toppers: _toppers, ...legacyDesign } = current.design;
  const legacy = { ...current, design: { ...legacyDesign, topper: 'princess', customTopper: 'My cat Miso' } };
  const migrated = parseBasket(JSON.stringify([legacy]))[0];
  assert.deepEqual(migrated.design.customTopper, { request: 'My cat Miso', assetId: null });
  assert.deepEqual(migrated.design.colors, DEFAULT_COLORS);
  assert.deepEqual(migrated.design.inscriptionStyle, DEFAULT_INSCRIPTION_STYLE);
  assert.deepEqual(migrated.design.topperStyles, {});
  assert.deepEqual(migrated.design.toppers, ['princess']);
  assert.equal(migrated.estimate.requiresQuote, true);
  const emptyLegacy = parseBasket(JSON.stringify([{ ...legacy, design: { ...legacy.design, customTopper: '' } }]))[0];
  assert.equal(emptyLegacy.design.customTopper, null);
  assert.equal(emptyLegacy.estimate.requiresQuote, false);
  const corrupt = { ...current, design: { ...current.design, topperStyles: { princess: { ...DEFAULT_TOPPER_STYLE } } } };
  assert.deepEqual(parseBasket(JSON.stringify([corrupt])), []);
  assert.equal(normalizeCustomRequest(' Ｍy \n Cat  MISO '), 'my cat miso');
});
