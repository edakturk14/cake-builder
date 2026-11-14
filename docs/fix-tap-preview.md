# Tap-to-create custom previews

## Delivered

- New custom interpretations keep their plaque and never start image generation automatically. Rejected edits, no-change turns, unrelated later edits, Undo, basket opening and reload do not start generation either.
- Builder and null-image basket items use the same optional **Create preview (about 1¢)** action. The estimate comes from `/api/health`'s configured `imageEstimatedCostUsd`; an unknown estimate displays “cost varies”.
- Free cache lookup and existing-image loading remain automatic. Buttons disable during lookup, pending work and generation. Normalized concurrent requests share one generation call. Failed generation requires another click.
- Receiving an image does not add an Undo step, change prices or replace existing image IDs. Saved designs receive only the one-time null-asset fill.

Frontend changes: `src/App.tsx`, `src/components/SavedPreviewRecovery.tsx`, `src/hooks/useCakeDesigner.ts`, `src/integration.css`, `src/lib/designerQueue.ts`, `src/lib/previewRecovery.ts` and new `src/lib/previewPrice.ts`. Image lifecycle coverage is retained in `tests/topper-images.test.ts`; new tap-only coverage is in `tests/tap-preview.test.ts`. README's image-generation section describes the explicit action.

## Checks

- `npm run typecheck`: pass.
- Targeted tap-preview, frontend-recovery and topper-images tests: **21/21 pass**.
- Full `npm test` at frontend implementation completion: **310/310 pass**, zero failures.
- `npm run build`: pass, 51 modules; CSS 13.00 kB, JavaScript 317.44 kB.
- No source changes were needed after those checks. Other workstream owners continue separate backend work and run final integration checks.

## Mock-only browser results

Desktop was checked at 1440×1100 and mobile at 390×844. Real interpretation and image-generation routes were blocked throughout. Generation responses were intercepted in the browser; the success case loaded an already-existing local PNG. **No live interpretation, paid fallback or image-generation calls were made.**

| Scenario | Observed result |
| --- | --- |
| New custom edit | Zero generation calls; plaque and “Create preview (about 1¢)” displayed |
| Double-click builder action | Exactly one mocked POST; button disabled with “Creating preview…” |
| Mocked generation failure | Enabled “Retry preview (about 1¢)” action |
| Rejected third-topper edit and no-change turn after failure | Generation count stayed at one; original request and $62 estimate preserved |
| Save and open failed null-image item | No additional generation call; basket showed the same retry action |
| Fresh-profile reload and basket opening, lookup `missing` | Zero generation attempts; create button enabled; no mobile horizontal overflow |
| Saved-item double-click after reload | Exactly one mocked POST with the exact saved request; button disabled while generating |
| Saved-item success | Existing PNG visibly loaded, generated-image opacity 1; create control removed |
| Saved-item invariants after success | Exact request `" QA Sailboat "`, inscription `"Exact saved name"`, quantity 2 and $62-each estimate unchanged |
| Genuine lookup `pending` | Button disabled; after advancing the mocked clock 120,001 ms, the next poll enabled retry without any generation POST |

An initial saved-success test encountered a genuinely pending response from stale QA route state and could not click its disabled button. That run was not counted as success. All routes were cleared and a new Chrome profile was used for the missing-cache, saved-success and deadline checks above. A missing result enables the control; a pending result stays disabled only until completion or its bounded deadline. Existing recovery tests also cover a lookup that never settles, deadline abort, retry and ignored late responses.

## Fresh screenshots

- `screenshots/fix-tap-desktop-before-click.png`
- `screenshots/fix-tap-mobile-failed-retry.png`
- `screenshots/fix-tap-mobile-basket.png`
- `screenshots/fix-tap-mobile-reload-no-post.png`
- `screenshots/fix-tap-mobile-generating.png`
- `screenshots/fix-tap-mobile-created-preview.png`
- `screenshots/fix-tap-mobile-deadline-retry.png`

Seven new screenshots. No existing appearance evidence was replaced. Browser automation did not exercise a paid provider or physical microphone.
