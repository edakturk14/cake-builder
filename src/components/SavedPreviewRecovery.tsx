import { useEffect, useState } from 'react';
import { savedPreviewRecovery, type PreviewStatus } from '../lib/previewRecovery';

export function SavedPreviewRecovery({ request, onReady }: { request: string; onReady: (request: string, assetId: string) => void }) {
  const [state, setState] = useState<PreviewStatus>({ status: 'checking' });
  useEffect(() => savedPreviewRecovery.watch(request, next => {
    setState(next);
    if (next.status === 'ready') onReady(request, next.assetId);
  }), [request, onReady]);
  const busy = ['checking', 'pending', 'generating'].includes(state.status);
  return <div className="saved-preview-recovery">
    <p className="status-note" role="status">
      {state.status === 'checking' ? 'Checking the saved preview cache…' :
        state.status === 'pending' ? 'Your preview is still processing. Checking for its completion; no new image is being requested.' :
        state.status === 'generating' ? 'Generating the preview you requested…' :
        state.status === 'error' ? state.message :
        state.status === 'missing' ? 'No cached preview is available. Your custom request is saved.' : 'Preview recovered.'}
    </p>
    {!busy && state.status !== 'ready' && <>
      <button type="button" className="text-button" onClick={() => savedPreviewRecovery.checkAgain(request)}>Check cache again (free)</button>
      <button type="button" className="text-button" onClick={() => { void savedPreviewRecovery.generateExplicitly(request); }}>Generate preview (may incur cost)</button>
    </>}
  </div>;
}
