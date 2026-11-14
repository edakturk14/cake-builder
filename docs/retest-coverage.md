# Fresh retest coverage audit

Audit date: 2026-11-14. Scope: current standard and unique features, compared with `build-brief.md`, `shared-contract.md`, README, application sources, and test bodies.

This agent first audited coverage, then independently reviewed the assigned fixes and reran regressions. The auditor made no implementation changes and no paid provider/image calls. The auditor's deliverable is this document; implementation owners changed their assigned files separately. The original failure record is preserved below as **pre-fix history**, not current unresolved-local status. Detailed original reports: [integration](retest-integration.md), [interpretation](retest-interpretation.md), and [browser](retest-browser.md).

## Current post-fix independent verification

**Current status: local fixes verified; live backup generalization and live provider-schema compatibility remain unverified.** The latest actual live backup semantic evidence is still the two pre-fix failures. Mocked regression success is not a new live success.

| Fix / check | Current evidence and result |
| --- | --- |
| Final integrated checks | Auditor ran `npm test`: **183/183 pass** after the frontend wall-clock deadline correction. `npm run typecheck`: pass. Coordinated non-overlapping `npm run build`: pass, **50 modules**, 694 ms Vite build |
| Generated-image delivery, original reproduction | Auditor started isolated production server with keys empty: all three original cached PNGs now return 200 `image/png` and exact file bytes, sizes 76,646 / 77,652 / 70,076. Invalid IDs, encoded traversal and global `.env`/`.git` paths remain 404. Server closed |
| Image server/lookup regressions | Auditor focused HTTP/image tests **9/9 pass** and lookup tests **2/2 pass**. Route-local dotfile exception follows strict 64-hex validation. Lookup shares generation identity but performs only reads/inflight inspection: no provider request, key read, generation or cache write |
| Pending saved-preview recovery | Cache-only `POST /api/topper-image/lookup` on mount/reload; ready fills only matching missing saved asset IDs. Missing cache does not generate. Shared normalized watchers, polling and explicit-generation deduplication reviewed; removal/unmount aborts and ignores late results. Existing saved asset IDs, exact request, quantity, other design fields and estimate stay unchanged |
| Hung lookup review finding | Auditor reproduced an initial missed deadline: never-resolving lookup stayed checking after a 4 ms configured bound. Owner corrected it with independent wall-clock timer, abort and per-attempt controller identity. Final suite includes timeout → free retry → old late-result ignored, with **zero generation calls** |
| Frontend focused checks | Initial focused recovery/timing suite **8/8 pass**; final suite has **9 tests**, including the added hung-lookup regression, all passing within the final 183-test run |
| Fallback list/null resets | Auditor focused fallback suite **53/53 pass**. All original empty-list/null reset reproductions are now covered on a rich design. New wire format separates `\"keep\"`, null reset and `[]` full replacement, validates required/enumerated fields, preserves literal writing `\"keep\"`, and applies shared composition validation |
| Arbitrary object safeguard | Prompt no longer anchors vague requests to a snowman. Guard rejects unsupported direct/remapped object/event additions; palette-only/gown/cloud regressions reject invented toppers while named objects, supported scenes, fruit and palette edits remain accepted. Conservative lexical support is not proof of arbitrary semantic accuracy |
| Backup disclosure and saved-image retry | Source reviewed: interpreter, backup duration and optional cost render from actual queue metadata even with no notices; absent cost remains unknown. Existing filled-image retry is a free GET and retains the saved asset ID. Missing saved preview generation requires explicit **“may incur cost”** action |
| Final browser local regressions | **PASS, reported by browser owner.** Original cached pigeon lookup/GET loads at opacity 1. Reload with two normalized duplicate pending requests makes **one lookup, zero paid-generation POSTs**, preserving quantities 3/1 and prices. Cache miss reload generates nothing; two explicit button clicks share one mocked generation. Missing filled asset gets a visible error and free GET retry preserving asset ID/quantity/price |
| Final backup display regression | Mock result with no notices visibly shows **Backup**, provider **175 ms**, backup **75 ms**, cost **$0.000400**, and truthful pending wording. These mocked numbers verify formatting/attribution, not real latency/cost |
| Final browser accessibility | Axe-core **4.12.1**, desktop 1440px and mobile 390px expanded catalog: **zero violations**. Recovered mobile basket also has zero violations. Manual-review gradient text has worst-case **5.58:1**, above normal-text 4.5:1; remaining incomplete/manual-review items are documented separately |
| Browser report artifact | Final browser checks complete: [frontend fixes and browser evidence](fix-frontend.md). Original reload, cached delivery, free retry, backup metadata and accessibility reproductions are documented with `fix-*` screenshots. QA Chrome is stopped. This auditor did not independently drive that browser |
| Documentation accuracy | Auditor reviewed README fallback section and [interpretation fixes](interpretation-fixes.md): both retain no-new-live-accuracy/latency/cost/provider-schema claims. Owner's earlier 182-test checkpoint is historical; auditor's final integrated count is 183 |

No high-confidence unresolved implementation defect was found in the final reviewed server, recovery or fallback changes. Remaining evidence limits: no new live backup interpretation, no live test of the revised structured-output schema against its provider, no new paid image generation, and no real physical microphone/audio test. Do not report broad live generalization as fixed from local tests.

## Pre-fix audit evidence boundaries

- **Local test coverage** below means a test body was inspected, not that this audit reran it.
- **Bounded-response fixtures** construct model choices from fixture patches. They test normalization, not whether Jev selects those choices from natural language.
- `tests/acceptance.test.ts` independently transcribes all fourteen example totals and selected expected attributes from the brief. This strengthens the price oracle, but still applies fixture patches rather than interpreting text.
- Fake speech events can verify browser wiring and lifecycle, not actual microphone capture, acoustic recognition, permissions granted by a person, or last-audible-word latency.
- Mocked image completion can verify caching/lifecycle without spending money. It does not establish current image-provider availability or generated artwork quality.
- The original brief predates the 41-topper library, appearances, counted plain candles, custom image generation, and secondary LLM. Their current behavior is described by README/shared contract. In particular, a missing saved custom image may be fulfilled later for the same request, but an already saved image and all other saved attributes must stay unchanged.

## Historical pre-fix evidence received from the retest owners

**Overall result is not all-pass.** Standard checks pass, but two newly tested open-ended backup interpretations fail semantic acceptance, six free mocked backup clear/reset checks fail, and browser checks expose missing backup attribution and pending-image reload recovery. Accessibility failures also remain. No fixes were made as part of this retest. No further paid calls are authorized for these checks.

| Fresh check | Result reported to this auditor |
| --- | --- |
| Baseline commands | `npm run typecheck`, `npm test` (**131 tests**), and `npm run build` pass |
| Isolated production startup | Port 39143, keys empty: built JS/CSS have correct MIME; all 78 PNG assets served, 5,441,022 bytes; deep SPA route works; unknown API returns JSON 404 |
| Production file isolation | `/.env`, `/.env.local`, `/.git`, `/.git/config` return 404; source/test/server/Vite/directory paths return SPA, not raw contents. Explicitly labeled fixture replay is intentionally in the production bundle |
| Maximal state/storage/history boundaries | Decorated 3-layer / 2-topper / 12-plain-candle design $106; corresponding 1-layer / cheesecake $94; numeral 0 and 999 variants $108; invalid patches atomically rejected; nested partial updates preserve other fields; 100 basket items × quantity 10, 250,000-character storage cap, 100-step Undo cap checked |
| Real standard interpretation | Voice owner reports **57/57 pass** |
| Additional Jev interpretation | Final voice report: **19/19 pass**, superseding interim 16/16; combined real Jev checks **76/76 pass** (57 standard + 19 additional). Details: [interpretation retest](retest-interpretation.md) |
| Existing mocked backup suite | **13/13 pass**; separate from the newly added clear/reset probes below |
| Real backup budget | Counter **4 → 6**, exactly two additional calls; both semantic probes fail |
| Autumn-harvest backup probe | No change, backup status 422; backup 1,180 ms, HTTP 1,971 ms; writing/layers preserved, but requested new seasonal design not supplied |
| Midnight-masquerade backup probe | Irrelevant snowman and `just-because`, no requested colors; backup 731.9 ms, HTTP 1,371 ms; cost $0.00039844; existing name/sponge preserved |
| Cost completeness | Failed-call cost omitted, so combined cost of the two calls is unknown; do not present successful-call cost as their total |
| Free backup clear/reset probes | Actual `runFallback` with mocked fetch and a rich confirmed cake: **2 pass / 6 fail**. Empty `toppings`, empty `toppers`, both empty, frosting null, topper tint null, and topper style null all yield 422/unchanged. Explicit remove lists work; a non-null ivory frosting change preserves unrelated fields |
| Browser standard flow | One real typed Jev request creates $51 cake; quantity 2/$102, save/Undo/reload/remove and Escape/focus return pass. 41 toppers, 17 occasions and 17 colors correctly exposed |
| Browser fixture/renderer matrices | Six-step demo and Undo pass; 14 fixtures / 22 turn prices pass; all 41 prepared toppers across 45 scenes, 16-case candle matrix and selected appearance matrix pass. These are local visual/DOM checks, not live interpretation |
| Browser accessibility | Axe reports two distinct failing rules: color contrast on 126 repeated nodes, and prohibited `aria-label` on one generic `.specs` div; two additional incomplete/manual-review rules. This is not 126 distinct defect types |
| Browser backup transparency, verified with fetch mock | Supplied backup provenance, 75 ms backup duration and no notices; UI displays only Provider 100 ms, with no backup attribution or duration column |
| Browser pending-image reload, verified with fetch mock | Save custom request with `assetId:null`, reload before completion, make cache response available: saved basket stays a plaque with no recovery request, hydration or retry. [Screenshot](screenshots/retest-mock-pending-reload.png) |
| Browser simulated speech lifecycle | Permission/network errors suppress restart; manual Start/Stop, natural-end replacement, and unmount abort exactly once pass. Simulated recognizer only, not real microphone/audio |
| Browser mobile | 390px disclosure/basket and 320px cake checks pass with no horizontal overflow |
| Browser delayed image/reset, fetch mocked | Completion after builder reset hydrates the saved asset ID while builder remains empty: state pass. Actual generated-image rendering fails GET separately. Reload recovery is the separate failure above |
| Cached generated-image GET | **FAIL, root cause confirmed.** All three existing generated PNGs return 404 because default Express `sendFile` rejects their `.cache` parent directory. Isolated checks using the same service file paths return 404 by default and 200 `image/png` with route-scoped dotfile permission: 77,652 / 76,646 / 70,076 bytes. This is not a proxy/CWD/metadata/stale-state issue. Existing paid previews cannot display. No source fix or new image calls. Details: [integration retest](retest-integration.md) |
| Browser missing-image recovery | Saved non-null asset ID with GET 404 retains exact quoted plaque, but no preview-error notice or retry control: fail |
| Browser completion/budget | [Final browser report](retest-browser.md) received. Owned Chrome stopped; zero paid image calls and zero real backup calls by browser tester. No physical microphone/audio tested |

These counts describe separate suites and should not be combined into a misleading single denominator. The detailed owner reports are the source for exact phrases, assertions, and timestamps.

## Historical pre-fix acceptance matrix

| Area | Required/current behavior | Existing local evidence | Fresh evidence / remaining limits |
| --- | --- | --- | --- |
| Entry point and scope | Main route is the builder; no checkout/accounts/payment; working dev and production commands | `package.json`, `server/index.ts`, `src/App.tsx`; fresh production owner evidence above | PASS production smoke isolated 39143 and browser main route; generated image route separately fails |
| Empty/default design | Empty reserved stage, no Add action; first default cake chocolate/one layer/$42 | Core state, demo fixtures and independent acceptance tests | PASS empty desktop/mobile and default real Jev; physical microphone not run |
| Initial sequence | Six turns: cake, two layers, princess, Birthday/Eda, Ada, remove princess; Undo restores princess/Ada/$58 | `cake.test.ts` six-step replay; `voice.test.ts` queue removal/Undo; initial bounded fixtures | PASS real Jev backend six turns and browser six-step fixture/Undo; full six-turn physical speech not run |
| Fourteen examples | All identities, requested attributes, quote flags and twenty-two totals | `acceptance.test.ts`; `voice.test.ts` bounded-response catalog; core fixture loop | PASS real Jev backend and browser local visual/price replay; these remain distinct paths |
| Prices/breakdown | Integer cents, base/layers/toppings/kit/topper/candle prices; no duplicated kit components; styles/occasion/writing free | Core and independent acceptance suites; `appearance.test.ts`, `candles.test.ts` | PASS fresh tests, 22 real catalog totals, maximal states, browser $51 each × 2 = $102 |
| Base/layers/tiers | Sponge 1–3; cheesecake fixed 1; preserve applicable decorations; tier request preserves design | `cake.test.ts`, `voice.test.ts`, catalog example 14 | Visual one/two/three seams and cheesecake; real tier ambiguity; heaviest three-layer composition |
| Topping operations | Independent add/remove/keep; repeat add idempotent; removal wins simultaneous add | `cake.test.ts`; example 11 in independent acceptance | Fresh mixed topping edit preserves all unrelated fields in UI |
| Prepared toppers | All 41 IDs render, $10 each, ordered unique pair; third rejects whole patch; named removal/replacement preserves other | Core catalog/limit/migration tests; `topper-renderer.test.ts`; bounded voice regressions | PASS real named edits/atomic limit, 45 browser scenes including all 41 toppers/four stress pairs, zero failed prepared-art requests |
| Themes | Mario, Formula One, Spain football, tennis, Jensen identity retained; no duplicate custom quote | Catalog fixtures, bounded real-answer regressions, static renderer | Fresh Jev and visible kit identity; replacement preserves candle 6 and unrelated topper |
| Occasions/discovery | Seventeen bounded free labels; no automatic decorations; contextual chips/catalog derive from shared options | `occasions.test.ts`, `discoverability.test.ts`, bounded voice occasion tests | PASS catalog 17/41/17 counts, real bounded labels, replay hides disclosure; accessibility of disclosure text fails contrast |
| Candles | Plain 1–12 at $3/set, default 5; numeral 0–999 at $5/set; counts/ages/calendar years distinct; replace/remove/partial updates | `candles.test.ts` covers every plain count and invalid 0/13/fractional/mixed fields; bounded numeric-role tests | PASS real numeric-role checks, maximal 0/999 state gates and browser 16-case matrix (plain 5/12, numerals 3/40, attached flames). Browser numeral 999 not claimed |
| Appearance | Seventeen palette values; four color targets; two independently styled toppers; writing font/case/size/placement; no price changes | `appearance.test.ts`, bounded voice styling tests; renderer sources | PASS selected real styling and browser appearance/long uppercase matrix; fallback null/default resets fail; UI text accessibility contrast fails |
| Exact/custom semantics | Quoted punctuation and exact inscription/custom request preserved; vague figure clarifies; known objects not quoted | Span and normalization regressions in `voice.test.ts`; appearance/custom quote tests | Fresh unknown wording and self-correction; custom portrait versus prepared generic item; no accidental paid generation for catalog item |
| Speech result processing | Interim visible; final delivered once per session/result; multiple finals serialize | `speechResults.ts` collector test and queue tests | Hook-level fake-recognizer events and actual browser wiring; actual microphone remains separate |
| Speech lifecycle | User starts; Stop/unmount stops; denial/network/no-speech supported; natural stop restarts only when intended | Hook source inspected; browser simulated lifecycle passes permission/network suppression, manual Start/Stop, natural-end replacement, unmount abort once | Real audio/permission remains pending; simulation is not acoustic or real-permission evidence |
| Queue/reset/Undo | Confirmed ordering, duplicate suppression, failed edits preserve state, reset rejects late response; Undo exact state/estimate | `voice.test.ts` rapid-turn/dedupe/reset/error/Undo cases | Browser rapid finals plus reset during delayed HTTP response; submit after reset while old work settles; no phantom basket additions |
| Interpreter failures/key safety | Genuine missing-key/error; no provider-body/key leaks; shared typed/spoken endpoint | Missing-key voice test; core validation; server error paths inspected | Fresh HTTP 400/413/unknown API; mocked 401/429/network/timeout/non-JSON; bundle and console remain secret-free without printing any key |
| Backup trigger/cost | At most one backup after no meaningful Jev answer; no backup on success or intentional demo limit; missing backup key leaves Jev result | `fallback.test.ts` trigger, timeout/invalid/no-change, catalog remap, asset-ID stripping, metadata tests | FAIL both fresh semantic probes, six rich clear/reset probes, and browser attribution. Counter delta exactly two; total cost unknown |
| Timing/replay honesty | Provider/request/final→approximate-paint separate; first observed not asserted cold; replay visibly non-Jev/no timings | Queue timing fields, double RAF hook, replay reducer, `fallback.test.ts` metadata | PASS labeled non-live replay; FAIL missing backup attribution/duration. Mock paint dash is not a measurement; no last-word measurement claimed |
| Basket standard behavior | Saved exact design/estimate; quantity 1–10, count/total/remove; survives local reload; empty/pending edit cannot Add | Core/independent snapshot and migration tests; App handlers inspected | PASS browser real $51 design, quantity 2, Undo isolation, reload $102, removal persistence, Escape/focus. Storage refusal not freshly browser-tested |
| Basket custom exception | Save while image pending; later only matching null asset ID fills; existing asset never overwritten; quote remains | `appearance.test.ts` fulfill/migration tests; image queue callback tests; browser mocked delayed completion after reset passes | Reload while generation pending fails recovery; mixed saved items and removed-item resurrection remain separate boundaries |
| Image service/cache | Normalize request key without changing exact wording; disk cache reused without key; duplicate inflight deduped; max two jobs | `topper-images.test.ts` mocked service/cache/postprocessing/failure tests | Mock capacity 2→3 rejection/recovery, failed retry, cache identity across model/reference/version changes; no paid calls required |
| Image async lifecycle | Text confirms before image completes; edits continue; stale replacement/reset cannot restore old request; Undo no extra step | Image queue tests cover completion, failure, reset/rejoin, ready map, late callback | PASS mocked nonblocking save/reset and late state hydration; FAIL real cached GET, reload resume and missing-image recovery. No new paid image generation |
| Image/render safety | Bounded opaque asset ID and same-origin image route; reject non-raster payloads; placeholder retained on load failure | Appearance asset validation; image non-raster test; `CustomTopper.tsx` onError | FAIL all three existing valid generated-image GETs; plaque/text safely retained, but no error/retry. Full size/timeout boundary matrix not run |
| Renderer stability/accessibility | Fixed camera/pedestal, top inscription, clear front/back, reduced motion; no nonexistent rotation cue | Static renderer tests check cutouts/order/unique SVG IDs, not geometry in browser | PASS prepared art/candle/appearance matrices, desktop and 390/320 screenshots/no overflow; FAIL axe contrast (126 nodes) and prohibited ARIA (1 node), two incomplete rules; reduced-motion not newly claimed |

## Independent original price oracle

Each sequence starts fresh; arrows are the specified follow-ups. These values are independent of the implementation price constants.

| Example | Expected known estimate (USD) |
| --- | --- |
| 01 | 44 → 51 |
| 02 | 58 |
| 03 | 56 → 56 |
| 04 | 55 |
| 05 | 56 → 61 |
| 06 | 60 → 60 |
| 07 | 56 |
| 08 | 56 |
| 09 | 63 |
| 10 | 66 |
| 11 | 59 → 57 |
| 12 | 44 plus custom quote → 49, quote removed |
| 13 | 63 → 65 |
| 14 | 52 → 56 |

The initial six-step estimate sequence is 42 → 48 → 58 → 58 → 58 → 48. Undo after removal returns 58 and restores the princess without changing Ada.

## Historical gaps reported for assignment

Items 2–3 were reproduced by the browser owner with fetch mocks, and item 4 by the voice owner with mocked fetch. Items 1 and 5 have fresh passing execution evidence within their stated limits. Item 6 retains untested boundaries. A comprehensive test request does not itself authorize fixing any failures.

1. **Speech lifecycle now has simulated-browser evidence, not real audio evidence.** `useSpeechRecognition.ts` owns native constructor events, restart timers, errors and teardown; `speechResults.ts` owns only event accumulation. The browser owner's fake-recognizer run passes permission/network restart suppression, manual Start/Stop, natural-end replacement and unmount abort exactly once. Real spoken audio remains explicitly pending.
2. **Reproduced: pending saved custom preview does not recover across reload.** `App.tsx:15–16` restores saved state, but does not resume a null saved asset request. `DesignerQueue` keeps its ready-assets map only in memory. Reload destroys the callback that would fulfill the saved pending thumbnail. The browser owner verified the saved plaque remains unhydrated after reload even when a cached response is available, with no recovery request or retry. No paid image call was needed. Missing completed image files also retain a plaque through `CustomTopper.tsx:22`, but saved items have no image retry action.
3. **Reproduced: backup provenance/duration is hidden in the UI.** `server/jev.ts:372–375` returns `provider.interpreter/fallback`; `DesignerQueue` records them. `App.tsx:196` renders Jev provider duration without backup duration/interpreter, and pending copy names Jev. The browser owner supplied an attributed backup result with 75 ms backup duration and no notices: the timing UI showed only Provider 100 ms, without backup attribution or duration. README's opening “no automatic parser fallback” sentence should not be read as proof that no secondary LLM runs; the later fallback section is the actual current behavior.
4. **Reproduced: backup removals are narrower than `CakePatch`.** `server/fallback.ts:173–183` drops empty arrays and null values recursively. Empty whole-list replacements and nullable scalar/style resets cannot survive that path. The prompt documents the scalar limitation, but also tells the model to use full lists for explicit whole-list replacements. The voice owner's eight free mocked checks now establish six failing clear/reset cases and two passing explicit/non-null edit cases, listed above. Report the limitation; do not silently redefine removal expectations.
5. **Fresh production static/entry evidence: pass; generated-image GET: fail.** The baseline owner completed the isolated production smoke including JS/CSS, all 78 prepared PNG assets, deep SPA, API fallthrough and dotfile protections. That static result does not cover generated assets served from `.cache`; their GET route fails as detailed in item 8.
6. **Image resource/error boundaries are only partly exercised.** The implementation has two-inflight, byte-size, pixel-count and timeout bounds, but existing tests do not exercise every limit, concurrent third-request recovery, or browser reload recovery. Distinguish source bounds from measured behavior. Do not generate images for this retest audit.
7. **Model fixture independence is partial by design.** Bounded provider-response expectations are derived from `CAKE_FIXTURES` patches. Independent acceptance tests guard all twenty-two amounts and selected attributes, not actual natural-language choice quality or every untouched field. Fresh Jev results and a preservation-rich mocked edit are complementary evidence, not interchangeable.
8. **Confirmed cached custom-image GET failure: Express dotfile handling.** `server/index.ts:34` uses default `sendFile` for files under `.cache/toppers`. The integration owner isolated the same `images.file(id)` paths for all three cached PNGs: default options produce 404, route-scoped `dotfiles:'allow'` produces 200 `image/png` with matching bytes. This identifies the hidden parent-directory rejection, not a proxy/CWD/metadata/stale-state failure. Existing paid images are not displayable through the current route. The probe server was closed; production code remains unchanged. Do not count the preserved plaque as successful generated-image display.

## Historical retest conclusion before implementation

- Final integration, interpretation and browser reports were received and linked above. Audit complete; application acceptance remains **NOT PASS**.
- Confirmed failures remain reported separately: generated-image delivery, pending saved-image reload recovery, missing-image recovery UI, backup semantics, backup clear/reset semantics, backup timing/provenance, and accessibility.
- Real physical microphone/audio, a new paid image generation, full resource-limit stress, storage-denial browser behavior, and reduced-motion browser behavior were not established by this retest. Passing nearby tests does not close those limits.
- Real Jev: 76/76; real default-config backup: 0/2 semantic passes; no further paid backup calls. Failed-call cost omitted, so total cost unknown.
- Browser tester's Chrome is stopped. This auditor did not modify source/tests, install dependencies, run duplicate suites, commit, or push. User work was preserved.
