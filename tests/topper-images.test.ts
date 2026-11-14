import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { createTopperImageService, imagePrompt, prepareTopperImage, TopperImageError } from '../server/topperImages';
import { DesignerQueue, type ImageResponse } from '../src/lib/designerQueue';
import { normalizeCustomRequest } from '../src/shared/cake';
import type { InterpretResponse } from '../src/shared/interpretation';
const tick = () => new Promise(resolve => setImmediate(resolve));
const source = async () => sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="white"/><rect x="20" y="20" width="60" height="60" fill="#6a438c"/><rect x="40" y="40" width="20" height="20" fill="white"/></svg>')).png().toBuffer();
const result = (turnId: string, patch: InterpretResponse['patch']): InterpretResponse => ({ turnId, action: 'edit', patch, notices: [], provider: { model: 'fixture', durationMs: 2, status: 200 } });

test('postprocessing fits transparent 256×320 library canvas, anchors bottom at306 and preserves enclosed white fondant', async () => {
  const png = await prepareTopperImage(await source());
  const { info, data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 256); assert.equal(info.height, 320);
  const opaque = [];
  for (let y = 0; y < 320; y++) for (let x = 0; x < 256; x++) if (data[(y * 256 + x) * 4 + 3] > 16) opaque.push([x, y]);
  assert.equal(Math.max(...opaque.map(p => p[1])), 305);
  assert.equal(Math.min(...opaque.map(p => p[0])), 20);
  assert.equal(Math.max(...opaque.map(p => p[0])), 235);
  assert.equal(data[3], 0);
  assert.equal(data[(190 * 256 + 128) * 4 + 3], 255);
  assert.ok(data[(190 * 256 + 128) * 4] > 240);
  await assert.rejects(prepareTopperImage(await sharp({ create: { width: 10, height: 10, channels: 4, background: '#fff' } }).png().toBuffer()), TopperImageError);
});

test('service sends real documented reference request, deduplicates inflight and reuses normalized disk cache without key', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cake-image-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const png = await source(); let calls = 0, requestBody: Record<string, unknown> = {};
  const fetcher: typeof fetch = async (_url, init) => {
    calls++; requestBody = JSON.parse(String(init?.body));
    await tick();
    return Response.json({ data: [{ b64_json: png.toString('base64'), media_type: 'image/png' }] });
  };
  const service = createTopperImageService({ directory, fetch: fetcher, key: () => 'fixture-key-not-live' });
  const [a, b] = await Promise.all([service.generate({ request: 'My Cat Miso' }), service.generate({ request: '  my   cat Miso  ' })]);
  assert.equal(calls, 1); assert.equal(a.assetId, b.assetId); assert.equal(a.cached, false);
  assert.equal(requestBody.model, 'black-forest-labs/flux-3-image-klein');
  assert.equal(requestBody.resolution, '768');
  assert.equal(requestBody.background, undefined);
  assert.equal(requestBody.quality, undefined);
  assert.match(JSON.stringify(requestBody.input_references), /data:image\/png;base64/);
  const next = createTopperImageService({ directory, fetch: fetcher, key: () => '' });
  assert.equal((await next.generate({ request: 'MY CAT MISO' })).cached, true);
  assert.equal(calls, 1);
  assert.equal((await sharp(await readFile(service.file(a.assetId))).metadata()).height, 320);
  assert.throws(() => service.file('../secrets'), TopperImageError);
  assert.match(imagePrompt("my grandma's face"), /GENERIC NON-IDENTIFIABLE/);
  assert.match(imagePrompt('a copyrighted character'), /never reproduce trademarks/);
});

test('missing key, malformed requests and genuine upstream failures stay explicit and leak no provider body', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cake-image-error-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const missing = createTopperImageService({ directory, key: () => '' });
  await assert.rejects(missing.generate({ request: 'a cat' }), e => e instanceof TopperImageError && e.status === 503);
  await assert.rejects(missing.generate({ request: 'x'.repeat(121) }), e => e instanceof TopperImageError && e.status === 400);
  await assert.rejects(missing.generate({ request: 'a cat', assetId: 'injected' }), e => e instanceof TopperImageError && e.status === 400);
  const failure = createTopperImageService({ directory, key: () => 'fixture', fetch: async () => new Response('secret-provider-body', { status: 401 }) });
  await assert.rejects(failure.generate({ request: 'a cat' }), e => e instanceof TopperImageError && e.status === 401 && !e.message.includes('secret-provider'));
  // A failed job leaves no stuck inflight entry.
  await assert.rejects(failure.generate({ request: 'a cat' }), e => e instanceof TopperImageError && e.status === 401);
});

test('custom edit commits before image completes; other edits serialize normally; asset ready adds no Undo step', async () => {
  let finish!: (value: ImageResponse) => void;
  const queue = new DesignerQueue(async request => result(request.turnId, request.phrase === 'custom'
    ? { exists: true, customTopper: { request: 'my cat Miso', assetId: null } } : { inscription: 'Eda' }),
  () => performance.now(), () => new Promise(resolve => { finish = resolve; }));
  queue.submit('custom'); await tick();
  assert.equal(queue.getSnapshot().pending, false); assert.equal(queue.getSnapshot().imagePending, true);
  assert.equal(queue.getSnapshot().cake.customTopper?.assetId, null);
  queue.submit('write'); await tick();
  finish({ assetId: 'fixture-miso', cached: false, model: 'fixture-image', imageGenerationMs: 30 });
  await tick();
  assert.equal(queue.getSnapshot().cake.customTopper?.assetId, 'fixture-miso');
  assert.equal(queue.getSnapshot().timings[0].imageGenerationMs, 30);
  queue.undo(); await tick();
  assert.equal(queue.getSnapshot().cake.inscription, '');
  assert.equal(queue.getSnapshot().cake.customTopper?.assetId, 'fixture-miso');
  queue.undo(); await tick();
  assert.equal(queue.getSnapshot().cake.customTopper, null);
});

test('reset guards builder but successful generation still notifies basket and enters readyAssets; later request is instant', async () => {
  let finish!: (value: ImageResponse) => void; let calls = 0;
  const events: string[] = [];
  const queue = new DesignerQueue(async request => result(request.turnId, { exists: true, customTopper: { request: 'my cat Miso', assetId: null } }),
    () => performance.now(), () => { calls++; return new Promise(resolve => { finish = resolve; }); });
  queue.onAssetReady = event => events.push(event.assetId);
  queue.submit('custom'); await tick(); queue.reset();
  finish({ assetId: 'fixture-miso', cached: false, model: 'fixture-image', imageGenerationMs: 30 }); await tick();
  assert.equal(queue.getSnapshot().cake.customTopper, null);
  assert.deepEqual(events, ['fixture-miso']);
  assert.equal(queue.getSnapshot().readyAssets.get(normalizeCustomRequest('MY CAT MISO')), 'fixture-miso');
  queue.submit('custom again'); await tick();
  assert.equal(calls, 1);
  assert.equal(queue.getSnapshot().cake.customTopper?.assetId, 'fixture-miso');
});

test('replacement ignores stale asset; failed preview leaves confirmed text and price/history intact', async () => {
  const finish = new Map<string, (value: ImageResponse) => void>();
  const queue = new DesignerQueue(async request => result(request.turnId, { exists: true, customTopper: { request: request.phrase, assetId: null } }),
    () => performance.now(), request => new Promise(resolve => { finish.set(request, resolve); }));
  queue.submit('cat'); await tick(); queue.submit('dog'); await tick();
  finish.get('cat')!({ assetId: 'cat-asset', cached: false, model: 'fixture', imageGenerationMs: 5 }); await tick();
  assert.equal(queue.getSnapshot().cake.customTopper?.request, 'dog');
  assert.equal(queue.getSnapshot().cake.customTopper?.assetId, null);
  finish.get('dog')!({ assetId: 'dog-asset', cached: false, model: 'fixture', imageGenerationMs: 5 }); await tick();
  assert.equal(queue.getSnapshot().cake.customTopper?.assetId, 'dog-asset');
  const failed = new DesignerQueue(async request => result(request.turnId, { exists: true, customTopper: { request: 'cat', assetId: null } }),
    () => performance.now(), async () => { throw new Error('OPENROUTER_API_KEY missing'); });
  failed.submit('cat'); await tick();
  assert.equal(failed.getSnapshot().cake.customTopper?.request, 'cat');
  assert.equal(failed.getSnapshot().cake.customTopper?.assetId, null);
  assert.match(failed.getSnapshot().imageError!, /missing/);
  assert.equal(failed.getSnapshot().pending, false);
  assert.equal(failed.getSnapshot().canUndo, true);
});

test('same request after reset joins the existing generation with a new epoch; callback fires once', async () => {
  let finish!: (value: ImageResponse) => void, calls = 0, callbacks = 0;
  const queue = new DesignerQueue(async request => result(request.turnId, { exists: true, customTopper: { request: 'pigeon', assetId: null } }),
    () => performance.now(), () => { calls++; return new Promise(resolve => { finish = resolve; }); });
  queue.onAssetReady = () => { callbacks++; };
  queue.submit('pigeon'); await tick(); queue.reset(); queue.submit('pigeon again'); await tick();
  assert.equal(calls, 1);
  finish({ assetId: 'pigeon-asset', model: 'fixture', cached: false, imageGenerationMs: 10 }); await tick();
  assert.equal(queue.getSnapshot().cake.customTopper?.assetId, 'pigeon-asset');
  assert.equal(callbacks, 1);
  assert.equal(queue.getSnapshot().imagePending, false);
});

test('processing rejects non-raster content before asking the image decoder to load it', async () => {
  await assert.rejects(prepareTopperImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><image href="file:///private/local"/></svg>')),
    error => error instanceof TopperImageError && error.status === 502 && /unsupported image format/.test(error.message));
});
