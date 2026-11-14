# Validation record

## Automated checks

The integrated app with occasions and candle counts passes `npm run typecheck`, `npm test` (**118/118**), and `npm run build` (47 modules). The shared appearance/core/acceptance/discovery/occasion/candle subset passes **63/63** tests, including all fourteen original example prices. Occasion tests cover all seventeen bounded labels, free label-only edits, saved-label migration, occasion-first discovery and contextual exclusions. Candle tests distinguish three plain candles from numeral three, exercise every count from 1–12 at a flat $3/set, partial field preservation, clearing incompatible fields, invalid atomic rejection, old saved-set migration and Undo. Voice regressions cover bounded occasion IDs and numeric-role decisions separating plain candle counts from numeral/age candles. These checks do not claim real image-provider generation or a browser image-completion walkthrough.

Appearance checks cover bounded colors and style choices, nested field preservation, exact writing under uppercase presentation, free appearance changes, style clearing on topper removal, custom preview identity and quote retention, normalized cache keys, asset-ready history hydration without an Undo step, stale-result rejection, asset-only basket fulfillment after builder reset, and migration of old saved custom strings/appearance defaults. Already saved image IDs never change.

Topper-library shared scope: core/acceptance tests cover all 41 options at $10, ordered pairs, precise removal, third-topper atomic rejection, Undo, snapshots, and legacy basket migration. All fourteen original example prices remain unchanged. Discoverability tests verify complete catalog/price derivation, contextual exclusions and deterministic topper rotation.

These checks are local and deterministic. They do not call Jev:

- All 14 requested examples and every listed follow-up, with the exact expected integer-cent prices from the brief.
- Four-turn chocolate → 2 layers → princess → Birthday/Eda flow; Ada correction, topper removal, Undo.
- Six-step opt-in local replay uses the same immutable reducer: Undo after Ada restores Eda/$58; Undo after removal restores the princess/Ada/$58.
- Independent edits, duplicate toppings, precise removal, decoration coexistence, and included inscription.
- Cheesecake layer enforcement and preserving fruit, candle number, and inscription on base changes.
- Immutable basket design and estimate snapshots, unpriced custom requests, validated storage reload, corrupt storage rejection, and recomputed stored prices.
- Immutable Undo history, reset, bounded model patches, and unsafe text kept as plain state text.
- Serialized rapid finalized turns, duplicate utterance protection, late-result rejection after reset, and actual error propagation.
- Span extraction and bounded decision normalization, including tiers and an unknown topper.
- Missing-key behavior returns a genuine local 503 instead of fixture success.
- The bounded provider-response fixture suite covers all 14 examples without claiming live model interpretation; independent acceptance assertions check expected attributes and quote flags.

A production-server smoke check on isolated loopback port 39143 passed: built app `/` returned 200, health returned 200 with `configured:false`, unknown API returned 404, and `/.env.local` returned 404. The temporary smoke server was stopped. An earlier smoke attempt on port 3002 reached a non-app response; the isolated-port rerun is the verified result.

## Browser acceptance

Discoverability was checked in an isolated headless desktop Chrome on loopback CDP port 9437, then the browser was stopped:

- Empty suggestions and collapsed disclosure appear by default. Clicking the chocolate suggestion ran real Jev and produced $42; clicking the layer suggestion produced two layers/$48.
- During a request, every suggestion and the disclosure control are disabled. Suggestions refresh with confirmed state.
- The disclosure shows seven groups and all 41 catalog toppers with shared prices. Keyboard Enter toggles it correctly.
- Desktop and 390px-wide layouts have no horizontal overflow. Discovery controls are absent in explicitly labeled fixture replay.
- Screenshots: [desktop](discoverability-desktop.png), [narrow](discoverability-narrow.png).

Two real typed-suggestion timing samples (not microphone measurements):

| Browser turn | Provider | Request | Final transcript → approximate paint |
| --- | ---: | ---: | ---: |
| First observed | 274 ms | 281 ms | 303 ms |
| Second | 203 ms | 213 ms | 234 ms |

The first observed request is not proof of a cold provider request. Paint uses a double animation-frame approximation. These two UI checks do not stand in for the complete voice acceptance checklist below.

## Pending real Jev and microphone checks

No TypeSafe key was supplied during the initial automated run. The following need a configured key and desktop Chrome microphone permission:

1. Set `TYPESAFE_API_KEY` in `.env.local`, restart `npm run dev`, open `http://127.0.0.1:5173`.
2. Speak all four demo turns from a fresh cake. Confirm $42 → $48 → $58 → $58 and the visible seam, princess, Birthday label and top inscription.
3. Type those same turns through the composer. Check a compound turn, “Change the name to Ada,” removal and Undo.
4. Speak two finalized turns quickly; confirm the second receives the first confirmed state. Reset during a request and confirm its late result does not recreate the cake.
5. Try “two tiers,” an unknown Miso topper, numeric ages versus a New Year's calendar year, and sponge → cheesecake with “keep everything else.”
6. Run all 14 example phrases and follow-ups from `docs/build-brief.md` through the **live typed composer**, not fixture replay. Compare designs and expected prices.
7. Add a fully decorated cake to the basket. Edit/reset the builder, reopen the basket, reload, change quantity and remove the cake. Confirm the saved thumbnail and original inscription stay exact.
8. Test microphone denial, Stop, natural recognition end, provider failure, and unsupported browser fallback.
9. Open Local demo tools and record several successful real edits. Separate the first observed request, provider duration, total request time and final-transcript-to-approximate-paint. No real latency numbers are claimed yet.

## Scope notes

- Local fixture replay is explicit, clearly labeled, and never a fallback for failed live commands.
- Basket storage is local to this browser; storage refusal is reported without losing the current visit's basket.
- Sample prices are not final quotes. Unpriced custom decorations remain unresolved in both preview and basket.
