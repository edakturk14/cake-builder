import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { createTopperImageService, DEFAULT_IMAGE_MODEL } from '../server/topperImages';

test('production HTTP serves the hidden cached PNG, bounds lookup and IDs, and keeps global dotfiles protected', { timeout: 15000 }, async t => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const request = `HTTP regression ${randomUUID()}`;
  const service = createTopperImageService({ key: () => 'mock-only', model: () => DEFAULT_IMAGE_MODEL,
    fetch: async () => Response.json({ data: [{ b64_json: (await sharp(Buffer.from('<svg width="20" height="20"><rect width="20" height="20" fill="white"/><rect x="4" y="4" width="12" height="12" fill="red"/></svg>')).png().toBuffer()).toString('base64') }] }) });
  const result = await service.generate({ request });
  t.after(() => rm(service.file(result.assetId), { force: true }));
  const expected = await readFile(service.file(result.assetId));
  const child = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], { cwd: root,
    env: { ...process.env, NODE_ENV: 'production', API_PORT: '0', TYPESAFE_API_KEY: '', OPENROUTER_API_KEY: '', OPENROUTER_IMAGE_MODEL: DEFAULT_IMAGE_MODEL },
    stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) { const closed = once(child, 'close'); child.kill('SIGTERM'); await closed; }
  });
  const port = await new Promise<number>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('HTTP fixture server did not start')), 8000);
    let output = '';
    child.stdout.on('data', data => {
      output += data.toString();
      const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) { clearTimeout(timeout); resolve(Number(match[1])); }
    });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', () => { clearTimeout(timeout); reject(new Error('HTTP fixture server exited before readiness')); });
  });
  const base = `http://127.0.0.1:${port}`;
  const response = await fetch(`${base}/api/topper-image/${result.assetId}`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /^image\/png/);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected);
  const lookup = async (body: unknown) => fetch(`${base}/api/topper-image/lookup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const cached = await lookup({ request: request.toUpperCase() });
  assert.equal(cached.status, 200); assert.equal(cached.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await cached.json(), { status: 'ready', assetId: result.assetId });
  const missing = await lookup({ request: `missing ${randomUUID()}` });
  assert.deepEqual(await missing.json(), { status: 'missing' });
  for (const body of [{ request: '' }, { request, extra: true }]) {
    const bad = await lookup(body);
    assert.equal(bad.status, 400); assert.equal(bad.headers.get('cache-control'), 'no-store');
  }
  const malformed = await fetch(`${base}/api/topper-image/lookup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400); assert.equal(malformed.headers.get('cache-control'), 'no-store');
  for (const suffix of ['bad', result.assetId + '.png', 'g'.repeat(64), '0'.repeat(64), '%2e%2e%2f.env', '%2e%2e%5c.git%5cconfig']) {
    const bad = await fetch(`${base}/api/topper-image/${suffix}`);
    assert.equal(bad.status, 404, suffix);
  }
  for (const target of ['/.env', '/.env.local', '/.git', '/.git/config']) {
    const hidden = await fetch(base + target);
    assert.equal(hidden.status, 404, target);
  }
  const health = await (await fetch(base + '/api/health')).json();
  assert.equal(health.fallbackAttempts, 0);
  assert.equal(health.imageConfigured, false);
});
