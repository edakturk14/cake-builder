import { useCallback, useEffect, useRef, useState } from 'react';
import type { TurnMeta } from '../shared/interpretation';
import { createSpeechResultCollector, type SpeechEvent } from '../lib/speechResults';

type Recognition = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null; onstart: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
export type SpeechOptions = { onFinal: (text: string, meta: TurnMeta) => void };

export function useSpeechRecognition({ onFinal }: SpeechOptions) {
  const [supported] = useState(() => typeof window !== 'undefined' && Boolean((window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition));
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const wanted = useRef(false);
  const generation = useRef(0);
  const callback = useRef(onFinal);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  callback.current = onFinal;
  const stop = useCallback(() => {
    wanted.current = false;
    if (restartTimer.current) clearTimeout(restartTimer.current);
    recognition.current?.stop();
    setListening(false);
    setInterimTranscript('');
  }, []);
  const launch = useCallback(() => {
    const Constructor = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
    if (!Constructor) { setError('Speech recognition is not supported here. Use desktop Chrome or type your edit.'); return; }
    const instance = new Constructor();
    recognition.current = instance;
    const session = ++generation.current;
    const collect = createSpeechResultCollector(String(session));
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = 'en-US';
    instance.onstart = () => { if (wanted.current) setListening(true); };
    instance.onresult = event => {
      if (!wanted.current || session !== generation.current) return;
      const result = collect(event);
      for (const final of result.finals) {
        setFinalTranscript(final.text);
        callback.current(final.text, final.meta);
      }
      setInterimTranscript(result.interimTranscript);
    };
    instance.onerror = event => {
      if (session !== generation.current) return;
      if (event.error === 'no-speech') return;
      if (event.error === 'aborted' && !wanted.current) return;
      wanted.current = false;
      setListening(false);
      const messages: Record<string, string> = {
        'not-allowed': 'Microphone permission was denied. Allow it in Chrome, or type your edit.',
        'service-not-allowed': 'Speech recognition is blocked by this browser. Try desktop Chrome or type your edit.',
        'audio-capture': 'No microphone was found. Check your input device or type your edit.',
        network: 'Browser speech recognition could not connect. Check your network or type your edit.',
      };
      setError(messages[event.error] || `Speech recognition stopped (${event.error}). Start again or type your edit.`);
    };
    instance.onend = () => {
      if (session !== generation.current) return;
      setListening(false);
      setInterimTranscript('');
      if (wanted.current) restartTimer.current = setTimeout(() => { if (wanted.current) launch(); }, 250);
    };
    try { instance.start(); } catch {
      wanted.current = false;
      setListening(false);
      setError('Could not start the microphone. Try again or type your edit.');
    }
  }, []);
  const start = useCallback(() => {
    if (wanted.current) return;
    wanted.current = true;
    setError(null);
    launch();
  }, [launch]);
  const toggle = useCallback(() => { if (wanted.current) stop(); else start(); }, [start, stop]);
  useEffect(() => () => {
    wanted.current = false;
    generation.current++;
    if (restartTimer.current) clearTimeout(restartTimer.current);
    recognition.current?.abort();
  }, []);
  return { supported, listening, interimTranscript, finalTranscript, error, start, stop, toggle };
}
