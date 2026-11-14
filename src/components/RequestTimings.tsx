import type { TurnTiming } from '../shared/interpretation';

const milliseconds = (value: number | undefined) => value === undefined ? '—' : `${Math.round(value)} ms`;
export function RequestTimings({ timings }: { timings: TurnTiming[] }) {
  return <div className="timing-scroll"><table>
    <thead><tr><th>Turn</th><th>Interpreter</th><th>Provider time</th><th>Backup time</th><th>Backup cost (USD)</th><th>Image generation</th><th>Request</th><th>Final transcript → paint</th></tr></thead>
    <tbody>{timings.map((timing, index) => <tr key={timing.turnId}>
      <td title={timing.phrase}>{index === 0 ? '1 (first)' : index + 1}{timing.error ? ' · failed' : ''}</td>
      <td>{timing.interpreter === 'fallback' ? 'Backup' : timing.interpreter === 'jev' ? 'Jev' : 'Unknown'}</td>
      <td>{milliseconds(timing.providerMs)}</td>
      <td>{milliseconds(timing.fallbackMs)}</td>
      <td>{timing.fallbackCostUsd !== undefined && Number.isFinite(timing.fallbackCostUsd) && timing.fallbackCostUsd >= 0 ? `$${timing.fallbackCostUsd.toFixed(6)}` : '—'}</td>
      <td title={timing.imageError}>{timing.imageCached ? 'cached' : timing.imageError ? 'failed' : milliseconds(timing.imageGenerationMs)}</td>
      <td>{milliseconds(timing.responseAt === undefined ? undefined : timing.responseAt - timing.fetchStartAt)}</td>
      <td>{milliseconds(timing.approximatePaintAt === undefined ? undefined : timing.approximatePaintAt - timing.finalAt)}</td>
    </tr>)}</tbody>
  </table></div>;
}
