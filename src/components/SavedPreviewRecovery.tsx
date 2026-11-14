import { useEffect, useState } from 'react';
import { savedPreviewRecovery, type PreviewInfo, type PreviewStatus } from '../lib/previewRecovery';
import { configuredPreviewCost, previewCostLabel } from '../lib/previewPrice';

export function SavedPreviewRecovery({ request, onReady }: { request: string; onReady: (request: string, assetId: string, info?: PreviewInfo) => void }) {
  const [state, setState] = useState<PreviewStatus>({ status: 'checking' });
  const [cost, setCost] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    void configuredPreviewCost().then(value => { if (active) setCost(value); });
    return () => { active = false; };
  }, []);
  useEffect(() => savedPreviewRecovery.watch(request, next => {
    setState(next);
    if (next.status === 'ready') onReady(request, next.assetId, next);
  }), [request, onReady]);
  const busy = ['checking', 'pending', 'generating'].includes(state.status);
  return <div className="saved-preview-recovery">
    <p className="status-note" role="status">
      {state.status === 'checking' ? 'Checking for an existing preview (free)…' :
        state.status === 'pending' ? 'Your preview is still processing. Checking for its completion; no new image is being requested.' :
        state.status === 'generating' ? 'Generating the preview you requested…' :
        state.status === 'error' ? state.message :
        state.status === 'missing' ? 'Your custom request is saved. Creating a new preview is optional.' : 'Preview recovered.'}
    </p>
    {state.status !== 'ready' && <>
      <button type="button" className="preview-create-button" disabled={busy} onClick={() => { void savedPreviewRecovery.generateExplicitly(request); }}>
        {state.status === 'generating' ? 'Creating preview…' : `${state.status === 'error' ? 'Retry preview' : 'Create preview'} (${previewCostLabel(cost)})`}
      </button>
      {!busy && <button type="button" className="text-button" onClick={() => savedPreviewRecovery.checkAgain(request)}>Check cache again (free)</button>}
    </>}
  </div>;
}
