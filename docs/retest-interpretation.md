# Fresh interpretation/backend retest

Date: 2026-11-14. This section records the testing-only checkpoint, before subsequent fixes. For the later offline-verified fixes, see [interpretation fixes and remaining limitations](interpretation-fixes.md). The failed real-provider cases below remain the latest live evidence.

## Outcome

- **Real Jev regression: 57/57 pass.**
- **Additional Jev checks: 19/19 pass** (15 new paraphrases, the reported three-layer regression, and three rich-state removal checks).
- **Existing mocked fallback tests: 13/13 pass.**
- **New default-configuration fallback generalization: 0/2 semantic passes.** Autumn harvest returned no change; midnight masquerade added an unrelated snowman and occasion.
- **New mocked fallback clear/reset checks: 2/8 pass, 6 fail.** Explicit removal lists and an ordinary color change work; empty full-list clears and null-based color/style resets are silently dropped, ending in a no-change error.

Passing tuned examples does not establish reliable generalization for the fallback. The two fresh, previously untested requests failed even though their requested preservation constraints were respected.

## Isolation, budget and method

Production source was exercised without fixes. Existing UI/API processes were reused for the two default-config requests. Regression HTTP checks used a separate instance of the unchanged backend on `127.0.0.1:3002`, started with `OPENROUTER_API_KEY=''`; dotenv does not override that empty value. Thus fallback and images were disabled in that instance. Its health endpoint reported `imageConfigured:false` and `fallbackAttempts:0` before and after testing.

The original/catalog checker calls the actual `interpret` adapter directly with the same empty OpenRouter environment. The four other existing checkers were run unchanged through an external preload that redirected their hard-coded port 3001 to 3002. It also blocked accidental client-side OpenRouter/image requests. All upstream Jev calls were real, using `jev-1.14.0`.

The real default-config fallback probes used **exactly two interpretation requests**, with no retries. Shared-server health counter changed **4 → 6**, matching **two fallback attempts**. These consume the remaining two attempts under the prior 8-of-10 budget. **No further paid text calls are authorized by this run. No image-generation POSTs were made.** A custom-topper interpretation is not image generation; API-only checks do not start the client image lifecycle.

Known reported new text cost: **$0.00039844** for the successful-but-irrelevant midnight response. Autumn returned a fallback 422, whose API metadata omits usage/cost, so **total billed cost cannot be established from these responses**. It must not be reported as zero or as only the known successful-call cost. Jev responses likewise expose no billing data.

Expectations for new cases were set before sending requests, based on the requested semantics and existing CakePatch contract. Existing validators compared actual states/prices against the repository's supplied examples. New deterministic Jev cases compared every CakeState field against the explicitly requested patch, not merely the changed field. Order was not relaxed in those additional checks.

## Existing standard flow and catalog (28/28)

Command: `OPENROUTER_API_KEY='' node --import tsx --import /tmp/cake-retest-guard.mjs scripts/check-live-jev.ts`.

All 28 requests passed the checker's assertions; all notices were empty. The six initial turns check their expected prices plus final name/layers/toppers. Catalog turns compare full state and price, with the existing exact-customer-span exception for “my cat Miso.” No audio or browser painting was measured.

| Case | Input | Expected/actual price | Jev ms | Result |
|---|---|---:|---:|---|
| Flow 1 | I want a cake. | $42 | 281 | PASS |
| Flow 2 | Make it two layers. | $48 | 183 | PASS |
| Flow 3 | Add a princess on top. | $58 | 186 | PASS |
| Flow 4 | Make it a birthday cake and write Eda on top. | $58 | 194 | PASS |
| Flow 5 | Change the name to Ada. | $58 | 174 | PASS |
| Flow 6 | Remove the princess. | $48 | 251 | PASS |
| 01.1 | I want a classic cheesecake. | $44 | 181 | PASS |
| 01.2 | Add strawberries and write Eda on top. | $51 | 189 | PASS |
| 02.1 | Make me a two-layer chocolate birthday cake with a princess on top. Write Eda on it. | $58 | 201 | PASS |
| 03.1 | It’s my 40th birthday. Make it a two-layer vanilla cake with a 40 candle and strawberries. | $56 | 167 | PASS |
| 03.2 | Actually, make it 41. | $56 | 177 | PASS |
| 04.1 | I have a New Year’s birthday. Give me a two-layer chocolate cake with gold stars and candles. Write Happy New Year, Eda. | $55 | 193 | PASS |
| 05.1 | Give me a two-layer vanilla Mario cake. | $56 | 166 | PASS |
| 05.2 | Add a 7 candle. | $61 | 168 | PASS |
| 06.1 | I want a two-layer chocolate Formula One cake. | $60 | 176 | PASS |
| 06.2 | Write Eda on it. | $60 | 153 | PASS |
| 07.1 | Make a two-layer vanilla World Cup cake for Spain. | $56 | 157 | PASS |
| 08.1 | Make a two-layer lemon tennis cake and write Game, Set, Match. | $56 | 167 | PASS |
| 09.1 | I want a two-layer chocolate Jensen Huang cake. | $63 | 165 | PASS |
| 10.1 | Give me a three-layer red velvet cake with raspberries and birthday candles. Write Happy Birthday, Mira. | $66 | 180 | PASS |
| 11.1 | I want a two-layer chocolate cake with caramel drizzle and strawberries. | $59 | 168 | PASS |
| 11.2 | Take the strawberries off and add ganache. | $57 | 183 | PASS |
| 12.1 | Make a two-layer vanilla birthday cake with a topper shaped like my cat Miso. | $44, custom quote | 181 | PASS |
| 12.2 | Actually remove the cat and put a 30 candle there. | $49 | 206 | PASS |
| 13.1 | Make a two-layer chocolate cake with a princess topper and a 6 candle. | $63 | 166 | PASS |
| 13.2 | Swap the princess for Mario and write Luca. | $65 | 176 | PASS |
| 14.1 | Make me a lemon cake with strawberries and a number 21 candle. Write Happy birthday, Selin. | $52 | 186 | PASS |
| 14.2 | Actually, make it a cheesecake, keep everything else. | $56 | 164 | PASS |

## Prepared toppers (13/13)

Existing `scripts/check-live-toppers.ts`, unchanged, against isolated HTTP backend. Full state and prices matched. Four notices were intentional, two generic-topper prompts and two max-two-topper limits. No other notices.

| Input | Verified outcome | Jev / HTTP ms | Result |
|---|---|---:|---|
| Add a castle. | Castle, $52 | 223 / 258 | PASS |
| Add a unicorn. | Unicorn, $52 | 213 / 220 | PASS |
| Put a knight next to the princess. | Both, Eda preserved, $68 | 185 / 194 | PASS |
| Swap the castle for a dragon. | Princess preserved, dragon replaces castle, $62 | 199 / 205 | PASS |
| Remove the castle. | Unicorn/Eda preserved, $52 | 149 / 153 | PASS |
| Add a spaceship. | Catalog rocket, $52 | 155 / 159 | PASS |
| Add my grandma's face. | Custom request + quote, $42 known subtotal; no image call | 159 / 164 | PASS |
| Add a character. | No change, which-topper notice, $42 | 172 / 178 | PASS |
| Put a figure on top. | Existing castle preserved, which-topper notice, $52 | 157 / 165 | PASS |
| Add a castle and a unicorn. | Both, $62 | 163 / 170 | PASS |
| Remove the castle and the unicorn. | Both removed, $42 | 200 / 207 | PASS |
| Make it two layers and add a unicorn. | At two-topper limit, entire edit rejected, $62 unchanged | 157 / 162 | PASS |
| Add a castle, a unicorn, and a princess. | Entire edit rejected, $42 unchanged | 170 / 175 | PASS |

## Appearance, occasions, candles (16/16)

Existing `scripts/check-live-appearance.ts`, `scripts/check-live-occasions.ts`, and `scripts/check-live-candles.ts`, unchanged, against isolated HTTP backend. All states/prices matched and all notices were empty. Appearance cases preserve castle/princess/Eda and $62. Occasion cases preserve tennis/Eda/lavender filling unless the supplied example explicitly adds the graduation cap. Candle cases preserve the two prepared toppers and writing.

| Input | Verified change | Jev / HTTP ms | Result |
|---|---|---:|---|
| make the icing pink | Frosting blush-pink only | 155 / 177 | PASS |
| write it in gold | Writing color gold only | 197 / 201 | PASS |
| make the castle bigger | Castle large only | 162 / 165 | PASS |
| put the princess on the left | Princess left only | 181 / 184 | PASS |
| write Eda in capitals | Uppercase style only, literal Eda preserved | 149 / 153 | PASS |
| make the filling lavender | Filling lavender only | 153 / 157 | PASS |
| make it a wedding cake | Occasion wedding only | 157 / 180 | PASS |
| it's for my promotion | Occasion promotion only | 190 / 194 | PASS |
| graduation cake with a cap | Graduation + catalog graduation-cap | 164 / 168 | PASS |
| change it to an anniversary cake | Occasion anniversary only | 155 / 159 | PASS |
| 3 candles | Plain count 3 | 167 / 196 | PASS |
| three candles | Plain count 3 | 171 / 177 | PASS |
| a 3 candle | Numeral 3 | 178 / 182 | PASS |
| make it 6 candles | Plain count 6, replacing 3 | 177 / 182 | PASS |
| it's my 30th, add a number candle | Birthday + numeral 30 | 276 / 281 | PASS |
| add birthday candles | Plain default count 5, no number prompt | 147 / 151 | PASS |

HTTP timings above are observed request-to-response times from the wrapper, not browser paint times; rounding and small wrapper overhead differ slightly from checkers' own HTTP fields. Original direct-adapter checker has no HTTP timing.

## Additional Jev generalization and preservation (19/19)

These were real API requests to isolated port 3002, with fallback disabled. All returned HTTP 200, correct action, exact expected state, correct price and no notices. Undo/reset cases check returned control actions only, not browser history execution.

| Input | Initial state / expected and actual outcome | Jev / HTTP ms | Result |
|---|---|---:|---|
| Keep the castle, replace only the unicorn with a dragon. | Castle+unicorn/Eda → castle+dragon/Eda | 303 / 325 | PASS |
| No strawberries please; keep the raspberries and caramel. | All three toppings → raspberries+caramel only | 163 / 168 | PASS |
| Leave Eda as the name, but make the writing gold and uppercase. | Eda preserved; writing gold + uppercase | 192 / 196 | PASS |
| Make it vanilla with three layers and a rocket on top. | Default cake → vanilla/3 layers/rocket | 182 / 186 | PASS |
| Actually, two layers, lemon sponge, and no candles. | 3 layers/numeral40 → lemon/2 layers/no candles | 159 / 165 | PASS |
| Swap the number 40 candle for six ordinary candles. | Numeral40 → plain count6, number cleared | 174 / 180 | PASS |
| Replace the six candles with a number 40 candle. | Plain6 → numeral40, count cleared | 167 / 175 | PASS |
| Please take off both the castle and the dragon. | Both removed; Eda preserved | 298 / 302 | PASS |
| Clear the writing and remove the custom topper, leave the rest. | Eda + custom Miso + princess → writing/custom cleared, princess kept | 199 / 203 | PASS |
| This is for a retirement, not a birthday. | Birthday → retirement only | 163 / 166 | PASS |
| Make the castle small and red, and move the princess to the right. | Castle small/red, princess right, Eda kept | 202 / 206 | PASS |
| Change only the filling to mint green; keep the icing white. | White frosting/lavender filling → white/mint | 241 / 244 | PASS |
| Take off the tennis theme but keep the princess. | Theme cleared, princess kept | 218 / 224 | PASS |
| Instead of a cake, undo my last change. | Action undo, empty patch | 190 / 194 | PASS |
| Start over with an empty design. | Action reset, empty patch | 189 / 192 | PASS |
| I want a three-layer chocolate cake with gold stars. | Chocolate/3 layers/gold-stars, no spurious topper prompt | 153 / 156 | PASS |
| Please take off both the castle and the dragon. | Rich state below: only two toppers and their styles removed | 223 / 247 | PASS |
| Remove the castle. | Rich state: only castle and its style removed | 186 / 191 | PASS |
| No strawberries please; keep the raspberries and caramel. | Rich state: strawberry removed, caramel preserved; missing raspberry not added | 230 / 236 | PASS |

Rich-state removal inputs had tennis theme, anniversary occasion, 3-layer lemon sponge, castle+dragon, strawberries+caramel, Ada writing, navy frosting/lavender filling, large gold castle, numeral40 candles and a custom Miso topper with an existing asset id. Every unrelated field, including custom image identity, remained intact.

## Two fresh default-config fallback probes (0/2 semantic passes)

These requests went through the real default `/api/interpret` endpoint on port 3001 with both providers configured. Each used one Jev request followed by one fallback attempt. Model: `openai/gpt-4.1-nano`. They were not repetitions of the tuned fruity/fancy/winter examples.

### 1. Autumn harvest: FAIL, safe no-op

- **Exact input:** “Give it a cozy autumn harvest mood, without changing the writing or the number of layers.”
- **Initial:** chocolate sponge, 2 layers, Eda, no toppings/toppers/colors/occasion/theme.
- **Expected before request:** a meaningful autumn/harvest direction, such as warm colors and/or the available pumpkin, preserving Eda and layer count.
- **Actual:** no changed fields. Returned patch was `{"exists":true,"addToppings":[],"removeToppings":[]}`. Notice: “The backup interpreter found no change to make. Your design is unchanged.”
- HTTP 200 at the application boundary; `provider.interpreter:"jev"` plus `provider.fallback.status:422` records the unsuccessful backup attempt. Initial Jev **271.7ms**, fallback **1180.2ms**, total HTTP **1970.6ms**.
- **Preservation passed**, semantic task failed. Price remained **$48**. **Cost not reported on failed fallback metadata.**

### 2. Midnight masquerade: FAIL, irrelevant edit

- **Exact input:** “Make the whole thing feel like a midnight masquerade, keeping the name and sponge as they are.”
- **Initial:** lemon sponge, 3 layers, Ada, no toppings/toppers/colors/occasion/theme.
- **Expected before request:** a meaningful midnight/masquerade direction, such as dark colors or a regal decoration, preserving Ada, base/flavor and layers.
- **Actual patch:** `{"occasion":"just-because","addToppers":["snowman"]}`. No color changes. No notices.
- HTTP 200; `provider.interpreter:"fallback"`, backup status 200. Initial Jev **200.4ms**, fallback **731.9ms**, total HTTP **1371.4ms**. Reported cost **$0.00039844**.
- **Preservation passed**, semantic task failed: neither the snowman nor unsolicited just-because occasion addresses masquerade. Price increased from **$52 to $62** for an irrelevant catalog topper. No image request was involved.

These are useful counterexamples to broad fallback-success claims. The backup's JSON validity and bounded catalog compliance do not establish semantic correctness. No prompt changes or re-tests were made after seeing these failures.

## Free fallback failure and sanitizer checks

`node --import tsx --test tests/fallback.test.ts` passed **13/13**. Existing coverage includes same-validator application, successful-Jev no-fallback, intentional clarifications, invalid-patch502, mocked timeout504, no-change422, catalog remap, stripping model-supplied assetId, missing-key passthrough, trigger rules, notice classification, schema contract and queue timing.

These tests use mocked fetch, not paid calls. Their timeout test injects an AbortError; it does not wait twenty seconds or prove every streaming/body-read timeout path. Existing tests do not establish real-provider semantic generalization.

### Reproduced empty-list/null reset defect (6 failures, 2 passing controls)

An external test harness imported the actual `runFallback`, replaced `globalThis.fetch` with a response constructor (no network), and supplied model JSON through the normal parse → sanitize → validate → apply path. The expected state was computed using the existing public `applyCakePatch(before, modelPatch)` contract independently of fallback sanitization. For each case the same richly configured cake was reset before execution.

Initial rich state: lemon/3 layers, anniversary, tennis, Ada; strawberries+caramel; castle+princess; navy frosting, lavender filling, gold writing, white accents; castle large/left/gold, princess medium/right/white; numeral40 candles; existing Miso custom asset.

| Model JSON patch | Expected from existing CakePatch contract | Actual runFallback result | Result |
|---|---|---|---|
| `{"toppings":[]}` | Clear strawberries+caramel only | 422 no change, toppings retained | FAIL |
| `{"toppers":[]}` | Clear prepared toppers and their styles only | 422 no change, toppers/styles retained | FAIL |
| `{"toppings":[],"toppers":[]}` | Clear both lists and removed-topper styles | 422 no change, both lists retained | FAIL |
| `{"removeToppings":["strawberries","caramel"],"removeToppers":["castle","princess"]}` | Same full removal, preserve unrelated state | Lists cleared; unrelated rich state preserved | PASS |
| `{"colors":{"frosting":null}}` | Reset only frosting to default | 422 no change, navy retained | FAIL / representation gap |
| `{"topperStyles":{"castle":{"tint":null}}}` | Reset only castle tint | 422 no change, gold retained | FAIL / representation gap |
| `{"topperStyles":{"castle":null}}` | Reset castle appearance only | 422 no change, castle styles retained | FAIL / representation gap |
| `{"colors":{"frosting":"ivory"}}` | Change frosting only | Ivory; every unrelated field preserved | PASS |

Root cause observed without editing: `sanitizePatch` converts every empty array to undefined and every null to undefined recursively. The schema/prompt explicitly allow full-list replacements; `[]` is also a valid bounded full-list value, so dropping it loses meaningful removal. For null-based resets the fallback schema/prompt deliberately overload null as “unchanged,” so it cannot express the shared CakePatch reset semantics. The reset rows are a contract/representation limitation, not proof the model would spontaneously return these exact reset patches.

The harness omitted irrelevant null keys for brevity. `runFallback` validates the resulting CakePatch but does not independently enforce every required structured-output wrapper key. Adding the omitted null keys would leave sanitization identical.

## Evidence, reproducibility and gaps

Fresh evidence files for this run are in `/tmp/cake-retest-*` on the test machine: original suite log; per-request JSONL for topper/appearance/occasion/candle suites; novel/rich-state input/output JSON; two default-provider request/response JSON including health snapshots; mocked sanitizer JSON; mocked fallback TAP log. External harnesses were kept outside the repository. No secrets were printed or copied into this report.

- The five existing live scripts and existing fallback tests remain unchanged.
- Default live fallback behavior is **not** established by fallback-disabled regression passes. Only the two explicitly labeled live probes used the default dual-provider configuration.
- Fresh Jev latency range across the 76 requests was approximately **147–303ms**. These observations are not a cold-start guarantee, percentile SLA, or upper bound.
- No image-generation requests, physical microphone/audio capture, browser paint, permission flows, basket behavior or checkout were tested by this backend assignment.
- No live credit-error, live timeout, or deliberately malformed paid-provider output was induced. Such failures were exercised only where existing mocked tests cover them.
- Two fresh fallback samples are enough to disprove universal generalization, not enough to estimate a success rate for all phrases.
- No production fixes, prompt changes, commits or pushes were made.
