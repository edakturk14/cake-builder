# Interpretation fixes after the fresh retest

Date: 2026-11-14. Scope: `server/fallback.ts` and interpretation tests/documentation. No new paid text or image calls were made.

## Fixed and checked offline

### 1. Explicit keep versus reset semantics

The old recursive sanitizer discarded both empty arrays and all null values. This lost valid whole-list removals and nullable CakePatch resets. It also made null ambiguous: the model used it for “unchanged,” while the shared patch contract uses it for “clear” in several places.

The structured-output wire schema now distinguishes these operations:

| Field | Unchanged wire value | Explicit reset / clear |
|---|---|---|
| `occasion`, `theme`, `customTopper` | `"keep"` | `null` |
| Whole `toppings` / `toppers` list | `null` | `[]` |
| Each color within `colors` | `"keep"` | `null` |
| Each prepared-topper entry within `topperStyles` | `"keep"` | `null` resets the whole entry |
| `topperStyles.<id>.tint` | `"keep"` | `null` |
| `candles.number` / `candles.count` | `"keep"` | `null`, subject to valid candle composition |
| `inscription` | `null` | `""` |
| Nonnullable fields and unchanged object containers | `null` | Use a valid explicit value |

The sentinel exists only in the server/provider wire format. It is decoded to an absent key and never reaches CakeState or client responses. Literal inscription text `"keep"` remains literal text. Empty arrays survive decoding. Nullable reset values survive only at paths where the CakePatch contract supports them.

Structured output is validated against the same restricted schema locally before decoding, so omitted required fields, unknown fields, invalid enums and wrong types do not get silently sanitized away. The decoded result still passes shared `validateCakePatch` and `applyCakePatch`; composition errors are now bounded fallback errors rather than uncaught application exceptions. Model-supplied custom asset ids are still stripped before validation; they never attach a model-chosen image.

Fifteen parameterized rich-state regressions cover full-list clears, explicit removal lists, nullable scalar resets, all four color resets, tint/whole-style resets, writing clear and candle removal. Separate cases cover keep preservation, partial-style preservation, plain-count reset, literal `"keep"` writing and invalid numeral composition. Every test starts with a richly configured cake so unrelated changes cannot hide behind default/null values.

### 2. Less prompt anchoring, conservative support checks

Safe inspection found that the prompt included a tuned scene-to-object example and catalog labels without their meanings. Earlier diagnostic output also showed the model inventing `customTopper:{"request":"Snowman"}`. The deterministic remap converted that name to a catalog topper without checking whether the user's request supported it.

The fresh midnight-masquerade evidence contains the normalized API patch, not the raw provider message. It therefore cannot establish whether that particular snowman came directly from `addToppers` or through the remap. Both paths lacked a source-support check and are now covered by regressions.

Changes:

- Removed the tuned winter-to-snowman and other phrase-to-decoration instructions. The prompt describes general palette/style inference and preserving unmentioned state.
- Added bounded topper meanings, palette meanings and the existing Jev spaceship alias to model context.
- Validate newly introduced objects against catalog names, aliases or descriptive concepts in an explicit scene/theme request. Loose meaning tokens do not justify adding a figurine to a palette/mood-only request.
- Validate custom-object descriptions against the source phrase. Remapped catalog objects undergo the same support checks as direct additions.
- Check new occasion/theme labels for source support, including catalog occasion aliases and birthday-age context.
- Unsupported catalog-object/event output is rejected as a whole with a clarification notice. Unsafe custom additions are handled separately by the m01 follow-up below, so other valid edits survive.
- Inferred fruit toppings and palette/style choices remain allowed. The check never chooses the cake edit itself; the provider still proposes bounded choices.

Mocked regressions accept fruity-category → berries, spaceship → rocket, anniversary context, birthday-age context, mood → palette, a named snowman and a supported winter scene. They reject unrelated direct/remapped snowmen for a masquerade, unsolicited figurines for palette/gown/cloud requests, invented custom descriptions and an unrequested just-because label.

## Validation and limits

At the validation checkpoint, **53/53 focused fallback tests** and **182/182 full-suite tests** passed. `npm run typecheck` and `npm run build` passed. The full suite includes other agents' concurrent fixes; 53 is the interpretation-specific count at this checkpoint.

All new provider responses in these tests were mocked. **No new live semantic accuracy, live structured-output-provider compatibility, latency or cost result is claimed.** The two failed live generalization cases in `retest-interpretation.md` were the real-provider evidence at that checkpoint.

The support check is conservative lexical validation, not proof of semantic relevance or a general-purpose language interpreter. It can reject a valid indirect metaphor or accept a related but still aesthetically poor object for an explicit scene. Negation, long-distance references, complex mixed requests and model preservation remain areas where fresh real-provider evaluation is needed. The application can reject a demonstrably unsupported object, but it cannot locally prove that a newly generated palette captures the user's intended mood.

The prompt/catalog payload changed, so the former approximately $0.0004-per-call measurement is historical, not a measurement of this version. The paid-call budget is exhausted; further live evaluation requires a new explicit budget.

## Offline reproduction

Run `node --import tsx --test tests/fallback.test.ts`, then `npm test` and `npm run build`. These checks do not call paid providers. Relevant tests exercise the real `interpret` → `runFallback` → shared validation/application pipeline with mocked fetch responses, not a second sanitizer implementation.

## m01 follow-up: custom-object quality filtering, not cost protection

The later held-out run exposed a different escape: the backup returned `customTopper.request: "more grown-up and fancy"` for a request to make an existing cake look more grown-up and fancy. The substring support check passed because those words occurred in the transcript. It established provenance, not a request for a physical object. Jev normalization had the same problem: an exact selected span and `customTopperAction: add` could pass without independently checking object intent.

Both paths share `server/customTopperIntent.ts`. It checks affirmative, local object-addition or topper/figurine/portrait syntax around a source-grounded description, rather than accepting a free-floating mood substring. It rejects the covered vague/comparative descriptions, appearance-attribute heads, color-only descriptions, partial spans that omit the object, and locally negated/removal constructions. The check does not map a mood to an object or choose a replacement edit. **This is a quality filter, not a reliable physical-noun classifier or an image-cost boundary.**

A rejected addition is omitted, not reset to `null`. Existing custom requests/assets and other valid edits survive. The response says the custom topper was left unchanged and asks the user to name a physical object or figure. If that leaves no change, the backup returns the honest notice rather than discarding it in the generic no-change error. Available paid-text usage metadata is retained; the rejected custom output is not described as free. A Jev rejection is an intentional clarification, not a reason to call the backup again. Explicit custom removals still work.

**Offline validation:** 36 new mocked regressions, **89/89 fallback tests**, **133/133 fallback plus voice tests**, and **219/219 full-suite tests** passed. `npm run typecheck` and `npm run build` passed. Tests include the exact m01 starting state and bad backup output; unrelated style requests; partial valid color edits while preserving an existing asset; concrete lighthouse, golden retriever, racing pigeon and portrait requests; existing catalog remapping; and explicit removal. Both provider paths are exercised through `interpret` with mocked fetches. No image endpoint is called.

These counts describe the first m01 checkpoint, not proof of semantic safety. No paid/live text or image calls were made. The frozen held-out phrases and results were not changed or rerun, the other six failures were not tuned, and the recorded held-out accuracy remains historical rather than a post-fix measurement.

### Independent review and tap-to-generate follow-up

Independent mocked review found that 8/12 unseen abstract/style phrases still passed the filter, including “a luxurious finish,” “whimsy,” “a festive atmosphere,” and “a refined aesthetic.” It also refused 3/10 legitimate requests, including “Put our cat Miso as a topper,” “Use our cat Miso as the topper,” and “Could you sculpt a fondant sailboat for the top?” Those small mocked samples are not live population estimates. The review did not approve the heuristic as cost protection.

**Tap-to-generate is the image-cost protection.** A custom request is a quoted-item plaque until the user explicitly requests a preview. Ordinary edits, an accepted abstract description, or a rejected interpretation must not automatically start or retry image generation. The client owns this explicit action and its queue lifecycle. The server quality filter is not the authorization boundary, and its interpreter-only tests do not validate the client lifecycle.

The syntax check now accepts ordinary `X as a/the topper`, `make/sculpt/do a X for the top/on top`, and `put X on it` constructions, including named subjects without articles when the topper purpose is explicit. Existing clear rejections stay; no expanding abstract-noun deny list was added. Abstract nouns can still slip through as plaques.

The review also found that Jev custom-only catalog names depended on a separately selected incoming prepared topper. Both providers now use the same exact catalog ID/name matcher, with optional leading articles. For example, custom-only `dinosaur` becomes `addToppers: ["dinosaur"]`, not a custom preview request. Remapping deduplicates an independently selected prepared slot and preserves an existing unrelated custom request/asset. Named pet portraits and other detailed custom descriptions remain custom.

The follow-up mocked matrix covers all ten legitimate reviewer examples plus six new constructions, both providers, and both no-custom and ready-custom starting states. It also covers custom-only dinosaur/castle/flower-bouquet remapping in both providers and states, every catalog ID/label in the shared matcher, duplicate prepared choices, the reviewer's clear rejections, and the existing m01 regression. No paid/live calls, frozen-artifact edits, or other held-out-failure tuning accompany this follow-up.

**Follow-up validation:** 86 additional interpreter regressions; **175/175 fallback tests**, **219/219 fallback plus voice tests**, and **310/310 full-suite tests** passed. `npm run typecheck` passed. The full suite includes concurrent client/lifecycle work. No build was run for this follow-up; that check belongs to the independent reviewer. Interpreter tests mock provider fetches and do not by themselves establish the client tap-to-generate boundary.
