import type { TurnMeta } from '../shared/interpretation';
export type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
export type SpeechEvent = { resultIndex: number; results: { length: number; [index: number]: SpeechResult } };

/** A recognition session owns stable result indices; a restarted session gets a new ID. */
export function createSpeechResultCollector(session: string, clock = () => performance.now()) {
  const delivered = new Set<number>();
  const firstInterim = new Map<number, number>();
  return (event: SpeechEvent) => {
    const interim: string[] = [];
    const finals: { text: string; meta: TurnMeta }[] = [];
    for (let index = 0; index < event.results.length; index++) {
      const result = event.results[index];
      const text = result[0].transcript.trim();
      if (!result.isFinal) {
        if (!firstInterim.has(index)) firstInterim.set(index, clock());
        if (text) interim.push(text);
      } else if (!delivered.has(index)) {
        delivered.add(index);
        if (text) finals.push({ text, meta: { source: 'speech', utteranceId: `speech-${session}-${index}`, firstInterimAt: firstInterim.get(index), finalAt: clock() } });
      }
    }
    return { interimTranscript: interim.join(' '), finals };
  };
}
