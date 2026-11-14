# Frontend fixes and regression results

Date: 2026-11-14. Implementation complete. No paid text/image calls, commits, or pushes.

## Changes

- Timing rows identify **Jev**, **Backup**, or **Unknown** from response metadata, independent of notices. Backup duration and actual USD cost are shown when supplied; unknown cost remains “—”, never a fabricated zero. Pending copy says “Interpreting your request (Jev or backup)”.
- Saved custom designs with null asset IDs recover through **POST `/api/topper-image/lookup`**, the integration-owned cache-only endpoint. Mount, reload, cache miss, timeout, and automatic polling never call the generation endpoint.
- One shared watcher per normalized custom request deduplicates lookups across saved items. Pending work polls every two seconds for at most 120 seconds. An independent wall-clock timer also handles a hung lookup that ignores abort; timeout exposes retry controls, aborts the old signal, and ignores late results after timeout/retry/removal/unmount.
- Cache misses/errors show **Check cache again (free)** and **Generate preview (may incur cost)**. Only the latter explicit click can use the existing generation transport. Concurrent normalized explicit requests are deduplicated.
- Existing non-null saved image IDs are never replaced. A failed image GET keeps the plaque, shows a readable error, and offers **Retry loading preview (free)**, which repeats GET with a cache-busting retry parameter. It does not generate.
- Hydration still uses `fulfillBasketAsset`, preserving exact request/name, price, quantity, immutable saved designs, and already-filled IDs. Removed items are not recreated. Existing live custom-request generation and queue/Undo/epoch behavior are unchanged.
- Generic labelled `.specs` and `.suggestion-row` divs now have `role="group"`. Muted text and rose button colors retain the design palette with sufficient text contrast.

## Validation

### Automated

- Added `tests/frontend-recovery.test.ts`: **9/9 pass**. Covers cache-only URL, 100 normalized duplicate saved items, pending→ready, no generation on cache miss/timeout, abort/removal/late response, bounded polling, the exact never-resolving 4 ms deadline regression, explicit retry deduplication, immutable hydration, and backup metadata rendering without notices.
- Before final deadline refinement, local integrated run: **142/142 tests**, typecheck and production build passed. After refinement, the nine frontend regressions passed again.
- Coordinator's independent final integrated verification: **183/183 tests**, typecheck and production build pass. No overlapping build was started by this worker during that verification.

### Real cached image and missing GET

Used the previously generated racing-pigeon cache entry, with real generation and interpretation endpoints blocked at the browser network layer:

1. Saved a null-image snapshot named “Exact saved Ada”, quantity two.
2. Reload automatically looked up the cache and filled its existing PNG asset ID.
3. Real cached PNG GET loaded successfully, generated-image opacity **1**. Name, quantity two, and $42-per-cake estimate stayed unchanged.
4. A second saved item with a deliberately missing non-null ID retained its plaque and displayed the error/retry action.
5. Clicking free load retry issued the same image GET with `?retry=1`. Original saved ID, quantity and price did not change.

Evidence: `screenshots/fix-basket-cache-and-missing.png`.

### Pending image across reload, browser-only cache mock

- Saved two differently spaced/cased versions of the same request, quantities three and one, null image IDs.
- Reloaded with lookup reporting pending. Made a completed-cache response available to the next automatic poll.
- Observed **one normalized lookup**, **zero generation POSTs**, both saved IDs hydrated and both cached PNGs loaded at opacity **1**. Quantities three/one and $42 estimates remained unchanged.
- This reproduces the original reload failure and demonstrates recovery without a new paid image request.

Evidence: `screenshots/fix-pending-reload-recovered.png`, `fix-mobile-recovered-basket.png`.

### Cache miss and explicit retry, browser-only mocks

- Reloaded two normalized duplicate missing-cache snapshots.
- Observed **one lookup** and **zero generation calls** before interaction.
- Both items showed separate free cache-check and explicitly cost-labelled generation actions.
- Clicked both generation buttons in the same browser operation against a mocked generation transport. Observed **one mocked generation**, both IDs hydrated, quantities one/two and $42 estimates unchanged.
- Paid endpoints remained blocked. These explicit generation calls were local mocks, not paid-provider validation.

Evidence: `screenshots/fix-mobile-cache-miss-explicit-retry.png`.

### Backup attribution, browser-only mock

Deferred a successful response with no notices, `interpreter:"fallback"`, provider duration 175 ms, backup duration 75 ms and actual cost $0.0004.

- Pending copy did not claim Jev alone.
- Row showed **Backup / 175 ms / 75 ms / $0.000400**.
- At 390 px, document width remained 390 px; the 706 px timing table scrolls inside its own container.
- Request/paint values in these synthetic screenshots are not provider or real speech latency claims.

Evidence: `screenshots/fix-desktop-backup-provenance.png`, `fix-mobile-backup-provenance.png`.

### Exact accessibility retest

Browser axe-core **4.12.1**, empty builder plus expanded full supported-options disclosure, same state as the original failing audit:

| View | Violations | Result |
| --- | ---: | --- |
| Desktop 1440×1100 | 0 | Original prohibited-ARIA and contrast failures removed |
| Mobile 390×844 | 0 | Same disclosure; no horizontal document overflow |
| Mobile recovered basket | 0 | Real cached thumbnails and persisted quantities |

The original desktop result was two failing rules: `aria-prohibited-attr` (WCAG 4.1.2, one node) and `color-contrast` (WCAG 1.4.3, 126 repeated nodes).

Expanded-disclosure retests still have one incomplete/manual-review rule, color contrast: gradient-backed secondary empty text and an aria-hidden plus/minus glyph. The text is now `#765752`: independently calculated **5.88:1** on ivory and **5.58:1** at maximum glow opacity, both above the normal-text 4.5:1 threshold. The aria-hidden glyph is not exposed as text content. The mobile-basket audit also flags overlapping-background/thumbnail text for manual review; visual screenshot review found no actual content collision.

Evidence: `screenshots/fix-desktop-contrast.png`, `fix-mobile-contrast.png`, `fix-mobile-recovered-basket.png`.

## Ownership and limits

- Frontend changes: App, new `RequestTimings` and `SavedPreviewRecovery` components, `previewRecovery` client library, existing custom-image renderer retry UI, queue timing metadata, and integration CSS.
- Integration owns the cache-only lookup and cached-PNG serving fix. Voice owns interpretation semantics.
- No externally modified appearance screenshot was edited. All new evidence uses `fix-*`.
- Physical microphone, recognition accuracy, new paid image generation and new real fallback calls were not tested.
- Coordinator retains responsibility for the separately reported novel-theme semantic failures; these frontend passes do not assert that interpretation issue is fixed.
- Isolated owned QA Chrome PID 91758 was stopped after evidence collection.
