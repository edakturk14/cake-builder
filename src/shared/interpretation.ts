import type { CakePatch, CakeState } from './cake';

export type TurnMeta = {
  source?: 'typed' | 'speech';
  utteranceId?: string;
  firstInterimAt?: number;
  finalAt?: number;
};

export type InterpretRequest = { turnId: string; phrase: string; state: CakeState };
export type InterpretResponse = {
  turnId: string;
  action: 'edit' | 'undo' | 'reset' | 'clarify';
  patch: CakePatch;
  notices: string[];
  provider: {
    model: string;
    durationMs: number;
    status: number;
    interpreter?: 'jev' | 'fallback';
    fallback?: { model: string; durationMs: number; status: number; costUsd?: number };
  };
};

export type TurnTiming = {
  turnId: string;
  phrase: string;
  source: 'typed' | 'speech';
  firstInterimAt?: number;
  finalAt: number;
  fetchStartAt: number;
  responseAt?: number;
  stateApplyAt?: number;
  approximatePaintAt?: number;
  providerMs?: number;
  model?: string;
  status?: number;
  error?: string;
  interpreter?: 'jev' | 'fallback';
  fallbackMs?: number;
  fallbackCostUsd?: number;
  imageGenerationMs?: number;
  imageCached?: boolean;
  imageError?: string;
};
