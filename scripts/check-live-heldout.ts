import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { applyCakePatch, cloneCake, validateCakePatch, type CakePatch, type CakeState } from '../src/shared/cake';
import type { InterpretResponse } from '../src/shared/interpretation';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PHRASES = path.join(ROOT, 'scripts/heldout-phrases.json');
const REPORT = path.join(ROOT, 'docs/heldout-results.md');
const REVIEW = path.join(ROOT, 'docs/heldout-review.md');
const JSON_REPORT = path.join(ROOT, 'docs/heldout-results.json');
const API = 'http://127.0.0.1:3001';
const HARD_CAP = 30;
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Rule = { kind: 'equals' | 'oneOf' | 'includesAny' | 'includesAll' | 'excludesAll' | 'length';
  path: string; value?: Json; values?: Json[] }
  | { kind: 'changedAny' | 'anyOfValues' | 'changedToAny'; paths: string[]; values?: Json[] }
  | { kind: 'clarify' };
type HeldoutCase = { id: string; category: string; phrase: string; initial: CakePatch;
  expect: { onlyChange: string[]; rules: Rule[] } };
type Suite = { version: number; baseState: CakeState; cases: HeldoutCase[] };
type Check = { rule: string; pass: boolean; detail: string };
type Health = { configured: boolean; model: string; textModel: string; fallbackAttempts: number };
type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;
type Row = { id: string; category: string; phrase: string; initial: CakeState; status: number;
  response?: InterpretResponse; actual: CakeState; checks: Check[]; pass: boolean; httpMs: number;
  counterBefore: number; counterAfter?: number; error?: string };
type Run = { mode: 'MOCK DRY RUN' | 'LIVE'; started: string; sha256: string; planned: number;
  baseline?: Health; after?: Health; rows: Row[]; requests: number; observedAttempts: number;
  abort?: string; selfChecks?: string[]; novelty?: { id: string; matches: string[] }[] };

const equal = (a: unknown, b: unknown): boolean => {
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b)
    && a.length === b.length && a.every((v, i) => equal(v, b[i]));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
    return Object.keys(left).length === Object.keys(right).length
      && Object.keys(left).every(key => Object.hasOwn(right, key) && equal(left[key], right[key]));
  }
  return a === b;
};
const at = (state: CakeState, dotted: string): unknown => dotted.split('.').reduce<unknown>((value, key) =>
  value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, state);
const inspect = (value: unknown) => value === undefined ? 'absent' : JSON.stringify(value);
const esc = (value: unknown) => String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const changedPaths = (before: unknown, after: unknown, prefix = ''): string[] => {
  if (equal(before, after)) return [];
  if (before && after && typeof before === 'object' && typeof after === 'object'
    && !Array.isArray(before) && !Array.isArray(after)) {
    const left = before as Record<string, unknown>, right = after as Record<string, unknown>;
    return [...new Set([...Object.keys(left), ...Object.keys(right)])].flatMap(key =>
      changedPaths(left[key], right[key], prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
};

export function score(item: HeldoutCase, before: CakeState, after: CakeState, response: InterpretResponse): Check[] {
  const allowed = item.expect.onlyChange;
  const unexpected = changedPaths(before, after).filter(changed => !allowed.some(key =>
    changed === key || changed.startsWith(`${key}.`)));
  const checks: Check[] = [{ rule: 'must preserve every field outside onlyChange', pass: !unexpected.length,
    detail: unexpected.length ? unexpected.join(', ') : 'No unrelated state changes' }];
  const clarificationExpected = item.expect.rules.some(rule => rule.kind === 'clarify');
  checks.push({ rule: clarificationExpected ? 'valid clarification action' : 'must return edit action',
    pass: clarificationExpected ? ['edit', 'clarify'].includes(response.action) : response.action === 'edit',
    detail: response.action });
  for (const rule of item.expect.rules) {
    let pass = false, detail = '';
    if ('path' in rule) {
      const value = at(after, rule.path);
      detail = `${rule.path}=${inspect(value)}`;
      if (rule.kind === 'equals') pass = equal(value, rule.value);
      if (rule.kind === 'oneOf') pass = !!rule.values?.some(candidate => equal(candidate, value));
      if (rule.kind === 'length') pass = (Array.isArray(value) || typeof value === 'string') && value.length === rule.value;
      if (Array.isArray(value)) {
        if (rule.kind === 'includesAny') pass = !!rule.values?.some(candidate => value.some(actual => equal(actual, candidate)));
        if (rule.kind === 'includesAll') pass = !!rule.values?.every(candidate => value.some(actual => equal(actual, candidate)));
        if (rule.kind === 'excludesAll') pass = !!rule.values?.every(candidate => !value.some(actual => equal(actual, candidate)));
      }
    } else if ('paths' in rule) {
      detail = rule.paths.map(key => `${key}=${inspect(at(after, key))}`).join('; ');
      if (rule.kind === 'changedAny') pass = rule.paths.some(key => !equal(at(before, key), at(after, key)));
      if (rule.kind === 'anyOfValues') pass = rule.paths.some(key => rule.values?.some(candidate => equal(at(after, key), candidate)));
      if (rule.kind === 'changedToAny') pass = rule.paths.some(key => !equal(at(before, key), at(after, key))
        && rule.values?.some(candidate => equal(at(after, key), candidate)));
    } else {
      pass = equal(before, after) && (response.action === 'clarify'
        || response.notices.some(note => /\?|clarif|which|please (?:describe|specify|choose)/i.test(note)));
      detail = `${response.action}; ${response.notices.join('; ') || 'no clarification notice'}`;
    }
    checks.push({ rule: JSON.stringify(rule), pass, detail });
  }
  return checks;
}

async function health(fetcher: Fetcher): Promise<Health> {
  const response = await fetcher(`${API}/api/health`, { signal: AbortSignal.timeout(5000) });
  const body = await response.json() as Health;
  if (!response.ok || !body || !Number.isSafeInteger(body.fallbackAttempts) || body.fallbackAttempts < 0
    || typeof body.model !== 'string' || typeof body.textModel !== 'string') throw new Error('Invalid health response/counter');
  return body;
}

function validResponse(body: unknown, turnId: string): body is InterpretResponse {
  if (!body || typeof body !== 'object') return false;
  const value = body as InterpretResponse;
  return value.turnId === turnId && ['edit', 'undo', 'reset', 'clarify'].includes(value.action)
    && Array.isArray(value.notices) && value.notices.every(note => typeof note === 'string')
    && !!value.provider && Number.isFinite(value.provider.durationMs)
    && ['jev', 'fallback'].includes(value.provider.interpreter ?? '')
    && (!value.provider.fallback || (typeof value.provider.fallback.model === 'string'
      && Number.isFinite(value.provider.fallback.durationMs) && Number.isInteger(value.provider.fallback.status)));
}

/** Sequential requests reserve one worst-case backup each. The existing endpoint permits at most one backup/turn. */
export async function runSuite(suite: Suite, sha256: string, options: {
  mode: Run['mode']; fetcher: Fetcher; cap?: number; persist?: (run: Run) => Promise<void>;
}): Promise<Run> {
  const cap = options.cap ?? HARD_CAP;
  if (!Number.isInteger(cap) || cap < 0 || cap > HARD_CAP) throw new Error('Backup cap must be between 0 and 30');
  if (suite.cases.length > HARD_CAP) throw new Error('At most 30 held-out requests are allowed');
  const run: Run = { mode: options.mode, started: new Date().toISOString(), sha256, planned: suite.cases.length,
    rows: [], requests: 0, observedAttempts: 0 };
  try {
    run.baseline = await health(options.fetcher);
    if (!run.baseline.configured) throw new Error('Jev is not configured; no requests sent');
    for (const item of suite.cases) {
      const current = await health(options.fetcher);
      const delta = current.fallbackAttempts - run.baseline.fallbackAttempts;
      if (delta !== run.observedAttempts) throw new Error('Health counter changed unexpectedly (other traffic or server restart); aborting');
      if (delta >= cap || run.requests >= HARD_CAP) throw new Error('Backup budget exhausted; no further interpretation request sent');
      const initial = applyCakePatch(suite.baseState, item.initial).state;
      const turnId = `heldout-${Date.now()}-${item.id}`;
      const start = performance.now();
      // No retry: a lost HTTP response may still have caused a billed backup call.
      run.requests++;
      const row: Row = { id: item.id, category: item.category, phrase: item.phrase, initial, status: 0,
        actual: cloneCake(initial), checks: [], pass: false, httpMs: 0, counterBefore: current.fallbackAttempts };
      run.rows.push(row);
      try {
        const response = await options.fetcher(`${API}/api/interpret`, { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(70_000),
          body: JSON.stringify({ turnId, phrase: item.phrase, state: initial }) });
        row.status = response.status;
        const body: unknown = await response.json();
        row.httpMs = performance.now() - start;
        if (!response.ok || !validResponse(body, turnId)) throw new Error(`Invalid interpretation response (HTTP ${response.status})`);
        row.response = body;
        if (body.provider.fallback) run.observedAttempts++;
        validateCakePatch(body.patch);
        row.actual = applyCakePatch(initial, body.patch).state;
        row.checks = score(item, initial, row.actual, body);
        row.pass = row.checks.every(check => check.pass);
      } catch (error) {
        row.httpMs = performance.now() - start;
        row.error = error instanceof Error ? error.message : 'Request failed';
        // Abort on transport/protocol failure, since actual billing may be unknown.
        throw error;
      } finally {
        run.after = await health(options.fetcher);
        row.counterAfter = run.after.fallbackAttempts;
        if (run.after.fallbackAttempts - run.baseline.fallbackAttempts !== run.observedAttempts) {
          row.pass = false;
          row.error = 'Backup metadata/counter mismatch or unknown completion; no further requests will be sent';
        }
        await options.persist?.(run);
      }
      if (row.error) throw new Error(row.error);
      if (run.observedAttempts > cap) throw new Error('Backup cap violation detected; server invariant/traffic audit failed');
    }
    run.after = await health(options.fetcher);
    if (run.after.fallbackAttempts - run.baseline.fallbackAttempts !== run.observedAttempts) throw new Error('Final counter audit failed');
  } catch (error) {
    run.abort = error instanceof Error ? error.message : 'Run aborted';
    // Never retry an interpretation request, even if final health cannot be read.
    try { run.after = await health(options.fetcher); } catch { /* Report retains last observed counter. */ }
  }
  await options.persist?.(run);
  return run;
}

const samplePatches: Record<string, CakePatch> = {
  m01: { colors: { frosting: 'ivory', accents: 'black' } }, m02: { colors: { frosting: 'sky-blue' } },
  m03: { colors: { frosting: 'sage-green' } }, m04: { colors: { frosting: 'peach' } }, m05: { colors: { accents: 'black' } },
  t01: { addToppings: ['raspberries'] }, t02: { addToppings: ['ganache'] }, t03: { addToppings: ['caramel'] }, t04: { addToppings: ['gold-stars'] },
  o01: { occasion: 'engagement' }, o02: { occasion: 'housewarming' }, o03: { occasion: 'retirement' }, o04: { occasion: 'anniversary' },
  c01: { toppings: [] }, c02: { toppers: [] }, c03: { colors: { frosting: null } }, c04: { inscription: '' },
  c05: { occasion: null, theme: null }, x01: { flavor: 'red-velvet', layers: 3, addToppings: ['raspberries'] },
  x02: { removeToppers: ['robot'], addToppers: ['panda'], inscription: 'Bravo, Inez!' },
  x03: { topperStyles: { bunny: { size: 'small' } }, inscriptionStyle: { placement: 'center' } },
  x04: { colors: { frosting: 'mint', inscription: 'coral' }, candles: { style: 'plain', count: 4 } },
  x05: { base: 'cheesecake', candles: { style: 'none' } }, p01: { layers: 3 },
  p02: { candles: { style: 'number', number: '92' } }, p03: { candles: { style: 'plain', count: 8 } },
  p04: { inscription: 'CHEERS, ZOË' }, a01: {}, a02: {}, a03: {},
};

/** No network at all. Synthetic valid responses test scoring, not model interpretation. */
function mockFetcher(suite: Suite, options: { allFallback?: boolean; drift?: boolean; restart?: boolean; failPost?: boolean } = {}): {
  fetcher: Fetcher; counts: { posts: number; backup: number; image: number };
} {
  const counts = { posts: 0, backup: 0, image: 0 };
  let counter = 7;
  return { counts, fetcher: async (url, init) => {
    if (url === `${API}/api/health`) return Response.json({ configured: true, model: 'mock-jev', textModel: 'mock-text', fallbackAttempts: counter });
    if (url !== `${API}/api/interpret` || init?.method !== 'POST') {
      counts.image++; throw new Error('Mock rejects every non-health/non-interpret endpoint');
    }
    const item = suite.cases[counts.posts++];
    if (!item) throw new Error('More requests than planned');
    if (options.failPost) throw new Error('Simulated lost response');
    const request = JSON.parse(String(init.body)) as { turnId: string };
    const usesBackup = options.allFallback || counts.posts % 2 === 0;
    if (usesBackup) { counter++; counts.backup++; }
    if (options.drift) counter++;
    if (options.restart) counter = 0;
    return Response.json({ turnId: request.turnId, action: item.category === 'ambiguity' ? 'clarify' : 'edit',
      patch: samplePatches[item.id], notices: item.category === 'ambiguity' ? ['Please specify which decoration or candle you want.'] : [],
      provider: { model: 'mock-jev', durationMs: 12, status: 200, interpreter: usesBackup ? 'fallback' : 'jev',
        ...(usesBackup ? { fallback: { model: 'mock-text', durationMs: 25, status: 200,
          // One failed-attempt-shaped cost gap is deliberately retained as unknown.
          ...(counts.posts === 2 ? {} : { costUsd: 0.0001 }) } } : {}) } });
  } };
}

async function selfTest(suite: Suite, sha: string): Promise<string[]> {
  const checks: string[] = [];
  const mock = mockFetcher(suite);
  const positive = await runSuite(suite, sha, { mode: 'MOCK DRY RUN', fetcher: mock.fetcher });
  assert.equal(positive.abort, undefined); assert.equal(positive.rows.length, 30);
  assert.ok(positive.rows.every(row => row.pass)); assert.equal(mock.counts.image, 0);
  assert.equal(positive.observedAttempts, mock.counts.backup);
  checks.push('30 synthetic outcomes scored correctly; mixed Jev/fallback metadata audited; zero network/image requests');
  for (const row of positive.rows) {
    const item = suite.cases.find(candidate => candidate.id === row.id)!;
    if (item.category !== 'ambiguity') {
      assert.ok(score(item, row.initial, row.initial, row.response!).some(check => !check.pass), `${item.id}: no-op must fail`);
    } else {
      const wrong = applyCakePatch(row.initial, { addToppings: ['ganache'] }).state;
      assert.ok(score(item, row.initial, wrong, row.response!).some(check => !check.pass));
    }
    const wrong = cloneCake(row.actual); wrong.exists = false;
    assert.ok(score(item, row.initial, wrong, row.response!).some(check => !check.pass), `${item.id}: unrelated mutation must fail`);
  }
  checks.push('No-op positives, arbitrary ambiguity edits and unrelated state mutations all fail scoring');
  const capped = mockFetcher(suite, { allFallback: true });
  const capRun = await runSuite(suite, sha, { mode: 'MOCK DRY RUN', fetcher: capped.fetcher, cap: 1 });
  assert.equal(capped.counts.posts, 1); assert.equal(capRun.observedAttempts, 1); assert.ok(capRun.abort?.includes('budget'));
  const maximum = mockFetcher(suite, { allFallback: true });
  const maxRun = await runSuite(suite, sha, { mode: 'MOCK DRY RUN', fetcher: maximum.fetcher });
  assert.equal(maxRun.observedAttempts, 30); assert.equal(maximum.counts.posts, 30); assert.equal(maxRun.abort, undefined);
  await assert.rejects(runSuite(suite, sha, { mode: 'MOCK DRY RUN', fetcher: maximum.fetcher, cap: 31 }));
  await assert.rejects(runSuite({ ...suite, cases: [...suite.cases, suite.cases[0]] }, sha, { mode: 'MOCK DRY RUN', fetcher: maximum.fetcher }));
  checks.push('One-call reduced budget stops before second POST; 30-call worst case stays at30; cap31 and request31 rejected');
  for (const fault of [{ drift: true }, { restart: true }, { failPost: true }]) {
    const failed = mockFetcher(suite, fault);
    const run = await runSuite(suite, sha, { mode: 'MOCK DRY RUN', fetcher: failed.fetcher });
    assert.equal(failed.counts.posts, 1); assert.ok(run.abort);
  }
  checks.push('Counter drift, server restart and lost response each abort after first POST without retries');
  return checks;
}

async function novelty(suite: Suite): Promise<NonNullable<Run['novelty']>> {
  const execute = promisify(execFile);
  const results: NonNullable<Run['novelty']> = [];
  for (const item of suite.cases) {
    try {
      const { stdout } = await execute('rg', ['--fixed-strings', '--ignore-case', '--files-with-matches',
        '--glob', '!heldout-phrases.json', '--glob', '!heldout-results.md', '--glob', '!heldout-results.json',
        '--glob', '!heldout-review.md', '--', item.phrase, path.join(ROOT, 'tests'), path.join(ROOT, 'scripts'), path.join(ROOT, 'docs')]);
      results.push({ id: item.id, matches: stdout.trim().split('\n').filter(Boolean).map(file => path.relative(ROOT, file)) });
    } catch (error) {
      if ((error as { code?: number }).code !== 1) throw error;
      results.push({ id: item.id, matches: [] });
    }
  }
  return results;
}

function render(run: Run, suite: Suite): string {
  const passed = run.rows.filter(row => row.pass).length;
  const backupRows = run.rows.filter(row => row.response?.provider.fallback);
  const knownCosts = backupRows.flatMap(row => {
    const cost = row.response!.provider.fallback!.costUsd;
    return typeof cost === 'number' && Number.isFinite(cost) && cost >= 0 ? [cost] : [];
  });
  const delta = run.baseline && run.after ? run.after.fallbackAttempts - run.baseline.fallbackAttempts : undefined;
  const counterAttempts = delta !== undefined && delta >= 0 ? delta : undefined;
  const missingCosts = Math.max(backupRows.length, counterAttempts ?? 0) - knownCosts.length;
  const lines = ['# Held-out interpretation results', '',
    `**Mode: ${run.mode}. ${run.mode === 'LIVE' ? 'Real default-config requests.' : 'MOCK RESPONSES ONLY. Live approval pending; these are NOT model accuracy results.'}**`, '',
    ...(run.mode === 'MOCK DRY RUN' ? ['All timing, counter and cost values below are synthetic. Real provider requests: **0**. Real spend: **$0**.', ''] : []),
    `Started: ${run.started}. Frozen phrase/rule SHA-256: \`${run.sha256}\`.`,
    `Completed ${run.rows.length}/${run.planned}; passed ${passed}/${run.rows.length}. ${run.abort ? `ABORTED: ${run.abort}` : 'Counter audit completed.'}`, '',
    `Backup attempts from health: ${counterAttempts ?? 'unknown'}/${HARD_CAP}; response metadata: ${run.observedAttempts}. Health: ${run.baseline?.fallbackAttempts ?? 'unknown'} → ${run.after?.fallbackAttempts ?? 'unknown'}.`,
    `Reported backup cost subtotal: $${knownCosts.reduce((sum, cost) => sum + cost, 0).toFixed(8)}; ${missingCosts} attempted backup(s) missing cost metadata. Missing cost is unknown, not zero.`,
    'Provider times are server-reported; HTTP times are client request-to-response, not audio or paint timings. No image endpoints are called.', '',
    '| Category | Passed / executed | Not run | Pass rate |', '|---|---:|---:|---:|'];
  for (const category of [...new Set(suite.cases.map(item => item.category))]) {
    const rows = run.rows.filter(row => row.category === category), pass = rows.filter(row => row.pass).length;
    lines.push(`| ${category} | ${pass}/${rows.length} | ${suite.cases.filter(item => item.category === category).length - rows.length} | ${rows.length ? `${(100 * pass / rows.length).toFixed(1)}%` : 'not run'} |`);
  }
  lines.push('', '## Harness self-checks', ...(run.selfChecks ?? []).map(check => `- ${check}`),
    '', '## Novelty audit', 'Exact case-insensitive fixed-string searches across existing tests/scripts/docs. Own phrase file and generated held-out reports/review are excluded.',
    ...(run.novelty ?? []).map(row => `- ${row.id}: ${row.matches.length ? `MATCH: ${row.matches.join(', ')}` : '0 prior matches'}`),
    '', '## Per-case rules and outcomes');
  for (const item of suite.cases) {
    const row = run.rows.find(candidate => candidate.id === item.id);
    const initial = row?.initial ?? applyCakePatch(suite.baseState, item.initial).state;
    lines.push('', `### ${item.id}: ${item.category}`, '', `**Phrase:** ${item.phrase}`, '',
      `**Starting state:** \`${JSON.stringify(initial)}\``, '',
      `**May change only:** ${item.expect.onlyChange.join(', ') || 'nothing (must clarify without editing)'}. Every other state field must be preserved.`,
      `**Rules:** \`${JSON.stringify(item.expect.rules)}\``, '',
      row ? `**${row.pass ? 'PASS' : 'FAIL'}**; HTTP ${row.status}; interpreter ${row.response?.provider.interpreter ?? 'unavailable'}; Jev ${row.response?.provider.durationMs.toFixed(1) ?? '?'}ms; backup ${row.response?.provider.fallback?.durationMs.toFixed(1) ?? 'not used'}ms (status ${row.response?.provider.fallback?.status ?? 'not used'}); HTTP ${row.httpMs.toFixed(1)}ms; backup cost ${row.response?.provider.fallback ? row.response.provider.fallback.costUsd ?? 'unknown' : 'not used'}.` : '**NOT RUN**');
    if (row) lines.push(`Patch: \`${JSON.stringify(row.response?.patch ?? {})}\`. Notices: \`${JSON.stringify(row.response?.notices ?? [])}\`.`,
      ...(row.error ? [`Error: ${row.error}`] : []), ...row.checks.map(check => `- ${check.pass ? 'PASS' : 'FAIL'} ${check.rule}: ${check.detail}`));
  }
  lines.push('', '## Constraints', '- A backup is optional; scoring never rewards a particular interpreter.',
    '- Canonical values on individual explicitly requested fields are required, but open-ended mood/topping rules accept multiple valid choices.',
    '- Run live only after user approval of this SHA. No changes to application prompts/models/normalization or scoring after seeing outcomes.',
    '- Live budget assumes this server retains its one-backup-per-turn invariant and runs without concurrent interpretation traffic or restarts. Counter discrepancies abort immediately; health GETs do not spend model budget.',
    '- No retries, no microphone, no browser paint claims, no image generation.', '');
  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2), dry = args.includes('--dry-run'), live = args.includes('--live');
  if (dry === live) throw new Error('Choose --dry-run (no network), or --live --approved-sha=<reviewed SHA> after user approval');
  const source = await readFile(PHRASES, 'utf8'), sha = createHash('sha256').update(source).digest('hex');
  const suite = JSON.parse(source) as Suite;
  validateCakePatch(suite.baseState);
  assert.equal(suite.cases.length, 30); assert.equal(new Set(suite.cases.map(item => item.id)).size, 30);
  assert.equal(new Set(suite.cases.map(item => item.phrase.toLowerCase())).size, 30);
  for (const item of suite.cases) {
    validateCakePatch(item.initial); assert.ok(item.phrase.trim() && item.phrase.length <= 600);
    assert.ok(item.expect.rules.length); assert.ok(item.expect.onlyChange.every(key => key.split('.')[0] in suite.baseState));
    applyCakePatch(suite.baseState, item.initial);
  }
  const matches = await novelty(suite);
  assert.ok(matches.every(row => row.matches.length === 0), 'Held-out phrase found in prior tests/scripts/docs');
  const persist = async (run: Run) => {
    run.novelty = matches;
    await writeFile(REPORT, render(run, suite));
    await writeFile(JSON_REPORT, `${JSON.stringify(run, null, 2)}\n`);
  };
  if (dry) {
    const selfChecks = await selfTest(suite, sha);
    const mock = mockFetcher(suite);
    const run = await runSuite(suite, sha, { mode: 'MOCK DRY RUN', fetcher: mock.fetcher });
    run.selfChecks = selfChecks; await persist(run);
    const review = ['# Held-out phrase review (live not run)', '', `Frozen SHA-256: \`${sha}\`.`, '',
      'All cases start with the base state below, then apply their listed initial patch. Unlisted fields MUST stay unchanged. `onlyChange` is an allowed-change envelope, never permission to ignore the other positive rules.',
      '', `Base state: \`${JSON.stringify(suite.baseState)}\``, '',
      ...suite.cases.flatMap(item => [`## ${item.id} · ${item.category}`, '', item.phrase, '',
        `Initial patch: \`${JSON.stringify(item.initial)}\``, `Only may change: ${item.expect.onlyChange.join(', ') || 'nothing'}.`,
        `Required rules: \`${JSON.stringify(item.expect.rules)}\``, '']),
      'Live command only AFTER approval:', '', `\`npx tsx scripts/check-live-heldout.ts --live --approved-sha=${sha}\``, '',
      'Maximum30 backup attempts; no retries/image calls. Mock pass rates are harness verification, not model accuracy.', ''].join('\n');
    await writeFile(REVIEW, review);
    console.log(JSON.stringify({ mode: run.mode, sha256: sha, cases: run.rows.length, passed: run.rows.filter(row => row.pass).length,
      noveltyMatches: matches.reduce((sum, row) => sum + row.matches.length, 0), selfChecks, liveCalls: 0 }, null, 2));
  } else {
    assert.ok(args.includes(`--approved-sha=${sha}`), 'User-reviewed phrase/rule SHA must match before any live request');
    const run = await runSuite(suite, sha, { mode: 'LIVE', fetcher: fetch, persist });
    console.log(JSON.stringify({ mode: run.mode, sha256: sha, requests: run.requests, backupAttempts: run.observedAttempts,
      passed: run.rows.filter(row => row.pass).length, abort: run.abort ?? null }, null, 2));
    if (run.abort || run.rows.some(row => !row.pass) || run.rows.length !== suite.cases.length) process.exitCode = 1;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error instanceof Error ? error.message : 'Held-out harness failed'); process.exitCode = 1; });
}
