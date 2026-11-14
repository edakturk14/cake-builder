import { applyCakePatch, cloneCake, EMPTY_CAKE, isAssetId, normalizeCustomRequest, validateCakePatch, type CakeState } from '../shared/cake';
import type { InterpretRequest, InterpretResponse, TurnMeta, TurnTiming } from '../shared/interpretation';

export type DesignerSnapshot = {
  cake: CakeState;
  pending: boolean;
  pendingCount: number;
  status: 'idle' | 'interpreting' | 'error';
  error: string | null;
  notices: string[];
  canUndo: boolean;
  timings: TurnTiming[];
  appliedTurnId: string | null;
  imagePending: boolean;
  imageError: string | null;
  readyAssets: ReadonlyMap<string, string>;
};
type Work = { text: string; meta: TurnMeta; id: string; epoch: number } | { undo: true; epoch: number };
export type Transport = (request: InterpretRequest, signal: AbortSignal) => Promise<InterpretResponse>;
export type AssetReady = { request: string; assetId: string };
export type ImageResponse = { assetId: string; imageGenerationMs: number; cached: boolean; model: string };
export type ImageTransport = (request: string) => Promise<ImageResponse>;
export const browserImageTransport: ImageTransport = async request => {
  const response = await fetch('/api/topper-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request }) });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(typeof body?.error === 'string' ? body.error : `Topper image failed: HTTP ${response.status}. Your cake is saved.`);
    Object.assign(error, { imageGenerationMs: body?.imageGenerationMs, status: response.status });
    throw error;
  }
  if (!body || !isAssetId(body.assetId) || typeof body.imageGenerationMs !== 'number' || !Number.isFinite(body.imageGenerationMs)
    || body.imageGenerationMs < 0 || typeof body.cached !== 'boolean' || typeof body.model !== 'string') throw new Error('The server returned an invalid topper image. Your cake is saved.');
  return body;
};

export const browserTransport: Transport = async (request, signal) => {
  const response = await fetch('/api/interpret', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(typeof body?.error === 'string' ? body.error : `Interpretation failed: HTTP ${response.status}. Please retry.`);
    Object.assign(error, { status: response.status, providerMs: body?.providerMs });
    throw error;
  }
  if (!body || body.turnId !== request.turnId || !['edit', 'undo', 'reset', 'clarify'].includes(body.action)
    || !Array.isArray(body.notices) || !body.notices.every((note: unknown) => typeof note === 'string')
    || !body.provider || typeof body.provider.model !== 'string'
    || typeof body.provider.durationMs !== 'number' || !Number.isFinite(body.provider.durationMs)) {
    throw new Error('The server returned an invalid edit. Please retry.');
  }
  validateCakePatch(body.patch);
  return body;
};

export class DesignerQueue {
  private listeners = new Set<() => void>();
  private history: CakeState[] = [];
  private work: Work[] = [];
  private epoch = 0;
  private running = false;
  private abort: AbortController | null = null;
  private seen = new Set<string>();
  private sequence = 0;
  private images = new Map<string, { epochs: Set<number>; turnIds: Set<string> }>();
  private assetEpoch = 0;
  private assets = new Map<string, string>();
  onAssetReady?: (event: AssetReady) => void;
  private snapshot: DesignerSnapshot = {
    cake: cloneCake(EMPTY_CAKE), pending: false, pendingCount: 0, status: 'idle',
    error: null, notices: [], canUndo: false, timings: [], appliedTurnId: null,
    imagePending: false, imageError: null, readyAssets: new Map(),
  };
  constructor(private transport: Transport = browserTransport, private clock = () => performance.now(),
    private imageTransport: ImageTransport | null = typeof window === 'undefined' ? null : browserImageTransport) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(next: Partial<DesignerSnapshot>) {
    this.snapshot = { ...this.snapshot, ...next, canUndo: this.history.length > 0 };
    this.listeners.forEach(listener => listener());
  }
  submit = (text: string, meta: TurnMeta = {}) => {
    text = text.trim();
    if (!text || (meta.utteranceId && this.seen.has(meta.utteranceId))) return;
    if (meta.utteranceId) this.seen.add(meta.utteranceId);
    if (this.seen.size > 1000) this.seen.delete(this.seen.values().next().value!);
    const id = `turn-${Date.now()}-${++this.sequence}`;
    this.work.push({ text, meta: { ...meta, finalAt: meta.finalAt ?? this.clock() }, id, epoch: this.epoch });
    this.update({ pending: true, pendingCount: this.work.length + (this.running ? 1 : 0), error: null, status: 'interpreting' });
    void this.drain();
  };
  undo = () => {
    this.work.push({ undo: true, epoch: this.epoch });
    this.update({ pending: true, pendingCount: this.work.length + (this.running ? 1 : 0) });
    void this.drain();
  };
  private undoNow() {
    const previous = this.history.pop();
    if (previous) this.update({ cake: previous, notices: [], error: null, appliedTurnId: null });
    this.ensureImage();
  }
  reset = () => {
    this.epoch++;
    this.assetEpoch++;
    this.abort?.abort();
    this.work = [];
    this.history = [];
    this.update({ cake: cloneCake(EMPTY_CAKE), pending: false, pendingCount: 0, status: 'idle', error: null, notices: [], appliedTurnId: null, imagePending: false, imageError: null });
  };
  cancel = () => {
    this.epoch++;
    this.assetEpoch++;
    this.abort?.abort();
    this.work = [];
    this.update({ pending: false, pendingCount: 0, status: 'idle' });
  };
  markPaint = (turnId: string) => {
    this.update({ timings: this.snapshot.timings.map(t => t.turnId === turnId && t.approximatePaintAt === undefined ? { ...t, approximatePaintAt: this.clock() } : t) });
  };
  private assetReady(request: string, assetId: string) {
    const key = normalizeCustomRequest(request);
    if (!this.snapshot.cake.customTopper || normalizeCustomRequest(this.snapshot.cake.customTopper.request) !== key) return;
    const complete = (cake: CakeState) => cake.customTopper && normalizeCustomRequest(cake.customTopper.request) === key
      ? { ...cloneCake(cake), customTopper: { ...cake.customTopper, assetId } } : cake;
    this.history = this.history.map(complete);
    this.update({ cake: complete(this.snapshot.cake), imageError: null });
  }
  retryImage = () => this.ensureImage(this.snapshot.appliedTurnId ?? undefined);
  private ensureImage(turnId?: string) {
    const custom = this.snapshot.cake.customTopper;
    if (!custom || custom.assetId) { this.update({ imagePending: false, imageError: null }); return; }
    const request = custom.request, key = normalizeCustomRequest(request), ready = this.assets.get(key);
    if (ready) {
      this.assetReady(request, ready);
      this.update({ imagePending: false, timings: this.snapshot.timings.map(t => t.turnId === turnId ? { ...t, imageGenerationMs: 0, imageCached: true } : t) });
      return;
    }
    const existing = this.images.get(key);
    if (existing) { existing.epochs.add(this.assetEpoch); if (turnId) existing.turnIds.add(turnId); this.update({ imagePending: true, imageError: null }); return; }
    if (!this.imageTransport) return;
    const work = { epochs: new Set([this.assetEpoch]), turnIds: new Set(turnId ? [turnId] : []) };
    this.images.set(key, work);
    this.update({ imagePending: true, imageError: null });
    const started = this.clock();
    // Never await this in drain(): the text edit commits and later edits proceed now.
    void this.imageTransport(request).then(result => {
      if (!isAssetId(result.assetId)) throw new Error('The server returned an invalid topper image.');
      this.assets.set(key, result.assetId);
      this.update({ readyAssets: new Map(this.assets), timings: this.snapshot.timings.map(t => work.turnIds.has(t.turnId)
        ? { ...t, imageGenerationMs: result.imageGenerationMs, imageCached: result.cached, imageError: undefined } : t) });
      if (work.epochs.has(this.assetEpoch)) this.assetReady(request, result.assetId);
      // Basket requests remain valid even when the builder was reset/replaced.
      this.onAssetReady?.({ request, assetId: result.assetId });
    }).catch(error => {
      const details = error as { message?: string; imageGenerationMs?: number };
      const message = details.message || 'Could not generate the topper preview. Your request is saved.';
      const current = this.snapshot.cake.customTopper;
      this.update({ timings: this.snapshot.timings.map(t => work.turnIds.has(t.turnId)
        ? { ...t, imageGenerationMs: details.imageGenerationMs ?? this.clock() - started, imageError: message } : t),
        ...(work.epochs.has(this.assetEpoch) && current && normalizeCustomRequest(current.request) === key ? { imageError: message } : {}) });
    }).finally(() => {
      this.images.delete(key);
      const current = this.snapshot.cake.customTopper;
      this.update({ imagePending: Boolean(current && !current.assetId && this.images.has(normalizeCustomRequest(current.request))) });
    });
  }
  private async drain() {
    if (this.running) return;
    this.running = true;
    while (this.work.length) {
      const item = this.work.shift()!;
      if (item.epoch !== this.epoch) continue;
      if ('undo' in item) { this.undoNow(); continue; }
      const controller = new AbortController();
      this.abort = controller;
      const timing: TurnTiming = { turnId: item.id, phrase: item.text, source: item.meta.source ?? 'typed', firstInterimAt: item.meta.firstInterimAt, finalAt: item.meta.finalAt!, fetchStartAt: this.clock() };
      this.update({ pending: true, pendingCount: this.work.length + 1, status: 'interpreting', error: null });
      try {
        const result = await this.transport({ turnId: item.id, phrase: item.text, state: cloneCake(this.snapshot.cake) }, controller.signal);
        if (item.epoch !== this.epoch) continue;
        timing.responseAt = this.clock();
        timing.providerMs = result.provider.durationMs;
        timing.model = result.provider.model;
        timing.status = result.provider.status;
        if (result.action === 'reset') {
          this.assetEpoch++;
          this.history = [];
          this.update({ cake: cloneCake(EMPTY_CAKE) });
        } else if (result.action === 'undo') this.undoNow();
        else if (result.action === 'edit') {
          const applied = applyCakePatch(this.snapshot.cake, result.patch);
          if (JSON.stringify(applied.state) !== JSON.stringify(this.snapshot.cake)) {
            this.history.push(cloneCake(this.snapshot.cake));
            this.history = this.history.slice(-100);
            this.update({ cake: applied.state });
          }
        }
        timing.stateApplyAt = this.clock();
        this.update({ notices: result.notices, appliedTurnId: item.id, timings: [...this.snapshot.timings, timing].slice(-100) });
        this.ensureImage(item.id);
      } catch (error) {
        if (item.epoch !== this.epoch) continue;
        const details = error as { message?: string; status?: number; providerMs?: number };
        timing.responseAt = this.clock();
        timing.error = details.message || 'Interpretation failed. Please retry.';
        timing.status = details.status;
        timing.providerMs = details.providerMs;
        this.update({ error: timing.error, status: 'error', timings: [...this.snapshot.timings, timing].slice(-100) });
      }
    }
    this.running = false;
    this.abort = null;
    this.update({ pending: false, pendingCount: 0, status: this.snapshot.error ? 'error' : 'idle' });
  }
}
