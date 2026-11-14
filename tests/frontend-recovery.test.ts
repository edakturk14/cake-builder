import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PreviewRecovery, lookupCachedPreview, type CacheResult, type PreviewStatus } from '../src/lib/previewRecovery';
import { RequestTimings } from '../src/components/RequestTimings';
import { DesignerQueue } from '../src/lib/designerQueue';
import { EMPTY_CAKE, createBasketItem, fulfillBasketAsset } from '../src/shared/cake';

const tick = () => new Promise(resolve => setImmediate(resolve));
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('saved preview transport only calls the cache-only lookup on missing, never generation', async () => {
  const original = globalThis.fetch;
  const calls: { url: string; method?: string; body?: string }[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), method: init?.method, body: init?.body as string });
    return new Response(JSON.stringify({ status: 'missing' }));
  };
  try {
    assert.deepEqual(await lookupCachedPreview('My cat Miso', new AbortController().signal), { status: 'missing' });
    assert.deepEqual(calls, [{ url: '/api/topper-image/lookup', method: 'POST', body: '{"request":"My cat Miso"}' }]);
  } finally { globalThis.fetch = original; }
});

test('100 normalized saved requests share one cache lookup; misses never generate', async () => {
  let lookups = 0, generations = 0;
  let release!: (value: CacheResult) => void;
  const recovery = new PreviewRecovery(async () => { lookups++; return new Promise(resolve => { release = resolve; }); },
    async () => { generations++; return { assetId: 'new-id' }; });
  const states: PreviewStatus[] = [];
  const stops = Array.from({ length: 100 }, (_, index) => recovery.watch(index % 2 ? '  MY   cat Miso ' : 'my cat miso', state => states.push(state)));
  assert.equal(lookups, 1);
  release({ status: 'missing' }); await tick();
  assert.equal(states.filter(state => state.status === 'missing').length, 100);
  assert.equal(generations, 0);
  stops.forEach(stop => stop());
});

test('reload-style cache pending polls to ready; ready and unmount stop polling', async () => {
  let calls = 0, generated = 0;
  const recovery = new PreviewRecovery(async () => ++calls === 1 ? { status: 'pending' } : { status: 'ready', assetId: 'cached-id' },
    async () => { generated++; return { assetId: 'unwanted' }; }, 2, 30);
  const states: PreviewStatus[] = [];
  const stop = recovery.watch('saved pending request', state => states.push(state));
  await delay(20);
  assert.equal(calls, 2);
  assert.deepEqual(states.at(-1), { status: 'ready', assetId: 'cached-id' });
  await delay(10);
  assert.equal(calls, 2);
  assert.equal(generated, 0);
  stop();
});

test('removal/unmount aborts lookup and ignores its late result; no resurrection', async () => {
  let release!: (value: CacheResult) => void;
  let signal!: AbortSignal;
  const recovery = new PreviewRecovery(async (_request, nextSignal) => { signal = nextSignal; return new Promise(resolve => { release = resolve; }); });
  const states: PreviewStatus[] = [];
  const stop = recovery.watch('removed design', state => states.push(state));
  stop();
  release({ status: 'ready', assetId: 'late-id' }); await tick();
  assert.equal(signal.aborted, true);
  assert.deepEqual(states, [{ status: 'checking' }]);
});

test('pending polling is bounded and never converts timeout into generation', async () => {
  let calls = 0, generated = 0;
  const recovery = new PreviewRecovery(async () => { calls++; return { status: 'pending' }; },
    async () => { generated++; return { assetId: 'unwanted' }; }, 2, 3);
  const states: PreviewStatus[] = [];
  const stop = recovery.watch('slow preview', state => states.push(state));
  await delay(30);
  assert.ok(calls <= 3);
  assert.equal(states.at(-1)?.status, 'error');
  assert.equal(generated, 0);
  stop();
});

test('hung lookup reaches wall-clock deadline, aborts and allows retry; old late result is ignored', async () => {
  let calls = 0, generations = 0;
  let late!: (value: CacheResult) => void;
  let oldSignal!: AbortSignal;
  const recovery = new PreviewRecovery(async (_request, signal) => {
    calls++;
    if (calls === 1) { oldSignal = signal; return new Promise(resolve => { late = resolve; }); }
    return { status: 'missing' };
  }, async () => { generations++; return { assetId: 'unwanted' }; }, 2, 2);
  const states: PreviewStatus[] = [];
  const stop = recovery.watch('hung cache', state => states.push(state));
  await delay(30);
  assert.equal(states.at(-1)?.status, 'error');
  assert.equal(oldSignal.aborted, true);
  recovery.checkAgain('hung cache');
  await tick();
  assert.equal(states.at(-1)?.status, 'missing');
  late({ status: 'ready', assetId: 'stale-id' }); await tick();
  assert.equal(states.at(-1)?.status, 'missing');
  assert.equal(generations, 0);
  stop();
});

test('explicit generation deduplicates normalized retries and ignores deleted subscribers', async () => {
  let generations = 0;
  let release!: (value: { assetId: string }) => void;
  const recovery = new PreviewRecovery(async () => ({ status: 'missing' }), async () => {
    generations++; return new Promise(resolve => { release = resolve; });
  });
  const firstStates: PreviewStatus[] = [], secondStates: PreviewStatus[] = [];
  const stop = recovery.watch(' My   Moon ', state => firstStates.push(state));
  await tick();
  const first = recovery.generateExplicitly('my moon');
  await tick(); stop();
  const stopSecond = recovery.watch('MY MOON', state => secondStates.push(state));
  await tick();
  const second = recovery.generateExplicitly('my moon');
  release({ assetId: 'cached-id' }); await Promise.all([first, second]);
  assert.equal(generations, 1);
  assert.equal(firstStates.at(-1)?.status, 'generating');
  assert.deepEqual(secondStates.at(-1), { status: 'ready', assetId: 'cached-id' });
  stopSecond();
});

test('cache hydration preserves quantities, price/design snapshots and existing image IDs', () => {
  const pending = createBasketItem({ ...EMPTY_CAKE, exists: true, inscription: 'Exact Eda', customTopper: { request: 'My Moon', assetId: null } });
  const ready = createBasketItem({ ...EMPTY_CAKE, exists: true, customTopper: { request: 'my moon', assetId: 'original-id' } });
  const items = [{ ...pending, quantity: 3 }, ready];
  const result = fulfillBasketAsset(items, '  MY  MOON ', 'recovered-id');
  assert.equal(result[0].quantity, 3);
  assert.equal(result[0].design.inscription, 'Exact Eda');
  assert.deepEqual(result[0].estimate, pending.estimate);
  assert.equal(result[0].design.customTopper?.assetId, 'recovered-id');
  assert.equal(result[1].design.customTopper?.assetId, 'original-id');
  assert.equal(pending.design.customTopper?.assetId, null);
  assert.deepEqual(fulfillBasketAsset([], 'My Moon', 'late-id'), []);
});

test('backup provenance/duration/cost survives queue and displays without notices; absent cost is not zero', async () => {
  const queue = new DesignerQueue(async request => ({
    turnId: request.turnId, action: 'edit', patch: { exists: true }, notices: [],
    provider: { model: 'jev-test', durationMs: 170, status: 200, interpreter: 'fallback',
      fallback: { model: 'backup-test', durationMs: 75, status: 200, costUsd: .0004 } },
  }), undefined, null);
  queue.submit('mock backup'); await tick();
  const timing = queue.getSnapshot().timings[0];
  assert.equal(timing.fallbackCostUsd, .0004);
  const html = renderToStaticMarkup(createElement(RequestTimings, { timings: [timing] }));
  assert.match(html, />Backup</);
  assert.match(html, /75 ms/);
  assert.match(html, /\$0.000400/);
  const noCost = renderToStaticMarkup(createElement(RequestTimings, { timings: [{ ...timing, fallbackCostUsd: undefined, interpreter: 'jev' }] }));
  assert.match(noCost, />Jev</);
  assert.doesNotMatch(noCost, /\$0\.000000/);
});
