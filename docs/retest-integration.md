# Fresh integration retest

Date: 2026-11-14. Scope: current working tree, including pending fallback-interpreter changes. This is baseline automated and production-entry testing, not a fresh microphone, visual browser, or live model acceptance claim.

## Result

- `npm run typecheck`: PASS.
- `npm test`: PASS, **131/131**, zero failed/skipped/cancelled.
- `npm run build`: PASS, 47 modules; JavaScript 310.48 kB (97.04 kB gzip), CSS 11.77 kB (3.43 kB gzip).
- Additional combined-state, storage, and history boundary probes: PASS.
- Isolated `npm start` production smoke: PASS, including all 78 PNG assets.
- Follow-up cached custom-image delivery initially **FAILED** because default `sendFile` handling ignored `.cache`. The scoped fix now passes real HTTP regression and all three previously failing images return 200 through direct API and Vite. See the diagnosis and fix below.
- The baseline retest was report-only. A subsequent implementation assignment added the scoped server fix and cache-only recovery endpoint below, preserving all pre-existing work.

The repository was `main`, one commit ahead of its remote, with pending environment-example, README, live-validation/result, server, queue, interpretation-contract, fallback implementation/test/script changes. No `AGENTS.md` files or shared setup-note directory were present.

## Service readiness

The existing development web service at `http://127.0.0.1:5173` returned 200. API health on `http://127.0.0.1:3001/api/health` returned `ok:true`, Jev configured, image provider configured, text model `openai/gpt-4.1-nano`. Both services were reused without restart and left available for other testers.

No interpretation requests or image-generation requests were made by this test track. Health/static GETs do not exercise interpretation or generation. Provider-related suite tests use mocks, not live keys. Real-provider and browser retests belong to separate tracks.

## Original acceptance and current-feature coverage

| Requirement or feature | Fresh evidence | Scope and remaining acceptance |
| --- | --- | --- |
| Four-turn cake → two layers → princess → Birthday/Eda; correction, removal, Undo | `tests/cake.test.ts`, `tests/voice.test.ts` | Local reducer/queue fixtures verify $42 → $48 → $58 → $58, exact correction, $10 removal, Undo. Not spoken recognition or live Jev. |
| All fourteen examples and listed follow-ups | `tests/acceptance.test.ts`, `tests/cake.test.ts`, bounded-answer fixtures in `tests/voice.test.ts` | All 22 local example turns pass. Acceptance assertions use independently transcribed brief prices, final fields and quote flags, not the pricing constants. Live typed interpretation remains a separate run. |
| Price rules, layer limits, single baked cheesecake, no per-digit candle charge | Core/acceptance/candle tests and combined-state probes below | Integer-cent estimates, replacement rather than accumulation, free labels/writing/appearance, known subtotal with unresolved custom quote pass. |
| Partial and compound updates preserve unrelated fields | Core, appearance, candle and voice tests | Topping add/remove, removals winning same-turn adds, base conversion, nested colors/styles/count edits, exact text, invalid atomic rejection pass. |
| Undo/reset, pending/confirmed distinction | Core/voice/image tests | Immutable history, exact restored estimates, reset clearing history, no image-only Undo entry pass. Real button disabled/enabled states need browser acceptance. |
| Rapid finalized turns, duplicate events, stale responses after reset | `tests/voice.test.ts` | Queue serializes against latest confirmed state, duplicate utterances apply once, late result cannot recreate reset cake, provider errors preserve design. Speech-event fixtures are not actual microphone events. |
| Basket immutable snapshot and persistence | Core/acceptance/appearance/candle tests | Deep clone/freeze; later original mutations cannot change saved state; serialize/parse round trip; corrupt storage rejection; recomputed trusted prices; older topper/custom/appearance/occasion/candle migration pass. |
| Basket pending custom preview hydration | `tests/appearance.test.ts`, `tests/topper-images.test.ts` | Mocked completion fills only matching null saved asset, keeps exact request/every other field/price, does not overwrite existing saved asset, and still emits after builder reset. Browser event → localStorage → reload wiring needs browser testing. |
| Basket quantity/remove/dialog/storage refusal | Boundary probes plus inspection of `src/App.tsx` | Quantity parser bounds pass; App has 1–10 selector, remove, totals, localStorage effect and storage-failure notice. DOM interactions, dialog focus and storage-refusal UI are not tested by Node suite. |
| 41 prepared toppers, ordered pairs, third-topper cap | Core, voice and renderer tests | Every catalog entry costs $10 and has a real asset; pair order, targeted removal, complete rejection of third-topper compound edit, styles and saved order pass. |
| 17 bounded occasions and occasion-first discovery | Occasion/discovery/voice tests | Free label-only changes, old-label migration, full catalog-derived options, deterministic/contextual chips and satisfied-option exclusion pass. Browser disclosure/keyboard/mobile appearance remains separate. |
| 17 colors; size, position and writing styling | Appearance/voice tests | Bounded options, nested preservation, exact inscription under uppercase display, clearing removed topper styles and zero pricing impact pass. Pixel appearance is not established by state tests. |
| Plain candle count versus numeral | Candle/voice tests | Counts 1–12, default five, separate numeral/age roles, partial fields, storage migration, Undo, New Year not inferred as age, $3/$5 flat sets pass. |
| Custom image work without blocking editing | Mocked image-service and queue tests | Immediate text commit, subsequent edits, failure retention, normalized disk/inflight caching, stale/replaced/reset work, ready-asset reuse, quote retention and processed transparent image dimensions pass. No new image-provider call occurred. |
| Backup interpreter | `tests/fallback.test.ts` | 13 mocked checks pass: narrow triggering, no fallback for successful Jev/intentional clarification, bounded invalid/timeout/no-change errors, missing-key behavior, strict schema, catalog topper remapping, asset-ID stripping and queue timing fields. Not live backup quality or latency. |
| Renderer identity and saved previews | `tests/topper-renderer.test.ts` | All 41 cutout references, ordered pair with candles/inscription, and unique SVG paint IDs across multiple saved renderers pass. Composition quality, top-surface writing and responsive layout need browser review. |
| Mic/error/fallback UX | Speech-result fixtures, request/error tests, App inspection | Typed and finalized speech submissions use the same queue. Permission denial, natural stops/restarts, Stop, unsupported browser, navigation cleanup and audible-word timing require real browser/microphone testing. |
| Replay clearly distinct from live model | Core six-step fixture tests and App inspection | Replay uses a separate immutable history and labeled opt-in controls, disables live composer, and does not supply fake provider timings. Production bundle includes this feature. |

## Additional boundary probes

These ran in a fresh Node process through exported `createCake`, `applyCakePatch`, `estimateCake`, `createBasketItem`, `parseBasket`, and `cakeReducer`, without network calls. They supplement gaps in combination/size-boundary coverage instead of replacing existing individual-bound tests.

- Combined three-layer red velvet, two toppers, all five toppings, twelve plain candles, inscription, occasion, colors and topper style: **10,600 cents**. Independent brief arithmetic: $44 + $12 + $20 + $27 + $3 = $106.
- Change only layers to one: **9,400 cents**, preserving decorations. Convert combined design to cheesecake while requesting three layers: one baked layer, explanatory note, same toppings/toppers/candles, **9,400 cents**.
- Layers zero/four and plain count thirteen reject. A third-topper turn that also changes layers and inscription preserves the entire previous design and returns the cap note.
- Simultaneously change frosting, one topper position and plain count to one: keep omitted filling color, topper size/tint and inscription; still **10,600 cents**.
- Numeral lower/upper bounds `0` and `999`: count clears, **10,800 cents**. Numeral `1000` rejects.
- **100** fully decorated basket entries at quantity **10** restore successfully; serialized length **134,791 characters**. Entry 101 rejects. Quantities 0, 11 and 1.5 reject.
- Valid JSON padded to exactly **250,000 characters** restores; 250,001 rejects. This verifies the parser's string-length cap, not a browser storage quota.
- 101 distinct edits retain the latest **100** history snapshots. 100 Undo calls reach the expected oldest retained state and empty history.

Two initial ad hoc probe failures were test-harness errors, not application regressions: an incorrect hand-added $126 price expectation (correct sum $106), and treating a JavaScript template URL as a concrete image URL. Both probes were corrected from the brief/file inventory and rerun successfully. No application tolerance or expected requirement was relaxed.

## Production-entry smoke

After the successful build, an unused loopback port **39143** was checked and used for `API_PORT=39143 TYPESAFE_API_KEY='' OPENROUTER_API_KEY='' npm start`. Explicit empty credentials prevented accidental provider use. The existing development services were untouched.

| Request | Observed result |
| --- | --- |
| `/` | 200, app index contains root element |
| Built index JavaScript and CSS | 200; JavaScript/CSS MIME types, not an HTML fallback |
| All 78 concrete public PNG art/topper/mask paths | 200, image MIME; **5,441,022 bytes** retrieved in total |
| `/api/health` | 200 JSON; `ok:true`, both provider configured flags false, `fallbackAttempts:0` |
| `/cake/design/qa` | 200 HTML, exactly the app index (SPA deep route) |
| `/api/unknown-qa` | 404 JSON |
| `/.env`, `/.env.local`, `/.git`, `/.git/config` | 404 text, no successful file response |
| `/src/shared/fixtures.ts`, `/tests/voice.test.ts`, `/server/jev.ts`, `/@vite/client` | 200 app-index fallback, not source or Vite runtime |
| `/art/` | 200 app-index fallback, not a directory listing |

No suspicious response bodies or credentials were printed. No live interpretation/image endpoints were invoked. The index has no Vite dev-client reference. **Local fixture replay is intentionally included in the production bundle and UI**, so this result does not assert that fixture functionality is development-only. It asserts that raw source/test files and directory listings were not exposed by the tested paths. Unknown non-API paths generally return the SPA rather than 404.

## Open gaps and limitations

1. **Missing timing UI:** `src/App.tsx` currently shows Turn, Provider, Image generation, Request and Final transcript → paint. It does not render Interpreter (Jev/Backup), backup duration or backup cost, although the provider/queue contracts carry interpreter and backup duration. This was reported, not implemented, under the testing-only assignment.
2. Passing mocks/fixtures cannot establish actual provider interpretation quality, cold latency, microphone operation, visual fidelity, accessibility or mobile overflow. Fresh browser/live tracks must report their own outcomes.
3. No browser basket quantity/remove/reload/blocked-storage walkthrough was performed here; model/serialization tests and source wiring are distinct evidence.
4. No fresh real image generation was requested. Provider-image quality, image retry interaction and completion across a real browser reload remain outside this track.
5. Missing/unknown non-API asset paths return the SPA. Tested actual JS/CSS/images have correct types; this smoke is not a general security audit.
6. Boundary probes are recorded here but were not added as persistent test files, in keeping with the report-only scope.

## Follow-up: cached custom images return 404

This follow-up used only cached filenames, GET requests, source inspection, file metadata, and an ephemeral local Express diagnostic. No generation/interpretation POST, shared-server restart, secret inspection, or application change occurred.

### Contract and reproduction

The route is **`GET /api/topper-image/<assetId>`**, with exactly 64 lowercase hexadecimal characters and **no `.png` suffix**. `server/topperImages.ts` validates that ID and resolves `<repository>/.cache/toppers/<assetId>.png`. The GET handler does not require a metadata record.

All three existing cached files failed on both **direct API 3001** and **Vite proxy 5173**:

| Asset ID | Existing file bytes | Direct GET | Proxied GET |
| --- | ---: | --- | --- |
| `cb3fcfd70f9a99f78ceb44030bad006476ca5a00d39c836f72ff5d34a67fdfe1` | 77,652 | 404 JSON, `no-store` | 404 JSON, `no-store` |
| `6f5f18649b72277be362f5e2d076b029bbde46ed5c6166aaf38e415808e4bb67` | 76,646 | 404 JSON, `no-store` | 404 JSON, `no-store` |
| `f17ae31562a181d49b66bed793a4e05ee3d7f8be077d753abe4bbec78e49bb69` | 70,076 | 404 JSON, `no-store` | 404 JSON, `no-store` |

Appending `.png` also returns 404, correctly rejected by the ID validator; that is not the cause of the failures above.

Both service processes have the repository as cwd. The API process runs this repository's `server/index.ts` through `tsx`; Vite runs this repository's development configuration. Cache resolution is module-relative, not cwd-relative, and the server constructs the default image service without a directory override. Health on both ports returned 200 with matching current text-model configuration and `fallbackAttempts:6`. No evidence indicates a proxy mismatch or wrong working directory.

### Confirmed cause

`server/index.ts` calls `response.sendFile(file, callback)` with an absolute path containing `.cache`. Express's installed `send` dependency defaults to `dotfiles:'ignore'` and checks every path component, including the hidden parent directory. It returns 404 before delivering the otherwise-existing PNG.

An isolated Express server on an ephemeral loopback port used the **same public image-service `file(id)` resolver and actual three files**, comparing default `sendFile` options with route-scoped `{dotfiles:'allow'}`. For every file:

- Default options: **404**.
- Scoped allowance: **200 `image/png`**, response size exactly matching the existing file's size.

The diagnostic server closed successfully. The shared services were not changed. This establishes an application configuration bug, not missing files, absent metadata, extension confusion, or Vite proxy failure.

No fix was made during the testing-only phase. The existing service/renderer tests did not exercise actual hidden-directory HTTP delivery, which explains the passing baseline suite despite the user-visible failure.

### Scoped implementation and verification

The later implementation assignment fixed `server/index.ts` with route-scoped `sendFile(file, {dotfiles:'allow'}, callback)`, only after the existing strict 64-lowercase-hexadecimal image-ID resolver. Global production `express.static` dotfile denial and SPA dot-path protection remain unchanged. No dependency was upgraded or patched. The [official Express 5 response documentation](https://expressjs.com/en/5x/api/response/#ressendfile) documents the default `ignore` behavior and supported per-call options; this is an application configuration fix using that API.

Added **`POST /api/topper-image/lookup`** with body `{request:string}` and response union:

- `{status:'ready',assetId:string}` for a readable regular cached file with a PNG signature.
- `{status:'pending'}` only for the same identity actually present in this process's in-flight map.
- `{status:'missing'}` otherwise. A prior process's unfinished job is not reported as pending.

The endpoint is strictly read-only: it does not call generation, access API keys, contact providers or create cache artifacts. A shared identity helper preserves exactly the existing normalized-request/model/prompt-version/reference-image hash used by generation. Responses, including invalid JSON and bounded validation failures, use `Cache-Control:no-store`. Internal file/reference failures become sanitized errors, without local paths or request text. Explicit generation remains a separate endpoint.

New tests:

- `tests/topper-http.test.ts`: launches the actual production server entrypoint on an OS-assigned loopback port with empty provider credentials. A locally mocked generation fixture supplies a real PNG under the actual hidden cache directory. The test verifies HTTP 200/image MIME/exact byte equality; ready/missing lookup; invalid payload and malformed JSON 400/no-store; malformed, extension-suffixed, traversal and missing IDs 404; `/.env`, `/.env.local`, `/.git`, `/.git/config` remain 404. Temporary fixture and server are cleaned up.
- `tests/topper-cache.test.ts`: verifies missing → pending → ready → removed/missing transitions, normalized-request equivalence, model/reference identity separation, key/provider non-use, unchanged cache-directory contents during lookup, invalid payloads, sanitized local errors, and non-PNG/non-regular rejection. Provider activity is mocked only.

Validation after implementation:

- Targeted image HTTP/cache/service tests: **11/11 pass**.
- Full current `npm run typecheck`: PASS.
- Full current `npm test`: **134/134 pass**.
- `npm run build`: PASS, 47 modules.
- All three originally failing cached IDs now return **200 `image/png`** on **both 3001 and 5173**, with the same 77,652 / 76,646 / 70,076 byte sizes recorded before the fix.

The shared development watcher picked up server edits normally; no manual shared-server restart was performed. No paid provider or image request occurred. Frontend reload recovery, polling and explicit retry UI are owned and validated separately.
