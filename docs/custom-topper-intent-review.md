# Independent custom-topper review

**Current outcome: PASS for the user-approved tap-to-generate design.** The final 104-row mocked matrix, extra lifecycle checks, all 310 registered tests, typecheck and production build pass. See [final verification](#tap-to-generate-final-independent-verification).

## Historical review checkpoint

The original report below records the pre-tap-to-generate implementation. Its findings and counts are historical. The completed follow-up at the end records the newer design.

# Independent review: custom topper intent guard

## Outcome

Do not approve as a general physical-object safety gate. The exact m01 regression is blocked, but unseen abstract/style nouns still initiate automatic image requests. Ordinary valid object syntax is also refused.

No repository source or documentation files were edited. No live text, image, or other network calls were made. All fetches in the independent probes were intercepted, including the actual browser transports' POSTs.

## Findings

### [P1] Do not treat an article and addition verb as physical-object evidence

`server/customTopperIntent.ts:30-42` denies a finite list of abstract heads, then accepts nominal syntax. This does not establish that the remaining noun is physical. For example, both interpreter paths accept `customTopper.request: "whimsy"` for `Add a little whimsy.`, and `"a festive atmosphere"` for `I would like a festive atmosphere.`. Through `DesignerQueue`, `browserTransport`, and `browserImageTransport`, each produced exactly one POST `/api/topper-image` with that abstract description. The same happened with no existing custom topper and with a ready existing asset; the latter was replaced. Unseen mood nouns bypass the gate without needing invented descriptions. Extending the banned-word list would retain the same failure mode.

### [P1] Accept ordinary explicit object-as-topper constructions

`server/customTopperIntent.ts:38-40` rejects the suffix `as a topper` and supports a narrow verb set. Both providers' correct source spans `our cat Miso` for `Put our cat Miso as a topper.` and `Use our cat Miso as the topper.` were discarded, despite explicitly naming a physical subject and topper purpose. `Could you sculpt a fondant sailboat for the top?` was also discarded. These are normal full sentences, not merely telegraphic or unusual descriptions. Three of ten independent legitimate custom-object phrases were refused: **30%** in this deliberately small mocked sample, consistently across both providers and both prior states. This is not a live population estimate.

## Independent mocked matrix

The corrected matrix ran 104 rows: both interpreter paths, each starting with no custom topper and with an existing ready custom topper. Jev responses selected actual candidate spans; fallback responses used its complete real wire schema. Each response passed through the real interpretation, patch application and queue/browser transport paths. Assertions verified the selected provider, zero errors, and image POST counts. No browser UI was launched; actual application queue and HTTP transports were exercised in Node.

### Unseen style/mood cases

Each result was identical in both providers and prior states.

| Phrase | Mocked custom span | Image POST |
|---|---|---|
| Would you make it fancier for an adult party? | fancier | 0 |
| Give the cake a classy look please. | a classy look | 0 |
| I want something special on top. | something special | 0 |
| Add a luxurious finish. | a luxurious finish | 1 |
| Add a little whimsy. | whimsy | 1 |
| I would like a festive atmosphere. | a festive atmosphere | 1 |
| Add a refined aesthetic. | a refined aesthetic | 1 |
| Put a playful twist on it. | a playful twist | 1 |
| Make it feel polished and mature. | polished and mature | 0 |
| Add a sophisticated appearance. | a sophisticated appearance | 1 |
| Place an elegant flourish on top. | an elegant flourish | 1 |
| I want a graceful design. | a graceful design | 1 |

Eight of twelve style phrases produced image POSTs: 32 of 48 matrix rows. Even treating `flourish` or `finish` as potentially physical would not explain acceptance of `whimsy`, `atmosphere`, `aesthetic`, `appearance`, and `design`.

### Unseen legitimate custom cases

| Phrase | Mocked custom span | Accepted |
|---|---|---|
| Please add a fondant sailboat on top. | a fondant sailboat | yes |
| Add a figure of my grandma on top. | my grandma | yes |
| Put our cat Miso as a topper. | our cat Miso | no |
| Use our cat Miso as the topper. | our cat Miso | no |
| I would like a topper of my cat Miso. | my cat Miso | yes |
| Please place a miniature violin on top. | a miniature violin | yes |
| Add a clay-style hedgehog on top. | a clay-style hedgehog | yes |
| Could you sculpt a fondant sailboat for the top? | a fondant sailboat | no |
| I want a figure of grandma on top. | grandma | yes |
| Add an astronaut holding a flag. | an astronaut holding a flag | yes |

Seven accepted, three refused; 28 of 40 rows accepted, 12 refused. Existing ready assets survived rejected descriptions.

### Catalog and exact regression

- `Put a dinosaur on top please.` and `Please add a castle to the cake.`: correctly classified Jev prepared slots and fallback custom-name remapping both produced the prepared catalog ID and **zero image POSTs** (8 rows).
- Additional existing asymmetry, not introduced by the guard: Jev output selecting only the custom span `dinosaur`, with no prepared incoming slot, still produced an image POST for `dinosaur` (both prior states). Fallback's equivalent custom-only output remapped to the prepared dinosaur with zero image POSTs. Jev duplicate suppression at `server/jev.ts:292-301` depends on a separately selected incoming catalog identity; the shared guard does not remap catalog names. This limits any claim that catalog requests cannot take the paid path.
- Exact m01 phrase and bad custom span: both providers, both prior states, zero image POSTs (4 rows). The registered suite also covers m01's exact original state.

### Rejected-turn UI qualification

For rejected descriptions and no existing custom topper or an existing ready asset, the real queue emitted zero image POSTs. Typed/speech input share this queue through `useCakeDesigner`.

However, a separate extra probe seeded a previously failed, still-unfilled legitimate `a fondant sailboat` preview. Submitting a rejected `Would you make it fancier?` turn initiated a second POST for the **old sailboat**, not for `fancier`. `DesignerQueue.drain()` unconditionally invokes `ensureImage()` at `src/lib/designerQueue.ts:206`, even for no-change/clarification outcomes. This is pre-existing retry behavior, not a new guard regression. The accurate claim is that rejected patch descriptions cannot become new image requests, not that rejected turns can never cause any POST.

### Harness correction

An initial exploratory matrix used a comma-bearing phrase whose chosen span was not a Jev candidate, and a wrong prepared-topper scope key. Four harness errors and fallback delegation resulted. Neither was counted as a product defect. The final 104-row matrix corrected both, asserted the intended provider, and completed without errors.

## Validation

- `npm test`: **219/219 passed**, 0 failures, skips or cancellations.
- `npm run typecheck`: passed.
- `npm run build`: passed, 50 modules, production build completed.
- Independent tests intentionally reproduced the defects above despite the registered suite passing.
- No application changes were made after these checks.

## Frozen artifacts

Before/after SHA-256 bytes matched each other and the historical baselines supplied by the orchestrator:

| File | SHA-256 |
|---|---|
| `scripts/heldout-phrases.json` | `18f1ef4afe40234761cb6dc8a34d41d8052ee969d8c1e5e576fab52abfe93335` |
| `docs/heldout-results.json` | `207238fb79ab9bb5e889b99ae5f94beba8338afbe2ffa61a3f1ae9bddb5af14b` |
| `docs/heldout-results.md` | `795d7ff7ad7dc0012748bfd01fce6d21ad8747436872f6b3b5afb5964fd1dbcb` |

`scripts/check-live-heldout.ts:333` hashes raw source UTF-8 bytes, not normalized JSON. `docs/heldout-review.md` also stayed unchanged during this review (`1375aeaa8a33ceea21afb1a846fc910aed9cd51dbbb03e4dbacb5535dd1b063d`), but no pre-fix baseline for that fourth file was supplied. Frozen cases/results were not rerun or edited.

## Tap-to-generate: final independent verification

**PASS. No concrete in-scope regression found in the final changes.** This supersedes the original cost-protection rejection above. The quality filter still accepts some abstract descriptions, but a plaque no longer initiates image generation. This is the explicitly approved behavior, not evidence that semantic classification has become reliable.

### The same 104-row matrix

Reran every phrase/span in the original matrix through real `interpret`, `DesignerQueue`, and browser HTTP transports with all network responses mocked. For eligible custom requests, also mounted the actual shared action service (`PreviewRecovery.watch`), exercised its automatic cache lookup and explicit `generateExplicitly` action, and delivered results through the application's `receiveImage` callback. This is the service used by `SavedPreviewRecovery`'s click handler, not only the queue's legacy explicit retry method.

| Group | Rows | Automatic image POSTs | Explicit eligible actions | POSTs after those actions |
|---|---:|---:|---:|---:|
| 12 style/mood phrases | 48 | 0 | 32 | 32 |
| 10 legitimate custom-object phrases | 40 | 0 | 40 | 40 |
| Properly classified dinosaur/castle | 8 | 0 | 0 | 0 |
| Custom-only dinosaur output | 4 | 0 | 0 | 0 |
| Exact m01 phrase/bad custom span | 4 | 0 | 0 | 0 |
| **Total** | **104** | **0** | **72** | **72** |

- All **10/10 legitimate phrases** are now accepted in both providers and both prior states: **0/10 refusals**, versus the original 3/10.
- Jev custom-only `dinosaur` now becomes the prepared catalog topper, like fallback. It never becomes a custom request. Existing unrelated ready custom assets remain unchanged.
- Each eligible explicit action produced exactly one mocked image POST. Simultaneous normalized duplicate actions shared that POST; attempts after the asset was ready produced no second POST.
- The eight previously accepted abstract phrases still become custom plaques in this sample. They now produce **zero automatic image POSTs**, and only generate when explicitly requested.
- The exact m01 phrase remains rejected without a new image request.
- All 104 rows asserted the expected interpreter path, no queue errors, and zero automatic generation. No actual provider or image call occurred.

### Failed sailboat, reload, Undo, basket and ready assets

A separate fresh lifecycle probe used the real preview transport and recovery service:

1. Created an unfilled `a fondant sailboat`: zero automatic generation.
2. Explicitly requested its image; mocked failure: exactly one POST.
3. Submitted the rejected fancier request, an unrelated edit, then Undo: **zero additional POSTs**, including no repeat of the old sailboat request.
4. Serialized and restored the basket with `parseBasket`, then created a fresh recovery service and normalized duplicate watchers: free lookup only, **zero reload generation**.
5. Explicitly retried through the same action service used by the UI: exactly one additional POST; duplicate concurrent action was deduplicated.
6. Completed the preview and checked the original inscription, quantity 3, estimate, quoted custom request, immutable original saved item and a separate already-ready saved item.
7. Delivered a different asset for the same normalized request: neither the builder's ready asset nor either already-ready basket asset was overwritten.
8. Undid after completion: restored the empty cake directly, proving image completion had not inserted an Undo step.
9. Mounted a fresh recovery service with a ready cache result: zero generation.

Result: **2 explicit attempts, 2 image POSTs, 3 free lookups, 0 automatic POSTs**. No paid work or uncontrolled network access occurred.

### Diff review and cost labels

Reviewed the changed frontend queue/recovery/component/hook/App wiring, interpretation/remapping, health estimate, pricing helper, CSS and README paths.

- `browserImageTransport` remains the sole generation POST transport in `src/`. The UI invokes it through the explicit preview action. Automatic `watch`/cache checks and image loading cannot fall through to generation.
- Queue automatic paths fail closed before calling the image transport. Undo and unrelated/rejected/no-change edits do not retry a failed image.
- `receiveImage`, current-asset completion and `fulfillBasketAsset` only fill missing IDs; existing ready IDs are retained. Preview completion does not change cake price or saved quantity/design text.
- The visible button uses `configuredPreviewCost()` from `/api/health`, not a separately hardcoded client price. Independently mocked known estimate `$0.025` produced `about 3¢`, null produced `cost varies`, zero produced `free`, and an invalid negative value produced `cost varies`. Each fresh module instance fetched health only once across repeated reads.
- The server's shared estimator returned `$0.008` for its default model and `null` for an unknown model. The full HTTP suite also exercises the actual health endpoint.

The independent checks exercised the application services and transports in Node, not a newly launched browser. Separate mocked desktop/mobile GUI evidence is recorded in `docs/fix-tap-preview.md`; it is not presented here as independently repeated browser testing.

### Final checks and frozen files

- `npm test`: **310/310 passed**, 0 failures, skipped or cancelled tests.
- `npm run typecheck`: passed.
- `npm run build`: passed, **51 modules**. CSS 13.00 kB; JavaScript 317.44 kB.
- Frozen phrase/results raw byte hashes still exactly match all three historical baselines in the table above. `docs/heldout-review.md` also still matches its first-review hash above.
- No frozen case/results file was edited or rerun. No live/paid calls or commits were made.
- The reviewer changed only this report in the repository. Application source stayed unchanged during final independent verification.
