# Real Jev live results

## Baseline before adapter corrections

Run date: 2026-11-14T00:21:02.215Z. Model: `jev-1.14.0`. Local Vite `127.0.0.1:5173`, Express `127.0.0.1:3001`. All requests used real Jev, no mocked provider. No microphone/audio was tested. The existing dev process was not restarted.

The original checker stopped because the shared demo grew from four to six turns but the checker still appended a second Ada edit. That test-only stale assumption was corrected with approval. Its rerun completed the six-step demo successfully and recorded 16/22 catalog turns passing, 6 failing. A separate HTTP diagnostic below records independent real requests, including Undo as its sixth initial turn: 21/28 strict-state passes, 7 failures. Example 14's two occasion-only differences were subsequently accepted as valid Birthday inference, leaving five actual defects in that diagnostic.

### HTTP per-turn baseline

HTTP total includes local request/response and server work. Provider time is measured by the server around the upstream call. The first observed request is listed separately, not claimed cold. All statuses were HTTP 200; there were no upstream transport errors.

| First observed request | Expected / actual | Provider ms | Total HTTP ms | Result |
|---|---|---:|---:|---|
| Initial 1, I want a cake. | $42 / $42 | 83 | 105 | PASS |

| Turn | Expected / actual | Provider ms | Total HTTP ms | Result / wrong fields |
|---|---|---:|---:|---|
| initial.2 | $48 / $48 | 65 | 68 | PASS |
| initial.3 | $58 / $58 | 92 | 95 | PASS |
| initial.4 | $58 / $58 | 102 | 106 | PASS |
| initial.5 | $58 / $58 | 75 | 79 | PASS |
| initial.6 | $58 / $58 | 179 | 182 | PASS |
| 01.1 | $44 / $44 | 85 | 88 | PASS |
| 01.2 | $51 / $51 | 72 | 76 | PASS |
| 02.1 | $58 / $58 | 132 | 138 | PASS |
| 03.1 | $56 / $56 | 127 | 135 | PASS |
| 03.2 | $56 / $56 | 97 | 101 | PASS |
| 04.1 | $55 / $52 | 144 | 150 | FAIL; candles: {"style":"plain","number":null} → {"style":"none","number":null} |
| 05.1 | $56 / $56 | 104 | 108 | PASS |
| 05.2 | $61 / $61 | 161 | 164 | PASS |
| 06.1 | $60 / $60 | 126 | 129 | PASS |
| 06.2 | $60 / $60 | 92 | 96 | PASS |
| 07.1 | $56 / $56 | 67 | 70 | PASS |
| 08.1 | $56 / $56 | 114 | 119 | PASS |
| 09.1 | $63 / $63 | 112 | 116 | FAIL; customTopper: null → "Jensen Huang" |
| 10.1 | $66 / $63 | 108 | 113 | FAIL; candles: {"style":"plain","number":null} → {"style":"none","number":null} |
| 11.1 | $59 / $59 | 98 | 103 | PASS |
| 11.2 | $57 / $57 | 93 | 96 | PASS |
| 12.1 | $44 / $44 | 368 | 372 | FAIL; customTopper: "my cat Miso" → null |
| 12.2 | $49 / $49 | 108 | 111 | PASS |
| 13.1 | $63 / $63 | 101 | 105 | PASS |
| 13.2 | $65 / $65 | 138 | 142 | FAIL; customTopper: null → "Mario" |
| 14.1 | $52 / $52 | 153 | 157 | FAIL; occasion: null → "Birthday" |
| 14.2 | $56 / $56 | 123 | 126 | FAIL; occasion: null → "Birthday" |

| Baseline sample | n | Median ms | p90 ms | Max ms |
|---|---:|---:|---:|---:|
| Provider | 28 | 106 | 161 | 368 |
| Total HTTP | 28 | 110 | 164 | 372 |

p90 uses nearest rank. Summary includes the separately listed first request.

### Observed defects, reported before code changes

- Examples 04 and 10 omitted explicitly requested plain candles, reducing totals by $3.
- Example 09 sometimes added a duplicate unpriced `Jensen Huang` custom topper despite selecting the supported theme. Example 13 follow-up added `Mario` as a custom topper despite selecting the supported theme. Both incorrectly required a quote.
- Example 12 failed to retain `my cat Miso`, so the custom placeholder/quote was missing.
- Irrelevant clarification notes appeared for untouched fields, including tiers, theme, base, and ganache.
- Example 14 inferred the free Birthday occasion from “Happy birthday” icing; the orchestrator approved that inference, so its old null-occasion expectation will be corrected.

### Real browser UI baseline

Headless desktop Chrome in a fresh profile, isolated CDP port 9334, driven through `agent-browser`. Six requests were typed and submitted through the real composer, with local fixture replay off. Chrome was stopped after testing. The existing dev server remained running.

| UI turn | Expected / actual | Provider ms | Browser request ms | Typed-submit → approximate paint ms | Result |
|---|---|---:|---:|---:|---|
| 1 (first observed): I want a cake. | $42 / $42 | 118 ms | 124 ms | 165 ms | PASS |
| 2: Make it two layers. | $48 / $48 | 167 ms | 171 ms | 189 ms | PASS |
| 3: Add a princess on top. | $58 / $58 | 81 ms | 84 ms | 105 ms | PASS |
| 4: Make it a birthday cake and write Eda on top. | $58 / $58 | 165 ms | 169 ms | 185 ms | PASS |
| 5: Change the name to Ada. | $58 / $58 | 66 ms | 69 ms | 99 ms | PASS |
| 6: Remove the princess. | $48 / $48 | 97 ms | 101 ms | 116 ms | PASS |

The first row was 118/124/165 ms (provider/request/approximate paint). UI displayed exact Eda → Ada, preserved layers and inscription after removing princess, and Undo restored princess and $58 without another model call. Turn 6 showed an unnecessary “clarify theme” notice. No UI errors were displayed. These typed-input timings are not final speech timings or last-audible-word latency. The column is the app's final-transcript-to-paint approximation, measured from typed submission in this run.

| UI sample | n | Median ms | p90 ms | Max ms |
|---|---:|---:|---:|---:|
| Provider | 6 | 108 | 167 | 167 |
| Browser request | 6 | 113 | 171 | 171 |
| Typed submit to approximate paint | 6 | 141 | 189 | 189 |

## Approved correction and rerun

Final real HTTP run: 2026-11-14T00:24:41.860Z. **28/28 turns passed** (six shared demo turns, then all fourteen catalog examples and eight follow-ups). All responses were HTTP 200 from `jev-1.14.0`. Every expected price, exact state field, topping set, custom request and quote flag matched. No clarification notices appeared. The real CLI checker also passed all six initial turns and 22 catalog turns (exit 0).

Changes: explicit plain-candle criteria; separate bounded custom-topper operation and exact-object-span questions; supported-name duplicate gating; bounded mentioned/unmentioned scope questions to keep unrelated uncertain decisions silent. No parser fallback was added. Example 14 now expects the approved free Birthday occasion. The first real CLI post-fix pass had one 546 ms provider outlier (example 02); the independent measured HTTP run below is a separate sample, not that CLI run.

### Post-fix per-turn HTTP results

First observed request (not proven cold):

| Turn | Expected / actual | Provider ms | Total HTTP ms | Status | Result |
|---|---|---:|---:|---:|---|
| initial.1 | $42 / $42 | 167 | 205 | 200 | PASS |

Remaining requests:

| Turn | Expected / actual | Provider ms | Total HTTP ms | Status | Result |
|---|---|---:|---:|---:|---|
| initial.2 | $48 / $48 | 80 | 85 | 200 | PASS |
| initial.3 | $58 / $58 | 184 | 189 | 200 | PASS |
| initial.4 | $58 / $58 | 134 | 139 | 200 | PASS |
| initial.5 | $58 / $58 | 70 | 75 | 200 | PASS |
| initial.6 | $48 / $48 | 79 | 84 | 200 | PASS |
| 01.1 | $44 / $44 | 93 | 96 | 200 | PASS |
| 01.2 | $51 / $51 | 123 | 126 | 200 | PASS |
| 02.1 | $58 / $58 | 125 | 129 | 200 | PASS |
| 03.1 | $56 / $56 | 389 | 394 | 200 | PASS |
| 03.2 | $56 / $56 | 95 | 99 | 200 | PASS |
| 04.1 | $55 / $55 | 112 | 119 | 200 | PASS |
| 05.1 | $56 / $56 | 102 | 110 | 200 | PASS |
| 05.2 | $61 / $61 | 144 | 188 | 200 | PASS |
| 06.1 | $60 / $60 | 132 | 136 | 200 | PASS |
| 06.2 | $60 / $60 | 109 | 117 | 200 | PASS |
| 07.1 | $56 / $56 | 123 | 127 | 200 | PASS |
| 08.1 | $56 / $56 | 138 | 142 | 200 | PASS |
| 09.1 | $63 / $63 | 109 | 113 | 200 | PASS |
| 10.1 | $66 / $66 | 110 | 114 | 200 | PASS |
| 11.1 | $59 / $59 | 115 | 119 | 200 | PASS |
| 11.2 | $57 / $57 | 173 | 179 | 200 | PASS |
| 12.1 | $44 / $44 | 118 | 122 | 200 | PASS |
| 12.2 | $49 / $49 | 99 | 111 | 200 | PASS |
| 13.1 | $63 / $63 | 131 | 144 | 200 | PASS |
| 13.2 | $65 / $65 | 140 | 143 | 200 | PASS |
| 14.1 | $52 / $52 | 115 | 120 | 200 | PASS |
| 14.2 | $56 / $56 | 130 | 133 | 200 | PASS |

All wrong-field lists were empty. Example 12 retained exactly `my cat Miso` and required a quote; its removal follow-up cleared only that custom topper. Jensen Huang and Mario did not create unpriced duplicates. Examples 04/10 included plain candles at $55/$66.

| Post-fix sample | n | Median ms | p90 ms | Max ms |
|---|---:|---:|---:|---:|
| Provider | 28 | 120 | 173 | 389 |
| Total HTTP | 28 | 124 | 189 | 394 |

Nearest-rank p90, first request included in summary. These are measured request durations, not audio latency.

### Post-fix browser UI and exact Undo sequence

Fresh isolated headless Chrome/CDP 9334, local fixture replay off. Typed turns 1–5 gave chocolate $42, two layers $48, princess $58, Birthday/Eda $58, Ada $58. **Clicked Undo immediately after Ada, before removing princess: exact Eda/$58 restored with two layers and princess intact.** Undo made no new request, so there remained five timing rows. Then typed “Remove the princess”: Eda and layers stayed, only princess disappeared, estimate $48. All six real request rows had no errors or clarification notices. Chrome was stopped after the check. No manual restart of the dev server occurred.

| UI request | Provider ms | Browser request ms | Typed submit → approximate paint ms |
|---|---:|---:|---:|
| 1 (first observed) | 205 ms | 213 ms | 243 ms |
| 2 | 158 ms | 161 ms | 173 ms |
| 3 | 96 ms | 99 ms | 107 ms |
| 4 | 116 ms | 120 ms | 132 ms |
| 5 | 86 ms | 89 ms | 99 ms |
| 6 (remove, after Undo) | 149 ms | 154 ms | 165 ms |

The app labels the last column final-transcript-to-paint. This run used typed submission, not speech, so no final speech transcript or last audible word was measured. Double animation frames approximate paint.

| Post-fix UI sample | n | Median ms | p90 ms | Max ms |
|---|---:|---:|---:|---:|
| Provider | 6 | 133 | 205 | 205 |
| Browser request | 6 | 137 | 213 | 213 |
| Typed submit to approximate paint | 6 | 149 | 243 | 243 |

### Regression evidence

Captured pre-fix real choices included generic candles → clarify (confidence 0.41), Jensen Huang custom span (0.46), Mario custom span (0.51), Miso wrapper span (0.42), and custom-removal operation (0.26). Regression fixtures cover supported-name duplicate rejection, silent unmentioned-field ambiguity, explicit plain candles, exact Miso quoting/removal, and the prior punctuation and candle-ambiguity bugs. Automated tests remain fixtures; the real runs above independently exercised the provider and browser path.

Microphone permission, actual audio recognition quality, and audio-derived latency remain untested.

## Prepared topper library, real Jev validation

Final run date: 2026-11-14T00:30:48.466Z. Shared catalog: 41 prepared toppers at $10 each, ordered unique state list with at most two. Jev receives shared descriptions in bounded incoming first/second/third choices (third detects overflow), outgoing first/second choices, operation, no-match and clarification choices. Existing named theme kits remain separate. Operation instructions also include catalog identities because Jev evaluates each question independently.

**13/13 final real scenarios passed**, all HTTP 200 from `jev-1.14.0`. The original six-step demo plus all 22 original catalog turns passed again after the final adapter change. Automated tests: 82/82 passing; integrated TypeScript check passing.

Earlier validation found correct unicorn/rocket additions whose independent existence answer stayed false, hiding the cake/$0. Composing the validated positive edit into `exists=true` fixed that. The extra third incoming slot prevents silently truncating three new requested toppers; both three new toppers and adding a third alongside a layer edit reject the entire turn. Another validation exposed an operation question without catalog context, which made unicorn appear ambiguous; giving that independent question the shared catalog identities fixed it. These corrections have regression tests. No transcript keyword parser or fake provider fallback was added.

The first observed request is separately identified, not claimed cold. Total HTTP time includes the local route and response parsing.

| Scenario | Expected / actual | Toppers or exact custom request | Provider ms | Total HTTP ms | Result |
|---|---|---|---:|---:|---|
| castle (first observed) | $52 / $52 | castle | 184 | 216 | PASS |
| unicorn | $52 / $52 | unicorn | 128 | 132 | PASS |
| knight-beside-princess | $68 / $68 | princess, knight | 139 | 143 | PASS |
| replace-only-castle | $62 / $62 | princess, dragon | 125 | 129 | PASS |
| remove-only-castle | $52 / $52 | unicorn | 129 | 133 | PASS |
| spaceship-synonym | $52 / $52 | rocket | 110 | 112 | PASS |
| grandma-custom | $42 / $42 | my grandma's face | 138 | 140 | PASS |
| generic-character | $42 / $42 | none | 147 | 149 | PASS |
| generic-figure | $52 / $52 | castle | 147 | 150 | PASS |
| two-new-toppers | $62 / $62 | castle, unicorn | 116 | 119 | PASS |
| two-removals | $42 / $42 | none | 176 | 179 | PASS |
| third-topper-limit | $62 / $62 | castle, princess | 181 | 184 | PASS |
| three-new-topper-limit | $42 / $42 | none | 118 | 122 | PASS |

Grandma's face retained exactly `my grandma's face` and requires a quote, known subtotal $42. Knight addition retained princess and inscription; castle replacement retained princess; castle removal retained unicorn. Generic character/figure returned “Which topper would you like? Try a castle, unicorn, or knight.” without changing the cake. Both overflow cases preserved the entire old design and returned “Up to two toppers in this demo”. Two independent additions/removals worked together. All wrong-field lists were empty. Only the intended clarification/limit cases returned notes; no upstream errors occurred.

| Topper sample | n | Median ms | p90 ms | Max ms |
|---|---:|---:|---:|---:|
| Provider | 13 | 138 | 181 | 184 |
| Total HTTP | 13 | 140 | 184 | 216 |

Run with the configured local server: `npx tsx scripts/check-live-toppers.ts`. Optional `TOPPER_RESULTS_PATH` writes per-turn JSON. These are API measurements, not microphone or browser-paint measurements. The prior browser timing tables remain measurements of the pre-library UI milestone.


## Unmentioned-topper notice regression

Reproduced the exact live phrase “I want a three-layer chocolate cake with gold stars.” before the correction: correct $58 design, but an irrelevant “Please clarify topper operation” note. Updated the bounded topper-relevance question to explicitly exclude loose toppings, layers, icing and other non-topper edits, and gated prepared-topper operations and generic prompts on that answer. A resolved custom-only portrait also no longer produces a competing prepared-topper warning. No text parser fallback was added.

Verified the same phrase after the fix through both real API and isolated Chrome composer: Chocolate, 3 layers, Gold stars, $58, no toppers, no notices, no errors. Screenshot: [fixed three-layer chocolate cake](screenshots/three-layer-chocolate-no-topper-notice.png). The isolated browser was stopped afterwards. A shell-interpolation error in the initial browser wait caused a timeout; subsequent direct DOM inspection confirmed the correct state and no notice.

Final real reruns:

| Suite | Passing turns | All notices | Topper notices | Unexpected notices |
|---|---:|---:|---:|---:|
| Original six-step demo | 6/6 | 0 | 0 | 0 |
| All fourteen examples and follow-ups | 22/22 | 0 | 0 | 0 |
| Prepared topper library | 13/13 | 4 | 4 intended | 0 |

The four library notices are the two required generic-character/figure clarifications and two required two-topper-limit notes. Additional non-topper probes all had zero topper notices; one independent “Add birthday candles” probe emitted an unrelated candle-number clarification despite correctly adding plain candles, reported separately for triage. Automated exact-phrase/non-topper/custom-only regressions pass: 84/84 total tests. TypeScript and production build pass. The live original checker now explicitly asserts zero topper notices and prints notice counts.

## Plain-candle clarification follow-up

The candle-number issue above is now fixed. Plain candles and candle removal make the numeral question inapplicable, regardless of a speculative low-confidence numeral answer. The bounded numeral-relevance question explicitly excludes generic birthday candles, layers, calendar years and inscription-only numbers. Explicitly ambiguous numeric candle requests still clarify and preserve the confirmed number.

An intermediate live rerun exposed another candidate ambiguity: `40th` and `40` were competing exact-span choices for the same numeric value, splitting confidence and omitting required number candles. Candidate construction now groups equivalent numeric values into one bounded option before Jev classifies their purpose. This is numeric normalization, not interpretation of transcript meaning. The final real 40/41 birthday examples pass.

Final validation after these changes:

| Real request or suite | Passing | Total notices | Unexpected notices |
|---|---:|---:|---:|
| `Add birthday candles.` | 1/1 | 0 | 0 |
| `Add candles` | 1/1 | 0 | 0 |
| Original six-step demo | 6/6 | 0 | 0 |
| Fourteen examples and follow-ups | 22/22 | 0 | 0 |
| Prepared topper library | 13/13 | 4 intended | 0 |

Both plain-candle probes returned `{style:"plain",number:null}`, preserved princess and exact `Eda` inscription, and showed $55. The four library notes remain exactly two generic-figure clarifications and two two-topper-limit notes. No new topper notices occurred in the originals. All 87 automated tests pass, including both plain phrases, unmentioned versus genuinely ambiguous numbers, and equivalent numeric candidate grouping. TypeScript and production build pass.

## Appearance, occasions and plain-candle quantities

These runs use the expanded shared contract: palette colors, per-topper style, writing style, `{request,assetId}` custom topper, bounded occasion IDs, and plain candle counts (1–12, default 5). Appearance and occasion labels are free. Prepared theme kits remain independent.

All **57/57 final real Jev turns passed** with zero unexpected notices:

| Suite | Passing turns | Total notices |
|---|---:|---:|
| Original demo plus fourteen examples/follow-ups | 28/28 | 0 |
| Prepared topper library | 13/13 | 4 intended |
| Appearance | 6/6 | 0 |
| Occasions | 4/4 | 0 |
| Candle counts versus numerals | 6/6 | 0 |

Appearance checks started with castle + princess + exact `Eda` inscription, $62. Every test compared the whole state, ensuring the other topper, text, ingredients and price stayed unchanged:

| Phrase | Exact change |
|---|---|
| make the icing pink | frosting `blush-pink`, not inscription `pink` |
| write it in gold | inscription color `gold`, existing text preserved |
| make the castle bigger | castle size `large`, princess unchanged |
| put the princess on the left | princess position `left`, castle unchanged |
| write Eda in capitals | literal text `Eda`, letterCase `upper` |
| make the filling lavender | filling `lavender`, frosting unchanged |

Occasion checks preserved the existing tennis kit, `Eda` inscription and lavender filling: wedding, promotion, graduation plus explicitly requested graduation-cap topper, anniversary. Context-only “it's for my promotion” is an edit; no cake keyword is required. An occasion alone does not add decorations.

| Candle phrase | Result |
|---|---|
| 3 candles | plain, count 3 |
| three candles | plain, count 3 |
| a 3 candle | numeral `3`, no plain count |
| make it 6 candles (from three) | plain, count 6 |
| it's my 30th, add a number candle | birthday, numeral `30` |
| add birthday candles | plain, default count 5 |

The candle distinction is a bounded Jev numeric-role choice, not a transcript rule parser. Digit/word/ordinal normalization happens only after Jev selects the numeric purpose/value. Discovery now includes a bare numeric token from punctuation-bearing spans (`30th,` → exact substring `30th`) while retaining the original punctuation-bearing candidates for literal inscriptions.

Intermediate real checks exposed and fixed literal `pink` replacing existing icing text, low-confidence redundant target relevance blocking princess positioning, promotion being treated as unrelated context, graduation-cap context suppressing the event, and ordinal punctuation hiding the age candidate. Regression fixtures cover these scenarios. Latest integrated rerun: 118/118 tests pass. TypeScript and production build pass after the renderer fixtures were updated for required `candles.count` (47 modules, JavaScript 308.93 KB, gzip 96.44 KB).

### Image-generation status

The asynchronous cached image service and client lifecycle are implemented and validated with exactly two real paid generations on low-cost `black-forest-labs/flux-3-image-klein` at resolution `768` (published $0.008/output image; actual `usage.cost` matched). An earlier attempt on the initially approved OpenAI model returned HTTP 402 (insufficient credits) in 190.5 ms with no image and no retry.

| UI request | Exact custom request | imageGenerationMs | Actual cost (usage) | Cached | assetId |
|---|---|---:|---:|---|---|
| add a topper of a racing pigeon | a racing pigeon | 6649.8 | $0.008 | no | `6f5f1864…e4bb67` |
| add my grandma's face | my grandma's face | 5879.0 | $0.008 | no | `cb3fcfd7…67fdfe1` |
| repeat: a racing pigeon | a racing pigeon | 0 | $0.000 | **yes** | same pigeon assetId |

Total actual image spend: **$0.016**. Both generations ran through the real browser UI: plaque appeared immediately (about 0.8 s), then swapped to the generated image when ready (7.5 s / 5.9 s). Jev edit timing stayed independent (216 ms / 236 ms; typed-submit→approximate-paint 250 ms / 282 ms). The timing table records image generation in its own column. The exact repeat request proved the free disk cache: `cached:true`, `costUsd:0`, HTTP 24.6 ms.

Generated PNGs (transparent 256×320, anchor (128,306)):

- `.cache/toppers/6f5f18649b72277be362f5e2d076b029bbde46ed5c6166aaf38e415808e4bb67.png` (76,646 bytes) — fondant racing pigeon; retains a cream fondant base and a small light ground wedge bottom-right.
- `.cache/toppers/cb3fcfd70f9a99f78ceb44030bad006476ca5a00d39c836f72ff5d34a67fdfe1.png` (77,652 bytes) — generic non-identifiable elderly-woman fondant figurine (no real-person likeness), clean cutout.

UI evidence: [pigeon plaque](screenshots/racing-pigeon-plaque.png), [pigeon generated](screenshots/racing-pigeon-generated.png), [grandma figurine](screenshots/grandma-generic-figurine.png). Reset-during-generation behavior is covered by mocked tests only, per instruction. See `docs/topper-images.md`.
