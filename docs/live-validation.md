# Voice and real Jev validation

## Status

Automated local fixtures validate state, pricing, bounded-response normalization, speech-event deduplication, serial turns, reset invalidation, Undo, and failure handling. They are **not real Jev interpretation or microphone tests**. The local HTTP missing-key path returns 503, without a parser fallback.

Real Jev catalog checks and isolated Chrome typed-input timing checks have now run; see `docs/live-results.md` for measured outcomes and corrections. Microphone/audio recognition and audio-derived timing remain untested. Fixture durations are not voice latency measurements.

## Run with credentials

1. Copy `.env.example` to the ignored `.env.local`. Set `TYPESAFE_API_KEY` locally. Never paste it into a command, browser input, screenshot, or report. `TYPESAFE_MODEL` defaults to pinned `jev-1.14.0`.
2. Run `npm run dev`. Open `http://127.0.0.1:5173` in desktop Chrome.
3. With fixture replay **off**, submit these separately through the text field: “I want a cake.” ($42), “Make it two layers.” ($48), “Add a princess on top.” ($58), “Make it a birthday cake and write Eda on top.” ($58), “Change the name to Ada.” ($58), “Undo.” (Eda, $58).
4. Try “Remove the princess.” ($48). Undo must restore princess and $58 without changing name or layers.
5. Reset. Click **Start listening**, allow microphone access, and speak the same turns separately. Verify interim words appear while talking and each finalized phrase changes the cake only once. Keep listening across several turns, then Stop.
6. Try two rapid finalized edits, “Make it two layers” then “Add a princess.” The second must use the confirmed first result. Try “two tiers,” a cat named Miso topper, and a cheesecake with two layers. Check explanatory notes and preserved unrelated fields.
7. Reset while a request is pending. Its late result must not resurrect the old cake. Deny microphone permission or use an unsupported browser, then verify the typed field still uses the same real backend.
8. Run `npx tsx scripts/check-live-jev.ts` for real API checks: the initial six-step flow followed by all fourteen supplied examples and their follow-ups. It exits 2 when the key is missing, never substitutes fixtures, and exits 1 on mismatches. This checks the provider adapter, not microphone capture or browser painting.
9. Run `npx tsx scripts/check-live-appearance.ts`, `npx tsx scripts/check-live-occasions.ts`, and `npx tsx scripts/check-live-candles.ts` for the six appearance, four occasion and six candle quantity/numeral checks. They use real Jev but never call image generation.
10. For custom-image configuration, costs, asynchronous delivery and geometry, see `docs/topper-images.md`. Adding an image key does not mean the OpenRouter account has credits. Do not retry paid generation after a billing error until credits are confirmed.
11. Run `npx tsx scripts/check-live-fallback.ts` for the general-LLM fallback checks. It needs `OPENROUTER_API_KEY` and makes up to six real `openai/gpt-4.1-nano` calls (about $0.0004 each). It asserts normal phrases never touch the fallback, vague phrases route through it, the health `fallbackAttempts` counter matches observed calls, and spend stays within budget.

## Timing

Open **Local demo tools** to inspect request rows. The first row is the first observed request for that page session, not a proven cold request. Provider duration is measured server-side around the real HTTP call. Request duration uses browser `performance.now()`. Final-transcript-to-paint uses a double `requestAnimationFrame` after React commits, so paint is an approximation, not a last-audible-word measurement. First-interim-to-paint includes time spent speaking.

Full in-memory rows are exported as `TurnTiming` by `src/hooks/useCakeDesigner.ts` and `src/shared/interpretation.ts`; the hook exposes `timings`. Fields: `firstInterimAt`, `finalAt`, `fetchStartAt`, `responseAt`, `stateApplyAt`, `approximatePaintAt`, `providerMs`, `model`, `status`, `error`, `turnId`, `phrase`, `source`. No key is included.
Image generation is measured separately through `imageGenerationMs`, `imageCached` and `imageError`. A pending preview does not extend Jev edit-to-paint timing or block later edits.

Record at least six successful real rows, show the first observed request separately, and report model, browser, sample count, provider duration, request duration, and approximate final-transcript-to-paint. Failed rows have no paint value.
