/** Display the server's configured estimate, never an independent UI price. */
export function previewCostLabel(estimatedCostUsd: number | null) {
  if (estimatedCostUsd === null || !Number.isFinite(estimatedCostUsd) || estimatedCostUsd < 0) return 'cost varies';
  if (estimatedCostUsd === 0) return 'free';
  return `about ${Math.max(1, Math.round(estimatedCostUsd * 100))}¢`;
}

let estimate: Promise<number | null> | undefined;
export function configuredPreviewCost() {
  estimate ??= fetch('/api/health').then(response => response.ok ? response.json() : null)
    .then(body => typeof body?.imageEstimatedCostUsd === 'number' && Number.isFinite(body.imageEstimatedCostUsd) && body.imageEstimatedCostUsd >= 0
      ? body.imageEstimatedCostUsd as number : null).catch(() => null);
  return estimate;
}
