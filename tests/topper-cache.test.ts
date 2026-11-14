import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { createTopperImageService, TopperImageError } from '../server/topperImages';

const png = () => sharp(Buffer.from('<svg width="20" height="20"><rect width="20" height="20" fill="white"/><rect x="5" y="5" width="10" height="10" fill="red"/></svg>')).png().toBuffer();

test('cache lookup is read-only, needs no key, and follows actual missing/pending/ready transitions', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cake-cache-lookup-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  let calls = 0, keyReads = 0, release!: (response: Response) => void;
  const service = createTopperImageService({ directory, key: () => { keyReads++; return 'mock-only'; },
    fetch: async () => { calls++; return new Promise(resolve => { release = resolve; }); } });
  assert.deepEqual(await service.lookup({ request: 'My cat Miso' }), { status: 'missing' });
  assert.equal(calls, 0); assert.equal(keyReads, 0);
  assert.deepEqual(await readdir(directory), []);
  const generation = service.generate({ request: 'My cat Miso' });
  // Wait for the mock provider invocation, not an elapsed wall-clock delay.
  while (!release) await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(await service.lookup({ request: ' MY  CAT MISO ' }), { status: 'pending' });
  assert.deepEqual(await service.lookup({ request: 'Another cat' }), { status: 'missing' });
  assert.equal(calls, 1); assert.equal(keyReads, 1);
  assert.deepEqual(await readdir(directory), []);
  release(Response.json({ data: [{ b64_json: (await png()).toString('base64') }] }));
  const result = await generation;
  const offline = createTopperImageService({ directory, key: () => { throw new Error('lookup must not read key'); },
    fetch: async () => { throw new Error('lookup must not fetch'); } });
  const files = await readdir(directory);
  assert.deepEqual(await offline.lookup({ request: 'my cat miso' }), { status: 'ready', assetId: result.assetId });
  const differentModel = createTopperImageService({ directory, model: () => 'another-model', fetch: async () => { throw new Error('never fetch'); } });
  assert.deepEqual(await differentModel.lookup({ request: 'my cat miso' }), { status: 'missing' });
  const referencePath = path.join(directory, 'different-reference.png');
  await writeFile(referencePath, await png());
  const differentReference = createTopperImageService({ directory, referencePath, fetch: async () => { throw new Error('never fetch'); } });
  assert.deepEqual(await differentReference.lookup({ request: 'my cat miso' }), { status: 'missing' });
  await rm(referencePath);
  assert.deepEqual(await readdir(directory), files);
  await rm(service.file(result.assetId));
  assert.deepEqual(await offline.lookup({ request: 'My cat Miso' }), { status: 'missing' });
  assert.equal(calls, 1); assert.equal(keyReads, 1);
});

test('lookup validates requests, returns sanitized errors, and rejects non-PNG/non-regular cache entries', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cake-cache-invalid-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  let calls = 0;
  const service = createTopperImageService({ directory, key: () => '', fetch: async () => { calls++; throw new Error('never fetch'); } });
  for (const value of [null, [], {}, { request: '' }, { request: 'a'.repeat(121) }, { request: 'cat', assetId: 'injected' }]) {
    await assert.rejects(service.lookup(value), e => e instanceof TopperImageError && e.status === 400);
  }
  const unavailable = createTopperImageService({ directory, referencePath: path.join(directory, 'private-reference') });
  await assert.rejects(unavailable.lookup({ request: 'cat' }), e => e instanceof TopperImageError && e.status === 500 && !e.message.includes(directory));
  const generating = createTopperImageService({ directory, key: () => 'mock-only', fetch: async () => Response.json({ data: [{ b64_json: (await png()).toString('base64') }] }) });
  const result = await generating.generate({ request: 'cat' });
  await writeFile(service.file(result.assetId), 'not a PNG');
  assert.deepEqual(await service.lookup({ request: 'cat' }), { status: 'missing' });
  await rm(service.file(result.assetId));
  await mkdir(service.file(result.assetId));
  assert.deepEqual(await service.lookup({ request: 'cat' }), { status: 'missing' });
  assert.equal(calls, 0);
});
