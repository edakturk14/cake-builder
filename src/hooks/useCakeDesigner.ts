import { useLayoutEffect, useRef, useSyncExternalStore, useEffect } from 'react';
import { DesignerQueue, type AssetReady } from '../lib/designerQueue';
export type { TurnTiming, TurnMeta } from '../shared/interpretation';

export function useCakeDesigner(options: { onAssetReady?: (event: AssetReady) => void } = {}) {
  const ref = useRef<DesignerQueue | null>(null);
  if (!ref.current) ref.current = new DesignerQueue();
  const queue = ref.current;
  queue.onAssetReady = options.onAssetReady;
  const snapshot = useSyncExternalStore(queue.subscribe, queue.getSnapshot);
  useLayoutEffect(() => {
    if (!snapshot.appliedTurnId) return;
    const id = snapshot.appliedTurnId;
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => queue.markPaint(id)); });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [queue, snapshot.appliedTurnId]);
  useEffect(() => () => queue.cancel(), [queue]);
  return { ...snapshot, submit: queue.submit, undo: queue.undo, reset: queue.reset, retryImage: queue.retryImage, receiveImage: queue.receiveImage };
}
