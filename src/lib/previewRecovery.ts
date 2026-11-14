import { isAssetId, normalizeCustomRequest } from '../shared/cake';
import { browserImageTransport } from './designerQueue';

export type PreviewInfo = { imageGenerationMs?: number; cached?: boolean };
export type CacheResult = ({ status: 'ready'; assetId: string } & PreviewInfo) | { status: 'pending' | 'missing' };
export type PreviewStatus = CacheResult | { status: 'checking' | 'generating' | 'error'; message?: string };
type Lookup = (request: string, signal: AbortSignal) => Promise<CacheResult>;
type Generate = (request: string) => Promise<{ assetId: string } & PreviewInfo>;

export const lookupCachedPreview: Lookup = async (request, signal) => {
  // This endpoint only reads the cache/in-flight map. Never substitute the
  // generation endpoint here, even on errors or cache misses.
  const response = await fetch('/api/topper-image/lookup', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request }), signal,
  });
  if (!response.ok) throw new Error('Could not check the preview cache. Your saved design is unchanged.');
  const body = await response.json();
  if (body?.status === 'ready' && isAssetId(body.assetId)) return { status: 'ready', assetId: body.assetId };
  if (body?.status === 'pending' || body?.status === 'missing') return { status: body.status };
  throw new Error('The preview cache returned an invalid response. Your saved design is unchanged.');
};

type Entry = {
  request: string;
  state: PreviewStatus;
  listeners: Set<(state: PreviewStatus) => void>;
  controller: AbortController;
  timer?: ReturnType<typeof setTimeout>;
  deadlineTimer?: ReturnType<typeof setTimeout>;
  polls: number;
  deadline: number;
};

/** Shared by saved items: one normalized lookup/poll loop and explicit retry. */
export class PreviewRecovery {
  private entries = new Map<string, Entry>();
  private generations = new Map<string, Promise<{ assetId: string } & PreviewInfo>>();
  constructor(private lookup: Lookup = lookupCachedPreview, private generate: Generate = browserImageTransport,
    private pollMs = 2000, private maxPolls = 60) {}

  watch(request: string, listener: (state: PreviewStatus) => void) {
    const key = normalizeCustomRequest(request);
    let entry = this.entries.get(key);
    const fresh = !entry;
    if (!entry) {
      entry = { request, state: { status: 'checking' }, listeners: new Set(), controller: new AbortController(), polls: 0, deadline: Date.now() + this.pollMs * this.maxPolls };
      this.entries.set(key, entry);
    }
    entry.listeners.add(listener);
    listener(entry.state);
    if (fresh) {
      this.armDeadline(key, entry);
      void this.check(key, entry);
    }
    const watched = entry;
    return () => {
      watched.listeners.delete(listener);
      if (!watched.listeners.size) {
        watched.controller.abort();
        clearTimeout(watched.timer);
        clearTimeout(watched.deadlineTimer);
        if (this.entries.get(key) === watched) this.entries.delete(key);
      }
    };
  }
  private active(key: string, entry: Entry) {
    return this.entries.get(key) === entry && entry.listeners.size > 0 && !entry.controller.signal.aborted;
  }
  private publish(key: string, entry: Entry, state: PreviewStatus) {
    if (!this.active(key, entry)) return;
    if (['ready', 'missing', 'error'].includes(state.status)) clearTimeout(entry.deadlineTimer);
    entry.state = state;
    entry.listeners.forEach(listener => listener(state));
  }
  private armDeadline(key: string, entry: Entry) {
    clearTimeout(entry.deadlineTimer);
    entry.deadlineTimer = setTimeout(() => {
      if (!this.active(key, entry)) return;
      clearTimeout(entry.timer);
      this.publish(key, entry, { status: 'error', message: 'The preview check timed out. Your saved design is unchanged; check the cache again later.' });
      // Publish before abort, and ignore even a transport that never settles or
      // ignores AbortSignal. A retry gets a different controller identity.
      entry.controller.abort();
    }, Math.max(0, entry.deadline - Date.now()));
  }
  private async check(key: string, entry: Entry) {
    const controller = entry.controller;
    try {
      const result = await this.lookup(entry.request, controller.signal);
      if (!this.active(key, entry) || entry.controller !== controller) return;
      if (result.status === 'pending' && (++entry.polls >= this.maxPolls || Date.now() >= entry.deadline)) {
        this.publish(key, entry, { status: 'error', message: 'The preview is still processing. Check the cache again later; no new image has been requested.' });
        return;
      }
      this.publish(key, entry, result);
      if (result.status === 'pending') entry.timer = setTimeout(() => { void this.check(key, entry); }, this.pollMs);
    } catch {
      if (entry.controller !== controller) return;
      this.publish(key, entry, { status: 'error', message: 'Could not check the preview cache. Your saved design is unchanged.' });
    }
  }
  checkAgain(request: string) {
    const key = normalizeCustomRequest(request), entry = this.entries.get(key);
    if (!entry || ['checking', 'generating', 'pending'].includes(entry.state.status)) return;
    clearTimeout(entry.timer);
    entry.controller = new AbortController();
    entry.polls = 0;
    entry.deadline = Date.now() + this.pollMs * this.maxPolls;
    this.armDeadline(key, entry);
    this.publish(key, entry, { status: 'checking' });
    void this.check(key, entry);
  }
  /** Only call from the explicitly cost-labelled user action, never watch(). */
  async generateExplicitly(request: string) {
    const key = normalizeCustomRequest(request), entry = this.entries.get(key);
    if (!entry || ['checking', 'generating', 'pending', 'ready'].includes(entry.state.status)) return;
    clearTimeout(entry.timer);
    entry.controller = new AbortController();
    entry.deadline = Date.now() + this.pollMs * this.maxPolls;
    this.armDeadline(key, entry);
    const controller = entry.controller;
    this.publish(key, entry, { status: 'generating' });
    let work = this.generations.get(key);
    if (!work) {
      work = Promise.resolve().then(() => this.generate(request));
      this.generations.set(key, work);
    }
    try {
      const result = await work;
      if (entry.controller !== controller) return;
      if (!isAssetId(result.assetId)) throw new Error('Invalid preview');
      this.publish(key, entry, { status: 'ready', assetId: result.assetId,
        ...(result.imageGenerationMs !== undefined ? { imageGenerationMs: result.imageGenerationMs } : {}),
        ...(result.cached !== undefined ? { cached: result.cached } : {}) });
    } catch {
      if (entry.controller !== controller) return;
      this.publish(key, entry, { status: 'error', message: 'Could not generate the preview. Your saved design is unchanged.' });
    } finally {
      if (this.generations.get(key) === work) this.generations.delete(key);
    }
  }
}

export const savedPreviewRecovery = new PreviewRecovery();
