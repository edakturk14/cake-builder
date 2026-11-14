import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DesignerQueue } from '../src/lib/designerQueue';
import { PreviewRecovery } from '../src/lib/previewRecovery';
import { SavedPreviewRecovery } from '../src/components/SavedPreviewRecovery';
import { previewCostLabel } from '../src/lib/previewPrice';
import { createBasketItem, EMPTY_CAKE, estimateCake, fulfillBasketAsset } from '../src/shared/cake';
import type { InterpretResponse } from '../src/shared/interpretation';

const tick = () => new Promise(resolve => setImmediate(resolve));
const response = (turnId: string, patch: InterpretResponse['patch'] = {}, action: InterpretResponse['action'] = 'edit'): InterpretResponse => ({
  turnId, patch, action, notices: [], provider: { model: 'mock', durationMs: 2, status: 200 },
});

test('new custom turns, no-change, rejected third-topper edits and Undo never POST an image', async () => {
  let generationCalls = 0;
  const queue = new DesignerQueue(async request => {
    if (request.phrase === 'new') return response(request.turnId, { exists: true, customTopper: { request: 'sailboat', assetId: null }, toppers: ['cat', 'dog'] });
    if (request.phrase === 'rejected') return response(request.turnId, { addToppers: ['castle'], inscription: 'must not apply' });
    if (request.phrase === 'unchanged') return response(request.turnId, {}, 'clarify');
    return response(request.turnId, { layers: 2 });
  }, undefined, async () => { generationCalls++; throw new Error('Mock preview failed'); });
  queue.submit('new'); await tick();
  assert.equal(generationCalls, 0);
  assert.equal(queue.getSnapshot().cake.customTopper?.assetId, null);
  queue.retryImage(); await tick();
  assert.equal(generationCalls, 1);
  assert.match(queue.getSnapshot().imageError!, /failed/);
  const saved = queue.getSnapshot().cake;
  queue.submit('rejected'); await tick();
  assert.deepEqual(queue.getSnapshot().cake, saved);
  queue.submit('unchanged'); await tick();
  queue.submit('unrelated layer edit'); await tick();
  queue.undo(); await tick();
  assert.equal(generationCalls, 1, 'no automatic retry of old failed sailboat');
  queue.retryImage(); queue.retryImage(); await tick();
  assert.equal(generationCalls, 2, 'two clicks while in flight share one explicit retry');
});

test('cache-delivered current preview fills history without an Undo step or overwriting ready assets', async () => {
  let calls = 0;
  const queue = new DesignerQueue(async request => response(request.turnId, ++calls === 1
    ? { exists: true, customTopper: { request: 'sailboat', assetId: null } }
    : { inscription: 'Exact Ada' }), undefined, async () => { throw new Error('must not auto-generate'); });
  queue.submit('new'); await tick(); queue.submit('name'); await tick();
  const beforePrice = estimateCake(queue.getSnapshot().cake);
  queue.receiveImage(' SAILBOAT ', 'ready-id', { imageGenerationMs: 9, cached: false });
  assert.deepEqual(estimateCake(queue.getSnapshot().cake), beforePrice);
  queue.receiveImage('sailboat', 'must-not-overwrite');
  assert.equal(queue.getSnapshot().cake.customTopper?.assetId, 'ready-id');
  queue.undo(); await tick();
  assert.equal(queue.getSnapshot().cake.inscription, '');
  assert.equal(queue.getSnapshot().cake.customTopper?.assetId, 'ready-id');
  queue.undo(); await tick();
  assert.deepEqual(queue.getSnapshot().cake, EMPTY_CAKE);
});

test('builder plus saved/reloaded basket watchers are cache-only and double-clicks normalize to one POST', async () => {
  let lookups = 0, posts = 0;
  let finish!: (value: { assetId: string }) => void;
  const recovery = new PreviewRecovery(async () => { lookups++; return { status: 'missing' }; },
    async () => { posts++; return new Promise(resolve => { finish = resolve; }); });
  const pending = createBasketItem({ ...EMPTY_CAKE, exists: true, inscription: 'Exact saved name', customTopper: { request: 'sailboat', assetId: null } });
  let basket = [{ ...pending, quantity: 2 }];
  const ready = (state: Parameters<Parameters<PreviewRecovery['watch']>[1]>[0]) => {
    if (state.status === 'ready') basket = fulfillBasketAsset(basket, 'sailboat', state.assetId);
  };
  const stopBuilder = recovery.watch('sailboat', ready);
  const stopBasket = recovery.watch('  SAILBOAT  ', ready);
  await tick();
  assert.equal(lookups, 1);
  assert.equal(posts, 0, 'new custom plus basket open does not generate');
  stopBuilder(); stopBasket();
  const stopReload = recovery.watch('sailboat', ready);
  await tick();
  assert.equal(posts, 0, 'reload cache miss must not generate');
  const first = recovery.generateExplicitly('sailboat');
  const second = recovery.generateExplicitly(' SAILBOAT ');
  await tick();
  assert.equal(posts, 1);
  finish({ assetId: 'clicked-preview-id' }); await Promise.all([first, second]);
  assert.equal(basket[0].design.customTopper?.assetId, 'clicked-preview-id');
  assert.equal(basket[0].quantity, 2);
  assert.equal(basket[0].design.inscription, 'Exact saved name');
  assert.deepEqual(basket[0].estimate, pending.estimate);
  stopReload();
});

test('shared preview control is visible and disabled during free lookup; price derives from configured value', () => {
  const markup = renderToStaticMarkup(createElement(SavedPreviewRecovery, { request: 'sailboat', onReady: () => {} }));
  assert.match(markup, /Create preview/);
  assert.match(markup, /disabled/);
  assert.match(markup, /Checking for an existing preview \(free\)/);
  assert.equal(previewCostLabel(.008), 'about 1¢');
  assert.equal(previewCostLabel(.025), 'about 3¢');
  assert.equal(previewCostLabel(0), 'free');
  assert.equal(previewCostLabel(null), 'cost varies');
});
