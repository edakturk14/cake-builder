# Fresh browser retest

Date: 2026-11-14. **Overall: NOT PASS.** Testing only; no implementation changes.

## Environment and budget

- Reused UI `http://127.0.0.1:5173` and API `http://127.0.0.1:3001`.
- Approved isolated headless Chrome, fresh profile, owned process 88556 / CDP 9335. The embedded assigned tab could read DOM but rejected screenshots and keyboard input because it was not visible. User desktop/session settings were not changed.
- Desktop viewport 1440×1100; mobile 390×844 and 320×720. Development matrices use larger viewports and are explicitly fixture/rendering checks.
- Exactly **one real typed standard Jev command** in this browser retest. After the coordinator paused live traffic, all interpretation and image-generation responses were browser-fetch mocks or local fixtures.
- **Zero paid image calls and zero real fallback text calls by this tester.** Final health `fallbackAttempts:6`, consistent with the voice agent's separately authorized 4→6 audit. Custom mocks intercepted POSTs before networking. Cached-image checks used GET only.
- Physical microphone/real speech recognition was **not tested**. Fake-recognizer lifecycle checks below are simulated, not equivalent to real audio, recognition quality, permissions UI, or audible-word latency.

## Failures

### 1. Cached custom images cannot render (high)

All three existing valid 64-hex PNG filenames in `.cache/toppers/` returned HTTP 404 from the app's image URL. A saved custom design with a non-null asset ID consequently kept its quoted plaque; generated image opacity stayed zero. This is not a successful real-image rendering check.

Integration independently reproduced direct-API and proxy failures and confirmed the cause: Express `sendFile` defaults reject the `.cache` parent path as a dotfile path. Its isolated differential returned the exact PNG bytes with route-scoped `dotfiles:allow`. No fix was made during QA.

Evidence: `screenshots/retest-mock-cached-hydration.png` and `retest-mock-cached-hydration-loaded.png`. The latter filename records the attempted loaded-state capture, **not** a successful load.

### 2. Pending saved custom images never recover after reload (medium)

Reproduction with browser-only mocked transport:

1. Return a custom edit `{request:"QA moon adventure",assetId:null}` and leave its image response unresolved.
2. Save to basket while “Creating your topper…” is visible; storage contains the null asset ID.
3. Reload before completion, then make a successful cached image response available to any recovery request.
4. Open basket. It remains a plaque with null asset ID. Observed recovery request count: **zero**. There is no saved-item retry control.

The pre-reload callback and in-memory queue asset map are gone; reading the basket does not resume this work. This failure is independent of the cached-image GET defect.

Evidence: `screenshots/retest-mock-pending-reload.png`.

### 3. Missing saved-image GET has no user-facing recovery (medium)

A saved non-null asset ID whose image GET returns 404 safely retains the plaque and exact quote request, but the basket gives no preview-error notice or retry control. Saving the asset ID alone is not proof that the image rendered.

### 4. Backup interpreter is not disclosed in timing UI (medium)

A browser-mocked successful response used `provider.interpreter:"fallback"`, provider duration 100 ms, fallback duration 75 ms, and an empty notices array. The row displayed only **Provider 100 ms**, Image generation, Request, and Final transcript→paint. There was no interpreter/backup identity or fallback duration column. Thus attribution depends on optional notices rather than actual provider metadata. The mocked request's paint cell was still “—” when captured; this is not a latency measurement.

Evidence: `screenshots/retest-mock-backup-timing.png`. No actual fallback was invoked.

### 5. Accessibility violations (medium; axe impact “serious”)

Ran browser axe-core **4.12.1** against the desktop empty builder with the full supported-options disclosure expanded.

- `aria-prohibited-attr`, WCAG 2.0 A **4.1.2**: one violating node, `.specs`, uses `aria-label` on a generic `div` without an appropriate role. `.suggestion-row` was additionally flagged for manual review (incomplete), not counted as a confirmed violation.
- `color-contrast`, WCAG 2.0 AA **1.4.3**: **126 repeated nodes**, not 126 independent defects. Normal/small text requires **4.5:1**; large text requires **3:1**. Representative normal-text ratios: white “Start listening” 3.36:1, eyebrow 3.19:1, heading caption 3.78:1, basket count 3.86:1, catalog included-price text 3.56:1, disclosure toggle 4.26:1. Empty-stage text at 23 px regular was 2.48:1 and below its applicable 4.5:1 threshold.
- Summary: **two distinct failing rules**, plus two incomplete/manual-review rules. Gradient-backed secondary empty-stage text could not be automatically assessed.

## Passed checks

### Real standard editing and basket

- Typed “I want a two layer vanilla birthday cake with strawberries and write Eda”.
- Confirmed Vanilla / 2 layers / Birthday / Strawberries / exact “Eda”, **$51**.
- Saved snapshot, changed quantity to two, closed basket, and used Undo. Builder returned empty while saved cake stayed unchanged at $51 each.
- Reload preserved saved design, quantity two and $102 total. Escape closed the modal and returned focus to the basket trigger.
- Remove deleted that saved item, persisted the change, and recalculated the remaining mock-item total to $84.
- Evidence: `screenshots/retest-empty-desktop.png`, `retest-basket-reload.png`.

### Fixtures, catalog and renderer (not live Jev)

- Six-step demo produced $42, $48, $58, $58, $58, $48 with Eda→Ada and princess removal. Undo after removal restored princess/Ada/$58.
- All **14 local fixtures and all 22 fixture turns** matched their own documented expected estimates. Included the five prepared theme kits, exact writing, fruit removal/addition, custom plaque removal, and lemon→cheesecake preserving numeral 21 and “Happy birthday, Selin”.
- Replay visibly says “not live Jev”; composer/microphone are disabled and suggestion/catalog discovery is hidden.
- Topper dev gallery: **45 scenes** (41 single designs plus four stress pairs), **49 topper image elements**, zero failed artwork resource requests. All prepared cutouts visible in fresh screenshot review; no obvious pair/writing collisions.
- Candle matrix: cheesecake plus sponge 1/2/3 layers; numerals 3 and 40; exact plain counts **5,5,5,5** and **12,12,12,12**. Numeral contact coordinates 200/243/187/140 matched base-specific scene offsets. Flames visually attach to numeral wicks; plain flames are visible. This is visual/DOM evidence, not real language interpretation.
- Appearance matrix reviewed selected frosting/filling/accent/writing colors, small/large toppers, left/right/center placement, script/print and uppercase long writing, dense custom-plaque combinations, and compact saved-scene renderer. Palette availability: 17 entries. The intentionally invalid QA image ID on this dev page returns 404 and is not an unexpected production request.
- Evidence: `screenshots/retest-toppers-catalog.png`, `retest-candles.png`, `retest-appearance.png`.

### Mocked delayed image lifecycle

- A custom image request committed immediately, displayed its plaque, allowed basket save and did not block reset.
- With a saved pending custom item, reset builder, then resolve the browser-mocked cached response: matching saved item's asset ID hydrated while builder remained empty. **State hydration passed. Image rendering failed separately because its GET returned 404.**
- Exact custom request and known subtotal/quoted-item wording were retained throughout.

### Simulated speech hook lifecycle

Mounted the real `useSpeechRecognition` hook in a temporary browser-only React root with a fake recognizer; no audio or model calls.

- Start set listening true.
- `not-allowed` showed the microphone-permission message, stopped listening and did not restart.
- Manual start cleared that error.
- `network` showed its network-specific message, stopped listening and did not restart.
- Natural end created one replacement recognizer and returned listening true after the restart delay.
- Stop left listening false and created no replacement; manual Start worked again.
- Unmount called abort exactly once; a late final-result event emitted no callback and created no restart.
- Temporary root was removed. This does not test the browser's real speech service.

### Responsive/discoverability/console

- Disclosure contains 17 occasions first, five bases, 41 toppers, 17 colors, five prepared theme kits and shared sample prices.
- 390 px empty builder, full catalog and basket: no horizontal overflow; disclosure width 350 px inside 390 px viewport.
- 320 px cheesecake with fruit, numeral 21 and long inscription: document width remained 320 px; specs/controls wrap and remain reachable. More content requires ordinary vertical scroll.
- Browser console review found Vite/debug/React development messages, no application exception in ordinary flows. Expected custom-image 404s are reported above, not suppressed.
- Evidence: `screenshots/retest-mobile-empty.png`, `retest-mobile-basket.png`, `retest-mobile-disclosure.png`, `retest-mobile-replay.png`, `retest-mobile-320-cheesecake.png`.

## Limits and handoff

- No implementation changes, commits, pushes, real fallback probes, paid image generation, real microphone test, or automated build/unit-test rerun by this tester.
- Arbitrary novel-theme interpretation and paid provider reliability belong to the separately reported voice audit; fixture passes must not be represented as semantic acceptance.
- Only new `retest-*` evidence and this report were written. Existing externally modified artwork/screenshots were not edited.
- Owned QA browser is stopped after evidence collection; user-owned desktop remains untouched.
